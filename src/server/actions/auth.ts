"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CART_COOKIE } from "@/lib/cart-context";
import { createSession, destroySession } from "@/lib/auth/session";
import { authenticate, registerUser, AuthError } from "@/server/services/auth";
import { mergeGuestIntoUser } from "@/server/services/cart";
import { loginSchema, registerSchema } from "@/lib/validators";

export type FormState = { error?: string } | undefined;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Input tidak valid" };

  try {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    const jar = await cookies();
    const guestToken = jar.get(CART_COOKIE)?.value;
    if (guestToken) await mergeGuestIntoUser(guestToken, user.id);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Terjadi kesalahan" };
  }
  redirect("/account");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Cek kembali isian: nama, email, dan password min 8 karakter" };

  try {
    const user = await registerUser(parsed.data);
    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    const jar = await cookies();
    const guestToken = jar.get(CART_COOKIE)?.value;
    if (guestToken) await mergeGuestIntoUser(guestToken, user.id);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    return { error: "Terjadi kesalahan" };
  }
  redirect("/account");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
