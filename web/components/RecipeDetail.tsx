"use client";

import { formatAmount, scaleIngredients, servingsForFactor, SCALE_FACTORS } from "measure";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clearReview, deleteRecipe, markMade, markTodo } from "@/lib/actions/recipes";
import { categoryByName } from "@/lib/categories";
import { uploadImage } from "@/lib/image";
import type { CookLog, Recipe } from "@/lib/types";
import MeasureVisual from "./MeasureVisual";
import styles from "./RecipeDetail.module.css";
import SourceEmbed from "./SourceEmbed";

const LOW_CONFIDENCE = 0.6;

export default function RecipeDetail({ recipe, logs, userId }: { recipe: Recipe; logs: CookLog[]; userId: string }) {
  const router = useRouter();
  const [factorIdx, setFactorIdx] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [madeOpen, setMadeOpen] = useState(false);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const factor = SCALE_FACTORS[factorIdx];
  const ingredients = scaleIngredients(recipe.ingredients, factor);
  const servings = servingsForFactor(recipe.servings, factor);
  const cat = categoryByName(recipe.category);
  const low = (key: string) => (recipe.confidence?.[key] ?? 1) < LOW_CONFIDENCE;

  function doMade() {
    start(async () => {
      try {
        const path = photo ? await uploadImage("cook-photos", userId, photo) : null;
        const r = await markMade(recipe.id, note || null, path);
        if (!r.ok) setError(r.error);
        else {
          setMadeOpen(false);
          router.refresh();
        }
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <article className="paper paper--plain">
      {recipe.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={recipe.cover_url} alt="" className={styles.cover} />
      ) : (
        <div className={`${styles.cover} ${styles.coverEmpty}`} aria-hidden="true">
          {cat?.emoji ?? "🍽️"}
        </div>
      )}

      <div className={styles.badges}>
        {recipe.needs_review && (
          <button type="button" className="badge badge--review" onClick={() => start(() => clearReview(recipe.id))} title="Kontrol ettim, rozeti kaldır">
            ✨ Yeni eklendi, kontrol et
          </button>
        )}
        {recipe.status === "made" && <span className="badge badge--made">Yaptım</span>}
      </div>

      <h1 className={low("title") ? styles.low : undefined}>{recipe.title}</h1>
      <p className={styles.meta}>
        {cat?.emoji} {recipe.category}
        {recipe.subcategory ? ` · ${recipe.subcategory}` : ""}
        {recipe.time_text && <span className={low("time") ? styles.low : undefined}> · ⏱ {recipe.time_text}</span>}
      </p>

      <SourceEmbed url={recipe.source_url} platform={recipe.source_platform} author={recipe.source_author} authorUrl={recipe.source_author_url} />

      <div className={styles.servings} role="group" aria-label="Porsiyon">
        <button type="button" className="icon-btn" onClick={() => setFactorIdx((i) => Math.max(0, i - 1))} disabled={factorIdx === 0} aria-label="Porsiyonu azalt">
          −
        </button>
        <div className={styles.servingsText}>
          <strong className={low("servings") ? styles.low : undefined}>{servings != null ? `${servings} kişilik` : `${factor}×`}</strong>
          {factor !== 1 && recipe.servings != null && <small>orijinal: {recipe.servings} kişilik</small>}
        </div>
        <button type="button" className="icon-btn" onClick={() => setFactorIdx((i) => Math.min(SCALE_FACTORS.length - 1, i + 1))} disabled={factorIdx === SCALE_FACTORS.length - 1} aria-label="Porsiyonu artır">
          +
        </button>
      </div>

      <h2>Malzemeler</h2>
      <ul className={styles.ingredients}>
        {ingredients.map((ing) => (
          <li key={ing.id} className={ing.estimated || (ing.confidence ?? 1) < LOW_CONFIDENCE ? styles.low : undefined}>
            <div className={styles.ingText}>
              <span className={styles.ingAmount}>
                {formatAmount(ing.amount)}
                {ing.amount_max != null ? `–${formatAmount(ing.amount_max)}` : ""} {ing.unit ?? ""}
              </span>{" "}
              <span>{ing.name}</span>
              {ing.note && <span className={styles.ingNote}> ({ing.note})</span>}
              {ing.estimated && <span className="badge badge--estimated">tahmini</span>}
            </div>
            <MeasureVisual amount={ing.amount} unit={ing.unit} name={ing.name} />
          </li>
        ))}
      </ul>

      <h2>Hazırlanışı</h2>
      <ol className={styles.steps}>
        {recipe.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>

      {recipe.notes && (
        <>
          <h2>Notlar</h2>
          <p className="hand" style={{ fontSize: 20 }}>
            {recipe.notes}
          </p>
        </>
      )}

      {logs.length > 0 && (
        <>
          <h2>Yapılma günlüğü</h2>
          <ul className={styles.logs}>
            {logs.map((l) => (
              <li key={l.id}>
                {l.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photo_url} alt="" />
                )}
                <div>
                  <strong>{new Date(l.made_at).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  {l.note && <p className="hand">{l.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <Link href={`/tarif/${recipe.id}/pisir`} className="btn btn--block">
          🍳 Pişirme modu
        </Link>
        {madeOpen ? (
          <div className={styles.madeForm}>
            <div className="field">
              <label htmlFor="note">Not (isteğe bağlı)</label>
              <textarea id="note" className="textarea" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nasıl oldu? Değiştirdiğin bir şey var mı?" />
            </div>
            <div className="field">
              <label htmlFor="photo">Fotoğraf (isteğe bağlı)</label>
              <input id="photo" type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn--ghost" onClick={() => setMadeOpen(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn" onClick={doMade} disabled={pending} style={{ flex: 1 }}>
                {pending ? "Kaydediliyor…" : "Yaptıklarım&apos;a taşı"}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn--soft btn--block" onClick={() => setMadeOpen(true)}>
            ✅ Yaptım
          </button>
        )}
        {recipe.status === "made" && (
          <button type="button" className="btn btn--ghost btn--block" disabled={pending} onClick={() => start(async () => { await markTodo(recipe.id); router.refresh(); })}>
            Yapacaklarım&apos;a geri al
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/tarif/${recipe.id}/duzenle`} className="btn btn--ghost" style={{ flex: 1 }}>
            ✏️ Düzenle
          </Link>
          {confirmDelete ? (
            <>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmDelete(false)}>
                Vazgeç
              </button>
              <button type="button" className="btn btn--danger" disabled={pending} onClick={() => start(() => deleteRecipe(recipe.id))}>
                Evet, sil
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost" style={{ color: "var(--danger)", boxShadow: "inset 0 0 0 2px var(--danger)" }} onClick={() => setConfirmDelete(true)}>
              🗑 Sil
            </button>
          )}
        </div>
        {confirmDelete && (
          <p className="notice notice--warn" role="alert">
            Bu tarif kalıcı olarak silinecek. Emin misin?
          </p>
        )}
      </div>
    </article>
  );
}
