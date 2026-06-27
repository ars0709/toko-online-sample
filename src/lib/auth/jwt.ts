import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type TokenPayload = {
  sub: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  type: "access" | "refresh" | "session";
};

export async function signToken(
  payload: Omit<TokenPayload, "type">,
  type: TokenPayload["type"],
  ttlSeconds: number,
) {
  return new SignJWT({ ...payload, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .setJti(crypto.randomUUID())
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload & { jti?: string }> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as TokenPayload & { jti?: string };
}
