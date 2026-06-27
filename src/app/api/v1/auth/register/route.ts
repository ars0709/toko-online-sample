import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { registerSchema } from "@/lib/validators";
import { registerUser, issueTokens, AuthError } from "@/server/services/auth";

export const POST = withApi(
  async (req: NextRequest) => {
    const parsed = registerSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    try {
      const user = await registerUser(parsed.data);
      const tokens = await issueTokens({ id: user.id, email: user.email, role: user.role });
      return apiOk(tokens, undefined, { status: 201 });
    } catch (e) {
      if (e instanceof AuthError) return apiError(e.code.toLowerCase(), e.message, 409);
      throw e;
    }
  },
  { auth: "none", rateTier: "auth" },
);

export { OPTIONS };
