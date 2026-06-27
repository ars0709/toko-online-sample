import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";

const schema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default([]),
});

export const GET = withApi(
  async (_req, { user }) => {
    const rows = await db
      .select({
        id: webhookEndpoints.id,
        url: webhookEndpoints.url,
        events: webhookEndpoints.events,
        isActive: webhookEndpoints.isActive,
        lastDeliveryStatus: webhookEndpoints.lastDeliveryStatus,
        createdAt: webhookEndpoints.createdAt,
      })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.ownerUserId, user!.userId))
      .orderBy(desc(webhookEndpoints.createdAt));
    return apiOk(rows);
  },
  { auth: "jwt" },
);

export const POST = withApi(
  async (req: NextRequest, { user }) => {
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return apiError("validation_error", "Invalid input", 400, parsed.error.flatten());
    }
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const [row] = await db
      .insert(webhookEndpoints)
      .values({
        ownerUserId: user!.userId,
        url: parsed.data.url,
        secret,
        events: parsed.data.events,
      })
      .returning();
    // Secret is shown once on creation so the developer can verify signatures.
    return apiOk(
      {
        id: row.id,
        url: row.url,
        events: row.events,
        isActive: row.isActive,
        secret,
      },
      undefined,
      { status: 201 },
    );
  },
  { auth: "jwt" },
);

export { OPTIONS };
