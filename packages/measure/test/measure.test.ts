import { describe, expect, it } from "vitest";
import {
  aggregateIngredients,
  describeVisual,
  formatAmount,
  gramsToVolume,
  parseAmt,
  parseIngredientLine,
  scaleIngredients,
  toGrams,
} from "../src";

describe("toGrams", () => {
  it("2 su bardağı un ≈ 220 g", () => {
    const g = toGrams(2, "su bardağı", "un").grams!;
    expect(g).toBeGreaterThanOrEqual(200);
    expect(g).toBeLessThanOrEqual(240);
  });

  it("3 yumurta ≈ 165 g", () => {
    expect(toGrams(3, "adet", "yumurta").grams).toBe(165);
  });

  it("1 lt süt ≈ 1030 g ve 1000 ml", () => {
    const r = toGrams(1, "lt", "süt");
    expect(r.ml).toBe(1000);
    expect(r.grams).toBeGreaterThan(1000);
  });

  it("yabancı birimler çevrilir", () => {
    expect(toGrams(1, "cup", "su").ml).toBe(240);
    expect(toGrams(1, "lb", "kıyma").grams).toBe(454);
  });
});

describe("gramsToVolume", () => {
  it("160 g toz şeker ≈ 1 su bardağı", () => {
    expect(gramsToVolume(160, "toz şeker")).toEqual({ amount: 1, unit: "su bardağı" });
  });

  it("1 lt süt ≈ 5 su bardağı", () => {
    const g = toGrams(1, "lt", "süt").grams!;
    expect(gramsToVolume(g, "süt")).toEqual({ amount: 5, unit: "su bardağı" });
  });

  it("küçük miktarlar kaşığa düşer", () => {
    expect(gramsToVolume(8, "un")).toEqual({ amount: 1, unit: "yemek kaşığı" });
  });
});

describe("describeVisual", () => {
  it("500 g kıyma → terazi", () => {
    const v = describeVisual(500, "g", "kıyma");
    expect(v.icon).toBe("scale");
    expect(v.grams).toBe(500);
  });

  it("2½ su bardağı → 3 bardak, sonuncusu yarım dolu", () => {
    const v = describeVisual(2.5, "su bardağı", "un");
    expect(v.icon).toBe("glass");
    expect(v.count).toBe(3);
    expect(v.lastFill).toBe(0.5);
    expect(v.multiplier).toBeNull();
  });

  it("6'dan fazla → × n", () => {
    const v = describeVisual(8, "yemek kaşığı", "zeytinyağı");
    expect(v.count).toBe(1);
    expect(v.multiplier).toBe(8);
  });

  it("katı sebze gramı yaklaşık adede çevrilir", () => {
    const v = describeVisual(360, "g", "patates");
    expect(v.icon).toBe("scale");
    expect(v.helper).toBe("≈ 2 adet");
  });
});

describe("parseAmt", () => {
  it('parseAmt("1 1/2") = 1.5', () => {
    expect(parseAmt("1 1/2")).toBe(1.5);
  });
  it("virgüllü ve unicode kesir", () => {
    expect(parseAmt("1,5")).toBe(1.5);
    expect(parseAmt("½")).toBe(0.5);
    expect(parseAmt("1½")).toBe(1.5);
    expect(parseAmt("bir buçuk")).toBe(1.5);
  });
  it("aralık ilk değeri alır", () => {
    expect(parseAmt("2-3")).toBe(2);
  });
});

describe("parseIngredientLine", () => {
  it("birim ve malzemeyi ayırır", () => {
    expect(parseIngredientLine("2 su bardağı un")).toMatchObject({ amount: 2, unit: "su bardağı", name: "un" });
    expect(parseIngredientLine("3 yumurta")).toMatchObject({ amount: 3, unit: "adet", name: "yumurta" });
    expect(parseIngredientLine("1 paket kabartma tozu (10 g)")).toMatchObject({ amount: 1, unit: "paket", name: "kabartma tozu", note: "10 g" });
    expect(parseIngredientLine("yarım çay bardağı sıvı yağ")).toMatchObject({ amount: 0.5, unit: "çay bardağı", name: "sıvı yağ" });
    expect(parseIngredientLine("tuz")).toMatchObject({ amount: null, unit: null, name: "tuz" });
  });
});

describe("scaleIngredients", () => {
  it("2 kat ölçekleme", () => {
    const out = scaleIngredients([{ amount: 1.5, unit: "su bardağı" }, { amount: null }], 2);
    expect(out[0].amount).toBe(3);
    expect(out[1].amount).toBeNull();
  });
  it("½ kat ölçekleme", () => {
    expect(scaleIngredients([{ amount: 3 }], 0.5)[0].amount).toBe(1.5);
  });
});

describe("formatAmount", () => {
  it("kesirleri yazar", () => {
    expect(formatAmount(1.5)).toBe("1½");
    expect(formatAmount(0.25)).toBe("¼");
    expect(formatAmount(2)).toBe("2");
  });
});

describe("aggregateIngredients", () => {
  it("aynı malzemeleri toplar", () => {
    const out = aggregateIngredients([
      { name: "un", amount: 2, unit: "su bardağı", recipeId: "a" },
      { name: "Un", amount: 1, unit: "su bardağı", recipeId: "b" },
      { name: "yumurta", amount: 2, unit: "adet", recipeId: "a" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ amount: 3, unit: "su bardağı", recipeIds: ["a", "b"] });
  });
});
