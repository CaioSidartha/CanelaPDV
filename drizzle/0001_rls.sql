-- Row Level Security (Neon). A aplicação usa role com BYPASSRLS no servidor;
-- políticas protegem acesso direto ao banco e futuras conexões por tenant.

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Variável de sessão: SET app.tenant_id = '<uuid>';

CREATE POLICY tenant_users_isolation ON tenant_users
  USING (
    tenant_id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.is_platform', true) = 'true'
  );

CREATE POLICY tenants_read ON tenants
  FOR SELECT
  USING (
    id::text = current_setting('app.tenant_id', true)
    OR current_setting('app.is_platform', true) = 'true'
  );

CREATE POLICY leads_platform_only ON leads
  USING (current_setting('app.is_platform', true) = 'true');

CREATE POLICY audit_platform_or_tenant ON audit_log
  USING (
    current_setting('app.is_platform', true) = 'true'
    OR tenant_id::text = current_setting('app.tenant_id', true)
  );
