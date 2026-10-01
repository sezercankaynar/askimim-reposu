-- Tarif Defterim: tek seferde kurulum (0001_init + 0002_queue)
-- Supabase > SQL Editor > New query'ye yapıştırıp Run'a basın. Birden fazla kez çalıştırmak güvenlidir.

-- Tarif Defterim – temel şema
-- Supabase SQL Editor'da bu dosyayı olduğu gibi çalıştırın.

create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------- recipes ----------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'made')),
  category text not null default 'Diğer',
  subcategory text,
  servings integer,
  original_servings integer,
  time_text text,
  ingredients jsonb not null default '[]'::jsonb,
  steps text[] not null default '{}',
  notes text,
  cover_path text,
  source_url text,
  source_normalized_url text,
  source_platform text,
  source_author text,
  source_author_url text,
  confidence jsonb not null default '{}'::jsonb,
  needs_review boolean not null default false,
  made_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recipes_user_idx on public.recipes (user_id, created_at desc);
create index if not exists recipes_user_status_idx on public.recipes (user_id, status);
create unique index if not exists recipes_user_source_idx
  on public.recipes (user_id, source_normalized_url)
  where source_normalized_url is not null;

-- Arama: başlık + notlar + malzeme adları (tetikleyici ile güncel tutulur)
alter table public.recipes add column if not exists search_text text not null default '';

create or replace function public.recipes_search_text() returns trigger
language plpgsql as $$
begin
  new.search_text := lower(
    new.title || ' ' || coalesce(new.notes, '') || ' ' || (
      select coalesce(string_agg(i->>'name', ' '), '')
      from jsonb_array_elements(coalesce(new.ingredients, '[]'::jsonb)) i
    )
  );
  return new;
end $$;

drop trigger if exists recipes_search_text on public.recipes;
create trigger recipes_search_text before insert or update of title, notes, ingredients on public.recipes
  for each row execute function public.recipes_search_text();

create index if not exists recipes_search_idx on public.recipes using gin (to_tsvector('simple', search_text));

-- ---------- import_jobs ----------
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'url' check (kind in ('url', 'screenshots')),
  url text not null,
  normalized_url text,
  platform text,
  status text not null default 'queued' check (status in (
    'queued', 'fetching', 'downloading', 'transcribing', 'reading_frames', 'writing',
    'done', 'failed', 'duplicate'
  )),
  progress integer not null default 0 check (progress between 0 and 100),
  step_label text,
  error text,
  error_code text,
  recipe_id uuid references public.recipes(id) on delete set null,
  target_status text not null default 'todo' check (target_status in ('todo', 'made')),
  upload_paths text[] not null default '{}',
  attempts integer not null default 0,
  locked_at timestamptz,
  locked_by text,
  started_at timestamptz,
  finished_at timestamptz,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  transcribe_seconds numeric not null default 0,
  cost_usd numeric(10, 5),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists import_jobs_user_idx on public.import_jobs (user_id, created_at desc);
create index if not exists import_jobs_queue_idx on public.import_jobs (status, created_at) where status = 'queued';

-- ---------- cook_logs ----------
create table if not exists public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  made_at timestamptz not null default now(),
  photo_path text,
  note text
);
create index if not exists cook_logs_recipe_idx on public.cook_logs (recipe_id, made_at desc);

-- ---------- shopping_items ----------
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric,
  unit text,
  recipe_ids uuid[] not null default '{}',
  checked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists shopping_items_user_idx on public.shopping_items (user_id, created_at);

-- ---------- updated_at tetikleyicisi ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.recipes enable row level security;
alter table public.import_jobs enable row level security;
alter table public.cook_logs enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists "recipes own" on public.recipes;
create policy "recipes own" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "import_jobs own" on public.import_jobs;
create policy "import_jobs own" on public.import_jobs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "cook_logs own" on public.cook_logs;
create policy "cook_logs own" on public.cook_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shopping_items own" on public.shopping_items;
create policy "shopping_items own" on public.shopping_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: import_jobs değişikliklerini arayüze yayınla
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'import_jobs'
  ) then
    alter publication supabase_realtime add table public.import_jobs;
  end if;
end $$;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', false), ('cook-photos', 'cook-photos', false), ('import-uploads', 'import-uploads', false)
on conflict (id) do nothing;

-- Her kullanıcı yalnızca kendi klasörüne ({user_id}/...) erişir
drop policy if exists "storage own read" on storage.objects;
create policy "storage own read" on storage.objects for select
  using (bucket_id in ('covers', 'cook-photos', 'import-uploads') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage own write" on storage.objects;
create policy "storage own write" on storage.objects for insert
  with check (bucket_id in ('covers', 'cook-photos', 'import-uploads') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage own update" on storage.objects;
create policy "storage own update" on storage.objects for update
  using (bucket_id in ('covers', 'cook-photos', 'import-uploads') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "storage own delete" on storage.objects;
create policy "storage own delete" on storage.objects for delete
  using (bucket_id in ('covers', 'cook-photos', 'import-uploads') and (storage.foldername(name))[1] = auth.uid()::text);

-- İş kuyruğu fonksiyonları. Worker bunları service_role anahtarıyla çağırır.

-- Sıradaki işi kilitleyip al (aynı anda birden çok worker güvenle çalışabilir)
create or replace function public.claim_import_job(worker_id text, stale_after_seconds integer default 600)
returns setof public.import_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.import_jobs;
begin
  -- Takılı kalmış işleri (worker çökmüş vb.) kuyruğa geri al
  update public.import_jobs
     set status = 'queued', locked_at = null, locked_by = null
   where status not in ('queued', 'done', 'failed', 'duplicate')
     and locked_at is not null
     and locked_at < now() - make_interval(secs => stale_after_seconds)
     and attempts < 3;

  update public.import_jobs
     set status = 'failed',
         error = 'İşlem birkaç kez yarıda kaldı. Linki tekrar ekleyip deneyin.',
         error_code = 'STALE',
         finished_at = now()
   where status not in ('queued', 'done', 'failed', 'duplicate')
     and locked_at is not null
     and locked_at < now() - make_interval(secs => stale_after_seconds)
     and attempts >= 3;

  select * into job
    from public.import_jobs
   where status = 'queued'
   order by created_at
   for update skip locked
   limit 1;

  if job.id is null then
    return;
  end if;

  update public.import_jobs
     set status = 'fetching',
         progress = 5,
         step_label = 'Link inceleniyor',
         locked_at = now(),
         locked_by = worker_id,
         started_at = coalesce(started_at, now()),
         attempts = attempts + 1
   where id = job.id
   returning * into job;

  return next job;
end $$;

-- Günlük limit: son 24 saatte açılan iş sayısı
create or replace function public.imports_last_24h(p_user uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.import_jobs
   where user_id = p_user and created_at > now() - interval '24 hours';
$$;

-- Yeni iş eklendiğinde worker'ı uyandırmak için NOTIFY
create or replace function public.notify_import_job() returns trigger
language plpgsql as $$
begin
  perform pg_notify('import_jobs', new.id::text);
  return new;
end $$;

drop trigger if exists import_jobs_notify on public.import_jobs;
create trigger import_jobs_notify after insert on public.import_jobs
  for each row execute function public.notify_import_job();

grant execute on function public.claim_import_job(text, integer) to service_role;
grant execute on function public.imports_last_24h(uuid) to authenticated, service_role;
