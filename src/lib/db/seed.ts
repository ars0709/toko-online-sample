import { sql } from "drizzle-orm";
import { db } from "./index";
import * as s from "./schema";
import { hashPassword } from "../auth/password";
import { generateApiKey } from "../auth/api-key";
import { slugify, generateOrderNumber } from "../utils";
import { uuidv7 } from "uuidv7";

const img = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/700/700`;
const pick = <T>(arr: T[], i: number) => arr[i % arr.length];

async function reset() {
  // Order matters less with CASCADE
  const tables = [
    "webhook_deliveries",
    "webhook_endpoints",
    "api_key_usage",
    "api_keys",
    "audit_logs",
    "coupon_redemptions",
    "flash_sale_items",
    "flash_sales",
    "promotions",
    "reviews",
    "order_status_history",
    "shipments",
    "payments",
    "order_items",
    "orders",
    "cart_items",
    "carts",
    "inventory",
    "product_variants",
    "product_categories",
    "product_images",
    "products",
    "categories",
    "coupons",
    "banners",
    "blog_posts",
    "cms_pages",
    "faqs",
    "site_settings",
    "addresses",
    "users",
  ];
  for (const t of tables) {
    await db.execute(sql.raw(`TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE`));
  }
}

async function main() {
  console.log("🌱 Seeding database...");
  await reset();

  // --- Users ---
  const [admin] = await db
    .insert(s.users)
    .values({
      email: "admin@demo.test",
      name: "Admin Toko",
      passwordHash: await hashPassword("Admin123!"),
      role: "ADMIN",
      emailVerifiedAt: new Date(),
    })
    .returning();

  const [customer] = await db
    .insert(s.users)
    .values({
      email: "user@demo.test",
      name: "Budi Pelanggan",
      passwordHash: await hashPassword("User123!"),
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    })
    .returning();

  const [developer] = await db
    .insert(s.users)
    .values({
      email: "dev@demo.test",
      name: "Dewi Developer",
      passwordHash: await hashPassword("Dev123!"),
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
    })
    .returning();

  await db.insert(s.addresses).values({
    userId: customer.id,
    label: "Rumah",
    recipient: "Budi Pelanggan",
    phone: "081234567890",
    line1: "Jl. Merdeka No. 17",
    city: "Bandung",
    province: "Jawa Barat",
    postalCode: "40111",
    country: "ID",
    isDefault: true,
  });

  // --- Categories ---
  const categoryDefs = [
    { name: "Elektronik", slug: "elektronik" },
    { name: "Fashion Pria", slug: "fashion-pria" },
    { name: "Fashion Wanita", slug: "fashion-wanita" },
    { name: "Rumah Tangga", slug: "rumah-tangga" },
    { name: "Olahraga", slug: "olahraga" },
    { name: "Kecantikan", slug: "kecantikan" },
  ];
  const cats = await db.insert(s.categories).values(
    categoryDefs.map((c) => ({ ...c, imageUrl: img(c.slug) })),
  ).returning();

  // --- Products (>= 30) with variants + inventory + images ---
  const brands = ["Aurora", "NovaTech", "Sentosa", "UrbanWear", "FitPro", "GlowUp"];
  const colors = ["Hitam", "Putih", "Merah", "Biru", "Hijau"];
  const sizes = ["S", "M", "L", "XL"];
  const productNames = [
    "Headphone Nirkabel", "Smartwatch Sport", "Speaker Bluetooth", "Power Bank 20000mAh",
    "Keyboard Mekanik", "Mouse Gaming", "Webcam HD", "Lampu Meja LED",
    "Kemeja Flanel", "Kaos Polos Premium", "Celana Chino", "Jaket Bomber",
    "Dress Casual", "Blouse Linen", "Rok Plisket", "Cardigan Rajut",
    "Blender Portable", "Rice Cooker Mini", "Set Pisau Dapur", "Vacuum Cleaner",
    "Matras Yoga", "Dumbbell Set", "Sepatu Lari", "Botol Minum Termos",
    "Serum Wajah", "Lipstik Matte", "Parfum Eau de Toilette", "Masker Wajah Set",
    "Tas Ransel Laptop", "Dompet Kulit", "Jam Tangan Analog", "Kacamata Hitam",
    "Tumbler Stainless", "Sarung Bantal Set",
  ];

  const allVariants: { id: string; price: number }[] = [];
  let pIndex = 0;
  for (const name of productNames) {
    const slug = slugify(name) + "-" + (pIndex + 1);
    const brand = pick(brands, pIndex);
    const basePrice = 50000 + ((pIndex * 37) % 40) * 12500;
    const [product] = await db
      .insert(s.products)
      .values({
        name,
        slug,
        brand,
        description: `${name} berkualitas dari ${brand}. Produk pilihan dengan material premium, garansi resmi, dan pengiriman cepat ke seluruh Indonesia.`,
        status: "ACTIVE",
        basePrice,
        currency: "IDR",
        ratingAvg: 35 + (pIndex % 16), // 3.5 - 5.0
        ratingCount: 5 + (pIndex * 3) % 200,
      })
      .returning();

    // images
    await db.insert(s.productImages).values([
      { productId: product.id, url: img(slug + "-1"), alt: name, sortOrder: 0 },
      { productId: product.id, url: img(slug + "-2"), alt: name, sortOrder: 1 },
      { productId: product.id, url: img(slug + "-3"), alt: name, sortOrder: 2 },
    ]);

    // categories (1-2)
    const catA = pick(cats, pIndex);
    await db.insert(s.productCategories).values({ productId: product.id, categoryId: catA.id });

    // variants: 2 colors x 2 sizes (subset) -> 2-3 variants
    const variantCount = 2 + (pIndex % 2);
    for (let v = 0; v < variantCount; v++) {
      const color = pick(colors, pIndex + v);
      const size = pick(sizes, v);
      const price = basePrice + v * 10000;
      const sku = `SKU-${(pIndex + 1).toString().padStart(3, "0")}-${v + 1}`;
      const [variant] = await db
        .insert(s.productVariants)
        .values({
          productId: product.id,
          sku,
          name: `${color} / ${size}`,
          price,
          attributes: { color, size },
        })
        .returning();
      await db.insert(s.inventory).values({
        variantId: variant.id,
        quantityOnHand: 10 + ((pIndex + v) * 7) % 90,
        quantityReserved: 0,
      });
      allVariants.push({ id: variant.id, price });
    }
    pIndex++;
  }
  console.log(`  → ${productNames.length} produk, ${allVariants.length} varian`);

  // --- Coupons ---
  await db.insert(s.coupons).values([
    {
      code: "WELCOME10",
      type: "PERCENT",
      value: 10,
      minSubtotal: 100000,
      maxDiscount: 50000,
      usageLimit: 1000,
      perUserLimit: 1,
      firstOrderOnly: true,
      channel: "PUBLIC",
      isActive: true,
    },
    {
      code: "HEMAT50K",
      type: "FIXED",
      value: 50000,
      minSubtotal: 250000,
      usageLimit: 500,
      channel: "PUBLIC",
      isActive: true,
    },
    {
      code: "VIPONLY",
      type: "PERCENT",
      value: 20,
      minSubtotal: 0,
      maxDiscount: 100000,
      perUserLimit: 3,
      channel: "PRIVATE",
      isActive: true,
    },
  ]);

  // --- Automatic promotions ---
  await db.insert(s.promotions).values([
    {
      name: "Gratis Ongkir di atas Rp300.000",
      type: "FREE_SHIPPING",
      config: { threshold: 300000 },
      priority: 10,
      stackable: true,
      isActive: true,
    },
    {
      name: "Diskon Spesial 5% Cart",
      type: "CART_PERCENT",
      config: { percent: 5, minSubtotal: 500000 },
      priority: 5,
      stackable: true,
      isActive: true,
    },
  ]);

  // --- Flash sale (active now) ---
  const [flash] = await db
    .insert(s.flashSales)
    .values({
      name: "Flash Sale Tengah Hari",
      bannerImage: img("flash-sale"),
      status: "ACTIVE",
      startsAt: new Date(Date.now() - 1000 * 60 * 60),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
    })
    .returning();
  await db.insert(s.flashSaleItems).values(
    allVariants.slice(0, 5).map((v) => ({
      flashSaleId: flash.id,
      variantId: v.id,
      salePrice: Math.floor(v.price * 0.7),
      stockLimit: 20,
      soldCount: Math.floor(Math.random() * 10),
    })),
  );

  // --- Banners ---
  await db.insert(s.banners).values([
    {
      title: "Belanja Hemat Setiap Hari",
      imageUrl: img("hero-1"),
      linkUrl: "/products",
      placement: "HOME_HERO",
      sortOrder: 0,
      isActive: true,
    },
    {
      title: "Koleksi Terbaru 2026",
      imageUrl: img("hero-2"),
      linkUrl: "/products?sort=newest",
      placement: "HOME_HERO",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "Gratis Ongkir",
      imageUrl: img("strip-1"),
      linkUrl: "/promo",
      placement: "HOME_STRIP",
      sortOrder: 0,
      isActive: true,
    },
  ]);

  // --- CMS pages ---
  await db.insert(s.cmsPages).values([
    { slug: "about", title: "Tentang Kami", content: "Toko Online Sample adalah etalase demo e-commerce.", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "terms", title: "Syarat & Ketentuan", content: "Dengan berbelanja Anda menyetujui ketentuan layanan kami.", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "privacy", title: "Kebijakan Privasi", content: "Kami menjaga kerahasiaan data pribadi Anda.", status: "PUBLISHED", publishedAt: new Date() },
    { slug: "faq", title: "FAQ", content: "Pertanyaan yang sering diajukan.", status: "PUBLISHED", publishedAt: new Date() },
  ]);

  // --- Blog posts ---
  await db.insert(s.blogPosts).values([
    { slug: "tips-belanja-online-aman", title: "5 Tips Belanja Online yang Aman", excerpt: "Belanja online makin mudah, tapi tetap waspada.", coverImage: img("blog-1"), body: "Selalu cek reputasi penjual, gunakan pembayaran aman...", authorId: admin.id, tags: ["tips", "belanja"], status: "PUBLISHED", publishedAt: new Date() },
    { slug: "tren-gadget-2026", title: "Tren Gadget 2026", excerpt: "Apa saja yang sedang naik daun tahun ini.", coverImage: img("blog-2"), body: "Tahun 2026 menghadirkan banyak inovasi...", authorId: admin.id, tags: ["gadget", "tren"], status: "PUBLISHED", publishedAt: new Date() },
    { slug: "panduan-memilih-sepatu-lari", title: "Panduan Memilih Sepatu Lari", excerpt: "Sepatu yang tepat untuk performa terbaik.", coverImage: img("blog-3"), body: "Perhatikan tipe pronasi kaki Anda...", authorId: admin.id, tags: ["olahraga"], status: "PUBLISHED", publishedAt: new Date() },
  ]);

  // --- FAQs ---
  await db.insert(s.faqs).values([
    { category: "Pengiriman", question: "Berapa lama pengiriman?", answer: "Estimasi 2-5 hari kerja tergantung lokasi.", sortOrder: 0 },
    { category: "Pembayaran", question: "Metode pembayaran apa saja?", answer: "Kartu, transfer bank, dan e-wallet (mock).", sortOrder: 1 },
    { category: "Retur", question: "Bagaimana cara retur?", answer: "Ajukan dalam 7 hari setelah barang diterima.", sortOrder: 2 },
  ]);

  // --- Site settings ---
  await db.insert(s.siteSettings).values({
    id: "singleton",
    data: {
      storeName: "Toko Online Sample",
      currency: "IDR",
      contactEmail: "halo@toko.skyleticalabs.online",
      social: { instagram: "@tokosample", twitter: "@tokosample" },
      freeShippingThreshold: 300000,
      taxRate: 0.11,
    },
  });

  // --- Developer API key (print plaintext once) ---
  const apiKey = generateApiKey("TEST");
  await db.insert(s.apiKeys).values({
    ownerUserId: developer.id,
    label: "Demo Test Key",
    environment: "TEST",
    keyPrefix: apiKey.keyPrefix,
    hashedKey: apiKey.hashedKey,
    scopes: ["catalog:read", "orders:read", "inventory:read"],
    rateLimitTier: "default",
  });

  // --- Sample orders for the customer (various statuses) + reviews ---
  const variantsForOrder = allVariants.slice(5, 8);
  const sampleStatuses = ["DELIVERED", "PAID", "SHIPPED"] as const;
  for (let i = 0; i < sampleStatuses.length; i++) {
    const v = variantsForOrder[i];
    const orderId = uuidv7();
    const subtotal = v.price * 2;
    const tax = Math.round(subtotal * 0.11);
    const grand = subtotal + tax;
    await db.insert(s.orders).values({
      id: orderId,
      orderNumber: generateOrderNumber(orderId),
      userId: customer.id,
      status: sampleStatuses[i],
      subtotal,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: tax,
      grandTotal: grand,
      currency: "IDR",
      shippingAddress: { recipient: "Budi Pelanggan", city: "Bandung", line1: "Jl. Merdeka No. 17" },
    });
    await db.insert(s.orderItems).values({
      orderId,
      variantId: v.id,
      productNameSnapshot: "Produk Contoh",
      variantNameSnapshot: "Hitam / M",
      skuSnapshot: "SKU-DEMO",
      unitPrice: v.price,
      quantity: 2,
      lineTotal: subtotal,
    });
    await db.insert(s.payments).values({
      orderId,
      provider: "mock",
      amount: grand,
      status: "PAID",
      method: "card",
      paidAt: new Date(),
    });
    await db.insert(s.orderStatusHistory).values({
      orderId,
      toStatus: sampleStatuses[i],
      note: "Seed order",
      actor: "seed",
    });
  }

  console.log("\n========================================================");
  console.log("✅ Seed selesai. Kredensial demo:");
  console.log("  Admin     : admin@demo.test / Admin123!");
  console.log("  Customer  : user@demo.test  / User123!");
  console.log("  Developer : dev@demo.test   / Dev123!");
  console.log("\n  🔑 API KEY (TEST) — tampil sekali, simpan baik-baik:");
  console.log(`     ${apiKey.plaintext}`);
  console.log("========================================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed", err);
  process.exit(1);
});
