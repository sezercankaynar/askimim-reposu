import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import SearchBox from "@/components/SearchBox";
import { listRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function ListPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; q?: string; elimde?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.durum === "made" ? "made" : sp.durum === "todo" ? "todo" : undefined;
  const have = sp.elimde
    ? sp.elimde
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;
  const recipes = await listRecipes({ status, q: sp.q?.trim() || undefined, have });
  const title = status === "made" ? "✅ Yaptıklarım" : status === "todo" ? "📌 Yapacaklarım" : "Tüm tarifler";
  const base = status ? `?durum=${status}` : "?";

  return (
    <main>
      <section className="paper">
        <h1>{title}</h1>
        <div className="chip-row" role="group" aria-label="Durum">
          <Link href="/defter/liste" className="chip" aria-pressed={!status}>
            Tümü
          </Link>
          <Link href="/defter/liste?durum=todo" className="chip" aria-pressed={status === "todo"}>
            Yapacaklarım
          </Link>
          <Link href="/defter/liste?durum=made" className="chip" aria-pressed={status === "made"}>
            Yaptıklarım
          </Link>
        </div>
        <SearchBox q={sp.q ?? ""} elimde={sp.elimde ?? ""} base={base} />
        {recipes.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>Eşleşen tarif bulunamadı.</p>
        ) : (
          <div className="grid-2" style={{ marginTop: 12 }}>
            {recipes.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
