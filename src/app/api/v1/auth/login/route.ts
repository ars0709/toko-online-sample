import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { loginSchema } from "@/lib/validators";
import { authenticate, issueTokens, AuthError } from "@/server/services/auth";

export const POST = withApi(
  async (req: NextRequest) => {
    const parsed = loginSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    try {
      const user = await authenticate(parsed.data.email, parsed.data.password);
      const tokens = await issueTokens({ id: user.id, email: user.email, role: user.role });
      return apiOk(tokens);
    } catch (e) {
      if (e instanceof AuthError) return apiError("unauthorized", e.message, 401);
      throw e;
    }
  },
  { auth: "none", rateTier: "auth" },
);

export { OPTIONS };
