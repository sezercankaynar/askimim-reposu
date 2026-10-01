import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeDetail from "@/components/RecipeDetail";
import { getCookLogs, getRecipe } from "@/lib/recipes";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ yaptim?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const [recipe, logs, user] = await Promise.all([getRecipe(id), getCookLogs(id), getUser()]);
  if (!recipe) notFound();
  return (
    <main>
      <p style={{ margin: "0 0 8px" }}>
        <Link href="/defter" className="btn btn--soft" style={{ minHeight: 44 }}>
          ← Defter
        </Link>
      </p>
      <RecipeDetail recipe={recipe} logs={logs} userId={user?.id ?? ""} openMade={sp.yaptim === "1"} />
    </main>
  );
}
