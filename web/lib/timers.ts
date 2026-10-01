/** Adım metnindeki süreleri bulur: "10 dakika", "1,5 saat", "5-6 dk", "yarım saat", "30 sn". */
export interface TimerMatch {
  text: string;
  seconds: number;
}

const NUM = String.raw`(\d+(?:[.,]\d+)?|yarım|çeyrek|bir|iki|üç|dört|beş|on|on beş|yirmi|yarım saat)`;
const RE = new RegExp(
  String.raw`\b${NUM}\s*(?:-|–|ila|veya)?\s*(\d+(?:[.,]\d+)?)?\s*(saniye|sn|dakika|dk|dak|saat|sa)\b`,
  "gi",
);

const WORDS: Record<string, number> = { yarım: 0.5, çeyrek: 0.25, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, on: 10, "on beş": 15, yirmi: 20 };

function num(s: string): number {
  const w = s.toLocaleLowerCase("tr").trim();
  if (WORDS[w] != null) return WORDS[w];
  return Number(w.replace(",", "."));
}

export function findTimers(step: string): TimerMatch[] {
  const out: TimerMatch[] = [];
  const lower = step.replace("yarım saat", "0,5 saat");
  for (const m of lower.matchAll(RE)) {
    const a = num(m[1]);
    const b = m[2] ? num(m[2]) : null;
    const unit = m[3].toLocaleLowerCase("tr");
    const mult = unit.startsWith("sa") && unit !== "saniye" ? 3600 : unit.startsWith("sn") || unit === "saniye" ? 1 : 60;
    // aralıkta ("5-6 dk") üst sınırı al
    const value = b != null && b > a ? b : a;
    if (!Number.isFinite(value) || value <= 0) continue;
    out.push({ text: m[0].trim(), seconds: Math.round(value * mult) });
  }
  return out;
}

export function formatSeconds(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
