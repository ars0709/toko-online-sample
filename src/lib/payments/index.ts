import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";

export type PaymentIntent = {
  orderId: string;
  amount: number;
  currency: string;
};

export type PaymentIntentResult = {
  providerRef: string;
  /** URL the customer is redirected to in order to pay. */
  redirectUrl: string;
};

/**
 * PaymentProvider interface — swap MockProvider for Midtrans/Xendit/Stripe by
 * implementing this contract.
 */
export interface PaymentProvider {
  readonly name: string;
  createIntent(intent: PaymentIntent): Promise<PaymentIntentResult>;
}

class MockProvider implements PaymentProvider {
  readonly name = "mock";
  async createIntent(intent: PaymentIntent): Promise<PaymentIntentResult> {
    const providerRef = `mock_${intent.orderId.slice(0, 8)}_${Date.now()}`;
    // The mock pay page lets the user trigger success/failure webhooks.
    return {
      providerRef,
      redirectUrl: `/checkout/pay/${intent.orderId}`,
    };
  }
}

export const paymentProvider: PaymentProvider = new MockProvider();

// --- Webhook signature helpers (HMAC-SHA256 + timestamp anti-replay) ---
export function signWebhook(payload: string, timestamp: string) {
  return createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
}

export function verifyWebhook(payload: string, timestamp: string, signature: string): boolean {
  // reject replays older than 5 minutes
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) return false;
  const expected = signWebhook(payload, timestamp);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
