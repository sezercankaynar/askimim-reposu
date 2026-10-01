import { normalizeUnit, UNIT_ALIASES } from "./units";

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const WORD_NUMBERS: Record<string, number> = {
  bir: 1,
  iki: 2,
  üç: 3,
  dört: 4,
  beş: 5,
  altı: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yarım: 0.5,
  "çeyrek": 0.25,
  "bir buçuk": 1.5,
  "iki buçuk": 2.5,
  "yarım kilo": 0.5,
};

/**
 * "1 1/2" → 1.5, "1,5" → 1.5, "½" → 0.5, "2-3" → 2 (min), "bir buçuk" → 1.5
 * Çözülemezse null.
 */
export function parseAmt(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  let s = input.trim().toLocaleLowerCase("tr");
  if (!s) return null;
  if (WORD_NUMBERS[s] != null) return WORD_NUMBERS[s];

  // unicode kesirleri "1½" → "1 1/2"
  s = s.replace(/([0-9])([¼½¾⅓⅔⅛⅜⅝⅞])/g, "$1 $2");
  s = s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (m) => String(UNICODE_FRACTIONS[m]));

  // aralık: "2-3" → ilk değer
  const range = s.match(/^([\d.,/\s]+)\s*(?:-|–|ila|veya|ya da)\s*([\d.,/\s]+)$/);
  if (range) s = range[1];

  // "1 1/2", "1 0.5"
  const parts = s.split(/\s+/).filter(Boolean);
  let total = 0;
  let any = false;
  for (const p of parts) {
    const frac = p.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      const d = Number(frac[2]);
      if (d === 0) return null;
      total += Number(frac[1]) / d;
      any = true;
      continue;
    }
    const num = Number(p.replace(",", "."));
    if (Number.isFinite(num)) {
      total += num;
      any = true;
      continue;
    }
    return any ? total : null;
  }
  return any ? Math.round(total * 1000) / 1000 : null;
}

export interface ParsedLine {
  amount: number | null;
  amount_max: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  raw: string;
}

const UNIT_KEYS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);

/**
 * Serbest metin malzeme satırını ayrıştırır.
 * "2 su bardağı un" → {amount:2, unit:"su bardağı", name:"un"}
 * "3 yumurta" → {amount:3, unit:"adet", name:"yumurta"}
 * "1 paket kabartma tozu (10 g)" → note:"10 g"
 */
export function parseIngredientLine(raw: string): ParsedLine {
  let s = raw.trim().replace(/\s+/g, " ");
  let note: string | null = null;
  const paren = s.match(/\(([^)]*)\)/);
  if (paren) {
    note = paren[1].trim();
    s = s.replace(paren[0], "").replace(/\s+/g, " ").trim();
  }
  s = s.replace(/^[-•*]\s*/, "");

  // miktar: baştaki sayı / kesir / aralık / kelime
  let amount: number | null = null;
  let amount_max: number | null = null;
  const lower = s.toLocaleLowerCase("tr");
  const numRe = /^((?:\d+[.,]?\d*|[¼½¾⅓⅔⅛⅜⅝⅞])(?:\s+\d+\/\d+)?(?:\s*(?:-|–|ila|veya)\s*(?:\d+[.,]?\d*|[¼½¾⅓⅔]))?)\s*/;
  const m = lower.match(numRe);
  let rest = s;
  if (m) {
    const rangeM = m[1].match(/^(.*?)\s*(?:-|–|ila|veya)\s*(.*)$/);
    if (rangeM) {
      amount = parseAmt(rangeM[1]);
      amount_max = parseAmt(rangeM[2]);
    } else {
      amount = parseAmt(m[1]);
    }
    rest = s.slice(m[0].length);
  } else {
    for (const w of ["bir buçuk", "iki buçuk", "yarım", "çeyrek", "bir", "iki", "üç", "dört", "beş"]) {
      if (lower.startsWith(w + " ")) {
        amount = WORD_NUMBERS[w];
        rest = s.slice(w.length + 1);
        break;
      }
    }
  }

  // birim
  let unit: string | null = null;
  const restLower = rest.toLocaleLowerCase("tr");
  for (const k of UNIT_KEYS) {
    if (restLower === k || restLower.startsWith(k + " ")) {
      unit = UNIT_ALIASES[k];
      rest = rest.slice(k.length).trim();
      break;
    }
  }
  if (unit === null && amount !== null) unit = "adet";

  // "1 su bardağı kadar un" → "kadar" temizle
  rest = rest.replace(/^(kadar|dolusu|dolu)\s+/i, "").trim();
  if (rest.startsWith("(")) rest = rest.replace(/^\([^)]*\)\s*/, "");

  return { amount, amount_max, unit: normalizeUnit(unit) ?? unit, name: rest || raw.trim(), note, raw };
}
