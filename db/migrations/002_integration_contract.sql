-- Versioned, least-privilege contract for approved Workflows/n8n consumers.
-- Run as the owner of the Workflows application tables.

CREATE SCHEMA IF NOT EXISTS integration;
REVOKE ALL ON SCHEMA integration FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workflows_app') THEN
    CREATE ROLE workflows_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'workflows_n8n') THEN
    CREATE ROLE workflows_n8n NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO workflows_app;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.workflows, public.workflow_versions, public.executions, public.execution_steps
  TO workflows_app;

-- n8n has no direct privileges on application tables or sequences.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM workflows_n8n;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM workflows_n8n;
REVOKE CREATE ON SCHEMA public FROM workflows_n8n;

CREATE OR REPLACE VIEW integration.v1_workflows
WITH (security_barrier = true) AS
SELECT id, name, published_version_id, created_at, updated_at
FROM public.workflows;

CREATE OR REPLACE VIEW integration.v1_drafts
WITH (security_barrier = true) AS
SELECT id AS workflow_id, name, draft_definition AS definition, draft_updated_at
FROM public.workflows;

CREATE OR REPLACE VIEW integration.v1_published_workflows
WITH (security_barrier = true) AS
SELECT w.id AS workflow_id, w.name, v.id AS workflow_version_id,
       v.version_number, v.definition, v.created_at AS published_at
FROM public.workflows AS w
JOIN public.workflow_versions AS v
  ON v.id = w.published_version_id
 AND v.workflow_id = w.id
 AND v.version_kind = 'published';

CREATE OR REPLACE VIEW integration.v1_execution_history
WITH (security_barrier = true) AS
SELECT id AS execution_id, workflow_id, workflow_version_id, execution_mode,
       status, input, output, error, n8n_execution_id,
       started_at, completed_at, created_at
FROM public.executions;

CREATE OR REPLACE VIEW integration.v1_execution_steps
WITH (security_barrier = true) AS
SELECT id AS step_id, execution_id, node_id, node_type, node_label, status,
       input, output, error, started_at, completed_at, created_at
FROM public.execution_steps;

COMMENT ON SCHEMA integration IS
  'Versioned, least-privilege database contract for approved consumers.';
COMMENT ON VIEW integration.v1_drafts IS
  'Current mutable drafts; read-only to integration consumers and not a production execution source.';
COMMENT ON VIEW integration.v1_published_workflows IS
  'Current published immutable definitions for production execution.';

-- Next.js creates queued executions. Production definitions are loaded from the
-- current published version inside the function; test runs supply an exact snapshot.
CREATE OR REPLACE FUNCTION integration.v1_start_execution(
  p_workflow_id uuid,
  p_execution_mode text,
  p_input jsonb DEFAULT '{}'::jsonb,
  p_workflow_version_id uuid DEFAULT NULL,
  p_test_definition_snapshot jsonb DEFAULT NULL
)
RETURNS TABLE (execution_id uuid, status text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_definition jsonb;
  v_id uuid;
  v_status text;
  v_created timestamptz;
BEGIN
  IF p_execution_mode NOT IN ('test', 'production') THEN
    RAISE EXCEPTION 'Unsupported execution mode' USING ERRCODE = '22023';
  END IF;
  IF p_input IS NULL OR jsonb_typeof(p_input) <> 'object' THEN
    RAISE EXCEPTION 'Execution input must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF p_execution_mode = 'production' THEN
    SELECT v.definition INTO v_definition
    FROM public.workflows AS w
    JOIN public.workflow_versions AS v
      ON v.id = w.published_version_id
     AND v.workflow_id = w.id
     AND v.version_kind = 'published'
    WHERE w.id = p_workflow_id AND v.id = p_workflow_version_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Requested version is not the current published version'
        USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_test_definition_snapshot IS NULL
       OR jsonb_typeof(p_test_definition_snapshot) <> 'object' THEN
      RAISE EXCEPTION 'Test execution requires a JSON object definition snapshot'
        USING ERRCODE = '22023';
    END IF;
    IF p_workflow_version_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.workflow_versions AS v
      WHERE v.id = p_workflow_version_id AND v.workflow_id = p_workflow_id
    ) THEN
      RAISE EXCEPTION 'Workflow version does not belong to workflow'
        USING ERRCODE = '22023';
    END IF;
    v_definition := p_test_definition_snapshot;
  END IF;

  INSERT INTO public.executions (
    workflow_id, workflow_version_id, execution_mode, status, definition_snapshot, input
  )
  VALUES (p_workflow_id, p_workflow_version_id, p_execution_mode, 'queued', v_definition, p_input)
  RETURNING id, executions.status, executions.created_at
    INTO v_id, v_status, v_created;

  RETURN QUERY SELECT v_id, v_status, v_created;
END;
$$;

-- n8n may report running/succeeded/failed; cancellation remains application-owned.
CREATE OR REPLACE FUNCTION integration.v1_update_execution_status(
  p_execution_id uuid,
  p_status text,
  p_n8n_execution_id text DEFAULT NULL,
  p_output jsonb DEFAULT NULL,
  p_error jsonb DEFAULT NULL
)
RETURNS TABLE (execution_id uuid, status text, started_at timestamptz, completed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_current text;
BEGIN
  IF p_status NOT IN ('running', 'succeeded', 'failed') THEN
    RAISE EXCEPTION 'n8n cannot set this execution status' USING ERRCODE = '42501';
  END IF;

  SELECT e.status INTO v_current
  FROM public.executions AS e
  WHERE e.id = p_execution_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution does not exist' USING ERRCODE = 'P0002';
  END IF;

  -- Duplicate delivery is safe and does not rewrite a terminal result.
  IF v_current = p_status THEN
    RETURN QUERY SELECT e.id, e.status, e.started_at, e.completed_at
      FROM public.executions AS e WHERE e.id = p_execution_id;
    RETURN;
  END IF;

  IF NOT (
    (v_current = 'queued' AND p_status IN ('running', 'failed'))
    OR (v_current = 'running' AND p_status IN ('succeeded', 'failed'))
  ) THEN
    RAISE EXCEPTION 'Invalid execution status transition: % -> %', v_current, p_status
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.executions AS e
  SET status = p_status,
      n8n_execution_id = COALESCE(p_n8n_execution_id, e.n8n_execution_id),
      started_at = CASE WHEN p_status = 'running' THEN COALESCE(e.started_at, now()) ELSE e.started_at END,
      completed_at = CASE WHEN p_status IN ('succeeded', 'failed') THEN now() ELSE e.completed_at END,
      output = CASE WHEN p_status = 'succeeded' THEN p_output ELSE e.output END,
      error = CASE WHEN p_status = 'failed' THEN p_error ELSE e.error END
  WHERE e.id = p_execution_id;

  RETURN QUERY SELECT e.id, e.status, e.started_at, e.completed_at
    FROM public.executions AS e WHERE e.id = p_execution_id;
END;
$$;

-- Node progress is keyed by execution/node and rejects backwards state transitions.
CREATE OR REPLACE FUNCTION integration.v1_record_execution_step(
  p_execution_id uuid,
  p_node_id text,
  p_node_type text,
  p_node_label text,
  p_status text,
  p_input jsonb DEFAULT NULL,
  p_output jsonb DEFAULT NULL,
  p_error jsonb DEFAULT NULL
)
RETURNS TABLE (step_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_current text;
  v_id uuid;
BEGIN
  IF p_status NOT IN ('queued', 'running', 'succeeded', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'Unsupported node status' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.executions AS e
    WHERE e.id = p_execution_id AND e.status = 'running'
  ) THEN
    RAISE EXCEPTION 'Node results require a running execution' USING ERRCODE = '22023';
  END IF;

  SELECT s.status INTO v_current
  FROM public.execution_steps AS s
  WHERE s.execution_id = p_execution_id AND s.node_id = p_node_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.execution_steps (
      execution_id, node_id, node_type, node_label, status,
      input, output, error, started_at, completed_at
    )
    VALUES (
      p_execution_id, p_node_id, p_node_type, p_node_label, p_status,
      p_input, p_output, p_error,
      CASE WHEN p_status = 'running' THEN now() ELSE NULL END,
      CASE WHEN p_status IN ('succeeded', 'failed', 'skipped') THEN now() ELSE NULL END
    )
    RETURNING id INTO v_id;
  ELSE
    IF NOT (
      v_current = p_status
      OR (v_current = 'queued' AND p_status IN ('running', 'succeeded', 'failed', 'skipped'))
      OR (v_current = 'running' AND p_status IN ('succeeded', 'failed', 'skipped'))
    ) THEN
      RAISE EXCEPTION 'Invalid node status transition: % -> %', v_current, p_status
        USING ERRCODE = '22023';
    END IF;

    UPDATE public.execution_steps AS s
    SET node_type = p_node_type,
        node_label = p_node_label,
        status = p_status,
        input = COALESCE(p_input, s.input),
        output = COALESCE(p_output, s.output),
        error = COALESCE(p_error, s.error),
        started_at = CASE WHEN p_status = 'running' THEN COALESCE(s.started_at, now()) ELSE s.started_at END,
        completed_at = CASE WHEN p_status IN ('succeeded', 'failed', 'skipped') THEN COALESCE(s.completed_at, now()) ELSE s.completed_at END
    WHERE s.execution_id = p_execution_id AND s.node_id = p_node_id
    RETURNING s.id INTO v_id;
  END IF;

  RETURN QUERY SELECT s.id, s.status FROM public.execution_steps AS s WHERE s.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION integration.v1_cancel_execution(p_execution_id uuid)
RETURNS TABLE (execution_id uuid, status text, completed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.executions AS e
  SET status = 'cancelled', completed_at = now()
  WHERE e.id = p_execution_id AND e.status IN ('queued', 'running');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Execution is missing or already terminal' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT e.id, e.status, e.completed_at
    FROM public.executions AS e WHERE e.id = p_execution_id;
END;
$$;

REVOKE ALL ON FUNCTION integration.v1_start_execution(uuid, text, jsonb, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.v1_update_execution_status(uuid, text, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.v1_record_execution_step(uuid, text, text, text, text, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION integration.v1_cancel_execution(uuid) FROM PUBLIC;

GRANT USAGE ON SCHEMA integration TO workflows_app, workflows_n8n;
GRANT SELECT ON integration.v1_workflows, integration.v1_drafts,
  integration.v1_published_workflows, integration.v1_execution_history,
  integration.v1_execution_steps TO workflows_n8n;

GRANT EXECUTE ON FUNCTION integration.v1_start_execution(uuid, text, jsonb, uuid, jsonb)
  TO workflows_app;
GRANT EXECUTE ON FUNCTION integration.v1_cancel_execution(uuid) TO workflows_app;
GRANT EXECUTE ON FUNCTION integration.v1_update_execution_status(uuid, text, text, jsonb, jsonb)
  TO workflows_n8n;
GRANT EXECUTE ON FUNCTION integration.v1_record_execution_step(uuid, text, text, text, text, jsonb, jsonb, jsonb)
  TO workflows_n8n;

ALTER DEFAULT PRIVILEGES IN SCHEMA integration
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
