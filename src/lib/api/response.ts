import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export type ApiMeta = Record<string, unknown>;

/** Success envelope: `{ data, meta? }`. */
export function apiOk<T>(data: T, meta?: ApiMeta, init?: ResponseInit) {
  const body = meta ? { data, meta } : { data };
  return NextResponse.json(body, init);
}

/** Error envelope: `{ error: { code, message, details? } }`. */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

/**
 * Resolve CORS headers for a request origin against `env.API_CORS_ORIGINS`
 * (a comma-separated allowlist, or `*` for any origin).
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  const configured = env.API_CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  const allowAll = configured.includes("*") || configured.length === 0;

  let allowOrigin = "*";
  if (!allowAll) {
    allowOrigin = origin && configured.includes(origin) ? origin : configured[0];
  } else if (origin) {
    // Echo back the caller origin so credentialed requests still work.
    allowOrigin = origin;
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-API-Key, X-Signature, X-Timestamp, Idempotency-Key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Merge a set of headers into an existing NextResponse. */
export function withHeaders(res: NextResponse, headers: Record<string, string>) {
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}
