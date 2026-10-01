import { toGrams } from "./convert";
import { lookupIngredient } from "./densities";

export interface AggInput {
  name: string;
  amount: number | null;
  unit: string | null;
  recipeId?: string;
}

export interface AggItem {
  name: string;
  amount: number | null;
  unit: string | null;
  grams: number | null;
  recipeIds: string[];
}

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

/**
 * Alışveriş listesi: aynı malzemeleri birleştirir.
 * Aynı birimdekiler toplanır; farklı birimdekiler gram üzerinden toplanır (mümkünse),
 * olmazsa ayrı satır kalır.
 */
export function aggregateIngredients(items: AggInput[]): AggItem[] {
  const map = new Map<string, AggItem[]>();
  for (const it of items) {
    const { key } = lookupIngredient(it.name);
    const k = key ?? norm(it.name);
    const list = map.get(k) ?? [];
    const g = toGrams(it.amount, it.unit, it.name).grams;
    const same = list.find((x) => x.unit === it.unit);
    if (same) {
      same.amount = same.amount != null && it.amount != null ? round2(same.amount + it.amount) : same.amount ?? it.amount;
      same.grams = same.grams != null && g != null ? round2(same.grams + g) : same.grams ?? g;
      if (it.recipeId && !same.recipeIds.includes(it.recipeId)) same.recipeIds.push(it.recipeId);
    } else {
      // farklı birim: gram üzerinden birleştirilebilir mi?
      const gramRow = list.find((x) => x.grams != null && g != null);
      if (gramRow && g != null && gramRow.unit !== it.unit) {
        gramRow.grams = round2((gramRow.grams ?? 0) + g);
        gramRow.amount = gramRow.grams;
        gramRow.unit = "g";
        if (it.recipeId && !gramRow.recipeIds.includes(it.recipeId)) gramRow.recipeIds.push(it.recipeId);
      } else {
        list.push({ name: it.name, amount: it.amount, unit: it.unit, grams: g, recipeIds: it.recipeId ? [it.recipeId] : [] });
      }
    }
    map.set(k, list);
  }
  return [...map.values()].flat();
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
