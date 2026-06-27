import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="text-6xl font-bold text-[var(--primary)]">404</div>
      <h1 className="mt-2 text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
        Maaf, halaman yang Anda cari tidak ada.
      </p>
      <Button asChild className="mt-6"><Link href="/">Kembali ke Beranda</Link></Button>
    </div>
  );
}
