-- ==============================================================================
-- DATABASE PERMISSIONS AND ROLES HIERARCHY
-- Principle of Least Privilege across platform services
-- ==============================================================================

-- Roles definitions
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_readonly') THEN
        CREATE ROLE platform_readonly;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_app') THEN
        CREATE ROLE platform_app;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'platform_migration') THEN
        CREATE ROLE platform_migration;
    END IF;
END $$;

-- Schema ownership & grant
GRANT USAGE ON SCHEMA public TO platform_readonly, platform_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO platform_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO platform_app;

