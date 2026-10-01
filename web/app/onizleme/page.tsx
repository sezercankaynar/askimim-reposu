import { notFound } from "next/navigation";
import CookMode from "@/components/CookMode";
import RecipeDetail from "@/components/RecipeDetail";
import RecipeForm from "@/components/RecipeForm";
import ShoppingList from "@/components/ShoppingList";
import TabBar from "@/components/TabBar";
import type { Recipe } from "@/lib/types";

/** Yalnızca ALLOW_PREVIEW=1 ile derlendiğinde açılan görsel kontrol sayfası (Supabase gerekmez). */
const SAMPLE: Recipe = {
  id: "demo",
  user_id: "demo",
  title: "Islak Kek",
  status: "todo",
  category: "Tatlılar",
  subcategory: "Kekler & kurabiyeler",
  servings: 8,
  original_servings: 8,
  time_text: "50 dk",
  ingredients: [
    { id: "a", name: "un", amount: 2, unit: "su bardağı" },
    { id: "b", name: "toz şeker", amount: 1, unit: "su bardağı" },
    { id: "c", name: "yumurta", amount: 3, unit: "adet" },
    { id: "d", name: "sıvı yağ", amount: 1, unit: "çay bardağı" },
    { id: "e", name: "kakao", amount: 3, unit: "yemek kaşığı", estimated: true, confidence: 0.5 },
    { id: "f", name: "kıyma", amount: 500, unit: "g" },
    { id: "g", name: "zeytinyağı", amount: 8, unit: "yemek kaşığı" },
    { id: "h", name: "tuz", amount: null, unit: "göz kararı" },
  ],
  steps: ["Yumurta ve şekeri 5 dakika çırp.", "Kuru malzemeleri ekleyip karıştır.", "180 derecede 35 dakika pişir.", "Üzerine sosu dök, yarım saat dinlendir."],
  notes: "Fırından çıkınca sıcakken sos dök.",
  cover_path: null,
  source_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  source_platform: "youtube",
  source_author: "Örnek Mutfak",
  source_author_url: "https://www.youtube.com/@ornek",
  confidence: { title: 0.98, servings: 0.4, time: 0.9 },
  needs_review: true,
  made_at: null,
  created_at: "2026-09-29T10:00:00Z",
  updated_at: "2026-09-29T10:00:00Z",
};

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ ekran?: string }> }) {
  if (process.env.ALLOW_PREVIEW !== "1") notFound();
  const { ekran = "detay" } = await searchParams;
  if (ekran === "pisir") return <CookMode recipe={SAMPLE} />;
  return (
    <>
      <div className="page">
        {ekran === "detay" && <RecipeDetail recipe={SAMPLE} logs={[]} userId="demo" />}
        {ekran === "form" && <RecipeForm recipe={SAMPLE} userId="demo" />}
        {ekran === "alisveris" && (
          <section className="paper">
            <h1>🧺 Alışveriş listesi</h1>
            <ShoppingList
              items={[
                { id: "1", name: "un", amount: 3, unit: "su bardağı", recipe_ids: ["demo"], checked: false },
                { id: "2", name: "yumurta", amount: 5, unit: "adet", recipe_ids: ["demo"], checked: false },
                { id: "3", name: "süt", amount: 1, unit: "lt", recipe_ids: [], checked: true },
              ]}
              recipes={[{ id: "demo", title: "Islak Kek" }]}
            />
          </section>
        )}
      </div>
      <TabBar />
    </>
  );
}
