import ShoppingList, { type ShoppingItem } from "@/components/ShoppingList";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const [{ data: items }, { data: recipes }] = await Promise.all([
    supabase.from("shopping_items").select("*").order("created_at"),
    supabase.from("recipes").select("id, title").order("title"),
  ]);
  return (
    <main>
      <section className="paper">
        <h1>🧺 Alışveriş listesi</h1>
        <ShoppingList items={(items ?? []) as ShoppingItem[]} recipes={recipes ?? []} />
      </section>
    </main>
  );
}
