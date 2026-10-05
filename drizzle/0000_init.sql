CREATE TYPE "public"."actor_scope" AS ENUM('platform', 'tenant');
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost');
CREATE TYPE "public"."tenant_kind" AS ENUM('production', 'test');
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'trial', 'churned');
CREATE TYPE "public"."tenant_user_role" AS ENUM('admin', 'gerente', 'caixa', 'operador');

CREATE TABLE "tenants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" "tenant_kind" DEFAULT 'production' NOT NULL,
  "status" "tenant_status" DEFAULT 'active' NOT NULL,
  "name" text NOT NULL,
  "document" text NOT NULL,
  "plan_id" text DEFAULT 'essencial' NOT NULL,
  "monthly_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
  "admin_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);

CREATE TABLE "platform_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "tenant_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade,
  "email" text NOT NULL,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" "tenant_user_role" DEFAULT 'admin' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "scope" "actor_scope" NOT NULL,
  "user_id" uuid NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "platform_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "leads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "company_name" text,
  "message" text,
  "plan_interest" text,
  "status" "lead_status" DEFAULT 'new' NOT NULL,
  "source" text DEFAULT 'site' NOT NULL,
  "email_requested" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE set null,
  "scope" "actor_scope" NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity" text,
  "payload" jsonb,
  "ip" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "platform_users_email_uidx" ON "platform_users" ("email");
CREATE UNIQUE INDEX "tenant_users_tenant_email_uidx" ON "tenant_users" ("tenant_id", "email");
CREATE INDEX "tenant_users_tenant_idx" ON "tenant_users" ("tenant_id");
CREATE INDEX "tenants_status_idx" ON "tenants" ("status");
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" ("scope", "user_id");
CREATE INDEX "leads_created_idx" ON "leads" ("created_at");
CREATE INDEX "audit_log_tenant_idx" ON "audit_log" ("tenant_id");
CREATE INDEX "audit_log_created_idx" ON "audit_log" ("created_at");
