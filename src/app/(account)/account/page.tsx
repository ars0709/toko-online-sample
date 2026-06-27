import { getCurrentUser } from "@/lib/auth/session";
import { ProfileForm } from "@/components/account/profile-form";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

export default async function AccountPage() {
  const user = (await getCurrentUser())!;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Profil Saya</h1>
      <p className="text-sm text-[var(--muted-foreground)] mb-6">
        Akun: <Badge variant="secondary">{user.role}</Badge>
      </p>
      <div className="max-w-md">
        <ProfileForm name={user.name} email={user.email} />
      </div>
    </div>
  );
}
