import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { env } from "@/lib/env";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ---------------------------------------------------------------------------
// Security schemes
// ---------------------------------------------------------------------------
const bearerAuth = registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description: "JWT access token issued by /auth/login or /auth/register.",
});

const apiKeyAuth = registry.registerComponent("securitySchemes", "apiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "X-API-Key",
  description: "Developer API key (sk_live_… / sk_test_…).",
});

// ---------------------------------------------------------------------------
// Reusable schemas
// ---------------------------------------------------------------------------
const ErrorSchema = registry.register(
  "Error",
  z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  }),
);

const TokensSchema = registry.register(
  "Tokens",
  z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    tokenType: z.literal("Bearer"),
    expiresIn: z.number().int(),
  }),
);

const RegisterInput = registry.register(
  "RegisterInput",
  z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  }),
);

const LoginInput = registry.register(
  "LoginInput",
  z.object({ email: z.string().email(), password: z.string().min(1) }),
);

const RefreshInput = registry.register(
  "RefreshInput",
  z.object({ refreshToken: z.string() }),
);

const ProductSummary = registry.register(
  "ProductSummary",
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    brand: z.string().nullable(),
    basePrice: z.number().int().describe("Integer rupiah"),
    currency: z.string(),
    ratingAvg: z.number().int().describe("Rating x10 (45 = 4.5)"),
    ratingCount: z.number().int(),
    image: z.string().nullable(),
  }),
);

const Category = registry.register(
  "Category",
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    parentId: z.string().nullable(),
    imageUrl: z.string().nullable(),
  }),
);

const AddToCartInput = registry.register(
  "AddToCartInput",
  z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(99) }),
);

const UpdateCartItemInput = registry.register(
  "UpdateCartItemInput",
  z.object({ quantity: z.number().int().min(0).max(99) }),
);

const CouponInput = registry.register(
  "CouponInput",
  z.object({ code: z.string().nullable() }),
);

const PlaceOrderInput = registry.register(
  "PlaceOrderInput",
  z.object({
    addressId: z.string().uuid().optional(),
    couponCode: z.string().optional(),
  }),
);

const CreateApiKeyInput = registry.register(
  "CreateApiKeyInput",
  z.object({
    label: z.string().min(1).max(80),
    environment: z.enum(["TEST", "LIVE"]).default("TEST"),
    scopes: z.array(z.string()).default(["catalog:read"]),
  }),
);

const CreateWebhookInput = registry.register(
  "CreateWebhookInput",
  z.object({
    url: z.string().url(),
    events: z.array(z.string()).default([]),
  }),
);

// Generic data envelope helper
const ok = (schema: z.ZodTypeAny, description = "Success") => ({
  [200]: { description, content: { "application/json": { schema: z.object({ data: schema }) } } },
});

const errorResponse = (status: number, description: string) => ({
  [status]: { description, content: { "application/json": { schema: ErrorSchema } } },
});

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
// Auth
registry.registerPath({
  method: "post",
  path: "/auth/register",
  tags: ["Auth"],
  summary: "Register a new customer and receive tokens",
  request: { body: { content: { "application/json": { schema: RegisterInput } } } },
  responses: { ...ok(TokensSchema, "Created"), ...errorResponse(400, "Validation error") },
});

registry.registerPath({
  method: "post",
  path: "/auth/login",
  tags: ["Auth"],
  summary: "Authenticate and receive tokens",
  request: { body: { content: { "application/json": { schema: LoginInput } } } },
  responses: { ...ok(TokensSchema), ...errorResponse(401, "Invalid credentials") },
});

registry.registerPath({
  method: "post",
  path: "/auth/refresh",
  tags: ["Auth"],
  summary: "Rotate a refresh token",
  request: { body: { content: { "application/json": { schema: RefreshInput } } } },
  responses: { ...ok(TokensSchema), ...errorResponse(401, "Invalid token") },
});

registry.registerPath({
  method: "post",
  path: "/auth/logout",
  tags: ["Auth"],
  summary: "Revoke a refresh token",
  request: { body: { content: { "application/json": { schema: RefreshInput } } } },
  responses: ok(z.object({ success: z.boolean() })),
});

// Catalog
registry.registerPath({
  method: "get",
  path: "/products",
  tags: ["Catalog"],
  summary: "List active products (keyset paginated)",
  request: {
    query: z.object({
      search: z.string().optional(),
      category: z.string().optional(),
      brand: z.string().optional(),
      minPrice: z.coerce.number().optional(),
      maxPrice: z.coerce.number().optional(),
      sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).optional(),
      cursor: z.string().optional(),
      limit: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            data: z.array(ProductSummary),
            meta: z.object({ nextCursor: z.string().nullable(), hasMore: z.boolean() }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/products/{slug}",
  tags: ["Catalog"],
  summary: "Get a product by slug",
  request: { params: z.object({ slug: z.string() }) },
  responses: { ...ok(z.object({}).passthrough()), ...errorResponse(404, "Not found") },
});

registry.registerPath({
  method: "get",
  path: "/products/{slug}/reviews",
  tags: ["Catalog"],
  summary: "List published reviews for a product",
  request: { params: z.object({ slug: z.string() }) },
  responses: ok(z.array(z.object({}).passthrough())),
});

registry.registerPath({
  method: "get",
  path: "/categories",
  tags: ["Catalog"],
  summary: "List categories",
  responses: ok(z.array(Category)),
});

registry.registerPath({
  method: "get",
  path: "/inventory/{sku}",
  tags: ["Catalog"],
  summary: "Effective stock for a SKU",
  security: [{ [apiKeyAuth.name]: [] }],
  request: { params: z.object({ sku: z.string() }) },
  responses: {
    ...ok(
      z.object({
        sku: z.string(),
        variantId: z.string(),
        onHand: z.number().int(),
        reserved: z.number().int(),
        available: z.number().int(),
      }),
    ),
    ...errorResponse(404, "Not found"),
  },
});

// Cart
registry.registerPath({
  method: "get",
  path: "/cart",
  tags: ["Cart"],
  summary: "Get the current user's cart",
  security: [{ [bearerAuth.name]: [] }],
  responses: ok(z.object({}).passthrough()),
});

registry.registerPath({
  method: "post",
  path: "/cart/items",
  tags: ["Cart"],
  summary: "Add an item to the cart",
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { "application/json": { schema: AddToCartInput } } } },
  responses: ok(z.object({}).passthrough()),
});

registry.registerPath({
  method: "patch",
  path: "/cart/items/{id}",
  tags: ["Cart"],
  summary: "Update cart item quantity",
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateCartItemInput } } },
  },
  responses: ok(z.object({}).passthrough()),
});

registry.registerPath({
  method: "delete",
  path: "/cart/items/{id}",
  tags: ["Cart"],
  summary: "Remove a cart item",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: ok(z.object({}).passthrough()),
});

registry.registerPath({
  method: "post",
  path: "/cart/coupon",
  tags: ["Cart"],
  summary: "Apply or clear a coupon on the cart",
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { "application/json": { schema: CouponInput } } } },
  responses: ok(z.object({}).passthrough()),
});

// Orders
registry.registerPath({
  method: "post",
  path: "/orders",
  tags: ["Orders"],
  summary: "Place an order from the current cart",
  security: [{ [bearerAuth.name]: [] }],
  request: { body: { content: { "application/json": { schema: PlaceOrderInput } } } },
  responses: { ...ok(z.object({}).passthrough(), "Created"), ...errorResponse(422, "Checkout error") },
});

registry.registerPath({
  method: "get",
  path: "/orders",
  tags: ["Orders"],
  summary: "List the current user's orders",
  security: [{ [bearerAuth.name]: [] }],
  responses: ok(z.array(z.object({}).passthrough())),
});

registry.registerPath({
  method: "get",
  path: "/orders/{id}",
  tags: ["Orders"],
  summary: "Get a single order",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: { ...ok(z.object({}).passthrough()), ...errorResponse(404, "Not found") },
});

registry.registerPath({
  method: "post",
  path: "/orders/{id}/cancel",
  tags: ["Orders"],
  summary: "Cancel a pending order",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string() }) },
  responses: ok(z.object({}).passthrough()),
});

// Payment
registry.registerPath({
  method: "post",
  path: "/payments/{orderId}/intent",
  tags: ["Payment"],
  summary: "Get the payment intent for an order",
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ orderId: z.string() }) },
  responses: { ...ok(z.object({}).passthrough()), ...errorResponse(404, "Not found") },
});

registry.registerPath({
  method: "post",
  path: "/payments/webhook",
  tags: ["Payment"],
  summary: "Payment provider webhook (HMAC signed)",
  request: {
    headers: z.object({
      "X-Signature": z.string(),
      "X-Timestamp": z.string(),
    }),
    body: { content: { "application/json": { schema: z.object({ orderId: z.string(), result: z.enum(["PAID", "FAILED"]) }) } } },
  },
  responses: { ...ok(z.object({ received: z.boolean() })), ...errorResponse(400, "Bad signature") },
});

// Content
registry.registerPath({
  method: "get",
  path: "/promotions/active",
  tags: ["Content"],
  summary: "List active promotions and flash sales",
  responses: ok(z.object({ promotions: z.array(z.object({}).passthrough()), flashSales: z.array(z.object({}).passthrough()) })),
});

registry.registerPath({
  method: "get",
  path: "/coupons/validate",
  tags: ["Content"],
  summary: "Validate a coupon code",
  request: { query: z.object({ code: z.string(), subtotal: z.coerce.number().optional() }) },
  responses: ok(z.object({}).passthrough()),
});

registry.registerPath({
  method: "get",
  path: "/banners",
  tags: ["Content"],
  summary: "List active banners",
  request: { query: z.object({ placement: z.string().optional() }) },
  responses: ok(z.array(z.object({}).passthrough())),
});

registry.registerPath({
  method: "get",
  path: "/pages/{slug}",
  tags: ["Content"],
  summary: "Get a published CMS page",
  request: { params: z.object({ slug: z.string() }) },
  responses: { ...ok(z.object({}).passthrough()), ...errorResponse(404, "Not found") },
});

registry.registerPath({
  method: "get",
  path: "/blog",
  tags: ["Content"],
  summary: "List published blog posts",
  request: { query: z.object({ tag: z.string().optional(), cursor: z.string().optional() }) },
  responses: ok(z.array(z.object({}).passthrough())),
});

registry.registerPath({
  method: "get",
  path: "/blog/{slug}",
  tags: ["Content"],
  summary: "Get a published blog post",
  request: { params: z.object({ slug: z.string() }) },
  responses: { ...ok(z.object({}).passthrough()), ...errorResponse(404, "Not found") },
});

// Developer
const devSecurity = [{ [bearerAuth.name]: [] }];
registry.registerPath({
  method: "get",
  path: "/developer/keys",
  tags: ["Developer"],
  summary: "List your API keys",
  security: devSecurity,
  responses: ok(z.array(z.object({}).passthrough())),
});
registry.registerPath({
  method: "post",
  path: "/developer/keys",
  tags: ["Developer"],
  summary: "Create an API key (plaintext returned once)",
  security: devSecurity,
  request: { body: { content: { "application/json": { schema: CreateApiKeyInput } } } },
  responses: ok(z.object({ key: z.string() }).passthrough(), "Created"),
});
registry.registerPath({
  method: "delete",
  path: "/developer/keys/{id}",
  tags: ["Developer"],
  summary: "Revoke an API key",
  security: devSecurity,
  request: { params: z.object({ id: z.string() }) },
  responses: ok(z.object({ success: z.boolean() })),
});
registry.registerPath({
  method: "post",
  path: "/developer/keys/{id}/roll",
  tags: ["Developer"],
  summary: "Roll an API key (revoke + create)",
  security: devSecurity,
  request: { params: z.object({ id: z.string() }) },
  responses: ok(z.object({ key: z.string() }).passthrough()),
});
registry.registerPath({
  method: "get",
  path: "/developer/usage",
  tags: ["Developer"],
  summary: "Aggregate API usage for your keys",
  security: devSecurity,
  responses: ok(z.object({}).passthrough()),
});
registry.registerPath({
  method: "post",
  path: "/developer/webhooks",
  tags: ["Developer"],
  summary: "Register a webhook endpoint",
  security: devSecurity,
  request: { body: { content: { "application/json": { schema: CreateWebhookInput } } } },
  responses: ok(z.object({}).passthrough(), "Created"),
});
registry.registerPath({
  method: "post",
  path: "/developer/webhooks/{id}/test",
  tags: ["Developer"],
  summary: "Send a test delivery to a webhook endpoint",
  security: devSecurity,
  request: { params: z.object({ id: z.string() }) },
  responses: ok(z.object({}).passthrough()),
});

// ---------------------------------------------------------------------------
// Document generation
// ---------------------------------------------------------------------------
export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Toko Online Public API",
      version: "1.0.0",
      description: "Public REST API (v1) for the Toko Online e-commerce platform.",
    },
    servers: [{ url: `${env.APP_URL}/api/v1` }],
    tags: [
      { name: "Auth" },
      { name: "Catalog" },
      { name: "Cart" },
      { name: "Orders" },
      { name: "Payment" },
      { name: "Content" },
      { name: "Developer" },
    ],
  });
}
