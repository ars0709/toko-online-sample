import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";

export const POST = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, params.id), eq(webhookEndpoints.ownerUserId, user!.userId)),
    });
    if (!endpoint) return apiError("not_found", "Webhook endpoint not found", 404);

    // NOTE: actual outbound HTTP delivery is stubbed; we record the attempt only.
    const [delivery] = await db
      .insert(webhookDeliveries)
      .values({
        endpointId: endpoint.id,
        event: "ping.test",
        payload: { message: "This is a test webhook delivery", at: new Date().toISOString() },
        status: "SENT",
        attempts: 1,
        responseCode: 200,
      })
      .returning();

    await db
      .update(webhookEndpoints)
      .set({ lastDeliveryStatus: "SENT" })
      .where(eq(webhookEndpoints.id, endpoint.id));

    return apiOk({
      id: delivery.id,
      endpointId: delivery.endpointId,
      event: delivery.event,
      status: delivery.status,
      stubbed: true,
    });
  },
  { auth: "jwt" },
);

export { OPTIONS };
