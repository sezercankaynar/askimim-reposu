import { notFound } from "next/navigation";
import CookMode from "@/components/CookMode";
import { getRecipe } from "@/lib/recipes";

export const dynamic = "force-dynamic";

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();
  return <CookMode recipe={recipe} />;
}
