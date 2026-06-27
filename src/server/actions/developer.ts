"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/auth/api-key";
import { requireUser } from "@/lib/auth/session";

export type DeveloperActionResult = {
  ok: boolean;
  key?: string;
  keyPrefix?: string;
  error?: string;
};

const SCOPES = ["catalog:read", "orders:read", "orders:write", "inventory:read"] as const;

const createSchema = z.object({
  label: z.string().min(1).max(80),
  environment: z.enum(["TEST", "LIVE"]).default("TEST"),
  scopes: z.array(z.enum(SCOPES)).default(["catalog:read"]),
});

export async function createKeyAction(formData: FormData): Promise<DeveloperActionResult> {
  const user = await requireUser();

  const parsed = createSchema.safeParse({
    label: formData.get("label"),
    environment: formData.get("environment") ?? "TEST",
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Periksa kembali isian (label & minimal satu scope)." };
  }

  const { plaintext, hashedKey, keyPrefix } = generateApiKey(parsed.data.environment);
  await db.insert(apiKeys).values({
    ownerUserId: user.id,
    label: parsed.data.label,
    environment: parsed.data.environment,
    keyPrefix,
    hashedKey,
    scopes: parsed.data.scopes,
  });

  revalidatePath("/developer/keys");
  return { ok: true, key: plaintext, keyPrefix };
}

export async function revokeKeyAction(id: string): Promise<DeveloperActionResult> {
  const user = await requireUser();
  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.ownerUserId, user.id)),
  });
  if (!key) return { ok: false, error: "Kunci tidak ditemukan." };
  if (!key.revokedAt) {
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, key.id));
  }
  revalidatePath("/developer/keys");
  return { ok: true };
}

export async function rollKeyAction(id: string): Promise<DeveloperActionResult> {
  const user = await requireUser();
  const old = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, id), eq(apiKeys.ownerUserId, user.id)),
  });
  if (!old) return { ok: false, error: "Kunci tidak ditemukan." };

  const { plaintext, hashedKey, keyPrefix } = generateApiKey(old.environment);
  await db.transaction(async (tx) => {
    if (!old.revokedAt) {
      await tx.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, old.id));
    }
    await tx.insert(apiKeys).values({
      ownerUserId: user.id,
      label: `${old.label} (rolled)`,
      environment: old.environment,
      keyPrefix,
      hashedKey,
      scopes: old.scopes,
      rateLimitTier: old.rateLimitTier,
      allowedOrigins: old.allowedOrigins,
      ipAllowlist: old.ipAllowlist,
      expiresAt: old.expiresAt,
    });
  });

  revalidatePath("/developer/keys");
  return { ok: true, key: plaintext, keyPrefix };
}
