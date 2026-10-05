export const ACCESS_COOKIE = "canela_at";
export const REFRESH_COOKIE = "canela_rt";

export const ACCESS_TTL_SEC = 15 * 60;
export const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

export type SessionScope = "platform" | "tenant";

export type AccessTokenPayload = {
  sub: string;
  scope: SessionScope;
  email: string;
  name: string;
  tenantId?: string;
  role?: string;
};
