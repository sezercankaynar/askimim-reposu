export interface Scalable {
  amount: number | null;
  amount_max?: number | null;
}

/** Miktarı çarpanla ölçekler; adet gibi tam sayılı birimlerde ½'lik adımlara yuvarlar. */
export function scaleAmount(amount: number | null, factor: number): number | null {
  if (amount == null) return null;
  const v = amount * factor;
  return Math.round(v * 100) / 100;
}

export function scaleIngredients<T extends Scalable>(items: T[], factor: number): T[] {
  return items.map((i) => ({
    ...i,
    amount: scaleAmount(i.amount, factor),
    amount_max: i.amount_max == null ? i.amount_max : scaleAmount(i.amount_max, factor),
  }));
}

/** Kişi sayısı için izin verilen çarpanlar. */
export const SCALE_FACTORS = [0.5, 1, 2] as const;

export function servingsForFactor(original: number | null, factor: number): number | null {
  if (original == null) return null;
  return Math.max(1, Math.round(original * factor));
}
