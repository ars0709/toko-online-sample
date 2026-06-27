import { describe, it, expect } from "vitest";
import { computeTotals } from "@/server/services/pricing";

/**
 * Integration-ish tests against the seeded DB (docker compose + db:seed).
 * Verifies PPN (11%), flat shipping, free-shipping threshold, and the seeded
 * automatic promotions (FREE_SHIPPING >= 300k, CART_PERCENT 5% >= 500k).
 */
describe("pricing.computeTotals", () => {
  it("applies flat shipping + 11% tax below free-shipping threshold", async () => {
    const t = await computeTotals([{ variantId: "x", quantity: 2, unitPrice: 100_000 }]);
    expect(t.subtotal).toBe(200_000);
    expect(t.freeShipping).toBe(false);
    expect(t.shippingTotal).toBe(20_000);
    expect(t.taxTotal).toBe(22_000); // round(200000 * 0.11)
    expect(t.grandTotal).toBe(242_000);
  });

  it("gives free shipping + 5% auto discount on large carts", async () => {
    const t = await computeTotals([{ variantId: "x", quantity: 1, unitPrice: 600_000 }]);
    expect(t.subtotal).toBe(600_000);
    expect(t.freeShipping).toBe(true);
    expect(t.shippingTotal).toBe(0);
    expect(t.discountTotal).toBe(30_000); // 5% of 600k
    expect(t.taxTotal).toBe(62_700); // round((600000 - 30000) * 0.11)
    expect(t.grandTotal).toBe(632_700);
  });

  it("returns zeros for an empty cart", async () => {
    const t = await computeTotals([]);
    expect(t.subtotal).toBe(0);
    expect(t.shippingTotal).toBe(0);
    expect(t.grandTotal).toBe(0);
  });
});
