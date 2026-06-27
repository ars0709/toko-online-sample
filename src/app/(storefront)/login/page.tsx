import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/account");
  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Masuk</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Demo: <span className="font-mono">user@demo.test / User123!</span> · admin{" "}
        <span className="font-mono">admin@demo.test / Admin123!</span>
      </p>
      <AuthForm mode="login" />
      <p className="mt-4 text-sm text-[var(--muted-foreground)]">
        Belum punya akun? <Link href="/register" className="text-[var(--primary)] hover:underline">Daftar</Link>
      </p>
    </div>
  );
}
