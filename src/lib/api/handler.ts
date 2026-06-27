import { NextRequest, NextResponse } from "next/server";
import { rateLimit, RATE_TIERS } from "@/lib/ratelimit";
import { apiError, corsHeaders, withHeaders } from "./response";
import {
  authenticateApiKey,
  authenticateJwt,
  hasScope,
  type ApiKeyRow,
  type JwtContext,
} from "./auth";

export type AuthMode = "none" | "optional" | "jwt" | "apikey";

export type ApiContext<P = Record<string, string>> = {
  user?: JwtContext;
  apiKey?: ApiKeyRow;
  params: P;
};

export type ApiHandler<P = Record<string, string>> = (
  req: NextRequest,
  ctx: ApiContext<P>,
) => Promise<NextResponse> | NextResponse;

export type WithApiOptions = {
  auth?: AuthMode;
  scope?: string;
  rateTier?: keyof typeof RATE_TIERS;
};

// Next 16 passes the second argument with params as a Promise.
type RouteSegment<P> = { params: Promise<P> };

/** First-hop client IP from x-forwarded-for, falling back to "anon". */
function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || "anon";
  return req.headers.get("x-real-ip")?.trim() || "anon";
}

/**
 * Wrap a route handler with CORS, rate limiting, auth and error handling.
 * Works directly as a Next.js route handler export.
 */
export function withApi<P = Record<string, string>>(
  handler: ApiHandler<P>,
  opts: WithApiOptions = {},
) {
  const auth: AuthMode = opts.auth ?? "none";

  return async (req: NextRequest, segment?: RouteSegment<P>): Promise<NextResponse> => {
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin);

    try {
      // --- Auth resolution ---
      let apiKey: ApiKeyRow | null = null;
      let user: JwtContext | null = null;

      if (auth === "apikey" || auth === "optional") {
        apiKey = await authenticateApiKey(req);
      }
      if (auth === "jwt" || auth === "optional") {
        user = await authenticateJwt(req);
      }

      // --- Rate limiting (by api key id, else client IP) ---
      const tierName = opts.rateTier ?? "default";
      const tier = RATE_TIERS[tierName] ?? RATE_TIERS.default;
      const rlKey = apiKey ? `key:${apiKey.id}` : `ip:${clientIp(req)}`;
      const rl = await rateLimit(`${tierName}:${rlKey}`, tier.limit, tier.window);

      const rlHeaders: Record<string, string> = {
        ...cors,
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.reset),
      };

      if (!rl.ok) {
        return withHeaders(apiError("rate_limited", "Too many requests", 429), {
          ...rlHeaders,
          "Retry-After": String(rl.retryAfter),
        });
      }

      // --- Auth enforcement ---
      if (auth === "jwt" && !user) {
        return withHeaders(
          apiError("unauthorized", "A valid access token is required", 401),
          rlHeaders,
        );
      }
      if (auth === "apikey") {
        if (!apiKey) {
          return withHeaders(
            apiError("unauthorized", "A valid API key is required", 401),
            rlHeaders,
          );
        }
        if (opts.scope && !hasScope(apiKey, opts.scope)) {
          return withHeaders(
            apiError("insufficient_scope", `Missing required scope: ${opts.scope}`, 403, {
              required: opts.scope,
            }),
            rlHeaders,
          );
        }
      }

      // --- Resolve params (Next 16: Promise) ---
      const params = ((await segment?.params) ?? {}) as P;

      const ctx: ApiContext<P> = {
        params,
        ...(user ? { user } : {}),
        ...(apiKey ? { apiKey } : {}),
      };

      const res = await handler(req, ctx);
      return withHeaders(res, rlHeaders);
    } catch (err) {
      console.error("[api] unhandled error:", err);
      return withHeaders(apiError("internal_error", "Something went wrong", 500), cors);
    }
  };
}

/** Shared CORS preflight handler — re-export as `OPTIONS` from any route. */
export function OPTIONS(req: NextRequest): NextResponse {
  return withHeaders(new NextResponse(null, { status: 204 }), corsHeaders(req.headers.get("origin")));
}
