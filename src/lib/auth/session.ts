import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { signToken, verifyToken } from "./jwt";

export const SESSION_COOKIE = "toko_session";
const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "ADMIN";
};

export async function createSession(user: SessionUser) {
  const token = await signToken(
    { sub: user.id, email: user.email, role: user.role },
    "session",
    SESSION_TTL,
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.APP_URL.startsWith("https"),
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Returns the logged-in user (fresh from DB) or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    if (payload.type !== "session") return null;
    const row = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!row) return null;
    return { id: row.id, email: row.email, name: row.name, role: row.role };
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("FORBIDDEN");
  return user;
}
