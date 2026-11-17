-- Persistence behavior smoke test; run after migration 001.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/003_workflow_persistence.sql

BEGIN;

INSERT INTO public.workflows (name, draft_definition)
VALUES ('Persistence test', '{"steps":[{"id":"trigger"}]}'::jsonb)
RETURNING id \gset workflow_

CREATE TEMP TABLE persistence_created AS
SELECT id, name, draft_definition
FROM public.workflows
WHERE id = :'workflow_id';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM persistence_created
    WHERE name = 'Persistence test'
      AND draft_definition = '{"steps":[{"id":"trigger"}]}'::jsonb
  ) THEN
    RAISE EXCEPTION 'created workflow does not contain the submitted draft';
  END IF;
END
$$;

INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
VALUES (:'workflow_id', 1, 'saved', '{"steps":[{"id":"trigger"}]}'::jsonb)
RETURNING id \gset version_

UPDATE public.workflows
SET name = 'Updated persistence test',
    draft_definition = '{"steps":[{"id":"trigger"},{"id":"action"}]}'::jsonb,
    draft_updated_at = now(),
    updated_at = now()
WHERE id = :'workflow_id';

INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
VALUES (:'workflow_id', 2, 'saved', '{"steps":[{"id":"trigger"},{"id":"action"}]}'::jsonb);

CREATE TEMP TABLE persistence_saved AS
SELECT
  w.name,
  w.draft_definition,
  (SELECT count(*) FROM public.workflow_versions WHERE workflow_id = w.id) AS version_count,
  (SELECT definition FROM public.workflow_versions WHERE id = :'version_id') AS original_definition
FROM public.workflows AS w
WHERE w.id = :'workflow_id';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM persistence_saved
    WHERE name = 'Updated persistence test'
      AND draft_definition = '{"steps":[{"id":"trigger"},{"id":"action"}]}'::jsonb
      AND version_count = 2
      AND original_definition = '{"steps":[{"id":"trigger"}]}'::jsonb
  ) THEN
    RAISE EXCEPTION 'save did not update the draft and preserve the immutable snapshot';
  END IF;
END
$$;

CREATE TEMP TABLE persistence_missing AS
SELECT count(*) AS matching_workflows
FROM public.workflows
WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM persistence_missing WHERE matching_workflows <> 0) THEN
    RAISE EXCEPTION 'nonexistent workflow ID unexpectedly returned a record';
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.workflows (name, draft_definition)
    VALUES ('   ', '{"steps":[]}'::jsonb);
    RAISE EXCEPTION 'blank workflow name was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.workflows (name, draft_definition)
    VALUES ('Invalid document', '[]'::jsonb);
    RAISE EXCEPTION 'non-object workflow document was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
    VALUES (gen_random_uuid(), 1, 'saved', '{}'::jsonb);
    RAISE EXCEPTION 'version for a missing workflow was accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END
$$;

ROLLBACK;
