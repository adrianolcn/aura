create table if not exists public.automation_dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  trigger_source text not null default 'scheduler',
  execution_key text not null,
  status text not null default 'running',
  processed_count integer not null default 0,
  skipped_count integer not null default 0,
  failed_count integer not null default 0,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (professional_id, execution_key)
);

create index if not exists automation_dispatch_runs_professional_started_idx
  on public.automation_dispatch_runs (professional_id, started_at desc);

create index if not exists automation_dispatch_runs_metadata_gin_idx
  on public.automation_dispatch_runs
  using gin (metadata);

create trigger set_automation_dispatch_runs_updated_at
before update on public.automation_dispatch_runs
for each row execute function public.set_updated_at();

alter table public.automation_dispatch_runs enable row level security;

create policy "automation_dispatch_runs_select"
  on public.automation_dispatch_runs
  for select
  using (professional_id = public.current_professional_id());

create policy "automation_dispatch_runs_insert"
  on public.automation_dispatch_runs
  for insert
  with check (professional_id = public.current_professional_id());

create policy "automation_dispatch_runs_update"
  on public.automation_dispatch_runs
  for update
  using (professional_id = public.current_professional_id())
  with check (professional_id = public.current_professional_id());

create policy "automation_dispatch_runs_delete"
  on public.automation_dispatch_runs
  for delete
  using (professional_id = public.current_professional_id());
