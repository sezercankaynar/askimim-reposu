"use client";

import { formatAmount } from "measure";
import { useOptimistic, useState, useTransition } from "react";
import { addManualItem, addRecipesToShopping, clearChecked, toggleShoppingItem } from "@/lib/actions/shopping";
import styles from "./ShoppingList.module.css";

export interface ShoppingItem {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  recipe_ids: string[];
  checked: boolean;
}

interface RecipeLite {
  id: string;
  title: string;
}

export default function ShoppingList({ items, recipes }: { items: ShoppingItem[]; recipes: RecipeLite[] }) {
  const [optimistic, setOptimistic] = useOptimistic(items, (state, patch: { id: string; checked: boolean }) =>
    state.map((i) => (i.id === patch.id ? { ...i, checked: patch.checked } : i)),
  );
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleById = new Map(recipes.map((r) => [r.id, r.title]));

  const open = optimistic.filter((i) => !i.checked);
  const done = optimistic.filter((i) => i.checked);

  function toggle(item: ShoppingItem) {
    start(async () => {
      setOptimistic({ id: item.id, checked: !item.checked });
      await toggleShoppingItem(item.id, !item.checked);
    });
  }

  function addSelected() {
    start(async () => {
      const r = await addRecipesToShopping(selected);
      if (!r.ok) setError(r.error ?? null);
      else {
        setSelected([]);
        setError(null);
      }
    });
  }

  return (
    <div>
      <details className={styles.picker}>
        <summary>➕ Tariflerden ekle</summary>
        <div className={styles.pickList}>
          {recipes.length === 0 && <p style={{ color: "var(--ink-soft)" }}>Henüz tarif yok.</p>}
          {recipes.map((r) => (
            <label key={r.id} className={styles.pick}>
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))}
              />
              <span>{r.title}</span>
            </label>
          ))}
          {recipes.length > 0 && (
            <button type="button" className="btn" disabled={pending || selected.length === 0} onClick={addSelected}>
              Seçilenlerin malzemelerini ekle ({selected.length})
            </button>
          )}
        </div>
      </details>

      <form
        className={styles.manual}
        onSubmit={(e) => {
          e.preventDefault();
          const v = manual;
          setManual("");
          start(() => addManualItem(v));
        }}
      >
        <input className="input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Elle ekle: ekmek, süt…" aria-label="Elle ekle" />
        <button type="submit" className="btn btn--soft" disabled={!manual.trim()}>
          Ekle
        </button>
      </form>

      {error && (
        <p role="alert" className="notice notice--error">
          {error}
        </p>
      )}

      {open.length === 0 && done.length === 0 && <p style={{ color: "var(--ink-soft)" }}>Liste boş. Yukarıdan tarif seçip malzemeleri ekle.</p>}

      <ul className={styles.list}>
        {open.map((i) => (
          <li key={i.id}>
            <label className={styles.item}>
              <input type="checkbox" checked={false} onChange={() => toggle(i)} />
              <span className={styles.itemText}>
                <span>
                  {i.amount != null && (
                    <strong>
                      {formatAmount(i.amount)} {i.unit ?? ""}{" "}
                    </strong>
                  )}
                  {i.name}
                </span>
                {i.recipe_ids.length > 0 && (
                  <small className={styles.from}>{i.recipe_ids.map((id) => titleById.get(id)).filter(Boolean).join(", ")}</small>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <div className={styles.doneHead}>
            <span>Alındı ({done.length})</span>
            <button type="button" className="btn btn--ghost" style={{ fontSize: 13 }} onClick={() => start(() => clearChecked())}>
              Temizle
            </button>
          </div>
          <ul className={`${styles.list} ${styles.doneList}`}>
            {done.map((i) => (
              <li key={i.id}>
                <label className={styles.item}>
                  <input type="checkbox" checked onChange={() => toggle(i)} />
                  <span className={styles.itemText}>
                    <span>
                      {i.amount != null && (
                        <strong>
                          {formatAmount(i.amount)} {i.unit ?? ""}{" "}
                        </strong>
                      )}
                      {i.name}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
