import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[var(--border)] bg-[var(--muted)]/30">
      <div className="container-page grid gap-8 py-12 md:grid-cols-4">
        <div>
          <div className="font-bold text-lg mb-2">TokoSample</div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Etalase demo e-commerce production-ready. Next.js + PostgreSQL + REST API aman.
          </p>
        </div>
        <FooterCol title="Belanja" links={[["Semua Produk", "/products"], ["Promo", "/promo"], ["Flash Sale", "/promo"]]} />
        <FooterCol title="Informasi" links={[["Tentang Kami", "/p/about"], ["Syarat & Ketentuan", "/p/terms"], ["Privasi", "/p/privacy"], ["FAQ", "/p/faq"]]} />
        <FooterCol title="Developer" links={[["Dokumentasi API", "/api-docs"], ["Developer Portal", "/developer"], ["Blog", "/blog"]]} />
      </div>
      <div className="border-t border-[var(--border)] py-4">
        <div className="container-page text-xs text-[var(--muted-foreground)] flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Toko Online Sample. Demo project.</span>
          <span>Dibangun dengan Next.js, Drizzle ORM, dan PostgreSQL.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="font-semibold mb-3 text-sm">{title}</div>
      <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
        {links.map(([label, href]) => (
          <li key={href + label}>
            <Link href={href} className="hover:text-[var(--foreground)]">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
