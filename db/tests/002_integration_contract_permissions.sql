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

SELECT 'integration contract permissions: OK' AS result;
