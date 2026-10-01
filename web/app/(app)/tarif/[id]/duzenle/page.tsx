import { notFound } from "next/navigation";
import RecipeForm from "@/components/RecipeForm";
import { getRecipe } from "@/lib/recipes";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, user] = await Promise.all([getRecipe(id), getUser()]);
  if (!recipe) notFound();
  return (
    <main>
      <RecipeForm recipe={recipe} userId={user?.id ?? ""} />
    </main>
  );
}
