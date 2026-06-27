# Toko Online Sample 🛒

E-commerce contoh **production-ready** end-to-end: Next.js 16 (App Router) + React 19 + TypeScript strict, PostgreSQL 16 + Drizzle ORM, Redis, REST API publik yang aman + dokumentasi OpenAPI.

> Live demo: **https://toko.skyleticalabs.online** · API docs: **/api-docs**

## ✨ Fitur

- **Storefront**: home (hero, kategori, flash sale, produk terbaru), katalog dengan filter/sort/search (full-text Postgres) + pagination keyset, halaman produk (galeri, varian, stok real-time, ulasan), keranjang, checkout, pembayaran (mock gateway dengan webhook ber-signature), konfirmasi & tracking pesanan.
- **Akun pelanggan**: register/login (session httpOnly), profil, alamat (CRUD + default), riwayat & detail pesanan, tulis ulasan (verified purchase).
- **Admin panel** (RBAC): dashboard metrik, CRUD produk + varian + stok, kelola pesanan (ubah status, input resi, refund mock), CRUD kupon, moderasi ulasan, oversight API key. Semua mutasi tercatat di `audit_logs`.
- **Promo**: kupon manual (per-user limit, first-order-only, channel public/private), promo otomatis (gratis ongkir threshold, diskon cart), flash sale aktif.
- **Developer portal** (`/developer`): buat API key self-service (plaintext tampil sekali), pilih scope, revoke & roll, lihat usage.
- **Public REST API** `/api/v1/**`: JWT (pelanggan) + API key dengan scopes (mesin/B2B), rate limit (Redis), envelope konsisten, idempotency, OpenAPI 3.1 di `/api-docs`.
- **Keamanan**: password hash (bcrypt), JWT + refresh rotation/revocation (Redis), RBAC + ownership check (anti-IDOR), validasi Zod di semua boundary, rate limiting, security headers (CSP/HSTS/dll), webhook HMAC + anti-replay, API key disimpan sebagai hash SHA-256.

## 🏗️ Arsitektur

Layered: **Route/Server Action → Service (use-case) → Repository (Drizzle)**. UI dan API publik memanggil *service layer* yang sama (`src/server/services/*`) — tidak ada duplikasi business logic.

```
src/
  app/
    (storefront)/   home, products, cart, checkout, orders, promo, blog, p/[slug], login, register
    (account)/      account/*, developer/*
    (admin)/        admin/*  (RBAC)
    api/v1/         REST API (route handlers)
    api-docs/       Scalar UI → /api/v1/openapi.json
  lib/
    db/             drizzle client, schema, migrations, migrate, seed
    auth/           password, jwt, session, api-key, refresh-store
    api/            response envelope, auth/scope middleware, rate limit, openapi
    payments/       PaymentProvider interface + MockProvider (HMAC webhook)
    validators/     zod schemas (shared FE/BE/API)
  server/
    services/       catalog, cart, pricing, checkout, payment, orders, auth
    actions/        server actions (cart, auth, checkout, payment, account, admin, developer)
  components/       ui primitives (shadcn-style) + domain components
```

> **Keputusan teknis** (semua `[ASUMSI]` diambil sebagai default production-grade):
> - **Auth**: alih-alih NextAuth/Auth.js, dipakai *custom credentials + JWT/session* (cookie httpOnly) agar satu mekanisme token dipakai web maupun API. Ganti di `src/lib/auth/*` bila ingin SSO/Keycloak.
> - **Cart**: disimpan di **PostgreSQL** (`carts`/`cart_items`) dengan `cart_token` cookie httpOnly (di-merge saat login), bukan Redis — agar checkout transaksional & row-locking konsisten. Redis dipakai untuk rate limit + refresh-token revocation + idempotency.
> - **Uang**: integer rupiah (IDR), PPN 11%, ongkir flat + gratis di atas Rp300.000 (lihat `.env`).
> - **Next.js 16 / React 19** (versi terbaru saat dibuat; prompt menyebut Next 15).

## 🚀 Menjalankan

```bash
pnpm install
docker compose up -d          # Postgres (host :5434) + Redis (host :6380)
cp .env.example .env          # sesuaikan bila perlu
pnpm db:migrate               # jalankan migrations
pnpm db:seed                  # data demo (cetak API key TEST sekali)
pnpm dev                      # http://localhost:3000
```

Produksi: `pnpm build && pnpm start` (PORT dari `.env`, default 3000).

## 🔑 Kredensial demo (dari seed)

| Peran | Email | Password |
|------|-------|----------|
| Admin | `admin@demo.test` | `Admin123!` |
| Customer | `user@demo.test` | `User123!` |
| Developer | `dev@demo.test` | `Dev123!` |

API key TEST untuk developer dicetak **sekali** di output `pnpm db:seed` (format `sk_test_...`). Buat key baru kapan saja di `/developer`.

## 📡 Public API (ringkas)

Base: `/api/v1`. Dokumentasi interaktif: **`/api-docs`** (spec: `/api/v1/openapi.json`).

| Grup | Endpoint |
|------|----------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Catalog | `GET /products`, `/products/{slug}`, `/categories`, `/products/{slug}/reviews` |
| Cart (JWT) | `GET /cart`, `POST /cart/items`, `PATCH/DELETE /cart/items/{id}`, `POST /cart/coupon` |
| Orders (JWT) | `POST /orders` (Idempotency-Key), `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel` |
| Payment | `POST /payments/{orderId}/intent`, `POST /payments/webhook` (HMAC) |
| Inventory (key `catalog:read`) | `GET /inventory/{sku}` |
| Promo/Content | `GET /promotions/active`, `/coupons/validate`, `/banners`, `/pages/{slug}`, `/blog`, `/blog/{slug}` |
| Developer (JWT) | `GET/POST /developer/keys`, `DELETE /developer/keys/{id}`, `POST /developer/keys/{id}/roll`, `GET /developer/usage` |

### Contoh

```bash
# Login → akses token
curl -s -X POST https://toko.skyleticalabs.online/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"user@demo.test","password":"User123!"}'

# Katalog dengan API key (header X-API-Key atau Authorization: Bearer sk_...)
curl -s https://toko.skyleticalabs.online/api/v1/products -H 'X-API-Key: sk_test_xxx'
```

### Verifikasi signature webhook (partner)

```
X-Signature = HMAC_SHA256(secret, `${X-Timestamp}.${rawBody}`)
```
Tolak bila timestamp lebih dari 5 menit (anti-replay). Lihat `src/lib/payments/index.ts`.

## 🧪 Skrip

| Skrip | Fungsi |
|-------|--------|
| `pnpm dev` / `build` / `start` | jalankan app |
| `pnpm db:generate` | generate migration dari schema |
| `pnpm db:migrate` | terapkan migrations + index FTS |
| `pnpm db:seed` | isi data demo |
| `pnpm db:studio` | Drizzle Studio |
| `pnpm test` | unit test (Vitest) — pricing & cart service |
| `pnpm test:e2e` | e2e happy-path (Playwright): browse → cart → checkout → bayar → order |

> **Webhook outbound**: pengiriman event (`order.paid`, `order.shipped`, `order.delivered`, `order.cancelled`, `order.refunded`, `payment.failed`) ke `webhook_endpoints` aktif dikirim **nyata via HTTP** (HMAC-signed, retry + dicatat di `webhook_deliveries`). Lihat `src/server/services/webhooks.ts`.
> **Admin konten & promo**: kelola banner, halaman CMS, blog, FAQ, site settings, promo otomatis, dan flash sale di `/admin/content` & `/admin/promotions` — semua langsung tampil di storefront.

## ⚙️ Environment

Lihat `.env.example` (DATABASE_URL, REDIS_URL, AUTH_SECRET, JWT_SECRET, PAYMENT_WEBHOOK_SECRET, TAX_RATE, SHIPPING_FLAT, FREE_SHIPPING_THRESHOLD, API_CORS_ORIGINS, APP_URL, PORT).

## 📦 Deploy

Di-serve via PM2 (`ecosystem.config.js`) dan diekspos ke `toko.skyleticalabs.online` lewat Cloudflare Tunnel (`mytunnel`). Lihat bagian Deploy di bawah / `ecosystem.config.js`.
