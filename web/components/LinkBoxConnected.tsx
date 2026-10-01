"use client";

import { useRouter } from "next/navigation";
import { createImportJob } from "@/lib/actions/imports";
import LinkBox from "./LinkBox";

export default function LinkBoxConnected() {
  const router = useRouter();
  return (
    <LinkBox
      onSubmit={async (url) => {
        const r = await createImportJob(url);
        if (!r.ok) return r.error;
        if (r.duplicateRecipeId) {
          router.push(`/tarif/${r.duplicateRecipeId}`);
          return null;
        }
        router.refresh();
        return null;
      }}
    />
  );
}
