import { lookupIngredient } from "./densities";
import { DISPLAY_VOLUME_ORDER, VOLUME_ML, WEIGHT_G, unitKind } from "./units";

export interface Grams {
  grams: number | null;
  ml: number | null;
  /** Tahmini (yoğunluk bilinmiyor, varsayılan kullanıldı) */
  approx: boolean;
}

/** Miktar + birim + malzeme → gram (ve sıvıda ml). */
export function toGrams(amount: number | null, unit: string | null, name: string): Grams {
  if (amount == null) return { grams: null, ml: null, approx: true };
  const { info } = lookupIngredient(name);
  const kind = unitKind(unit);

  if (kind === "weight" && unit) {
    const g = amount * WEIGHT_G[unit];
    const ml = info.density ? g / info.density : null;
    return { grams: round(g), ml: info.liquid && ml ? round(ml) : null, approx: false };
  }
  if (kind === "volume" && unit) {
    const ml = amount * VOLUME_ML[unit];
    const density = info.density ?? 1.0;
    return { grams: round(ml * density), ml: info.liquid ? round(ml) : null, approx: info.density == null };
  }
  if (kind === "count" && unit) {
    if (unit === "paket" && info.pack) return { grams: round(amount * info.pack), ml: null, approx: false };
    if (info.each) return { grams: round(amount * info.each), ml: null, approx: false };
    return { grams: null, ml: null, approx: true };
  }
  return { grams: null, ml: null, approx: true };
}

export interface VolumeDisplay {
  amount: number;
  unit: (typeof DISPLAY_VOLUME_ORDER)[number];
}

/** ¼'lük adımlara yuvarla */
export function roundQuarter(n: number): number {
  return Math.round(n * 4) / 4;
}

/**
 * Gram → en uygun bardak/kaşık. ¼ ve ½ kesirleri kullanılır.
 * 160 g toz şeker → 1 su bardağı; 15 g un → 2 yemek kaşığı.
 */
export function gramsToVolume(grams: number, name: string): VolumeDisplay | null {
  const { info } = lookupIngredient(name);
  if (info.solid || grams <= 0) return null;
  const density = info.density ?? 1.0;
  const ml = grams / density;
  return mlToVolume(ml);
}

export function mlToVolume(ml: number): VolumeDisplay | null {
  if (ml <= 0) return null;
  for (const unit of DISPLAY_VOLUME_ORDER) {
    const n = ml / VOLUME_ML[unit];
    const q = roundQuarter(n);
    if (q >= 0.5 || unit === "çay kaşığı") {
      // Son birimde 0.25 bile olsa göster
      if (q >= 0.25) return { amount: q, unit };
    }
  }
  return { amount: 0.25, unit: "çay kaşığı" };
}

/** Katı malzeme için gram → yaklaşık adet. */
export function gramsToPieces(grams: number, name: string): number | null {
  const { info } = lookupIngredient(name);
  if (!info.each) return null;
  const n = grams / info.each;
  return n >= 1 ? Math.round(n * 2) / 2 : Math.round(n * 4) / 4;
}

function round(n: number): number {
  return n >= 100 ? Math.round(n) : Math.round(n * 10) / 10;
}

/** Sayıyı okunur yaz: 1.5 → "1½", 0.25 → "¼", 2 → "2" */
export function formatAmount(n: number | null | undefined): string {
  if (n == null) return "";
  const whole = Math.floor(n);
  const frac = n - whole;
  const fracStr = frac >= 0.875 ? "" : frac >= 0.7 ? "¾" : frac >= 0.6 ? "⅔" : frac >= 0.45 ? "½" : frac >= 0.3 ? "⅓" : frac >= 0.2 ? "¼" : frac >= 0.1 ? "⅛" : "";
  const w = frac >= 0.875 ? whole + 1 : whole;
  if (w === 0 && fracStr) return fracStr;
  if (!fracStr) return String(Math.round(n * 100) / 100).replace(".", ",");
  return `${w}${fracStr}`;
}
