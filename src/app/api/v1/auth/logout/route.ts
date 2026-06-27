import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { logoutRefresh } from "@/server/services/auth";

const schema = z.object({ refreshToken: z.string().min(1) });

export const POST = withApi(
  async (req: NextRequest) => {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return apiError("validation_error", "refreshToken is required", 400);
    await logoutRefresh(parsed.data.refreshToken);
    return apiOk({ success: true });
  },
  { auth: "none", rateTier: "auth" },
);

export { OPTIONS };
