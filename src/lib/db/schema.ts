import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  index,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

// ---------------------------------------------------------------------------
// Helpers — UUID v7 PK + timestamps shared by every table
// ---------------------------------------------------------------------------
const pk = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRole = pgEnum("user_role", ["CUSTOMER", "ADMIN"]);
export const productStatus = pgEnum("product_status", ["DRAFT", "ACTIVE", "ARCHIVED"]);
export const orderStatus = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
]);
export const paymentStatus = pgEnum("payment_status", [
  "INITIATED",
  "PENDING",
  "PAID",
  "FAILED",
  "REFUNDED",
]);
export const couponType = pgEnum("coupon_type", ["PERCENT", "FIXED"]);
export const reviewStatus = pgEnum("review_status", ["PENDING", "PUBLISHED", "REJECTED"]);
export const contentStatus = pgEnum("content_status", ["DRAFT", "PUBLISHED"]);
export const bannerPlacement = pgEnum("banner_placement", [
  "HOME_HERO",
  "HOME_STRIP",
  "CATEGORY_TOP",
  "CHECKOUT",
]);
export const promotionType = pgEnum("promotion_type", [
  "CART_PERCENT",
  "CART_FIXED",
  "BUY_X_GET_Y",
  "FREE_SHIPPING",
  "BUNDLE",
]);
export const apiEnvironment = pgEnum("api_environment", ["TEST", "LIVE"]);

// ---------------------------------------------------------------------------
// Auth / users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: pk(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: userRole("role").notNull().default("CUSTOMER"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  ...timestamps,
});

export const addresses = pgTable("addresses", {
  id: pk(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Rumah"),
  recipient: text("recipient").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  country: text("country").notNull().default("ID"),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: pk(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: uuid("parent_id"),
  imageUrl: text("image_url"),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: pk(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    brand: text("brand"),
    status: productStatus("status").notNull().default("ACTIVE"),
    basePrice: integer("base_price").notNull(),
    currency: text("currency").notNull().default("IDR"),
    ratingAvg: integer("rating_avg").notNull().default(0), // x10 (e.g. 45 = 4.5)
    ratingCount: integer("rating_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("products_status_idx").on(t.status), index("products_brand_idx").on(t.brand)],
);

export const productImages = pgTable("product_images", {
  id: pk(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  alt: text("alt"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [unique("product_categories_uq").on(t.productId, t.categoryId)],
);

export const productVariants = pgTable("product_variants", {
  id: pk(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
  ...timestamps,
});

export const inventory = pgTable("inventory", {
  id: pk(),
  variantId: uuid("variant_id")
    .notNull()
    .unique()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  quantityOnHand: integer("quantity_on_hand").notNull().default(0),
  quantityReserved: integer("quantity_reserved").notNull().default(0),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------
export const carts = pgTable("carts", {
  id: pk(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  cartToken: text("cart_token").notNull().unique(),
  status: text("status").notNull().default("ACTIVE"),
  couponCode: text("coupon_code"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: pk(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    unitPriceSnapshot: integer("unit_price_snapshot").notNull(),
    ...timestamps,
  },
  (t) => [unique("cart_items_uq").on(t.cartId, t.variantId)],
);

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export const orders = pgTable(
  "orders",
  {
    id: pk(),
    orderNumber: text("order_number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("PENDING_PAYMENT"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    taxTotal: integer("tax_total").notNull().default(0),
    grandTotal: integer("grand_total").notNull(),
    currency: text("currency").notNull().default("IDR"),
    couponCode: text("coupon_code"),
    shippingAddress: jsonb("shipping_address").$type<Record<string, unknown>>(),
    placedAt: timestamp("placed_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("orders_user_idx").on(t.userId), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable("order_items", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  variantNameSnapshot: text("variant_name_snapshot").notNull(),
  skuSnapshot: text("sku_snapshot").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: integer("line_total").notNull(),
});

export const payments = pgTable("payments", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("mock"),
  providerRef: text("provider_ref"),
  amount: integer("amount").notNull(),
  status: paymentStatus("status").notNull().default("INITIATED"),
  method: text("method"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>(),
  ...timestamps,
});

export const shipments = pgTable("shipments", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  courier: text("courier"),
  trackingNumber: text("tracking_number"),
  status: text("status").notNull().default("PENDING"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  ...timestamps,
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: pk(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  note: text("note"),
  actor: text("actor"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Promo / marketing
// ---------------------------------------------------------------------------
export const coupons = pgTable("coupons", {
  id: pk(),
  code: text("code").notNull().unique(),
  type: couponType("type").notNull(),
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxDiscount: integer("max_discount"),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  perUserLimit: integer("per_user_limit"),
  appliesTo: text("applies_to").notNull().default("ALL"), // ALL | CATEGORY | PRODUCT
  targetIds: jsonb("target_ids").$type<string[]>().notNull().default([]),
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  channel: text("channel").notNull().default("PUBLIC"), // PUBLIC | PRIVATE
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: pk(),
  couponId: uuid("coupon_id")
    .notNull()
    .references(() => coupons.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  discountAmount: integer("discount_amount").notNull(),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }).defaultNow().notNull(),
});

export const promotions = pgTable("promotions", {
  id: pk(),
  name: text("name").notNull(),
  type: promotionType("type").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
  priority: integer("priority").notNull().default(0),
  stackable: boolean("stackable").notNull().default(false),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const flashSales = pgTable("flash_sales", {
  id: pk(),
  name: text("name").notNull(),
  bannerImage: text("banner_image"),
  status: text("status").notNull().default("SCHEDULED"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const flashSaleItems = pgTable("flash_sale_items", {
  id: pk(),
  flashSaleId: uuid("flash_sale_id")
    .notNull()
    .references(() => flashSales.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id")
    .notNull()
    .references(() => productVariants.id, { onDelete: "cascade" }),
  salePrice: integer("sale_price").notNull(),
  stockLimit: integer("stock_limit").notNull().default(0),
  soldCount: integer("sold_count").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export const reviews = pgTable("reviews", {
  id: pk(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
  rating: integer("rating").notNull(),
  title: text("title"),
  body: text("body"),
  status: reviewStatus("status").notNull().default("PENDING"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Content / CMS
// ---------------------------------------------------------------------------
export const cmsPages = pgTable("cms_pages", {
  id: pk(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  status: contentStatus("status").notNull().default("DRAFT"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});

export const banners = pgTable("banners", {
  id: pk(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  mobileImageUrl: text("mobile_image_url"),
  linkUrl: text("link_url"),
  placement: bannerPlacement("placement").notNull().default("HOME_HERO"),
  sortOrder: integer("sort_order").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const blogPosts = pgTable("blog_posts", {
  id: pk(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt"),
  coverImage: text("cover_image"),
  body: text("body").notNull().default(""),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  status: contentStatus("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  ...timestamps,
});

export const faqs = pgTable("faqs", {
  id: pk(),
  category: text("category").notNull().default("Umum"),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("singleton"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Developer / external API
// ---------------------------------------------------------------------------
export const apiKeys = pgTable("api_keys", {
  id: pk(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  environment: apiEnvironment("environment").notNull().default("TEST"),
  keyPrefix: text("key_prefix").notNull(),
  hashedKey: text("hashed_key").notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  rateLimitTier: text("rate_limit_tier").notNull().default("default"),
  allowedOrigins: jsonb("allowed_origins").$type<string[]>().notNull().default([]),
  ipAllowlist: jsonb("ip_allowlist").$type<string[]>().notNull().default([]),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});

export const apiKeyUsage = pgTable(
  "api_key_usage",
  {
    id: pk(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    requestCount: integer("request_count").notNull().default(0),
    errorCount: integer("error_count").notNull().default(0),
  },
  (t) => [unique("api_key_usage_uq").on(t.apiKeyId, t.date)],
);

export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: pk(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  lastDeliveryStatus: text("last_delivery_status"),
  ...timestamps,
});

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: pk(),
  endpointId: uuid("endpoint_id")
    .notNull()
    .references(() => webhookEndpoints.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("PENDING"),
  attempts: integer("attempts").notNull().default(0),
  responseCode: integer("response_code"),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
export const auditLogs = pgTable("audit_logs", {
  id: pk(),
  actor: text("actor"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Full-text search index on products (raw SQL applied via migration; declared for clarity)
export const productsSearchIndex = sql`to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(description,''))`;

// ---------------------------------------------------------------------------
// Relations (used by drizzle query API)
// ---------------------------------------------------------------------------
export const productRelations = relations(products, ({ many }) => ({
  images: many(productImages),
  variants: many(productVariants),
  productCategories: many(productCategories),
  reviews: many(reviews),
}));

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const variantRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  inventory: one(inventory, { fields: [productVariants.id], references: [inventory.variantId] }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const productCategoryRelations = relations(productCategories, ({ one }) => ({
  product: one(products, { fields: [productCategories.productId], references: [products.id] }),
  category: one(categories, { fields: [productCategories.categoryId], references: [categories.id] }),
}));

export const cartRelations = relations(carts, ({ many }) => ({
  items: many(cartItems),
}));

export const cartItemRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  payments: many(payments),
  shipments: many(shipments),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));
