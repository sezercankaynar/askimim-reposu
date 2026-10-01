import { gramsToPieces, gramsToVolume, toGrams } from "./convert";
import { lookupIngredient } from "./densities";
import { unitKind } from "./units";

export type VisualIcon = "glass" | "teaglass" | "coffeecup" | "tablespoon" | "teaspoon" | "scale" | "piece" | "pack" | "pinch" | "none";

export interface Visual {
  icon: VisualIcon;
  /** Kaç ikon çizilecek (en fazla 6; fazlası "× n") */
  count: number;
  /** Son ikonun doluluk oranı 0-1 */
  lastFill: number;
  /** 6'dan fazlaysa "× n" yazısı */
  multiplier: number | null;
  color: string;
  emoji: string;
  /** Okunur yardımcı metin: "≈ 220 g" */
  helper: string | null;
  grams: number | null;
  ml: number | null;
  approx: boolean;
}

const ICON_BY_UNIT: Record<string, VisualIcon> = {
  "su bardağı": "glass",
  cup: "glass",
  "çay bardağı": "teaglass",
  "kahve fincanı": "coffeecup",
  "yemek kaşığı": "tablespoon",
  tbsp: "tablespoon",
  "tatlı kaşığı": "tablespoon",
  "çay kaşığı": "teaspoon",
  tsp: "teaspoon",
  paket: "pack",
  tutam: "pinch",
};

const MAX_ICONS = 6;

function split(amount: number): { count: number; lastFill: number; multiplier: number | null } {
  if (amount <= 0) return { count: 0, lastFill: 0, multiplier: null };
  if (amount > MAX_ICONS) return { count: 1, lastFill: 1, multiplier: amount };
  const whole = Math.floor(amount);
  const frac = amount - whole;
  if (frac > 0.01) return { count: whole + 1, lastFill: frac, multiplier: null };
  return { count: whole, lastFill: 1, multiplier: null };
}

/**
 * Malzeme satırı → görsel tanımı.
 * - bardak/kaşık: malzeme renginde dolu ikonlar, kesirde kısmen dolu son ikon
 * - katı (et, sebze): terazi + gram + yaklaşık adet
 * - adet: parça ikonu
 */
export function describeVisual(amount: number | null, unit: string | null, name: string): Visual {
  const { info } = lookupIngredient(name);
  const base = { color: info.color, emoji: info.emoji };
  const kind = unitKind(unit);
  const g = toGrams(amount, unit, name);

  if (amount == null || kind === "vague" || kind === "unknown") {
    return { icon: kind === "vague" ? "pinch" : "none", count: 1, lastFill: 1, multiplier: null, ...base, helper: null, grams: null, ml: null, approx: true };
  }

  if (kind === "volume" && unit) {
    const icon = ICON_BY_UNIT[unit] ?? "glass";
    if (unit === "ml" || unit === "lt") {
      // ml/lt → en uygun bardak ikonu
      const ml = unit === "lt" ? amount * 1000 : amount;
      const vol = gramsToVolume(ml * (info.density ?? 1), name);
      if (vol) {
        const sp = split(vol.amount);
        return { icon: ICON_BY_UNIT[vol.unit], ...sp, ...base, helper: helperText(g, vol.amount, vol.unit), ...gm(g) };
      }
    }
    const sp = split(amount);
    return { icon, ...sp, ...base, helper: g.grams != null ? `≈ ${fmtG(g.grams)}${g.ml != null ? ` · ${g.ml} ml` : ""}` : null, ...gm(g) };
  }

  if (kind === "weight") {
    if (info.solid || info.density == null) {
      const pieces = g.grams != null ? gramsToPieces(g.grams, name) : null;
      return {
        icon: "scale",
        count: 1,
        lastFill: 1,
        multiplier: null,
        ...base,
        helper: pieces != null ? `≈ ${pieces} adet` : null,
        ...gm(g),
      };
    }
    const vol = g.grams != null ? gramsToVolume(g.grams, name) : null;
    if (vol) {
      const sp = split(vol.amount);
      return { icon: ICON_BY_UNIT[vol.unit], ...sp, ...base, helper: `≈ ${fmtVol(vol.amount)} ${vol.unit}`, ...gm(g) };
    }
    return { icon: "scale", count: 1, lastFill: 1, multiplier: null, ...base, helper: null, ...gm(g) };
  }

  if (kind === "count" && unit) {
    if (unit === "paket") {
      const sp = split(amount);
      return { icon: "pack", ...sp, ...base, helper: g.grams != null ? `≈ ${fmtG(g.grams)}` : null, ...gm(g) };
    }
    const sp = split(amount);
    return { icon: "piece", ...sp, ...base, helper: g.grams != null ? `≈ ${fmtG(g.grams)}` : null, ...gm(g) };
  }

  return { icon: "none", count: 1, lastFill: 1, multiplier: null, ...base, helper: null, grams: null, ml: null, approx: true };
}

function gm(g: { grams: number | null; ml: number | null; approx: boolean }) {
  return { grams: g.grams, ml: g.ml, approx: g.approx };
}

function helperText(g: { grams: number | null; ml: number | null }, amt: number, unit: string) {
  const parts = [`≈ ${fmtVol(amt)} ${unit}`];
  if (g.grams != null) parts.push(fmtG(g.grams));
  return parts.join(" · ");
}

function fmtG(grams: number) {
  return grams >= 1000 ? `${Math.round(grams / 100) / 10} kg` : `${Math.round(grams)} g`;
}

function fmtVol(n: number) {
  return String(n).replace(".5", "½").replace(".25", "¼").replace(".75", "¾");
}
