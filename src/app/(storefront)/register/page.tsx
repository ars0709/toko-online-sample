import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Daftar" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Buat Akun</h1>
      <AuthForm mode="register" />
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        Sudah punya akun? <Link href="/login" className="text-[var(--primary)] hover:underline">Masuk</Link>
      </p>
    </div>
  );
}
