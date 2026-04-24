create or replace function public.normalize_phone(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(coalesce(value, ''), '\D', '', 'g')
$$;

create or replace function public.find_client_by_phone(
  professional_uuid uuid,
  phone_value text
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.clients
  where professional_id = professional_uuid
    and phone_normalized = public.normalize_phone(phone_value)
  order by updated_at desc, created_at desc
  limit 1
$$;

alter table public.professionals
  add column if not exists whatsapp_phone_number_id text,
  add column if not exists whatsapp_business_account_id text;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'professionals'
      and column_name = 'whatsapp_phone_normalized'
  ) then
    execute '
      alter table public.professionals
      add column whatsapp_phone_normalized text
      generated always as (public.normalize_phone(whatsapp_phone)) stored
    ';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clients'
      and column_name = 'phone_normalized'
  ) then
    execute '
      alter table public.clients
      add column phone_normalized text
      generated always as (public.normalize_phone(phone)) stored
    ';
  end if;
end
$$;

create index if not exists professionals_whatsapp_phone_number_id_idx
  on public.professionals (whatsapp_phone_number_id);

create index if not exists professionals_whatsapp_phone_normalized_idx
  on public.professionals (whatsapp_phone_normalized);

create index if not exists clients_professional_phone_normalized_idx
  on public.clients (professional_id, phone_normalized);

alter table public.conversations
  add column if not exists client_phone text,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists last_outbound_at timestamptz,
  add column if not exists last_message_preview text,
  add column if not exists last_message_direction text,
  add column if not exists last_message_status text;

alter table public.messages
  add column if not exists message_type text not null default 'text',
  add column if not exists status text not null default 'pending',
  add column if not exists template_name text,
  add column if not exists template_language text,
  add column if not exists error_message text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

alter table public.message_templates
  add column if not exists external_template_name text,
  add column if not exists language_code text not null default 'pt_BR',
  add column if not exists category text not null default 'utility',
  add column if not exists parameter_schema jsonb not null default '[]'::jsonb,
  add column if not exists requires_opt_in boolean not null default true;

alter table public.automation_rules
  add column if not exists automation_kind text not null default 'manual',
  add column if not exists requires_opt_in boolean not null default true;

alter table public.notification_logs
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists template_id uuid references public.message_templates(id) on delete set null,
  add column if not exists execution_kind text not null default 'manual',
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.communication_opt_ins (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  channel text not null default 'whatsapp',
  status text not null default 'pending',
  source text not null default 'manual',
  granted_at timestamptz,
  revoked_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (professional_id, client_id, channel)
);

create table if not exists public.message_status_events (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  external_message_id text,
  status text not null,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  channel text not null default 'whatsapp',
  direction text not null default 'system',
  log_type text not null,
  event_key text not null,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (channel, event_key)
);

create index if not exists conversations_professional_last_message_idx
  on public.conversations (professional_id, last_message_at desc);

create index if not exists messages_professional_client_created_idx
  on public.messages (professional_id, client_id, created_at desc);

create unique index if not exists messages_professional_external_message_idx
  on public.messages (professional_id, channel, external_message_id)
  where external_message_id is not null;

create index if not exists message_status_events_message_occurred_idx
  on public.message_status_events (message_id, occurred_at desc);

create index if not exists integration_logs_professional_created_idx
  on public.integration_logs (professional_id, created_at desc);

create unique index if not exists notification_logs_professional_idempotency_idx
  on public.notification_logs (professional_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists automation_rules_professional_active_idx
  on public.automation_rules (professional_id, is_active, trigger_type);

update public.conversations conversation
set client_phone = clients.phone
from public.clients clients
where conversation.client_id = clients.id
  and conversation.client_phone is null;

update public.messages
set message_type = case
    when template_id is not null then 'template'
    else 'text'
  end,
  template_name = coalesce(template_name, null),
  template_language = coalesce(template_language, 'pt_BR'),
  status = case
    when failed_at is not null then 'failed'
    when read_at is not null then 'read'
    when delivered_at is not null then 'delivered'
    when sent_at is not null then 'sent'
    when direction = 'inbound' then 'received'
    else 'pending'
  end
where true;

update public.conversations conversation
set
  last_message_at = latest.created_at,
  last_message_preview = latest.body,
  last_message_direction = latest.direction,
  last_message_status = latest.status,
  last_inbound_at = inbound.last_inbound_at,
  last_outbound_at = outbound.last_outbound_at
from lateral (
  select body, direction, status, created_at
  from public.messages message
  where message.conversation_id = conversation.id
  order by message.created_at desc
  limit 1
) latest
left join lateral (
  select max(created_at) as last_inbound_at
  from public.messages message
  where message.conversation_id = conversation.id
    and message.direction = 'inbound'
) inbound on true
left join lateral (
  select max(created_at) as last_outbound_at
  from public.messages message
  where message.conversation_id = conversation.id
    and message.direction = 'outbound'
) outbound on true
where true;

update public.message_templates
set
  parameter_schema = case
    when jsonb_typeof(variables) = 'array' then variables
    else '[]'::jsonb
  end,
  requires_opt_in = case
    when template_type = 'custom' then false
    else true
  end,
  category = case
    when template_type in ('follow_up', 'budget') then 'utility'
    else category
  end
where true;

create trigger set_communication_opt_ins_updated_at
before update on public.communication_opt_ins
for each row execute function public.set_updated_at();

create trigger set_message_status_events_updated_at
before update on public.message_status_events
for each row execute function public.set_updated_at();

create trigger set_integration_logs_updated_at
before update on public.integration_logs
for each row execute function public.set_updated_at();

alter table public.communication_opt_ins enable row level security;
alter table public.message_status_events enable row level security;
alter table public.integration_logs enable row level security;

create policy "communication_opt_ins_select"
  on public.communication_opt_ins
  for select
  using (professional_id = public.current_professional_id());

create policy "communication_opt_ins_insert"
  on public.communication_opt_ins
  for insert
  with check (professional_id = public.current_professional_id());

create policy "communication_opt_ins_update"
  on public.communication_opt_ins
  for update
  using (professional_id = public.current_professional_id())
  with check (professional_id = public.current_professional_id());

create policy "communication_opt_ins_delete"
  on public.communication_opt_ins
  for delete
  using (professional_id = public.current_professional_id());

create policy "message_status_events_select"
  on public.message_status_events
  for select
  using (professional_id = public.current_professional_id());

create policy "message_status_events_insert"
  on public.message_status_events
  for insert
  with check (professional_id = public.current_professional_id());

create policy "message_status_events_update"
  on public.message_status_events
  for update
  using (professional_id = public.current_professional_id())
  with check (professional_id = public.current_professional_id());

create policy "message_status_events_delete"
  on public.message_status_events
  for delete
  using (professional_id = public.current_professional_id());

create policy "integration_logs_select"
  on public.integration_logs
  for select
  using (professional_id = public.current_professional_id());

create policy "integration_logs_insert"
  on public.integration_logs
  for insert
  with check (professional_id = public.current_professional_id());

create policy "integration_logs_update"
  on public.integration_logs
  for update
  using (professional_id = public.current_professional_id())
  with check (professional_id = public.current_professional_id());

create policy "integration_logs_delete"
  on public.integration_logs
  for delete
  using (professional_id = public.current_professional_id());
