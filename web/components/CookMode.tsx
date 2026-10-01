"use client";

import { formatAmount } from "measure";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { findTimers, formatSeconds } from "@/lib/timers";
import type { Recipe } from "@/lib/types";
import styles from "./CookMode.module.css";

interface Timer {
  id: string;
  label: string;
  total: number;
  endsAt: number;
  done: boolean;
}

function alarm(audioRef: React.RefObject<AudioContext | null>) {
  navigator.vibrate?.([300, 150, 300, 150, 600]);
  try {
    const ctx = (audioRef.current ??= new AudioContext());
    for (let k = 0; k < 3; k++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime + k * 0.35;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
      o.start(t0);
      o.stop(t0 + 0.32);
    }
  } catch {
    // ses desteklenmiyor
  }
}

/** Tam ekran, büyük yazılı adım adım pişirme modu. Wake Lock + otomatik zamanlayıcılar. */
export default function CookMode({ recipe }: { recipe: Recipe }) {
  const [idx, setIdx] = useState(-1); // -1 = malzemeler
  const [timers, setTimers] = useState<Timer[]>([]);
  const [now, setNow] = useState(0);
  const [wake, setWake] = useState<"on" | "off" | "unsupported">("off");
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const steps = recipe.steps;
  const total = steps.length;

  // Wake Lock: ekran kapanmasın
  const requestWake = useCallback(() => {
    if (!("wakeLock" in navigator)) {
      Promise.resolve().then(() => setWake("unsupported"));
      return;
    }
    navigator.wakeLock
      .request("screen")
      .then((lock) => {
        wakeRef.current = lock;
        setWake("on");
        lock.addEventListener("release", () => {
          wakeRef.current = null;
          setWake("off");
        });
      })
      .catch(() => setWake("off"));
  }, []);

  useEffect(() => {
    const id = setTimeout(requestWake, 0);
    const onVis = () => {
      if (document.visibilityState === "visible" && !wakeRef.current) requestWake();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearTimeout(id);
      document.removeEventListener("visibilitychange", onVis);
      wakeRef.current?.release().catch(() => {});
    };
  }, [requestWake]);

  // Zamanlayıcı saati: her 500 ms'de bir güncelle, süresi dolanları bitir ve uyar
  const hasActive = timers.some((t) => !t.done);
  useEffect(() => {
    if (!hasActive) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      setTimers((ts) => {
        const finished = ts.filter((x) => !x.done && x.endsAt <= t);
        if (finished.length === 0) return ts;
        alarm(audioRef);
        return ts.map((x) => (finished.some((f) => f.id === x.id) ? { ...x, done: true } : x));
      });
    };
    const i = setInterval(tick, 500);
    return () => clearInterval(i);
  }, [hasActive]);

  function startTimer(label: string, seconds: number) {
    audioRef.current ??= new AudioContext(); // kullanıcı jestiyle ses iznini al
    setTimers((ts) => [...ts, { id: Math.random().toString(36).slice(2), label, total: seconds, endsAt: Date.now() + seconds * 1000, done: false }]);
  }

  const step = idx >= 0 ? steps[idx] : null;
  const stepTimers = step ? findTimers(step) : [];

  return (
    <div className={styles.screen}>
      <header className={styles.top}>
        <Link href={`/tarif/${recipe.id}`} className={styles.exit} aria-label="Pişirme modundan çık">
          ✕
        </Link>
        <div className={styles.title}>{recipe.title}</div>
        <div className={styles.wake} title={wake === "on" ? "Ekran açık kalacak" : "Ekran kilidi yok"}>
          {wake === "on" ? "☀️" : wake === "unsupported" ? "" : "🌙"}
        </div>
      </header>

      {timers.length > 0 && (
        <div className={styles.timers}>
          {timers.map((t) => {
            const left = now === 0 ? t.total : Math.max(0, Math.ceil((t.endsAt - now) / 1000));
            return (
              <div key={t.id} className={`${styles.timer} ${t.done ? styles.timerDone : ""}`} role="timer" aria-live="off">
                <span>{t.label}</span>
                <strong>{t.done ? "Bitti!" : formatSeconds(left)}</strong>
                <button type="button" aria-label="Zamanlayıcıyı kaldır" onClick={() => setTimers((ts) => ts.filter((x) => x.id !== t.id))}>
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <main className={styles.body}>
        {idx === -1 ? (
          <>
            <h2 className={styles.stepNo}>Malzemeler</h2>
            <ul className={styles.ingList}>
              {recipe.ingredients.map((i) => (
                <li key={i.id}>
                  <strong>
                    {formatAmount(i.amount)} {i.unit ?? ""}
                  </strong>{" "}
                  {i.name}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h2 className={styles.stepNo}>
              Adım {idx + 1} / {total}
            </h2>
            <p className={styles.stepText}>{step}</p>
            {stepTimers.length > 0 && (
              <div className={styles.timerBtns}>
                {stepTimers.map((t) => (
                  <button key={t.text} type="button" className="btn btn--soft" onClick={() => startTimer(`Adım ${idx + 1}: ${t.text}`, t.seconds)}>
                    ⏱ {t.text} başlat
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className={styles.nav}>
        <button type="button" className={styles.navBtn} onClick={() => setIdx((i) => Math.max(-1, i - 1))} disabled={idx === -1}>
          ← Geri
        </button>
        <div className={styles.dots} aria-hidden="true">
          {steps.map((_, i) => (
            <span key={i} className={i === idx ? styles.dotOn : styles.dot} />
          ))}
        </div>
        {idx < total - 1 ? (
          <button type="button" className={`${styles.navBtn} ${styles.navPrimary}`} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
            {idx === -1 ? "Başla →" : "İleri →"}
          </button>
        ) : (
          <Link href={`/tarif/${recipe.id}?yaptim=1`} className={`${styles.navBtn} ${styles.navPrimary}`}>
            Bitti ✅
          </Link>
        )}
      </footer>
    </div>
  );
}
