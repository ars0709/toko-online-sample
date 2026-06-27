import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { KeysManager, type KeyView } from "./keys-client";

export default async function DeveloperKeysPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.ownerUserId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  const keys: KeyView[] = rows.map((r) => ({
    id: r.id,
    label: r.label,
    environment: r.environment,
    keyPrefix: r.keyPrefix,
    scopes: r.scopes,
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    revoked: !!r.revokedAt,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Kunci API</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Buat dan kelola kunci untuk mengakses Public API.
        </p>
      </div>
      <KeysManager keys={keys} />
    </div>
  );
}
