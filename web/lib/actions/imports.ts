"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const URL_RE = /https?:\/\/[^\s]+/i;
const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\]|::1)/i;

export type ImportResult = { ok: true; jobId: string; duplicateRecipeId?: string } | { ok: false; error: string };

function dailyLimit() {
  return Number(process.env.DAILY_IMPORT_LIMIT ?? 20);
}

async function wakeWorker() {
  const base = process.env.WORKER_URL;
  const secret = process.env.WORKER_SHARED_SECRET;
  if (!base || !secret) return;
  try {
    await fetch(`${base.replace(/\/$/, "")}/wake`, {
      method: "POST",
      headers: { "x-worker-secret": secret },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Worker uyuyor olabilir (Render ücretsiz plan); kendi döngüsüyle işi alacak.
  }
}

/** Linkten import işi oluşturur. */
export async function createImportJob(rawUrl: string, targetStatus: "todo" | "made" = "todo"): Promise<ImportResult> {
  const m = (rawUrl ?? "").match(URL_RE);
  if (!m) return { ok: false, error: "Geçerli bir link yapıştırın (http:// veya https:// ile başlamalı)." };
  const url = m[0].replace(/[),.;!?]+$/, "");
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return { ok: false, error: "Link çözümlenemedi." };
  }
  if (BLOCKED_HOSTS.test(host)) return { ok: false, error: "Bu adrese erişilemiyor. Herkese açık bir link kullanın." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };

  const { data: count } = await supabase.rpc("imports_last_24h", { p_user: user.id });
  if ((count ?? 0) >= dailyLimit()) {
    return { ok: false, error: `Bugünlük link ekleme hakkınız (${dailyLimit()}) doldu. Yarın tekrar deneyin ya da tarifi elle ekleyin.` };
  }

  // Aynı ham link kısa süre önce eklendiyse tekrar iş açma
  const { data: recent } = await supabase
    .from("import_jobs")
    .select("id, status, recipe_id")
    .eq("url", url)
    .in("status", ["queued", "fetching", "downloading", "transcribing", "reading_frames", "writing", "done", "duplicate"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.recipe_id) return { ok: true, jobId: recent.id, duplicateRecipeId: recent.recipe_id };
  if (recent && recent.status !== "done" && recent.status !== "duplicate") return { ok: true, jobId: recent.id };

  const { data, error } = await supabase
    .from("import_jobs")
    .insert({ user_id: user.id, url, kind: "url", target_status: targetStatus })
    .select("id")
    .single();
  if (error) return { ok: false, error: "İş oluşturulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin." };

  await wakeWorker();
  revalidatePath("/defter");
  return { ok: true, jobId: data.id };
}

/** Ekran görüntülerinden import işi (Instagram yedeği). uploadPaths: "import-uploads/{user}/x.jpg" */
export async function createScreenshotJob(uploadPaths: string[], sourceUrl: string | null): Promise<ImportResult> {
  if (!uploadPaths.length) return { ok: false, error: "En az bir ekran görüntüsü seçin." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Oturum bulunamadı." };
  const { data: count } = await supabase.rpc("imports_last_24h", { p_user: user.id });
  if ((count ?? 0) >= dailyLimit()) return { ok: false, error: "Bugünlük ekleme hakkınız doldu. Yarın tekrar deneyin." };

  const { data, error } = await supabase
    .from("import_jobs")
    .insert({ user_id: user.id, url: sourceUrl ?? "", kind: "screenshots", upload_paths: uploadPaths.slice(0, 10) })
    .select("id")
    .single();
  if (error) return { ok: false, error: "İş oluşturulamadı. Tekrar deneyin." };
  await wakeWorker();
  revalidatePath("/defter");
  return { ok: true, jobId: data.id };
}

export async function dismissJob(jobId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("import_jobs").delete().eq("id", jobId).in("status", ["done", "failed", "duplicate"]);
  revalidatePath("/defter");
}
