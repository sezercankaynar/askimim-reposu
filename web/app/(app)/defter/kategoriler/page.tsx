import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { countByCategory } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const counts = await countByCategory();
  return (
    <main>
      <section className="paper">
        <h1>Kategoriler</h1>
        <ul className="toc">
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={`/defter/kategoriler/${c.slug}`}>
                <span className="toc__name">
                  {c.emoji} {c.name}
                </span>
                <span className="toc__dots" />
                <span className="toc__num">{counts[c.name] ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
