import Link from "next/link";
import LinkBoxConnected from "@/components/LinkBoxConnected";
import RecipeCard from "@/components/RecipeCard";
import ImportProgress from "@/components/ImportProgress";
import { countByStatus, listActiveImports, listRecipes } from "@/lib/recipes";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ContentsPage({ searchParams }: { searchParams: Promise<{ paylasim?: string; mesaj?: string; sifre?: string }> }) {
  const sp = await searchParams;
  const [counts, recent, imports, user] = await Promise.all([countByStatus(), listRecipes(), listActiveImports(), getUser()]);
  const latest = recent.slice(0, 6);

  return (
    <main>
      <LinkBoxConnected />
      {sp.paylasim === "linkyok" && (
        <p role="alert" className="notice notice--warn">
          Paylaşılan içerikte bir link bulunamadı.
        </p>
      )}
      {sp.paylasim === "hata" && (
        <p role="alert" className="notice notice--error">
          {sp.mesaj ?? "Link eklenemedi."}
        </p>
      )}
      {sp.sifre === "ok" && <p className="notice notice--ok">Şifren kaydedildi. Artık e-posta ve şifreyle giriş yapabilirsin.</p>}
      <ImportProgress initial={imports} userId={user?.id ?? ""} />
      <section className="paper">
        <h1>İçindekiler</h1>
        <ul className="toc">
          <li>
            <Link href="/defter/liste?durum=made">
              <span className="toc__name">✅ Yaptıklarım</span>
              <span className="toc__dots" />
              <span className="toc__num">{counts.made}</span>
            </Link>
          </li>
          <li>
            <Link href="/defter/liste?durum=todo">
              <span className="toc__name">📌 Yapacaklarım</span>
              <span className="toc__dots" />
              <span className="toc__num">{counts.todo}</span>
            </Link>
          </li>
          <li>
            <Link href="/defter/kategoriler">
              <span className="toc__name">🗂️ Kategoriler</span>
              <span className="toc__dots" />
              <span className="toc__num">11</span>
            </Link>
          </li>
        </ul>

        <h2 style={{ marginTop: 24 }}>Son eklenenler</h2>
        {latest.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>
            Defter henüz boş. Yukarıya bir link yapıştır ya da{" "}
            <Link href="/tarif/yeni" style={{ textDecoration: "underline" }}>
              elle tarif ekle
            </Link>
            .
          </p>
        ) : (
          <div className="grid-2" style={{ marginTop: 12 }}>
            {latest.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        )}
        <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Link href="/hesap/sifre" className="btn btn--ghost" style={{ fontSize: 13 }}>
            Şifre değiştir
          </Link>
          <form action="/auth/cikis" method="post">
            <button type="submit" className="btn btn--ghost" style={{ fontSize: 13 }}>
              Çıkış yap
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
