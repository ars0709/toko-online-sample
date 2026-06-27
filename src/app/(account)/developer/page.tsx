import Link from "next/link";
import { and, eq, isNull, sql } from "drizzle-orm";
import { BookOpen, KeyRound, Activity, AlertCircle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { apiKeys, apiKeyUsage } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function DeveloperDashboardPage() {
  const user = await requireUser();
  const today = new Date().toISOString().slice(0, 10);

  const [[{ count: activeKeys } = { count: 0 }], usageRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiKeys)
      .where(and(eq(apiKeys.ownerUserId, user.id), isNull(apiKeys.revokedAt))),
    db
      .select({ date: apiKeyUsage.date, requestCount: apiKeyUsage.requestCount })
      .from(apiKeyUsage)
      .innerJoin(apiKeys, eq(apiKeys.id, apiKeyUsage.apiKeyId))
      .where(eq(apiKeys.ownerUserId, user.id)),
  ]);

  let totalRequests = 0;
  let todayRequests = 0;
  for (const r of usageRows) {
    totalRequests += r.requestCount;
    if (r.date === today) todayRequests += r.requestCount;
  }

  const stats = [
    { label: "Kunci API aktif", value: activeKeys, icon: KeyRound },
    { label: "Request hari ini", value: todayRequests.toLocaleString("id-ID"), icon: Activity },
    { label: "Total request", value: totalRequests.toLocaleString("id-ID"), icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Developer</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Kelola akses API dan pantau penggunaan.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/api-docs" target="_blank">
            <BookOpen className="size-4" /> Dokumentasi API
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
                <s.icon className="size-4" /> {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mulai cepat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Buat kunci API di halaman{" "}
            <Link href="/developer/keys" className="text-[var(--primary)] underline">
              Kunci API
            </Link>{" "}
            lalu sertakan pada header request:
          </p>
          <pre className="overflow-x-auto rounded-md bg-[var(--muted)] p-3 text-xs">
            {`curl ${"$APP_URL"}/api/v1/products \\
  -H "X-API-Key: sk_live_xxx"`}
          </pre>
          <p className="text-[var(--muted-foreground)]">
            Referensi lengkap tersedia di{" "}
            <Link href="/api-docs" target="_blank" className="text-[var(--primary)] underline">
              /api-docs
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
