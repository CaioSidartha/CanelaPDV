CREATE TABLE IF NOT EXISTS "tenant_workspaces" (
  "tenant_id" uuid PRIMARY KEY NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "payload" jsonb NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid
);
