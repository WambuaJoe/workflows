-- Workflow version rows are historical snapshots. Never mutate them in place.
-- Correct a workflow by inserting a new version instead.

CREATE OR REPLACE FUNCTION public.prevent_workflow_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Workflow versions are immutable; create a new version instead'
    USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS workflow_versions_immutable
  ON public.workflow_versions;

CREATE TRIGGER workflow_versions_immutable
BEFORE UPDATE OR DELETE ON public.workflow_versions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_workflow_version_mutation();

REVOKE ALL ON FUNCTION public.prevent_workflow_version_mutation() FROM PUBLIC;
