import { describe, expect, it } from "vitest";
import { findTimers, formatSeconds } from "./timers";

describe("findTimers", () => {
  it("dakika ve saat bulur", () => {
    expect(findTimers("Kısık ateşte 10 dakika pişir.")).toEqual([{ text: "10 dakika", seconds: 600 }]);
    expect(findTimers("1,5 saat dinlendir")).toEqual([{ text: "1,5 saat", seconds: 5400 }]);
  });
  it("aralıkta üst sınırı alır", () => {
    expect(findTimers("5-6 dk kavur")[0].seconds).toBe(360);
  });
  it("kelimeyle yazılmış süreleri bulur", () => {
    expect(findTimers("yarım saat bekle")[0].seconds).toBe(1800);
    expect(findTimers("iki dakika çırp")[0].seconds).toBe(120);
  });
  it("saniye", () => {
    expect(findTimers("30 sn karıştır")[0].seconds).toBe(30);
  });
  it("süre yoksa boş", () => {
    expect(findTimers("Servis et.")).toEqual([]);
  });
});

describe("formatSeconds", () => {
  it("mm:ss ve h:mm:ss", () => {
    expect(formatSeconds(65)).toBe("1:05");
    expect(formatSeconds(3700)).toBe("1:01:40");
  });
});
