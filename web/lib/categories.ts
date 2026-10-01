/** Sabit kategori listesi. Worker tarafındaki liste ile birebir aynı tutulur. */
export const CATEGORIES = [
  { slug: "corbalar", name: "Çorbalar", emoji: "🍲", subs: ["Sebze çorbaları", "Bakliyat çorbaları", "Et & tavuk çorbaları", "Terbiyeli çorbalar"] },
  { slug: "ana-yemekler", name: "Ana Yemekler", emoji: "🍖", subs: ["Et yemekleri", "Tavuk yemekleri", "Balık & deniz ürünleri", "Köfteler", "Güveç & fırın"] },
  { slug: "sebze-yemekleri", name: "Sebze Yemekleri", emoji: "🥦", subs: ["Zeytinyağlılar", "Etli sebze yemekleri", "Dolma & sarma", "Bakliyat yemekleri"] },
  { slug: "pilav-makarna", name: "Pilav & Makarna", emoji: "🍚", subs: ["Pilavlar", "Makarnalar", "Bulgur", "Noodle & Asya"] },
  { slug: "hamur-isleri", name: "Hamur İşleri", emoji: "🥐", subs: ["Börekler", "Poğaça & açma", "Ekmekler", "Pide & lahmacun", "Mantı"] },
  { slug: "kahvalti", name: "Kahvaltılıklar", emoji: "🍳", subs: ["Yumurtalı", "Menemen & sahanlar", "Krep & pankek", "Reçel & ezme"] },
  { slug: "salatalar-mezeler", name: "Salatalar & Mezeler", emoji: "🥗", subs: ["Salatalar", "Mezeler", "Soslar & dipler", "Turşular"] },
  { slug: "tatlilar", name: "Tatlılar", emoji: "🍮", subs: ["Şerbetli tatlılar", "Sütlü tatlılar", "Kekler & kurabiyeler", "Pastalar", "Dondurma & meyveli"] },
  { slug: "atistirmaliklar", name: "Atıştırmalıklar", emoji: "🍟", subs: ["Kızartmalar", "Sandviç & tost", "Burger & wrap", "Aperatifler"] },
  { slug: "icecekler", name: "İçecekler", emoji: "🥤", subs: ["Sıcak içecekler", "Soğuk içecekler", "Smoothie", "Limonata & şerbet"] },
  { slug: "diger", name: "Diğer", emoji: "📌", subs: ["Bebek & çocuk", "Diyet & fit", "Vegan", "Dünya mutfağı", "Pratik"] },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_NAMES: string[] = CATEGORIES.map((c) => c.name);

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export function categoryByName(name: string | null | undefined) {
  return CATEGORIES.find((c) => c.name === name);
}
