-- Dedicated Workflows database schema; never use n8n's internal database.
-- PostgreSQL 13+ (gen_random_uuid is built in).

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled Workflow',
  draft_definition jsonb NOT NULL,
  draft_updated_at timestamptz NOT NULL DEFAULT now(),
  published_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflows_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT workflows_draft_is_object CHECK (jsonb_typeof(draft_definition) = 'object')
);

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  version_kind text NOT NULL CHECK (version_kind IN ('saved', 'published')),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_versions_workflow_number_unique UNIQUE (workflow_id, version_number)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workflows_published_version_fk'
      AND conrelid = 'public.workflows'::regclass
  ) THEN
    ALTER TABLE public.workflows
      ADD CONSTRAINT workflows_published_version_fk
      FOREIGN KEY (published_version_id)
      REFERENCES public.workflow_versions(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflows(id) ON DELETE SET NULL,
  workflow_version_id uuid REFERENCES public.workflow_versions(id) ON DELETE SET NULL,
  execution_mode text NOT NULL CHECK (execution_mode IN ('test', 'production')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  definition_snapshot jsonb NOT NULL CHECK (jsonb_typeof(definition_snapshot) = 'object'),
  input jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(input) = 'object'),
  output jsonb,
  error jsonb,
  n8n_workflow_id text,
  n8n_execution_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS executions_workflow_created_idx
  ON public.executions (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS executions_status_created_idx
  ON public.executions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.executions(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  node_type text NOT NULL,
  node_label text NOT NULL,
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  input jsonb,
  output jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT execution_steps_node_unique UNIQUE (execution_id, node_id)
);

CREATE INDEX IF NOT EXISTS execution_steps_execution_idx
  ON public.execution_steps (execution_id, created_at);
