export type RecipeStatus = "todo" | "made";

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  amount_max?: number | null;
  unit: string | null;
  note?: string | null;
  group?: string | null;
  estimated?: boolean;
  confidence?: number;
  raw?: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  status: RecipeStatus;
  category: string;
  subcategory: string | null;
  servings: number | null;
  original_servings: number | null;
  time_text: string | null;
  ingredients: Ingredient[];
  steps: string[];
  notes: string | null;
  cover_path: string | null;
  cover_url?: string | null;
  source_url: string | null;
  source_platform: string | null;
  source_author: string | null;
  source_author_url: string | null;
  confidence: Record<string, number>;
  needs_review: boolean;
  made_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ImportStatus =
  | "queued"
  | "fetching"
  | "downloading"
  | "transcribing"
  | "reading_frames"
  | "writing"
  | "done"
  | "failed"
  | "duplicate";

export interface ImportJob {
  id: string;
  user_id: string;
  kind: "url" | "screenshots";
  url: string;
  normalized_url: string | null;
  platform: string | null;
  status: ImportStatus;
  progress: number;
  step_label: string | null;
  error: string | null;
  error_code: string | null;
  recipe_id: string | null;
  cost_usd: number | null;
  created_at: string;
}

export interface CookLog {
  id: string;
  recipe_id: string;
  made_at: string;
  photo_path: string | null;
  photo_url?: string | null;
  note: string | null;
}
