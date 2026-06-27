import type { NextRequest } from "next/server";
import { withApi, OPTIONS } from "@/lib/api/handler";
import { apiOk, apiError } from "@/lib/api/response";
import { verifyWebhook } from "@/lib/payments";
import { processPaymentResult } from "@/server/services/payment";

export const POST = withApi(
  async (req: NextRequest) => {
    const raw = await req.text();
    const signature = req.headers.get("x-signature") ?? "";
    const timestamp = req.headers.get("x-timestamp") ?? "";

    if (!verifyWebhook(raw, timestamp, signature)) {
      return apiError("invalid_signature", "Webhook signature verification failed", 400);
    }

    let body: { orderId?: string; result?: string; method?: string };
    try {
      body = JSON.parse(raw);
    } catch {
      return apiError("invalid_payload", "Invalid JSON payload", 400);
    }

    if (!body.orderId || (body.result !== "PAID" && body.result !== "FAILED")) {
      return apiError("invalid_payload", "orderId and result (PAID|FAILED) are required", 400);
    }

    await processPaymentResult(body.orderId, body.result, body.method);
    return apiOk({ received: true });
  },
  { auth: "none" },
);

export { OPTIONS };
