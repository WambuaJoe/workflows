-- Read-only permission smoke test; run after migrations 001 and 002.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/002_integration_contract_permissions.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'integration') THEN
    RAISE EXCEPTION 'integration schema is missing';
  END IF;

  IF has_table_privilege('workflows_n8n', 'public.workflows', 'SELECT')
     OR has_table_privilege('workflows_n8n', 'public.workflows', 'INSERT')
     OR has_table_privilege('workflows_n8n', 'public.workflow_versions', 'UPDATE')
     OR has_table_privilege('workflows_n8n', 'public.executions', 'UPDATE')
     OR has_table_privilege('workflows_n8n', 'public.execution_steps', 'INSERT') THEN
    RAISE EXCEPTION 'workflows_n8n unexpectedly has direct application-table privileges';
  END IF;

  IF NOT has_table_privilege('workflows_n8n', 'integration.v1_drafts', 'SELECT')
     OR NOT has_table_privilege('workflows_n8n', 'integration.v1_published_workflows', 'SELECT')
     OR NOT has_table_privilege('workflows_n8n', 'integration.v1_execution_history', 'SELECT')
     OR NOT has_table_privilege('workflows_n8n', 'integration.v1_execution_steps', 'SELECT') THEN
    RAISE EXCEPTION 'workflows_n8n is missing an approved read-view privilege';
  END IF;

  IF NOT has_function_privilege('workflows_n8n',
       'integration.v1_update_execution_status(uuid,text,text,jsonb,jsonb)', 'EXECUTE')
     OR NOT has_function_privilege('workflows_n8n',
       'integration.v1_record_execution_step(uuid,text,text,text,text,jsonb,jsonb,jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'workflows_n8n is missing an approved execution function privilege';
  END IF;

  IF has_function_privilege('workflows_n8n',
       'integration.v1_start_execution(uuid,text,jsonb,uuid,jsonb)', 'EXECUTE')
     OR has_function_privilege('workflows_n8n',
       'integration.v1_cancel_execution(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'workflows_n8n has an application-owned function privilege';
  END IF;
END
$$;

-- Exercise the approved lifecycle and prove that the ownership boundaries are
-- enforced by PostgreSQL, not only documented.
DELETE FROM public.execution_steps
WHERE execution_id IN (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000004'::uuid
);
DELETE FROM public.executions
WHERE id IN (
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000004'::uuid
);
DELETE FROM public.workflow_versions
WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.workflows
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

CREATE TEMP TABLE contract_test_executions (
  execution_id uuid PRIMARY KEY,
  kind text NOT NULL
);
GRANT ALL ON contract_test_executions TO PUBLIC;

INSERT INTO public.workflows (id, name, draft_definition)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Contract test workflow',
  '{"nodes":[{"id":"draft-node"}]}'::jsonb
);
INSERT INTO public.workflow_versions (
  id, workflow_id, version_number, version_kind, definition
)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  1,
  'published',
  '{"nodes":[{"id":"published-node"}]}'::jsonb
);
UPDATE public.workflows
SET published_version_id = '00000000-0000-0000-0000-000000000002'
WHERE id = '00000000-0000-0000-0000-000000000001';

SET ROLE workflows_app;
DO $$
DECLARE
  v_execution_id uuid;
  v_status text;
  v_definition jsonb;
BEGIN
  SELECT execution_id, status
  INTO v_execution_id, v_status
  FROM integration.v1_start_execution(
    '00000000-0000-0000-0000-000000000001',
    'production',
    '{"request":"run"}'::jsonb,
    '00000000-0000-0000-0000-000000000002'
  );
  IF v_status <> 'queued' THEN
    RAISE EXCEPTION 'start did not create a queued execution';
  END IF;
  INSERT INTO contract_test_executions VALUES (v_execution_id, 'production');

  SELECT definition_snapshot INTO v_definition
  FROM public.executions
  WHERE id = v_execution_id;
  IF v_definition <> '{"nodes":[{"id":"published-node"}]}'::jsonb THEN
    RAISE EXCEPTION 'production execution did not snapshot the published definition';
  END IF;

  SELECT execution_id
  INTO v_execution_id
  FROM integration.v1_start_execution(
    '00000000-0000-0000-0000-000000000001',
    'test',
    '{}'::jsonb,
    NULL,
    '{"nodes":[{"id":"test-node"}]}'::jsonb
  );
  INSERT INTO contract_test_executions VALUES (v_execution_id, 'test');
END
$$;

DO $$
DECLARE
  v_execution_id uuid;
  v_status text;
BEGIN
  SELECT execution_id INTO v_execution_id
  FROM contract_test_executions WHERE kind = 'test';
  SELECT status INTO v_status
  FROM integration.v1_cancel_execution(v_execution_id);
  IF v_status <> 'cancelled' THEN
    RAISE EXCEPTION 'application cancellation did not mark execution cancelled';
  END IF;
END
$$;

RESET ROLE;

SET ROLE workflows_n8n;
DO $$
DECLARE
  v_execution_id uuid;
  v_status text;
  v_step_status text;
  v_view_status text;
  v_view_input jsonb;
BEGIN
  SELECT execution_id INTO v_execution_id
  FROM contract_test_executions WHERE kind = 'production';
  SELECT status INTO v_status
  FROM integration.v1_update_execution_status(
    v_execution_id, 'running', 'n8n-1'
  );
  IF v_status <> 'running' THEN
    RAISE EXCEPTION 'status reporter did not mark execution running';
  END IF;

  SELECT status INTO v_step_status
  FROM integration.v1_record_execution_step(
    v_execution_id,
    'node-1', 'test', 'First node', 'succeeded',
    '{"x":1}'::jsonb, '{"y":2}'::jsonb, NULL
  );
  IF v_step_status <> 'succeeded' THEN
    RAISE EXCEPTION 'node reporter did not record the result';
  END IF;

  SELECT status INTO v_status
  FROM integration.v1_update_execution_status(
    v_execution_id, 'succeeded', NULL, '{"result":"ok"}'::jsonb
  );
  IF v_status <> 'succeeded' THEN
    RAISE EXCEPTION 'status reporter did not record the successful outcome';
  END IF;

  SELECT status, input
  INTO v_view_status, v_view_input
  FROM integration.v1_execution_history
  WHERE execution_id = v_execution_id;
  IF v_view_status <> 'succeeded'
     OR v_view_input <> '{"request":"run"}'::jsonb THEN
    RAISE EXCEPTION 'execution history view did not expose the current result';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM integration.v1_execution_steps
    WHERE execution_id = v_execution_id
      AND node_id = 'node-1' AND status = 'succeeded'
  ) THEN
    RAISE EXCEPTION 'execution steps view did not expose the node result';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    PERFORM integration.v1_start_execution(
      '00000000-0000-0000-0000-000000000001', 'test', '{}'::jsonb, NULL,
      '{"nodes":[]}'::jsonb
    );
    RAISE EXCEPTION 'n8n was able to create an execution';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    PERFORM integration.v1_update_execution_status(
      (SELECT execution_id FROM contract_test_executions WHERE kind = 'production'),
      'cancelled'
    );
    RAISE EXCEPTION 'n8n was able to set cancelled status';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    DECLARE
      v_execution_id uuid;
    BEGIN
      SELECT execution_id INTO v_execution_id
      FROM contract_test_executions WHERE kind = 'production';
    PERFORM integration.v1_cancel_execution(
      v_execution_id
    );
    END;
    RAISE EXCEPTION 'n8n was able to cancel an execution';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.executions (
      workflow_id, execution_mode, definition_snapshot
    )
    VALUES (
      '00000000-0000-0000-0000-000000000001', 'test', '{"nodes":[]}'::jsonb
    );
    RAISE EXCEPTION 'n8n was able to write an application table';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

RESET ROLE;
DELETE FROM public.execution_steps
WHERE execution_id IN (
  SELECT execution_id FROM contract_test_executions
);
DELETE FROM public.executions
WHERE id IN (
  SELECT execution_id FROM contract_test_executions
);
DELETE FROM public.workflow_versions
WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;
DELETE FROM public.workflows
WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

SELECT 'integration contract permissions: OK' AS result;
