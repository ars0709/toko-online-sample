import "server-only";
import { createHmac } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookDeliveries, webhookEndpoints } from "@/lib/db/schema";

export type WebhookEvent =
  | "order.paid"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.refunded"
  | "payment.failed";

function sign(secret: string, timestamp: string, body: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

async function deliver(
  endpoint: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>,
  attempt: number,
): Promise<boolean> {
  const body = JSON.stringify({ event, data: payload, sentAt: new Date().toISOString() });
  const ts = String(Date.now());
  const signature = sign(endpoint.secret, ts, body);

  let status = "FAILED";
  let responseCode: number | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Webhook-Event": event,
        "X-Timestamp": ts,
        "X-Signature": signature,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    responseCode = res.status;
    status = res.ok ? "SENT" : "FAILED";
  } catch {
    status = "FAILED";
  }

  await db.insert(webhookDeliveries).values({
    endpointId: endpoint.id,
    event,
    payload,
    status,
    attempts: attempt,
    responseCode: responseCode ?? undefined,
    nextRetryAt: status === "SENT" ? null : new Date(Date.now() + attempt * 60_000),
  });
  await db
    .update(webhookEndpoints)
    .set({ lastDeliveryStatus: status })
    .where(eq(webhookEndpoints.id, endpoint.id));

  return status === "SENT";
}

/**
 * Dispatch an event to every active endpoint subscribed to it. Best-effort with
 * up to 3 inline attempts + backoff; failures are recorded with a nextRetryAt so
 * a future worker could retry. Call with `void` so it never blocks the request.
 */
export async function dispatchEvent(event: WebhookEvent, payload: Record<string, unknown>) {
  try {
    const endpoints = await db
      .select()
      .from(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.isActive, true),
          sql`${webhookEndpoints.events} @> ${JSON.stringify([event])}::jsonb`,
        ),
      );

    await Promise.all(
      endpoints.map(async (ep) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const ok = await deliver(ep, event, payload, attempt);
          if (ok) break;
          await new Promise((r) => setTimeout(r, attempt * 500));
        }
      }),
    );
  } catch {
    /* never throw from a fire-and-forget dispatch */
  }
}

/** Send a single test delivery to one endpoint and return whether it succeeded. */
export async function sendTestDelivery(endpoint: { id: string; url: string; secret: string }) {
  return deliver(
    endpoint,
    "ping.test",
    { message: "Test webhook delivery", at: new Date().toISOString() },
    1,
  );
}
