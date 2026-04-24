create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  full_name text not null,
  business_name text not null,
  phone text not null,
  whatsapp_phone text not null,
  email text not null,
  timezone text not null default 'America/Sao_Paulo',
  plan_tier text not null default 'mvp',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_professional_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.professionals
  where auth_user_id = auth.uid()
  limit 1;
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  city text,
  instagram_handle text,
  lifecycle_stage text not null default 'lead',
  priority_score integer not null default 50 check (priority_score between 0 and 100),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (professional_id, phone)
);

create table public.client_events (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  event_type text not null,
  event_date timestamptz not null,
  location text,
  status text not null default 'lead',
  guest_count integer,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.client_events(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.client_media (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.client_events(id) on delete cascade,
  file_name text not null,
  media_type text not null,
  mime_type text not null,
  storage_path text not null,
  size_bytes bigint,
  caption text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  base_price numeric(12,2) not null default 0,
  duration_minutes integer not null default 60,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  name text not null,
  channel text not null default 'whatsapp',
  template_type text not null default 'custom',
  body text not null,
  variables jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid not null references public.client_events(id) on delete cascade,
  status text not null default 'draft',
  currency text not null default 'BRL',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  valid_until timestamptz,
  sent_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  budget_id uuid not null references public.budgets(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total_price numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.client_events(id) on delete set null,
  title text not null,
  appointment_type text not null,
  status text not null default 'scheduled',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  notes text,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid not null references public.client_events(id) on delete cascade,
  current_version_id uuid,
  status text not null default 'draft',
  signed_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_number integer not null,
  file_name text not null,
  storage_path text not null,
  file_size_bytes bigint,
  uploaded_at timestamptz not null default timezone('utc', now()),
  uploaded_by uuid,
  status text not null default 'uploaded',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (contract_id, version_number)
);

alter table public.contracts
  add constraint contracts_current_version_id_fkey
  foreign key (current_version_id)
  references public.contract_versions(id)
  on delete set null;

create table public.client_documents (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.client_events(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null default 'whatsapp',
  external_thread_id text,
  last_message_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (professional_id, client_id, channel)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  direction text not null,
  channel text not null default 'whatsapp',
  body text not null,
  template_id uuid references public.message_templates(id) on delete set null,
  external_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  channel text not null default 'whatsapp',
  template_id uuid references public.message_templates(id) on delete set null,
  event_offset_minutes integer not null default 0,
  is_active boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  automation_rule_id uuid references public.automation_rules(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.client_events(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  channel text not null default 'whatsapp',
  status text not null default 'scheduled',
  scheduled_for timestamptz not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.customer_scores (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  priority_score integer not null default 50 check (priority_score between 0 and 100),
  budget_potential_score integer not null default 50 check (budget_potential_score between 0 and 100),
  engagement_score integer not null default 50 check (engagement_score between 0 and 100),
  no_show_risk_score integer not null default 0 check (no_show_risk_score between 0 and 100),
  last_calculated_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (professional_id, client_id)
);

create index clients_professional_priority_idx on public.clients (professional_id, priority_score desc);
create index clients_professional_phone_idx on public.clients (professional_id, phone);
create index client_events_professional_date_idx on public.client_events (professional_id, event_date);
create index budgets_professional_status_idx on public.budgets (professional_id, status);
create index appointments_professional_starts_idx on public.appointments (professional_id, starts_at);
create index contracts_professional_status_idx on public.contracts (professional_id, status);
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);
create index notification_logs_professional_scheduled_idx on public.notification_logs (professional_id, scheduled_for);

create trigger set_professionals_updated_at before update on public.professionals for each row execute function public.set_updated_at();
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger set_client_events_updated_at before update on public.client_events for each row execute function public.set_updated_at();
create trigger set_client_notes_updated_at before update on public.client_notes for each row execute function public.set_updated_at();
create trigger set_client_media_updated_at before update on public.client_media for each row execute function public.set_updated_at();
create trigger set_services_updated_at before update on public.services for each row execute function public.set_updated_at();
create trigger set_message_templates_updated_at before update on public.message_templates for each row execute function public.set_updated_at();
create trigger set_budgets_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger set_budget_items_updated_at before update on public.budget_items for each row execute function public.set_updated_at();
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();
create trigger set_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger set_contract_versions_updated_at before update on public.contract_versions for each row execute function public.set_updated_at();
create trigger set_client_documents_updated_at before update on public.client_documents for each row execute function public.set_updated_at();
create trigger set_conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger set_messages_updated_at before update on public.messages for each row execute function public.set_updated_at();
create trigger set_automation_rules_updated_at before update on public.automation_rules for each row execute function public.set_updated_at();
create trigger set_notification_logs_updated_at before update on public.notification_logs for each row execute function public.set_updated_at();
create trigger set_customer_scores_updated_at before update on public.customer_scores for each row execute function public.set_updated_at();

alter table public.professionals enable row level security;
create policy "professionals_select_own"
  on public.professionals
  for select
  using (auth_user_id = auth.uid());
create policy "professionals_insert_own"
  on public.professionals
  for insert
  with check (auth_user_id = auth.uid());
create policy "professionals_update_own"
  on public.professionals
  for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

do $$
declare
  tenant_table text;
begin
  foreach tenant_table in array array[
    'clients',
    'client_events',
    'client_notes',
    'client_media',
    'services',
    'message_templates',
    'budgets',
    'budget_items',
    'appointments',
    'contracts',
    'contract_versions',
    'client_documents',
    'conversations',
    'messages',
    'automation_rules',
    'notification_logs',
    'customer_scores'
  ]
  loop
    execute format('alter table public.%I enable row level security', tenant_table);
    execute format(
      'create policy "%I_select" on public.%I for select using (professional_id = public.current_professional_id())',
      tenant_table,
      tenant_table
    );
    execute format(
      'create policy "%I_insert" on public.%I for insert with check (professional_id = public.current_professional_id())',
      tenant_table,
      tenant_table
    );
    execute format(
      'create policy "%I_update" on public.%I for update using (professional_id = public.current_professional_id()) with check (professional_id = public.current_professional_id())',
      tenant_table,
      tenant_table
    );
    execute format(
      'create policy "%I_delete" on public.%I for delete using (professional_id = public.current_professional_id())',
      tenant_table,
      tenant_table
    );
  end loop;
end
$$;

insert into storage.buckets (id, name, public)
values
  ('client-media', 'client-media', false),
  ('contracts', 'contracts', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "storage_read_tenant"
  on storage.objects
  for select
  using (
    bucket_id in ('client-media', 'contracts', 'documents')
    and split_part(name, '/', 1) = coalesce(public.current_professional_id()::text, '')
  );

create policy "storage_insert_tenant"
  on storage.objects
  for insert
  with check (
    bucket_id in ('client-media', 'contracts', 'documents')
    and split_part(name, '/', 1) = coalesce(public.current_professional_id()::text, '')
  );

create policy "storage_update_tenant"
  on storage.objects
  for update
  using (
    bucket_id in ('client-media', 'contracts', 'documents')
    and split_part(name, '/', 1) = coalesce(public.current_professional_id()::text, '')
  )
  with check (
    bucket_id in ('client-media', 'contracts', 'documents')
    and split_part(name, '/', 1) = coalesce(public.current_professional_id()::text, '')
  );

create policy "storage_delete_tenant"
  on storage.objects
  for delete
  using (
    bucket_id in ('client-media', 'contracts', 'documents')
    and split_part(name, '/', 1) = coalesce(public.current_professional_id()::text, '')
  );
