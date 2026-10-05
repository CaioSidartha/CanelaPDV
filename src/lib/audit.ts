import { auditLog } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db/index";
import type { SessionScope } from "@/lib/auth/constants";

export async function writeAudit(input: {
  scope: SessionScope;
  actorId?: string;
  tenantId?: string;
  action: string;
  entity?: string;
  payload?: Record<string, unknown>;
  ip?: string;
}) {
  if (!isDatabaseConfigured()) return;
  try {
    const db = getDb();
    await db.insert(auditLog).values({
      scope: input.scope,
      actorId: input.actorId ?? null,
      tenantId: input.tenantId ?? null,
      action: input.action,
      entity: input.entity,
      payload: input.payload ?? null,
      ip: input.ip,
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
