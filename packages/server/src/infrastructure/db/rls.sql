-- Row-Level Security Policies
-- Tenant isolation at database level — even application bugs cannot leak cross-tenant data.
-- JWT claims must set app.tenant_id before any query.

-- Enable RLS on all tenant-scoped tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;

-- Create a role for the application (used at runtime, not for migrations)
-- CREATE ROLE pet_app LOGIN PASSWORD 'changeme';

-- teams: only visible within the current tenant
CREATE POLICY teams_tenant_isolation ON teams
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- practice_sessions: only visible within the current tenant
CREATE POLICY sessions_tenant_isolation ON practice_sessions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- drills: inherit isolation via session_id join (handled in application)
-- The practice_sessions policy ensures session_id references are always tenant-scoped
CREATE POLICY drills_tenant_isolation ON drills
  USING (
    session_id IN (
      SELECT id FROM practice_sessions
      WHERE tenant_id = current_setting('app.tenant_id')::uuid
    )
  );

-- memberships: only visible within the current tenant
CREATE POLICY memberships_tenant_isolation ON memberships
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- team_assignments: inherit via membership
CREATE POLICY team_assignments_tenant_isolation ON team_assignments
  USING (
    membership_id IN (
      SELECT id FROM memberships
      WHERE tenant_id = current_setting('app.tenant_id')::uuid
    )
  );
