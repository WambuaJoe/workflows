-- Version immutability test; run after migrations 001, 002 and 003.
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/tests/004_immutable_workflow_versions.sql

BEGIN;

INSERT INTO public.workflows (name, draft_definition)
VALUES ('Version immutability test', '{"steps":[{"id":"trigger"}]}'::jsonb)
RETURNING id \gset workflow_

INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
VALUES (:'workflow_id', 1, 'saved', '{"steps":[{"id":"trigger"}]}'::jsonb)
RETURNING id \gset saved_

INSERT INTO public.workflow_versions (workflow_id, version_number, version_kind, definition)
VALUES (:'workflow_id', 2, 'published', '{"steps":[{"id":"trigger"},{"id":"action"}]}'::jsonb)
RETURNING id \gset published_

UPDATE public.workflows
SET published_version_id = :'published_id'
WHERE id = :'workflow_id';

DO $$
BEGIN
  BEGIN
    UPDATE public.workflow_versions
    SET definition = '{"steps":[]}'::jsonb
    WHERE version_number = 1
      AND workflow_id = (SELECT id FROM public.workflows WHERE name = 'Version immutability test');
    RAISE EXCEPTION 'saved version update unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;

  BEGIN
    DELETE FROM public.workflow_versions
    WHERE version_number = 2
      AND workflow_id = (SELECT id FROM public.workflows WHERE name = 'Version immutability test');
    RAISE EXCEPTION 'published version delete unexpectedly succeeded';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    NULL;
  END;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.workflow_versions
    WHERE version_number = 1
      AND version_kind = 'saved'
      AND definition = '{"steps":[{"id":"trigger"}]}'::jsonb
  ) THEN
    RAISE EXCEPTION 'saved snapshot changed despite immutability guard';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.workflow_versions
    WHERE version_number = 2
      AND version_kind = 'published'
      AND definition = '{"steps":[{"id":"trigger"},{"id":"action"}]}'::jsonb
  ) THEN
    RAISE EXCEPTION 'published snapshot changed despite immutability guard';
  END IF;
END
$$;

ROLLBACK;

SELECT 'workflow version immutability: OK' AS result;
