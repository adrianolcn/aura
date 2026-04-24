create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.professionals (
    auth_user_id,
    full_name,
    business_name,
    phone,
    whatsapp_phone,
    email,
    timezone,
    plan_tier
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'business_name', 'AURA Studio'),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'whatsapp_phone', new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'America/Sao_Paulo'),
    'mvp'
  )
  on conflict (auth_user_id) do update
  set
    full_name = excluded.full_name,
    business_name = excluded.business_name,
    phone = excluded.phone,
    whatsapp_phone = excluded.whatsapp_phone,
    email = excluded.email,
    timezone = excluded.timezone,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professionals
  set
    full_name = coalesce(new.raw_user_meta_data ->> 'full_name', full_name),
    business_name = coalesce(new.raw_user_meta_data ->> 'business_name', business_name),
    phone = coalesce(new.raw_user_meta_data ->> 'phone', phone),
    whatsapp_phone = coalesce(new.raw_user_meta_data ->> 'whatsapp_phone', whatsapp_phone),
    email = coalesce(new.email, email),
    timezone = coalesce(new.raw_user_meta_data ->> 'timezone', timezone),
    updated_at = timezone('utc', now())
  where auth_user_id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_auth_user_updated();

create or replace function public.assert_same_professional()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  related_professional_id uuid;
begin
  if tg_table_name in ('client_events', 'client_notes', 'client_media', 'budgets', 'appointments', 'contracts', 'client_documents', 'conversations', 'customer_scores') then
    select professional_id into related_professional_id
    from public.clients
    where id = new.client_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Cliente fora do tenant atual.';
    end if;
  end if;

  if tg_table_name in ('client_notes', 'client_media', 'budgets', 'appointments', 'contracts', 'client_documents') and new.event_id is not null then
    select professional_id into related_professional_id
    from public.client_events
    where id = new.event_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Evento fora do tenant atual.';
    end if;
  end if;

  if tg_table_name = 'budget_items' then
    select professional_id into related_professional_id
    from public.budgets
    where id = new.budget_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Orcamento fora do tenant atual.';
    end if;

    if new.service_id is not null then
      select professional_id into related_professional_id
      from public.services
      where id = new.service_id;

      if related_professional_id is null or related_professional_id <> new.professional_id then
        raise exception 'Servico fora do tenant atual.';
      end if;
    end if;
  end if;

  if tg_table_name = 'contract_versions' then
    select professional_id into related_professional_id
    from public.contracts
    where id = new.contract_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Contrato fora do tenant atual.';
    end if;
  end if;

  if tg_table_name = 'messages' then
    select professional_id into related_professional_id
    from public.conversations
    where id = new.conversation_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Conversa fora do tenant atual.';
    end if;

    select professional_id into related_professional_id
    from public.clients
    where id = new.client_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Cliente da mensagem fora do tenant atual.';
    end if;
  end if;

  if tg_table_name = 'automation_rules' and new.template_id is not null then
    select professional_id into related_professional_id
    from public.message_templates
    where id = new.template_id;

    if related_professional_id is null or related_professional_id <> new.professional_id then
      raise exception 'Template fora do tenant atual.';
    end if;
  end if;

  if tg_table_name = 'notification_logs' then
    if new.client_id is not null then
      select professional_id into related_professional_id
      from public.clients
      where id = new.client_id;

      if related_professional_id is null or related_professional_id <> new.professional_id then
        raise exception 'Cliente do log fora do tenant atual.';
      end if;
    end if;

    if new.event_id is not null then
      select professional_id into related_professional_id
      from public.client_events
      where id = new.event_id;

      if related_professional_id is null or related_professional_id <> new.professional_id then
        raise exception 'Evento do log fora do tenant atual.';
      end if;
    end if;

    if new.message_id is not null then
      select professional_id into related_professional_id
      from public.messages
      where id = new.message_id;

      if related_professional_id is null or related_professional_id <> new.professional_id then
        raise exception 'Mensagem do log fora do tenant atual.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists client_events_tenant_guard on public.client_events;
create trigger client_events_tenant_guard
  before insert or update on public.client_events
  for each row execute procedure public.assert_same_professional();

drop trigger if exists client_notes_tenant_guard on public.client_notes;
create trigger client_notes_tenant_guard
  before insert or update on public.client_notes
  for each row execute procedure public.assert_same_professional();

drop trigger if exists client_media_tenant_guard on public.client_media;
create trigger client_media_tenant_guard
  before insert or update on public.client_media
  for each row execute procedure public.assert_same_professional();

drop trigger if exists budgets_tenant_guard on public.budgets;
create trigger budgets_tenant_guard
  before insert or update on public.budgets
  for each row execute procedure public.assert_same_professional();

drop trigger if exists budget_items_tenant_guard on public.budget_items;
create trigger budget_items_tenant_guard
  before insert or update on public.budget_items
  for each row execute procedure public.assert_same_professional();

drop trigger if exists appointments_tenant_guard on public.appointments;
create trigger appointments_tenant_guard
  before insert or update on public.appointments
  for each row execute procedure public.assert_same_professional();

drop trigger if exists contracts_tenant_guard on public.contracts;
create trigger contracts_tenant_guard
  before insert or update on public.contracts
  for each row execute procedure public.assert_same_professional();

drop trigger if exists contract_versions_tenant_guard on public.contract_versions;
create trigger contract_versions_tenant_guard
  before insert or update on public.contract_versions
  for each row execute procedure public.assert_same_professional();

drop trigger if exists client_documents_tenant_guard on public.client_documents;
create trigger client_documents_tenant_guard
  before insert or update on public.client_documents
  for each row execute procedure public.assert_same_professional();

drop trigger if exists conversations_tenant_guard on public.conversations;
create trigger conversations_tenant_guard
  before insert or update on public.conversations
  for each row execute procedure public.assert_same_professional();

drop trigger if exists messages_tenant_guard on public.messages;
create trigger messages_tenant_guard
  before insert or update on public.messages
  for each row execute procedure public.assert_same_professional();

drop trigger if exists automation_rules_tenant_guard on public.automation_rules;
create trigger automation_rules_tenant_guard
  before insert or update on public.automation_rules
  for each row execute procedure public.assert_same_professional();

drop trigger if exists notification_logs_tenant_guard on public.notification_logs;
create trigger notification_logs_tenant_guard
  before insert or update on public.notification_logs
  for each row execute procedure public.assert_same_professional();

drop trigger if exists customer_scores_tenant_guard on public.customer_scores;
create trigger customer_scores_tenant_guard
  before insert or update on public.customer_scores
  for each row execute procedure public.assert_same_professional();
