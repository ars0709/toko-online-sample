"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { placeOrder, CheckoutError } from "@/server/services/checkout";

export type CheckoutState = { error?: string } | undefined;

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login?next=/checkout");
  }

  const addressId = (formData.get("addressId") as string) || undefined;
  const couponCode = (formData.get("couponCode") as string) || undefined;

  const manual = {
    recipient: formData.get("recipient") as string,
    phone: formData.get("phone") as string,
    line1: formData.get("line1") as string,
    line2: (formData.get("line2") as string) || undefined,
    city: formData.get("city") as string,
    province: formData.get("province") as string,
    postalCode: formData.get("postalCode") as string,
    country: "ID",
  };

  let redirectUrl: string;
  try {
    const result = await placeOrder({
      userId: user.id,
      addressId,
      address: addressId ? undefined : manual,
      couponCode,
    });
    redirectUrl = `/checkout/pay/${result.order.id}`;
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    return { error: "Gagal membuat pesanan" };
  }
  redirect(redirectUrl);
}
