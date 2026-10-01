import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import { categoryBySlug } from "@/lib/categories";
import { listRecipes } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ alt?: string }>;
}) {
  const { slug } = await params;
  const { alt } = await searchParams;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();
  const recipes = await listRecipes({ category: cat.name, subcategory: alt || undefined });
  return (
    <main>
      <section className="paper">
        <h1>
          {cat.emoji} {cat.name}
        </h1>
        <div className="chip-row" role="group" aria-label="Alt kategori">
          <Link href={`/defter/kategoriler/${slug}`} className="chip" aria-pressed={!alt}>
            Tümü
          </Link>
          {cat.subs.map((s) => (
            <Link key={s} href={`/defter/kategoriler/${slug}?alt=${encodeURIComponent(s)}`} className="chip" aria-pressed={alt === s}>
              {s}
            </Link>
          ))}
        </div>
        {recipes.length === 0 ? (
          <p style={{ color: "var(--ink-soft)" }}>Bu kategoride henüz tarif yok.</p>
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
