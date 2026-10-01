import Link from "next/link";
import LinkBox from "@/components/LinkBox";
import RecipeCard from "@/components/RecipeCard";
import { SAMPLE_RECIPES } from "@/lib/sample";

export default function ContentsPage() {
  const recipes = SAMPLE_RECIPES;
  const made = recipes.filter((r) => r.status === "made");
  const todo = recipes.filter((r) => r.status === "todo");
  const recent = [...recipes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);

  return (
    <main>
      <LinkBox />
      <section className="paper">
        <h1>İçindekiler</h1>
        <ul className="toc">
          <li>
            <Link href="/defter/liste?durum=made">
              <span className="toc__name">✅ Yaptıklarım</span>
              <span className="toc__dots" />
              <span className="toc__num">{made.length}</span>
            </Link>
          </li>
          <li>
            <Link href="/defter/liste?durum=todo">
              <span className="toc__name">📌 Yapacaklarım</span>
              <span className="toc__dots" />
              <span className="toc__num">{todo.length}</span>
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
        <div className="grid-2" style={{ marginTop: 12 }}>
          {recent.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
