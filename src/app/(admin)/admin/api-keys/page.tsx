import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { RevokeButton } from "./revoke-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "API Keys" };

function keyStatus(revokedAt: Date | null, expiresAt: Date | null) {
  if (revokedAt) return { label: "Dicabut", variant: "destructive" as const };
  if (expiresAt && new Date(expiresAt).getTime() < Date.now())
    return { label: "Kedaluwarsa", variant: "warning" as const };
  return { label: "Aktif", variant: "success" as const };
}

export default async function ApiKeysPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  const rows = await db
    .select({
      id: apiKeys.id,
      label: apiKeys.label,
      keyPrefix: apiKeys.keyPrefix,
      environment: apiKeys.environment,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
      expiresAt: apiKeys.expiresAt,
      ownerEmail: users.email,
    })
    .from(apiKeys)
    .leftJoin(users, eq(apiKeys.ownerUserId, users.id))
    .orderBy(desc(apiKeys.createdAt))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Pengawasan semua kunci API. Developer membuat kunci mereka sendiri.
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[var(--muted-foreground)] border-b border-[var(--border)] bg-[var(--muted)]/40">
              <th className="py-3 px-4 font-medium">Label</th>
              <th className="py-3 px-4 font-medium">Pemilik</th>
              <th className="py-3 px-4 font-medium">Prefix</th>
              <th className="py-3 px-4 font-medium">Env</th>
              <th className="py-3 px-4 font-medium">Scopes</th>
              <th className="py-3 px-4 font-medium">Terakhir Dipakai</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => {
              const st = keyStatus(k.revokedAt, k.expiresAt);
              const revoked = Boolean(k.revokedAt);
              return (
                <tr key={k.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{k.label}</td>
                  <td className="py-3 px-4 text-[var(--muted-foreground)] truncate max-w-[180px]">
                    {k.ownerEmail ?? "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{k.keyPrefix}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{k.environment}</Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-[var(--muted-foreground)] max-w-[200px]">
                    {k.scopes.length ? k.scopes.join(", ") : "—"}
                  </td>
                  <td className="py-3 px-4 text-[var(--muted-foreground)] text-xs">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString("id-ID") : "Belum pernah"}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    {revoked ? (
                      <div className="text-right text-xs text-[var(--muted-foreground)]">—</div>
                    ) : (
                      <RevokeButton id={k.id} />
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[var(--muted-foreground)]">
                  Belum ada kunci API.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
