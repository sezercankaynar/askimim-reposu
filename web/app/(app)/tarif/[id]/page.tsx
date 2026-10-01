import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeDetail from "@/components/RecipeDetail";
import { getCookLogs, getRecipe } from "@/lib/recipes";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, logs, user] = await Promise.all([getRecipe(id), getCookLogs(id), getUser()]);
  if (!recipe) notFound();
  return (
    <main>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/defter" className="btn btn--soft" style={{ minHeight: 40 }}>
          ← Defter
        </Link>
      </p>
      <RecipeDetail recipe={recipe} logs={logs} userId={user?.id ?? ""} />
    </main>
  );
}
