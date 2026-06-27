"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, registerAction, type FormState } from "@/server/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? "Memproses..." : label}</Button>;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction] = useActionState<FormState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "register" && (
        <div><Label>Nama</Label><Input name="name" required placeholder="Nama lengkap" /></div>
      )}
      <div><Label>Email</Label><Input name="email" type="email" required placeholder="email@contoh.com" /></div>
      <div><Label>Password</Label><Input name="password" type="password" required placeholder="••••••••" /></div>
      {state?.error && <p className="text-sm text-[var(--destructive)]">{state.error}</p>}
      <Submit label={mode === "login" ? "Masuk" : "Daftar"} />
    </form>
  );
}
