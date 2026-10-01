"use server";

import { aggregateIngredients } from "measure";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient } from "@/lib/types";

/** Seçilen tariflerin malzemelerini birleştirip alışveriş listesine ekler. */
export async function addRecipesToShopping(recipeIds: string[]): Promise<{ ok: boolean; error?: string }> {
  if (!recipeIds.length) return { ok: false, error: "En az bir tarif seçin." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };

  const { data: recipes } = await supabase.from("recipes").select("id, ingredients").in("id", recipeIds);
  const { data: existing } = await supabase.from("shopping_items").select("*").eq("checked", false);

  const inputs = [
    ...(existing ?? []).map((e) => ({ name: e.name as string, amount: e.amount as number | null, unit: e.unit as string | null, recipeId: (e.recipe_ids as string[])[0] })),
    ...(recipes ?? []).flatMap((r) =>
      (r.ingredients as Ingredient[]).map((i) => ({ name: i.name, amount: i.amount, unit: i.unit, recipeId: r.id as string })),
    ),
  ];
  const merged = aggregateIngredients(inputs);

  // işaretsiz satırları yeniden yaz (birleştirilmiş)
  if (existing?.length) await supabase.from("shopping_items").delete().in("id", existing.map((e) => e.id));
  const rows = merged.map((m) => ({ user_id: user.id, name: m.name, amount: m.amount, unit: m.unit, recipe_ids: m.recipeIds, checked: false }));
  const { error } = await supabase.from("shopping_items").insert(rows);
  if (error) return { ok: false, error: "Liste kaydedilemedi." };
  revalidatePath("/alisveris");
  return { ok: true };
}

export async function toggleShoppingItem(id: string, checked: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("shopping_items").update({ checked }).eq("id", id);
  revalidatePath("/alisveris");
}

export async function clearChecked(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("shopping_items").delete().eq("checked", true);
  revalidatePath("/alisveris");
}

export async function addManualItem(name: string): Promise<void> {
  const n = name.trim();
  if (!n) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("shopping_items").insert({ user_id: user.id, name: n, recipe_ids: [] });
  revalidatePath("/alisveris");
}
