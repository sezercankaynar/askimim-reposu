import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CookLog, ImportJob, Recipe } from "./types";

const SIGNED_TTL = 60 * 60; // 1 saat

/** Storage yolları için imzalı URL'ler (bucket:path biçimi). */
export async function signUrls(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const supabase = await createClient();
  const out = new Map<string, string>();
  const byBucket = new Map<string, string[]>();
  for (const p of paths) {
    if (!p) continue;
    const [bucket, ...rest] = p.split("/");
    const key = rest.join("/");
    if (!bucket || !key) continue;
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), key]);
  }
  for (const [bucket, keys] of byBucket) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(keys, SIGNED_TTL);
    data?.forEach((d) => {
      if (d.signedUrl && d.path) out.set(`${bucket}/${d.path}`, d.signedUrl);
    });
  }
  return out;
}

export async function withCoverUrls<T extends { cover_path: string | null }>(rows: T[]): Promise<(T & { cover_url: string | null })[]> {
  const map = await signUrls(rows.map((r) => r.cover_path));
  return rows.map((r) => ({ ...r, cover_url: r.cover_path ? (map.get(r.cover_path) ?? null) : null }));
}

export interface ListFilter {
  status?: "todo" | "made";
  category?: string;
  subcategory?: string;
  q?: string;
  /** "elimdeki malzemeler" araması: virgülle ayrılmış malzeme adları */
  have?: string[];
}

export async function listRecipes(filter: ListFilter = {}): Promise<Recipe[]> {
  const supabase = await createClient();
  let query = supabase.from("recipes").select("*").order("created_at", { ascending: false });
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.subcategory) query = query.eq("subcategory", filter.subcategory);
  if (filter.q) query = query.ilike("search_text", `%${filter.q.toLocaleLowerCase("tr")}%`);
  if (filter.have?.length) {
    for (const h of filter.have) query = query.ilike("search_text", `%${h.toLocaleLowerCase("tr")}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return withCoverUrls((data ?? []) as Recipe[]);
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [r] = await withCoverUrls([data as Recipe]);
  return r;
}

export async function getCookLogs(recipeId: string): Promise<CookLog[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cook_logs").select("*").eq("recipe_id", recipeId).order("made_at", { ascending: false });
  const rows = (data ?? []) as CookLog[];
  const map = await signUrls(rows.map((l) => l.photo_path));
  return rows.map((l) => ({ ...l, photo_url: l.photo_path ? (map.get(l.photo_path) ?? null) : null }));
}

export async function countByStatus(): Promise<{ made: number; todo: number }> {
  const supabase = await createClient();
  const [{ count: made }, { count: todo }] = await Promise.all([
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "made"),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "todo"),
  ]);
  return { made: made ?? 0, todo: todo ?? 0 };
}

export async function countByCategory(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data } = await supabase.from("recipes").select("category");
  const out: Record<string, number> = {};
  for (const r of data ?? []) out[r.category] = (out[r.category] ?? 0) + 1;
  return out;
}

export async function listActiveImports(): Promise<ImportJob[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from("import_jobs")
    .select("*")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  return (data ?? []) as ImportJob[];
}
