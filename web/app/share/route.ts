import { NextResponse } from "next/server";
import { createImportJob } from "@/lib/actions/imports";
import { getUser } from "@/lib/supabase/server";

const URL_RE = /https?:\/\/[^\s]+/i;

/**
 * Web Share Target: Android'de "Paylaş → Tarif Defterim".
 * Manifest GET ile title/text/url gönderir; linki bulup import başlatırız.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const candidates = [searchParams.get("url"), searchParams.get("text"), searchParams.get("title")];
  const found = candidates.map((c) => c?.match(URL_RE)?.[0]).find(Boolean);

  if (!found) return NextResponse.redirect(`${origin}/defter?paylasim=linkyok`);

  const user = await getUser();
  if (!user) {
    const next = `/share?url=${encodeURIComponent(found)}`;
    return NextResponse.redirect(`${origin}/giris?next=${encodeURIComponent(next)}`);
  }

  const r = await createImportJob(found);
  if (!r.ok) return NextResponse.redirect(`${origin}/defter?paylasim=hata&mesaj=${encodeURIComponent(r.error)}`);
  if (r.duplicateRecipeId) return NextResponse.redirect(`${origin}/tarif/${r.duplicateRecipeId}`);
  return NextResponse.redirect(`${origin}/defter?job=${r.jobId}`);
}
