import { z } from "zod";

export const emailSchema = z.string().email().max(255);
export const passwordSchema = z.string().min(8).max(100);

export const registerSchema = z.object({
  name: z.string().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const addToCartSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(64),
});

export const addressSchema = z.object({
  label: z.string().min(1).max(40).default("Rumah"),
  recipient: z.string().min(2).max(120),
  phone: z.string().min(6).max(30),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(100),
  province: z.string().min(2).max(100),
  postalCode: z.string().min(3).max(12),
  country: z.string().default("ID"),
  isDefault: z.boolean().default(false),
});

export const placeOrderSchema = z.object({
  addressId: z.string().uuid().optional(),
  address: addressSchema.optional(),
  couponCode: z.string().max(64).optional(),
});

export const productQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "rating"]).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});

export const createApiKeySchema = z.object({
  label: z.string().min(1).max(80),
  environment: z.enum(["TEST", "LIVE"]).default("TEST"),
  scopes: z.array(z.string()).default(["catalog:read"]),
  allowedOrigins: z.array(z.string()).default([]),
  ipAllowlist: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
