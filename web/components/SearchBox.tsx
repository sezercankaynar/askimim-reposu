"use client";

import { useState } from "react";

export default function SearchBox({ q, elimde, base }: { q: string; elimde: string; base: string }) {
  const [mode, setMode] = useState<"q" | "elimde">(elimde ? "elimde" : "q");
  return (
    <form method="get" action="/defter/liste" style={{ margin: "8px 0 16px" }}>
      {base.includes("durum=") && <input type="hidden" name="durum" value={base.split("durum=")[1]} />}
      <div className="chip-row" role="group" aria-label="Arama türü">
        <button type="button" className="chip" aria-pressed={mode === "q"} onClick={() => setMode("q")}>
          🔎 Başlık / malzeme
        </button>
        <button type="button" className="chip" aria-pressed={mode === "elimde"} onClick={() => setMode("elimde")}>
          🧺 Elimdekilerle ne yapabilirim?
        </button>
      </div>
      {mode === "q" ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" name="q" defaultValue={q} placeholder="örn. mercimek, kek…" aria-label="Ara" />
          <button type="submit" className="btn">
            Ara
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            name="elimde"
            defaultValue={elimde}
            placeholder="virgülle ayır: yumurta, un, süt"
            aria-label="Elimdeki malzemeler"
          />
          <button type="submit" className="btn">
            Bul
          </button>
        </div>
      )}
    </form>
  );
}
