"use client";

import { parseIngredientLine } from "measure";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createRecipe, updateRecipe, type RecipeInput } from "@/lib/actions/recipes";
import { CATEGORIES, categoryByName } from "@/lib/categories";
import { uploadImage } from "@/lib/image";
import type { Ingredient, Recipe } from "@/lib/types";
import MeasureVisual from "./MeasureVisual";
import styles from "./RecipeForm.module.css";

interface Row {
  id: string;
  text: string;
  group?: string | null;
}

const uid = () => Math.random().toString(36).slice(2, 10);

function toRows(ings: Ingredient[]): Row[] {
  if (!ings.length) return [{ id: uid(), text: "" }];
  return ings.map((i) => ({
    id: i.id || uid(),
    text: [i.amount != null ? String(i.amount).replace(".", ",") : "", i.unit && i.unit !== "adet" ? i.unit : "", i.name, i.note ? `(${i.note})` : ""]
      .filter(Boolean)
      .join(" "),
    group: i.group,
  }));
}

export default function RecipeForm({ recipe, userId }: { recipe?: Recipe; userId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [category, setCategory] = useState(recipe?.category ?? CATEGORIES[0].name);
  const [subcategory, setSubcategory] = useState(recipe?.subcategory ?? "");
  const [servings, setServings] = useState(recipe?.servings?.toString() ?? "4");
  const [timeText, setTimeText] = useState(recipe?.time_text ?? "");
  const [status, setStatus] = useState<"todo" | "made">(recipe?.status ?? "todo");
  const [rows, setRows] = useState<Row[]>(toRows(recipe?.ingredients ?? []));
  const [steps, setSteps] = useState<string>(recipe?.steps.join("\n") ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(recipe?.cover_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const cat = categoryByName(category);

  function setRow(id: string, text: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, text } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { id: uid(), text: "" }]);
  }
  function removeRow(id: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>, id: string) {
    const text = e.clipboardData.getData("text");
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      e.preventDefault();
      setRows((rs) => {
        const idx = rs.findIndex((r) => r.id === id);
        const newRows = lines.map((l) => ({ id: uid(), text: l }));
        return [...rs.slice(0, idx), ...newRows, ...rs.slice(idx + 1)];
      });
    }
  }
  function onPhoto(f: File | null) {
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : recipe?.cover_url ?? null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ingredients: Ingredient[] = rows
      .filter((r) => r.text.trim())
      .map((r) => {
        const p = parseIngredientLine(r.text);
        return { id: r.id, name: p.name, amount: p.amount, amount_max: p.amount_max, unit: p.unit, note: p.note, group: r.group ?? null, raw: r.text };
      });
    const input: RecipeInput = {
      title,
      category,
      subcategory: subcategory || null,
      servings: servings ? Number(servings) : null,
      time_text: timeText || null,
      ingredients,
      steps: steps.split(/\r?\n/).map((s) => s.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean),
      notes: notes || null,
      status,
    };
    start(async () => {
      try {
        if (photo) input.cover_path = await uploadImage("covers", userId, photo);
        const r = recipe ? await updateRecipe(recipe.id, input) : await createRecipe(input);
        if (!r.ok) return setError(r.error);
        router.push(`/tarif/${r.id}`);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="paper paper--plain">
      <h1>{recipe ? "Tarifi düzenle" : "Yeni tarif"}</h1>

      <div className="field">
        <label htmlFor="title">Tarif adı</label>
        <input id="title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className={styles.two}>
        <div className="field">
          <label htmlFor="category">Kategori</label>
          <select
            id="category"
            className="select"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setSubcategory("");
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.name}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subcategory">Alt kategori</label>
          <select id="subcategory" className="select" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
            <option value="">—</option>
            {cat?.subs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.two}>
        <div className="field">
          <label htmlFor="servings">Kişi sayısı</label>
          <input id="servings" className="input" type="number" inputMode="numeric" min={1} value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="time">Süre</label>
          <input id="time" className="input" value={timeText} onChange={(e) => setTimeText(e.target.value)} placeholder="örn. 45 dk" />
        </div>
      </div>

      <div className="field">
        <label htmlFor="photo">Kapak fotoğrafı</label>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={styles.preview} />
        )}
        <input id="photo" type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
      </div>

      <fieldset className={styles.fieldset}>
        <legend>Malzemeler</legend>
        <p className={styles.hint}>Her satıra bir malzeme: &quot;2 su bardağı un&quot;, &quot;3 yumurta&quot;, &quot;1 paket kabartma tozu&quot;</p>
        {rows.map((r) => {
          const p = parseIngredientLine(r.text);
          return (
            <div key={r.id} className={styles.row}>
              <input
                className="input"
                value={r.text}
                onChange={(e) => setRow(r.id, e.target.value)}
                onPaste={(e) => onPaste(e, r.id)}
                aria-label="Malzeme"
                placeholder="2 su bardağı un"
              />
              <div className={styles.visual}>{r.text.trim() && <MeasureVisual amount={p.amount} unit={p.unit} name={p.name} size={24} />}</div>
              <button type="button" className="icon-btn" onClick={() => removeRow(r.id)} aria-label="Satırı sil">
                ×
              </button>
            </div>
          );
        })}
        <button type="button" className="btn btn--soft" onClick={addRow}>
          + Malzeme ekle
        </button>
      </fieldset>

      <div className="field">
        <label htmlFor="steps">Hazırlanışı (her satır bir adım)</label>
        <textarea id="steps" className="textarea" value={steps} onChange={(e) => setSteps(e.target.value)} rows={8} required />
      </div>

      <div className="field">
        <label htmlFor="notes">Notlar</label>
        <textarea id="notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>

      <div className="field">
        <span id="status-label" style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-soft)" }}>
          Bölüm
        </span>
        <div className="chip-row" role="group" aria-labelledby="status-label">
          <button type="button" className="chip" aria-pressed={status === "todo"} onClick={() => setStatus("todo")}>
            📌 Yapacaklarım
          </button>
          <button type="button" className="chip" aria-pressed={status === "made"} onClick={() => setStatus("made")}>
            ✅ Yaptıklarım
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn--block" disabled={pending}>
        {pending ? "Kaydediliyor…" : recipe ? "Değişiklikleri kaydet" : "Deftere ekle"}
      </button>
    </form>
  );
}
