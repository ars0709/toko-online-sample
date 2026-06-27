import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tambah Produk" };

export default async function NewProductPage() {
  const admin = await requireAdmin().catch(() => null);
  if (!admin) redirect("/login?next=/admin");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Tambah Produk</h1>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
