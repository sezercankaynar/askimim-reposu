import Link from "next/link";
import type { Recipe } from "@/lib/types";
import { categoryByName } from "@/lib/categories";

export default function RecipeCard({ recipe, index = 0 }: { recipe: Recipe; index?: number }) {
  const cat = categoryByName(recipe.category);
  const tilt = ["-1.5deg", "1deg", "-0.5deg", "1.5deg"][index % 4];
  return (
    <Link href={`/tarif/${recipe.id}`} className="polaroid" style={{ ["--tilt" as string]: tilt }}>
      <div className="polaroid__img">
        {recipe.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={recipe.cover_url} alt="" loading="lazy" />
        ) : (
          <span aria-hidden="true">{cat?.emoji ?? "🍽️"}</span>
        )}
      </div>
      <div className="polaroid__title">{recipe.title}</div>
      <div className="polaroid__meta">
        {recipe.needs_review && <span className="badge badge--review">Kontrol et</span>}
        {recipe.status === "made" && <span className="badge badge--made">Yaptım</span>}
        {!recipe.needs_review && recipe.status !== "made" && (recipe.time_text ?? cat?.name)}
      </div>
    </Link>
  );
}
