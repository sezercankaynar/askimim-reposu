"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createScreenshotJob, dismissJob } from "@/lib/actions/imports";
import { uploadImage } from "@/lib/image";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ImportJob } from "@/lib/types";
import styles from "./ImportProgress.module.css";

const STEP_LABELS: Record<string, string> = {
  queued: "Sırada bekliyor",
  fetching: "Link inceleniyor",
  downloading: "Video indiriliyor",
  transcribing: "Ses yazıya dökülüyor",
  reading_frames: "Görseller okunuyor",
  writing: "Tarif yazılıyor",
  done: "Deftere eklendi",
  failed: "Eklenemedi",
  duplicate: "Zaten defterde",
};

const PLATFORM_ICON: Record<string, string> = { youtube: "▶️", instagram: "📸", tiktok: "🎵", pinterest: "📌", web: "🌐" };

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace("www.", "") + (u.pathname.length > 1 ? u.pathname.slice(0, 24) : "");
  } catch {
    return url;
  }
}

/** Devam eden importları Supabase Realtime ile canlı gösterir. */
export default function ImportProgress({ initial, userId }: { initial: ImportJob[]; userId: string }) {
  // Sunucudan gelen liste + Realtime ile gelen güncellemeler birleştirilir
  const [live, setLive] = useState<Record<string, ImportJob | null>>({});
  const router = useRouter();
  const doneRef = useRef(new Set(initial.filter((j) => j.status === "done").map((j) => j.id)));
  const jobs = mergeJobs(initial, live);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`import_jobs:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "import_jobs", filter: `user_id=eq.${userId}` },
        (payload: RealtimePostgresChangesPayload<ImportJob>) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id: string }).id;
            setLive((l) => ({ ...l, [id]: null }));
            return;
          }
          const row = payload.new as ImportJob;
          setLive((l) => ({ ...l, [row.id]: row }));
          if (row.status === "done" && !doneRef.current.has(row.id)) {
            doneRef.current.add(row.id);
            router.refresh(); // yeni tarif "son eklenenler"e düşsün
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Realtime kapalıysa (ör. yayın ayarı eksik) 5 sn'de bir yedek yoklama
  useEffect(() => {
    const active = jobs.some((j) => !["done", "failed", "duplicate"].includes(j.status));
    if (!active) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [jobs, router]);

  if (jobs.length === 0) return null;

  return (
    <section className={styles.list} aria-live="polite" aria-label="Devam eden importlar">
      {jobs.map((j) => (
        <JobRow key={j.id} job={j} userId={userId} />
      ))}
    </section>
  );
}

function mergeJobs(initial: ImportJob[], live: Record<string, ImportJob | null>): ImportJob[] {
  const map = new Map<string, ImportJob>();
  for (const j of initial) map.set(j.id, j);
  for (const [id, row] of Object.entries(live)) {
    if (row === null) map.delete(id);
    else map.set(id, row);
  }
  return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function JobRow({ job, userId }: { job: ImportJob; userId: string }) {
  const [pending, start] = useTransition();
  const [files, setFiles] = useState<FileList | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const active = !["done", "failed", "duplicate"].includes(job.status);
  const label = job.step_label ?? STEP_LABELS[job.status] ?? job.status;
  const icon = job.kind === "screenshots" ? "🖼️" : (PLATFORM_ICON[job.platform ?? ""] ?? "🔗");

  function uploadScreens() {
    if (!files?.length) return;
    start(async () => {
      try {
        const paths: string[] = [];
        for (const f of Array.from(files).slice(0, 10)) paths.push(await uploadImage("import-uploads", userId, f));
        const r = await createScreenshotJob(paths, job.url || null);
        if (!r.ok) setErr(r.error);
        else await dismissJob(job.id);
      } catch (e) {
        setErr((e as Error).message);
      }
    });
  }

  return (
    <div className={`${styles.row} ${job.status === "failed" ? styles.failed : ""} ${job.status === "done" ? styles.done : ""}`}>
      <div className={styles.head}>
        <span aria-hidden="true">{icon}</span>
        <span className={styles.url}>{job.kind === "screenshots" ? "Ekran görüntüleri" : shortUrl(job.url)}</span>
        <button
          type="button"
          className={styles.close}
          aria-label={active ? "İşi iptal et" : "Kaldır"}
          title={active ? "İptal et" : "Kaldır"}
          onClick={() => start(() => dismissJob(job.id))}
          disabled={pending}
        >
          ×
        </button>
      </div>
      {active && (
        <>
          <div className={styles.bar} role="progressbar" aria-valuenow={job.progress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
            <div className={styles.fill} style={{ width: `${Math.max(4, job.progress)}%` }} />
          </div>
          <div className={styles.label}>
            <span className={styles.spinner} aria-hidden="true" /> {label}…
            <button type="button" className={styles.cancel} onClick={() => start(() => dismissJob(job.id))} disabled={pending}>
              İptal et
            </button>
          </div>
        </>
      )}
      {job.status === "done" && job.recipe_id && (
        <Link href={`/tarif/${job.recipe_id}`} className={styles.cta}>
          ✅ Deftere eklendi — tarifi aç ve kontrol et →
        </Link>
      )}
      {job.status === "duplicate" && job.recipe_id && (
        <Link href={`/tarif/${job.recipe_id}`} className={styles.cta}>
          📖 Bu link zaten defterinde — tarifi aç →
        </Link>
      )}
      {job.status === "failed" && (
        <div className={styles.error}>
          <p>{job.error ?? "Eklenemedi."}</p>
          {(job.error_code === "INSTAGRAM_LOGIN_REQUIRED" || job.error_code === "DOWNLOAD_FAILED" || job.error_code === "PRIVATE_CONTENT") && (
            <div className={styles.fallback}>
              <label htmlFor={`shots-${job.id}`} className="btn btn--soft">
                🖼️ Ekran görüntüsü yükle
              </label>
              <input id={`shots-${job.id}`} type="file" accept="image/*" multiple className="visually-hidden" onChange={(e) => setFiles(e.target.files)} />
              {files && files.length > 0 && (
                <button type="button" className="btn" onClick={uploadScreens} disabled={pending}>
                  {pending ? "Yükleniyor…" : `${files.length} görseli gönder`}
                </button>
              )}
              {err && <p className="notice notice--error">{err}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
