import { redis } from "../redis";
import { env } from "../env";

/**
 * Refresh-token allowlist with rotation. A refresh token is valid only while its
 * jti is present in Redis; rotating or logging out removes it (revocation).
 */
const prefix = "refresh:";

export async function storeRefresh(jti: string, userId: string) {
  await redis.set(`${prefix}${jti}`, userId, "EX", env.JWT_REFRESH_TTL);
}

export async function isRefreshValid(jti: string, userId: string) {
  const v = await redis.get(`${prefix}${jti}`);
  return v === userId;
}

export async function revokeRefresh(jti: string) {
  await redis.del(`${prefix}${jti}`);
}
