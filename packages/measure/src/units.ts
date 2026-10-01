/** Hacim birimleri (ml cinsinden). Türk mutfağı ölçüleri. */
export const VOLUME_ML: Record<string, number> = {
  "su bardağı": 200,
  "çay bardağı": 100,
  "kahve fincanı": 70,
  "yemek kaşığı": 15,
  "tatlı kaşığı": 10,
  "çay kaşığı": 5,
  ml: 1,
  lt: 1000,
  // yabancı birimler (tarif sitelerinden gelebilir)
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

/** Ağırlık birimleri (gram cinsinden). */
export const WEIGHT_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28,
  lb: 454,
};

/** Sayılabilir / belirsiz birimler. */
export const COUNT_UNITS = ["adet", "diş", "dal", "demet", "paket", "dilim", "yaprak", "parça", "kase", "avuç"] as const;
export const VAGUE_UNITS = ["tutam", "göz kararı", "biraz", "yeteri kadar", "miktarı kadar"] as const;

/** Her birimin takma adları. Küçük harf ve Türkçe karakterlerle. */
export const UNIT_ALIASES: Record<string, string> = {
  // su bardağı
  "su bardağı": "su bardağı",
  "su bardagi": "su bardağı",
  "sb": "su bardağı",
  "bardak": "su bardağı",
  "water glass": "su bardağı",
  // çay bardağı
  "çay bardağı": "çay bardağı",
  "cay bardagi": "çay bardağı",
  "çb": "çay bardağı",
  // kahve fincanı
  "kahve fincanı": "kahve fincanı",
  "fincan": "kahve fincanı",
  "kf": "kahve fincanı",
  // kaşıklar
  "yemek kaşığı": "yemek kaşığı",
  "yemek kasigi": "yemek kaşığı",
  "yk": "yemek kaşığı",
  "yemek k.": "yemek kaşığı",
  "tatlı kaşığı": "tatlı kaşığı",
  "tatli kasigi": "tatlı kaşığı",
  "tk": "tatlı kaşığı",
  "çay kaşığı": "çay kaşığı",
  "cay kasigi": "çay kaşığı",
  "çk": "çay kaşığı",
  "çay k.": "çay kaşığı",
  // metrik
  "ml": "ml",
  "mililitre": "ml",
  "cl": "ml",
  "lt": "lt",
  "l": "lt",
  "litre": "lt",
  "g": "g",
  "gr": "g",
  "gram": "g",
  "kg": "kg",
  "kilo": "kg",
  "kilogram": "kg",
  // yabancı
  "cup": "cup",
  "cups": "cup",
  "tbsp": "tbsp",
  "tablespoon": "tbsp",
  "tablespoons": "tbsp",
  "tsp": "tsp",
  "teaspoon": "tsp",
  "teaspoons": "tsp",
  "oz": "oz",
  "ounce": "oz",
  "ounces": "oz",
  "lb": "lb",
  "lbs": "lb",
  "pound": "lb",
  "pounds": "lb",
  // sayılabilir
  "adet": "adet",
  "tane": "adet",
  "diş": "diş",
  "dis": "diş",
  "dal": "dal",
  "demet": "demet",
  "paket": "paket",
  "dilim": "dilim",
  "yaprak": "yaprak",
  "parça": "parça",
  "kase": "kase",
  "avuç": "avuç",
  // belirsiz
  "tutam": "tutam",
  "göz kararı": "göz kararı",
  "goz karari": "göz kararı",
  "biraz": "biraz",
  "yeteri kadar": "yeteri kadar",
  "miktarı kadar": "miktarı kadar",
};

export type UnitKind = "volume" | "weight" | "count" | "vague" | "unknown";

export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const k = raw.trim().toLocaleLowerCase("tr").replace(/\s+/g, " ").replace(/\.$/, "");
  return UNIT_ALIASES[k] ?? UNIT_ALIASES[k + "."] ?? null;
}

export function unitKind(unit: string | null): UnitKind {
  if (!unit) return "unknown";
  if (unit in VOLUME_ML) return "volume";
  if (unit in WEIGHT_G) return "weight";
  if ((COUNT_UNITS as readonly string[]).includes(unit)) return "count";
  if ((VAGUE_UNITS as readonly string[]).includes(unit)) return "vague";
  return "unknown";
}

/** Gram → bardak/kaşık dönüşümünde tercih sırası (büyükten küçüğe). */
export const DISPLAY_VOLUME_ORDER = ["su bardağı", "çay bardağı", "yemek kaşığı", "çay kaşığı"] as const;
