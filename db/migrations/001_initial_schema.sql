-- Workflows application database (separate database from n8n's internal database).
-- Apply with psql to the dedicated Workflows database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS workflows (
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

CREATE TABLE IF NOT EXISTS workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  version_kind text NOT NULL CHECK (version_kind IN ('saved', 'published')),
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_versions_number_positive CHECK (version_number > 0),
  CONSTRAINT workflow_versions_definition_is_object CHECK (jsonb_typeof(definition) = 'object'),
  CONSTRAINT workflow_versions_workflow_number_unique UNIQUE (workflow_id, version_number)
);

ALTER TABLE workflows
  ADD CONSTRAINT workflows_published_version_fk
  FOREIGN KEY (published_version_id)
  REFERENCES workflow_versions(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version_id uuid REFERENCES workflow_versions(id) ON DELETE SET NULL,
  execution_mode text NOT NULL CHECK (execution_mode IN ('test', 'production')),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  -- Always retain the exact definition used, including draft-test snapshots.
  definition_snapshot jsonb NOT NULL,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error jsonb,
  n8n_workflow_id text,
  n8n_execution_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT executions_snapshot_is_object CHECK (jsonb_typeof(definition_snapshot) = 'object'),
  CONSTRAINT executions_input_is_object CHECK (jsonb_typeof(input) = 'object')
);

CREATE INDEX IF NOT EXISTS executions_workflow_created_idx
  ON executions (workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS executions_status_created_idx
  ON executions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS execution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
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
  ON execution_steps (execution_id, created_at);
