import { and, eq } from "drizzle-orm";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { db } from "@/lib/db";
import { webhookEndpoints } from "@/lib/db/schema";
import { sendTestDelivery } from "@/server/services/webhooks";

export const POST = withApi<{ id: string }>(
  async (_req, { user, params }) => {
    const endpoint = await db.query.webhookEndpoints.findFirst({
      where: and(eq(webhookEndpoints.id, params.id), eq(webhookEndpoints.ownerUserId, user!.userId)),
    });
    if (!endpoint) return apiError("not_found", "Webhook endpoint not found", 404);

    // Real outbound HTTP delivery (HMAC-signed); records a webhook_deliveries row.
    const delivered = await sendTestDelivery({
      id: endpoint.id,
      url: endpoint.url,
      secret: endpoint.secret,
    });

    return apiOk({
      endpointId: endpoint.id,
      event: "ping.test",
      delivered,
      status: delivered ? "SENT" : "FAILED",
    });
  },
  { auth: "jwt" },
);

export { OPTIONS };
