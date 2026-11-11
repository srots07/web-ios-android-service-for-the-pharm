-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-tenant isolation enforced at the database level
-- ==============================================================================

-- Enable RLS on core multi-tenant tables
ALTER TABLE IF EXISTS core.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS core.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS core.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS workflow.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS files.uploaded_files ENABLE ROW LEVEL SECURITY;

-- Helper to retrieve current active tenant context from session setting
-- Usage in application: SET LOCAL app.current_tenant_id = 'uuid';
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

-- Example Tenant Isolation Policy for Memberships
CREATE POLICY tenant_isolation_policy ON core.memberships
    FOR ALL
    USING (organization_id = current_tenant_id())
    WITH CHECK (organization_id = current_tenant_id());

