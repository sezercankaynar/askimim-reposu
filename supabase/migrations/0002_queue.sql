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
