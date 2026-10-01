"use client";

import { useState, useTransition } from "react";
import styles from "./LinkBox.module.css";

const URL_RE = /https?:\/\/[^\s]+/i;

export interface LinkBoxProps {
  /** Link gönderildiğinde çağrılır. Hata mesajı döner ya da null. */
  onSubmit?: (url: string) => Promise<string | null>;
}

export default function LinkBox({ onSubmit }: LinkBoxProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const canClipboard = typeof navigator !== "undefined" && !!navigator.clipboard?.readText;

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      const m = text.match(URL_RE);
      if (m) {
        setValue(m[0]);
        setError(null);
      } else {
        setError("Panoda bir link bulunamadı. Önce Instagram, TikTok veya YouTube'dan linki kopyalayın.");
      }
    } catch {
      setError("Panoya erişilemedi. Linki elle yapıştırabilirsiniz.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const m = value.match(URL_RE);
    if (!m) {
      setError("Geçerli bir link yapıştırın (http:// veya https:// ile başlamalı).");
      return;
    }
    if (!onSubmit) return;
    start(async () => {
      const err = await onSubmit(m[0]);
      if (err) setError(err);
      else {
        setValue("");
        setError(null);
      }
    });
  }

  return (
    <form className={styles.box} onSubmit={submit}>
      <label htmlFor="link" className={styles.title}>
        🔗 Tarif linki yapıştır
      </label>
      <p className={styles.hint}>Instagram, TikTok, YouTube, Pinterest veya bir tarif sitesi</p>
      <div className={styles.row}>
        <input
          id="link"
          className="input"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        {canClipboard && !value && (
          <button type="button" className="btn btn--soft" onClick={paste}>
            Yapıştır
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="notice notice--error" style={{ marginTop: 10, marginBottom: 0 }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn btn--block" disabled={pending || !value} style={{ marginTop: 12 }}>
        {pending ? "Ekleniyor…" : "Deftere ekle"}
      </button>
    </form>
  );
}
