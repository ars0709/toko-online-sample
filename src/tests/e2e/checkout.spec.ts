import { test, expect } from "@playwright/test";

/**
 * Happy-path e2e: register → browse → add to cart → checkout → mock pay → order PAID.
 * Runs against the running app (PM2/dev) on baseURL. A unique email per run avoids
 * "email already taken".
 */
test("browse → add to cart → checkout → pay → order confirmed", async ({ page }) => {
  const email = `e2e_${Date.now()}@demo.test`;

  // --- Register a fresh account ---
  await page.goto("/register");
  await page.getByPlaceholder("Nama lengkap").fill("E2E Tester");
  await page.getByPlaceholder("email@contoh.com").fill(email);
  await page.getByPlaceholder("••••••••").fill("E2ePass123!");
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL("**/account");

  // --- Browse to a product ---
  await page.goto("/products");
  await page.locator('a[href^="/products/"]').first().click();
  await page.waitForURL("**/products/**");

  // --- Add to cart ---
  await page.getByRole("button", { name: /Tambah ke Keranjang/i }).click();
  await expect(page.getByText("Ditambahkan ke keranjang")).toBeVisible();

  // --- Go to cart and proceed to checkout ---
  await page.goto("/cart");
  await page.getByRole("link", { name: /Lanjut ke Checkout/i }).click();
  await page.waitForURL("**/checkout");

  // --- Fill a new shipping address (new account has none saved) ---
  await page.locator('input[name="recipient"]').fill("E2E Tester");
  await page.locator('input[name="phone"]').fill("081200000000");
  await page.locator('input[name="postalCode"]').fill("40111");
  await page.locator('input[name="line1"]').fill("Jl. Testing No. 1");
  await page.locator('input[name="city"]').fill("Bandung");
  await page.locator('input[name="province"]').fill("Jawa Barat");

  // --- Place the order ---
  await page.getByRole("button", { name: /Buat Pesanan/i }).click();
  await page.waitForURL("**/checkout/pay/**");

  // --- Mock pay: success ---
  await page.getByRole("button", { name: "Bayar Berhasil" }).click();
  await page.waitForURL("**/orders/**");

  // --- Assert order is paid ---
  await expect(
    page.getByText("Pembayaran berhasil! Pesanan Anda sedang kami siapkan."),
  ).toBeVisible();
  // Order number badge present on the confirmation page
  await expect(page.getByText(/ORD-/)).toBeVisible();
});
