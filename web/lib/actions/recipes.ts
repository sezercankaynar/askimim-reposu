"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CATEGORY_NAMES, categoryByName } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient } from "@/lib/types";

export interface RecipeInput {
  title: string;
  category: string;
  subcategory: string | null;
  servings: number | null;
  time_text: string | null;
  ingredients: Ingredient[];
  steps: string[];
  notes: string | null;
  status: "todo" | "made";
  cover_path?: string | null;
}

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function validate(input: RecipeInput): string | null {
  if (!input.title.trim()) return "Tarif adı boş olamaz.";
  if (!CATEGORY_NAMES.includes(input.category)) return "Geçersiz kategori.";
  const cat = categoryByName(input.category);
  if (input.subcategory && cat && !(cat.subs as readonly string[]).includes(input.subcategory)) return "Geçersiz alt kategori.";
  if (input.ingredients.length === 0) return "En az bir malzeme ekleyin.";
  if (input.steps.length === 0) return "En az bir adım ekleyin.";
  return null;
}

function clean(input: RecipeInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    subcategory: input.subcategory || null,
    servings: input.servings,
    time_text: input.time_text?.trim() || null,
    ingredients: input.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ ...i, name: i.name.trim(), amount: i.amount ?? null, unit: i.unit || null })),
    steps: input.steps.map((s) => s.trim()).filter(Boolean),
    notes: input.notes?.trim() || null,
    status: input.status,
  };
}

export async function createRecipe(input: RecipeInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  const row = {
    ...clean(input),
    user_id: user.id,
    original_servings: input.servings,
    cover_path: input.cover_path ?? null,
    made_at: input.status === "made" ? new Date().toISOString() : null,
  };
  const { data, error } = await supabase.from("recipes").insert(row).select("id").single();
  if (error) return { ok: false, error: "Tarif kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin." };
  revalidatePath("/defter");
  return { ok: true, id: data.id };
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const supabase = await createClient();
  const patch: Record<string, unknown> = { ...clean(input), needs_review: false };
  if (input.cover_path !== undefined) patch.cover_path = input.cover_path;
  const { error } = await supabase.from("recipes").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Değişiklikler kaydedilemedi. Tekrar deneyin." };
  revalidatePath("/defter");
  revalidatePath(`/tarif/${id}`);
  return { ok: true, id };
}

export async function deleteRecipe(id: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("cover_path").eq("id", id).maybeSingle();
  await supabase.from("recipes").delete().eq("id", id);
  if (data?.cover_path) {
    const [bucket, ...rest] = data.cover_path.split("/");
    await supabase.storage.from(bucket).remove([rest.join("/")]);
  }
  revalidatePath("/defter");
  redirect("/defter");
}

export async function markMade(id: string, note: string | null, photoPath: string | null): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };
  const now = new Date().toISOString();
  const { error } = await supabase.from("recipes").update({ status: "made", made_at: now }).eq("id", id);
  if (error) return { ok: false, error: "Kaydedilemedi." };
  await supabase.from("cook_logs").insert({ user_id: user.id, recipe_id: id, made_at: now, note, photo_path: photoPath });
  revalidatePath("/defter");
  revalidatePath(`/tarif/${id}`);
  return { ok: true, id };
}

export async function markTodo(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("recipes").update({ status: "todo" }).eq("id", id);
  if (error) return { ok: false, error: "Kaydedilemedi." };
  revalidatePath("/defter");
  revalidatePath(`/tarif/${id}`);
  return { ok: true, id };
}

export async function clearReview(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("recipes").update({ needs_review: false }).eq("id", id);
  revalidatePath(`/tarif/${id}`);
  revalidatePath("/defter");
}
