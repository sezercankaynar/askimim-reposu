"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Cover.module.css";

export default function Cover() {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  function open() {
    if (opening) return;
    setOpening(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => router.push("/defter"), reduce ? 50 : 900);
  }

  return (
    <main className={styles.scene}>
      <div className={`${styles.book} ${opening ? styles.open : ""}`}>
        <div className={styles.pages} aria-hidden="true" />
        <div className={styles.cover}>
          <div className={styles.frame}>
            <div className={styles.label}>
              <span className={styles.labelTop}>Tarif</span>
              <span className={styles.labelMain}>Defterim</span>
              <span className={`hand ${styles.labelSub}`}>linkten tarife, elle yazmadan</span>
            </div>
            <button type="button" className={styles.openBtn} onClick={open} disabled={opening}>
              {opening ? "Açılıyor…" : "Defteri aç"}
            </button>
          </div>
          <div className={styles.spine} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
