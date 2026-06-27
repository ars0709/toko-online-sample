import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { AddressManager } from "@/components/account/address-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alamat" };

export default async function AddressesPage() {
  const user = (await getCurrentUser())!;
  const list = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alamat Pengiriman</h1>
      <AddressManager
        addresses={list.map((a) => ({
          id: a.id,
          label: a.label,
          recipient: a.recipient,
          phone: a.phone,
          line1: a.line1,
          city: a.city,
          province: a.province,
          postalCode: a.postalCode,
          isDefault: a.isDefault,
        }))}
      />
    </div>
  );
}
