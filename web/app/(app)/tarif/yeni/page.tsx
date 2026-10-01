import RecipeForm from "@/components/RecipeForm";
import { getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewRecipePage() {
  const user = await getUser();
  return (
    <main>
      <RecipeForm userId={user?.id ?? ""} />
    </main>
  );
}
