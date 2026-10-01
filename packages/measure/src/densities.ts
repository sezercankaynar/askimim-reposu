/**
 * Malzeme bilgi tablosu.
 * density: g/ml (bardak/kaşık → gram dönüşümü için)
 * each: 1 adet ≈ gram
 * pack: 1 paket ≈ gram
 * color: görsel dolgu rengi
 * emoji: köşe ikonu
 * solid: terazi ikonu gösterilecek katı malzeme (et, sebze vb.)
 */
export interface IngredientInfo {
  density?: number;
  each?: number;
  pack?: number;
  color: string;
  emoji: string;
  solid?: boolean;
  liquid?: boolean;
}

const T: Record<string, IngredientInfo> = {
  // ---- kuru / toz ----
  un: { density: 0.55, color: "#f1e6cf", emoji: "🌾" },
  "toz şeker": { density: 0.8, color: "#ffffff", emoji: "🍬" },
  "pudra şekeri": { density: 0.56, color: "#fafafa", emoji: "🍬" },
  "esmer şeker": { density: 0.82, color: "#b5793b", emoji: "🟤" },
  tuz: { density: 1.2, color: "#f5f5f5", emoji: "🧂" },
  kakao: { density: 0.45, color: "#5a3a22", emoji: "🍫" },
  nişasta: { density: 0.6, color: "#f6f2ea", emoji: "🌽" },
  "mısır nişastası": { density: 0.6, color: "#f6f2ea", emoji: "🌽" },
  irmik: { density: 0.7, color: "#f0dcaa", emoji: "🌾" },
  bulgur: { density: 0.75, color: "#d9a86b", emoji: "🌾" },
  pirinç: { density: 0.85, color: "#f7f3e8", emoji: "🍚" },
  "kırmızı mercimek": { density: 0.85, color: "#e5733c", emoji: "🟠" },
  "yeşil mercimek": { density: 0.85, color: "#7f8b45", emoji: "🟢" },
  nohut: { density: 0.75, color: "#e3c48e", emoji: "🟡" },
  "kuru fasulye": { density: 0.78, color: "#f3ead6", emoji: "🫘" },
  "kabartma tozu": { density: 0.9, pack: 10, color: "#fdfdfd", emoji: "🧁" },
  "kuru maya": { density: 0.65, pack: 10, color: "#d8c3a0", emoji: "🍞" },
  "yaş maya": { density: 1.0, pack: 42, color: "#c9b48a", emoji: "🍞" },
  vanilin: { density: 0.9, pack: 5, color: "#fbf2d8", emoji: "🌼" },
  "galeta unu": { density: 0.5, color: "#e4c590", emoji: "🍞" },
  "hindistan cevizi": { density: 0.35, color: "#ffffff", emoji: "🥥" },
  ceviz: { density: 0.45, color: "#b88b5a", emoji: "🌰" },
  fındık: { density: 0.6, color: "#b87b47", emoji: "🌰" },
  badem: { density: 0.6, color: "#e6d2b5", emoji: "🌰" },
  "yulaf ezmesi": { density: 0.4, color: "#e8d9b9", emoji: "🌾" },
  "pul biber": { density: 0.4, color: "#c53a2a", emoji: "🌶️" },
  "kara biber": { density: 0.5, color: "#3a3230", emoji: "⚫" },
  kimyon: { density: 0.5, color: "#8e6b3b", emoji: "🟤" },
  "toz tarçın": { density: 0.5, color: "#a35f2a", emoji: "🟤" },
  nane: { density: 0.3, color: "#4f7a3c", emoji: "🌿" },
  kekik: { density: 0.3, color: "#5e7f4a", emoji: "🌿" },
  "toz kırmızı biber": { density: 0.5, color: "#c43c24", emoji: "🌶️" },
  "toz şekerli vanilin": { density: 0.9, pack: 5, color: "#fbf2d8", emoji: "🌼" },
  "susam": { density: 0.6, color: "#f1e5c8", emoji: "⚪" },
  "çörek otu": { density: 0.55, color: "#2d2a28", emoji: "⚫" },
  "toz tatlı kırmızı biber": { density: 0.5, color: "#c43c24", emoji: "🌶️" },

  // ---- sıvılar ----
  su: { density: 1.0, liquid: true, color: "#b9dbf2", emoji: "💧" },
  süt: { density: 1.03, liquid: true, color: "#fffdf7", emoji: "🥛" },
  yoğurt: { density: 1.05, liquid: true, color: "#fffaf0", emoji: "🥣" },
  "sıvı yağ": { density: 0.92, liquid: true, color: "#f4d35e", emoji: "🫗" },
  "ayçiçek yağı": { density: 0.92, liquid: true, color: "#f4d35e", emoji: "🫗" },
  zeytinyağı: { density: 0.91, liquid: true, color: "#b8b545", emoji: "🫒" },
  "tereyağı": { density: 0.95, each: 113, pack: 250, color: "#f6d56a", emoji: "🧈" },
  bal: { density: 1.42, liquid: true, color: "#e8a926", emoji: "🍯" },
  pekmez: { density: 1.3, liquid: true, color: "#5b2a1a", emoji: "🍯" },
  sirke: { density: 1.01, liquid: true, color: "#f3e5c5", emoji: "🧴" },
  "limon suyu": { density: 1.03, liquid: true, color: "#f6f0a1", emoji: "🍋" },
  "krema": { density: 1.0, liquid: true, pack: 200, color: "#fff9ea", emoji: "🥛" },
  "sıvı krema": { density: 1.0, liquid: true, pack: 200, color: "#fff9ea", emoji: "🥛" },
  "salça": { density: 1.1, color: "#b4291c", emoji: "🥫" },
  "domates salçası": { density: 1.1, color: "#b4291c", emoji: "🥫" },
  "biber salçası": { density: 1.1, color: "#c23b1d", emoji: "🥫" },
  "süzme yoğurt": { density: 1.08, color: "#fffaf0", emoji: "🥣" },
  "labne": { density: 1.05, pack: 180, color: "#fffdf8", emoji: "🧀" },
  "soya sosu": { density: 1.1, liquid: true, color: "#3d2314", emoji: "🧴" },
  "portakal suyu": { density: 1.04, liquid: true, color: "#f7a62b", emoji: "🍊" },
  "kahve": { density: 0.4, color: "#4b2e1e", emoji: "☕" },
  "çikolata": { density: 0.65, pack: 80, color: "#4a2a1b", emoji: "🍫" },
  "damla çikolata": { density: 0.65, color: "#4a2a1b", emoji: "🍫" },

  // ---- adetli ----
  yumurta: { each: 55, color: "#f9d98c", emoji: "🥚" },
  soğan: { each: 120, solid: true, color: "#e9c8a0", emoji: "🧅" },
  "kuru soğan": { each: 120, solid: true, color: "#e9c8a0", emoji: "🧅" },
  sarımsak: { each: 5, solid: true, color: "#f6efe0", emoji: "🧄" },
  domates: { each: 150, solid: true, color: "#e34a2f", emoji: "🍅" },
  patates: { each: 180, solid: true, color: "#d9b26a", emoji: "🥔" },
  havuç: { each: 80, solid: true, color: "#ef8a2a", emoji: "🥕" },
  "yeşil biber": { each: 40, solid: true, color: "#6fae45", emoji: "🫑" },
  "kırmızı biber": { each: 150, solid: true, color: "#d93b2b", emoji: "🫑" },
  "sivri biber": { each: 25, solid: true, color: "#8bc34a", emoji: "🌶️" },
  patlıcan: { each: 250, solid: true, color: "#5a2d82", emoji: "🍆" },
  kabak: { each: 200, solid: true, color: "#a8c66c", emoji: "🥒" },
  salatalık: { each: 150, solid: true, color: "#7bb661", emoji: "🥒" },
  limon: { each: 90, solid: true, color: "#f4e04d", emoji: "🍋" },
  portakal: { each: 180, solid: true, color: "#f5a623", emoji: "🍊" },
  elma: { each: 180, solid: true, color: "#d7413c", emoji: "🍎" },
  muz: { each: 120, solid: true, color: "#f5d33c", emoji: "🍌" },
  "çilek": { each: 15, solid: true, color: "#e0304a", emoji: "🍓" },
  avokado: { each: 170, solid: true, color: "#6a8f3c", emoji: "🥑" },
  pırasa: { each: 200, solid: true, color: "#a8c66c", emoji: "🥬" },
  marul: { each: 300, solid: true, color: "#8fcc5c", emoji: "🥬" },
  ıspanak: { each: 300, solid: true, color: "#3f7a3a", emoji: "🥬" },
  maydanoz: { each: 40, solid: true, color: "#3f8a3a", emoji: "🌿" },
  dereotu: { each: 30, solid: true, color: "#5aa34a", emoji: "🌿" },
  "taze soğan": { each: 15, solid: true, color: "#7fbf4f", emoji: "🧅" },
  mantar: { each: 20, solid: true, color: "#d7c3a5", emoji: "🍄" },
  "lavaş": { each: 60, color: "#f1dfb8", emoji: "🫓" },
  ekmek: { each: 250, color: "#d9a861", emoji: "🍞" },
  "tost ekmeği": { each: 25, color: "#e8c88f", emoji: "🍞" },
  "yufka": { each: 150, pack: 450, color: "#f1dfb8", emoji: "🫓" },
  "milföy": { each: 50, pack: 500, color: "#f1dfb8", emoji: "🥐" },
  "bisküvi": { each: 7, pack: 150, color: "#d9a861", emoji: "🍪" },
  "kaşar peyniri": { density: 1.0, solid: true, pack: 400, color: "#f5c85e", emoji: "🧀" },
  "beyaz peynir": { density: 1.0, solid: true, pack: 500, color: "#fffdf3", emoji: "🧀" },
  "lor peyniri": { density: 0.9, solid: true, color: "#fffdf3", emoji: "🧀" },
  "mozzarella": { density: 1.0, solid: true, pack: 125, color: "#fffdf3", emoji: "🧀" },

  // ---- et & protein (katı, terazi) ----
  kıyma: { solid: true, color: "#b4453b", emoji: "🥩" },
  "dana kıyma": { solid: true, color: "#b4453b", emoji: "🥩" },
  "kuzu eti": { solid: true, color: "#c0463e", emoji: "🍖" },
  "dana eti": { solid: true, color: "#a93b33", emoji: "🥩" },
  "kuşbaşı et": { solid: true, color: "#a93b33", emoji: "🥩" },
  tavuk: { solid: true, color: "#f0c9a2", emoji: "🍗" },
  "tavuk göğsü": { solid: true, each: 250, color: "#f0c9a2", emoji: "🍗" },
  "tavuk but": { solid: true, each: 200, color: "#e9b88c", emoji: "🍗" },
  "tavuk kanat": { solid: true, each: 60, color: "#e9b88c", emoji: "🍗" },
  balık: { solid: true, color: "#9fc5d8", emoji: "🐟" },
  somon: { solid: true, color: "#f08a6a", emoji: "🐟" },
  karides: { solid: true, each: 15, color: "#f3a08a", emoji: "🦐" },
  sucuk: { solid: true, color: "#8c2b23", emoji: "🌭" },
  sosis: { solid: true, each: 35, color: "#d2746a", emoji: "🌭" },
  pastırma: { solid: true, color: "#8c2b23", emoji: "🥩" },
  "hindi": { solid: true, color: "#efcba3", emoji: "🦃" },
  makarna: { density: 0.6, pack: 500, color: "#f2d58d", emoji: "🍝" },
  "şehriye": { density: 0.7, color: "#f2d58d", emoji: "🍝" },
  "kırmızı toz biber": { density: 0.5, color: "#c43c24", emoji: "🌶️" },
};

export const INGREDIENTS = T;

/** Anahtar kelime → tablo adı eşlemesi (bulanık eşleşme için). Daha uzun anahtarlar önce denenir. */
const KEYS = Object.keys(T).sort((a, b) => b.length - a.length);

const FALLBACK: IngredientInfo = { color: "#d9cfbf", emoji: "🥄" };

const norm = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/g, " ").trim();

/** Malzeme adına göre bilgi döndürür. Bulamazsa genel bilgi. */
export function lookupIngredient(name: string): { key: string | null; info: IngredientInfo } {
  const n = norm(name);
  if (T[n]) return { key: n, info: T[n] };
  for (const k of KEYS) {
    if (n.includes(k)) return { key: k, info: T[k] };
  }
  // sezgisel: "eti" / "et" içerenler katı
  if (/\bet\b|\beti\b|köfte|bonfile|pirzola/.test(n)) return { key: null, info: { solid: true, color: "#a93b33", emoji: "🥩" } };
  if (/peynir/.test(n)) return { key: null, info: { solid: true, density: 1.0, color: "#fffdf3", emoji: "🧀" } };
  if (/suyu$/.test(n)) return { key: null, info: { density: 1.0, liquid: true, color: "#f3e8c4", emoji: "💧" } };
  return { key: null, info: FALLBACK };
}
