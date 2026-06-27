import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signToken, verifyToken } from "@/lib/auth/jwt";
import { env } from "@/lib/env";
import { isRefreshValid, revokeRefresh, storeRefresh } from "@/lib/auth/refresh-store";

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) throw new AuthError("EMAIL_TAKEN", "Email sudah terdaftar");
  const [user] = await db
    .insert(users)
    .values({
      email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      role: "CUSTOMER",
    })
    .returning();
  return user;
}

export async function authenticate(email: string, password: string) {
  const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  if (!user) throw new AuthError("INVALID_CREDENTIALS", "Email atau password salah");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new AuthError("INVALID_CREDENTIALS", "Email atau password salah");
  return user;
}

export async function issueTokens(user: { id: string; email: string; role: "CUSTOMER" | "ADMIN" }) {
  const access = await signToken(
    { sub: user.id, email: user.email, role: user.role },
    "access",
    env.JWT_ACCESS_TTL,
  );
  const refresh = await signToken(
    { sub: user.id, email: user.email, role: user.role },
    "refresh",
    env.JWT_REFRESH_TTL,
  );
  const payload = await verifyToken(refresh);
  if (payload.jti) await storeRefresh(payload.jti, user.id);
  return {
    accessToken: access,
    refreshToken: refresh,
    tokenType: "Bearer" as const,
    expiresIn: env.JWT_ACCESS_TTL,
  };
}

export async function rotateRefresh(refreshToken: string) {
  let payload;
  try {
    payload = await verifyToken(refreshToken);
  } catch {
    throw new AuthError("INVALID_TOKEN", "Refresh token tidak valid");
  }
  if (payload.type !== "refresh" || !payload.jti)
    throw new AuthError("INVALID_TOKEN", "Bukan refresh token");
  if (!(await isRefreshValid(payload.jti, payload.sub)))
    throw new AuthError("REVOKED", "Refresh token sudah dicabut");
  await revokeRefresh(payload.jti); // rotation
  return issueTokens({ id: payload.sub, email: payload.email, role: payload.role });
}

export async function logoutRefresh(refreshToken: string) {
  try {
    const payload = await verifyToken(refreshToken);
    if (payload.jti) await revokeRefresh(payload.jti);
  } catch {
    /* ignore */
  }
}
