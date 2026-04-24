insert into public.professionals (
  id,
  auth_user_id,
  full_name,
  business_name,
  phone,
  whatsapp_phone,
  whatsapp_phone_number_id,
  whatsapp_business_account_id,
  email,
  timezone,
  plan_tier,
  created_at,
  updated_at
)
values (
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  'ab3a2b8e-1e9d-43f2-8a48-e49c61b6d7b7',
  'Aurora Menezes',
  'AURA Beauty Studio',
  '+55 11 99876-4455',
  '+55 11 99876-4455',
  '123456789012345',
  '987654321098765',
  'aurora@aurabeauty.com',
  'America/Bahia',
  'mvp',
  '2026-04-23T09:00:00.000Z',
  '2026-04-23T09:00:00.000Z'
)
on conflict (id) do nothing;

insert into public.clients (
  id,
  professional_id,
  full_name,
  phone,
  email,
  city,
  instagram_handle,
  lifecycle_stage,
  priority_score,
  notes,
  created_at,
  updated_at
)
values
  (
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Marina Alves',
    '+55 71 99123-8801',
    'marina.alves@email.com',
    'Salvador',
    '@marinaalves',
    'confirmed',
    92,
    'Prefere comunicação rápida por WhatsApp e aprova materiais em PDF.',
    '2026-04-02T14:00:00.000Z',
    '2026-04-20T10:00:00.000Z'
  ),
  (
    '4d2c3f66-fd37-45fe-b48d-9ebc9f2af431',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Beatriz Nunes',
    '+55 71 98876-5502',
    'bia.nunes@email.com',
    'Lauro de Freitas',
    '@bianunes',
    'proposal',
    74,
    'Evento corporativo com necessidade de produção para duas executivas.',
    '2026-04-05T13:30:00.000Z',
    '2026-04-18T15:00:00.000Z'
  ),
  (
    '9d2d7267-c553-4024-b68a-62b6ab026d12',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Carla Souza',
    '+55 71 99771-2091',
    'carla.souza@email.com',
    'Salvador',
    '@carlasouza',
    'qualified',
    66,
    'Pediu proposta com pacote madrinhas e quer retorno até sexta.',
    '2026-04-11T09:10:00.000Z',
    '2026-04-22T16:40:00.000Z'
  )
on conflict (id) do nothing;

insert into public.services (
  id,
  professional_id,
  name,
  category,
  description,
  base_price,
  duration_minutes,
  is_active,
  created_at,
  updated_at
)
values
  (
    'f16a3ded-11c0-41e6-86db-7afdff3022a0',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Make Glow Bride',
    'makeup',
    'Pele glow, olhos suaves e acabamento de longa duração.',
    1250.00,
    150,
    true,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    '0aa34401-594d-4231-aecf-fce97dad8b4d',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Penteado clássico',
    'hair',
    'Coque baixo com preparação de volume e fixação.',
    890.00,
    120,
    true,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    '453434f4-1c35-420a-8306-f9f2cfcb3257',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Teste pré-evento',
    'trial',
    'Sessão de alinhamento de estilo com foto e checklist.',
    450.00,
    90,
    true,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.message_templates (
  id,
  professional_id,
  name,
  channel,
  template_type,
  category,
  body,
  variables,
  external_template_name,
  language_code,
  parameter_schema,
  requires_opt_in,
  is_active,
  created_at,
  updated_at
)
values
  (
    '8d6913b6-c7b7-44fd-95fa-eb039d02d347',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Lembrete de teste',
    'whatsapp',
    'reminder',
    'utility',
    'Oi {{client_name}}, passando para lembrar do seu teste amanhã às {{appointment_time}}.',
    '["client_name","appointment_time"]'::jsonb,
    'aura_trial_reminder',
    'pt_BR',
    '["client_name","appointment_time"]'::jsonb,
    true,
    true,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'a2cab851-93f8-468b-9cd7-3a4d1af1bcb7',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Pós-atendimento',
    'whatsapp',
    'follow_up',
    'utility',
    'Obrigada por viver esse momento com a AURA. Se quiser, me envia suas fotos favoritas depois.',
    '[]'::jsonb,
    'aura_post_service_follow_up',
    'pt_BR',
    '[]'::jsonb,
    true,
    true,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.client_events (
  id,
  professional_id,
  client_id,
  title,
  event_type,
  event_date,
  location,
  status,
  guest_count,
  notes,
  created_at,
  updated_at
)
values
  (
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'Casamento Marina e Theo',
    'wedding',
    '2026-07-18T13:00:00.000Z',
    'Villa Bahia, Salvador',
    'booked',
    160,
    'Noiva quer make soft glam e cabelo preso com brilho discreto.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'd566528a-b880-4554-94d7-b6c9b15aef54',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '4d2c3f66-fd37-45fe-b48d-9ebc9f2af431',
    'Evento corporativo Beatriz',
    'corporate',
    '2026-05-14T12:00:00.000Z',
    'Hotel Fasano Salvador',
    'quoted',
    2,
    'Produção objetiva, elegante e com tempo curto.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'bf7b8907-a4af-41e1-bd19-f598b4630bf4',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '9d2d7267-c553-4024-b68a-62b6ab026d12',
    'Pré-wedding Carla',
    'pre_wedding',
    '2026-05-08T11:00:00.000Z',
    'Praia do Forte',
    'lead',
    1,
    'Quer leveza, textura natural e proteção para foto externa.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.client_notes (
  id,
  professional_id,
  client_id,
  event_id,
  title,
  body,
  created_at,
  updated_at
)
values
  (
    '238f7679-b72d-4cae-aaf9-5655de4998b6',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'Briefing inicial',
    'Cliente pediu foco em durabilidade e acabamento luminoso para cerimônia ao ar livre.',
    '2026-04-09T17:20:00.000Z',
    '2026-04-09T17:20:00.000Z'
  ),
  (
    '7ff98a4f-19a0-4a8f-b1f3-a9c795f8fd7d',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'Pós-reunião',
    'Enviar cronograma final duas semanas antes e checklist de pele três dias antes.',
    '2026-04-15T18:00:00.000Z',
    '2026-04-15T18:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.client_media (
  id,
  professional_id,
  client_id,
  event_id,
  file_name,
  media_type,
  mime_type,
  storage_path,
  size_bytes,
  caption,
  created_at,
  updated_at
)
values
  (
    '82f68042-8074-4281-9495-c73bd5ffc42d',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'referencia-penteado.jpg',
    'image',
    'image/jpeg',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6/ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b/referencia-penteado.jpg',
    187000,
    'Coque baixo com frente polida.',
    '2026-04-16T08:10:00.000Z',
    '2026-04-16T08:10:00.000Z'
  ),
  (
    '0f977fbb-8c0a-45fb-8b80-4fd2be87df09',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'contrato-v1.pdf',
    'pdf',
    'application/pdf',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6/ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b/contrato-v1.pdf',
    520000,
    'Contrato assinado digitalmente.',
    '2026-04-18T11:30:00.000Z',
    '2026-04-18T11:30:00.000Z'
  )
on conflict (id) do nothing;

insert into public.budgets (
  id,
  professional_id,
  client_id,
  event_id,
  status,
  currency,
  subtotal,
  discount_amount,
  total_amount,
  valid_until,
  sent_at,
  approved_at,
  created_at,
  updated_at
)
values
  (
    '9e8855d2-7510-4080-a319-372728518e9b',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'approved',
    'BRL',
    2590.00,
    140.00,
    2450.00,
    '2026-04-30T23:59:59.000Z',
    '2026-04-10T12:00:00.000Z',
    '2026-04-12T14:30:00.000Z',
    '2026-04-10T10:00:00.000Z',
    '2026-04-12T14:30:00.000Z'
  ),
  (
    '302d5928-66d7-4f20-a6ac-c2dc1d259894',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '4d2c3f66-fd37-45fe-b48d-9ebc9f2af431',
    'd566528a-b880-4554-94d7-b6c9b15aef54',
    'sent',
    'BRL',
    1580.00,
    0.00,
    1580.00,
    '2026-04-28T23:59:59.000Z',
    '2026-04-19T15:00:00.000Z',
    null,
    '2026-04-19T10:00:00.000Z',
    '2026-04-19T15:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.budget_items (
  id,
  professional_id,
  budget_id,
  service_id,
  description,
  quantity,
  unit_price,
  total_price,
  created_at,
  updated_at
)
values
  (
    '2cf55371-f93c-442d-a4ee-8fb77e5c9293',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '9e8855d2-7510-4080-a319-372728518e9b',
    'f16a3ded-11c0-41e6-86db-7afdff3022a0',
    'Make Glow Bride',
    1,
    1250.00,
    1250.00,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    '19448a36-e0fa-491d-b6ce-e3da8c4bf2fb',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '9e8855d2-7510-4080-a319-372728518e9b',
    '0aa34401-594d-4231-aecf-fce97dad8b4d',
    'Penteado clássico',
    1,
    890.00,
    890.00,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'a6fc05f9-9e65-4e6f-bd76-18f09fb739c2',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '9e8855d2-7510-4080-a319-372728518e9b',
    '453434f4-1c35-420a-8306-f9f2cfcb3257',
    'Teste pré-evento',
    1,
    450.00,
    450.00,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.appointments (
  id,
  professional_id,
  client_id,
  event_id,
  title,
  appointment_type,
  status,
  starts_at,
  ends_at,
  location,
  notes,
  created_at,
  updated_at
)
values
  (
    '88ca544f-196e-45b6-b970-8c88d359c2f1',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    '6a6dcf04-f0fc-4fef-b339-f49976911c79',
    'Teste de make e penteado',
    'trial',
    'confirmed',
    '2026-05-22T13:00:00.000Z',
    '2026-05-22T16:00:00.000Z',
    'Estúdio AURA',
    'Separar referências impressas e cronograma do dia.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    '7c95f257-05e1-49f2-86fb-f6b47ec6d3c2',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '4d2c3f66-fd37-45fe-b48d-9ebc9f2af431',
    'd566528a-b880-4554-94d7-b6c9b15aef54',
    'Alinhamento final do orçamento',
    'consultation',
    'scheduled',
    '2026-04-25T14:30:00.000Z',
    '2026-04-25T15:00:00.000Z',
    'Videochamada',
    'Validar quantidade de profissionais.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    '22ece581-c295-4939-b8d8-c32b4dc4b202',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '9d2d7267-c553-4024-b68a-62b6ab026d12',
    'bf7b8907-a4af-41e1-bd19-f598b4630bf4',
    'Visita técnica Praia do Forte',
    'consultation',
    'scheduled',
    '2026-04-24T16:00:00.000Z',
    '2026-04-24T17:00:00.000Z',
    'Praia do Forte',
    'Checar logística de deslocamento e clima.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.contracts (
  id,
  professional_id,
  client_id,
  event_id,
  current_version_id,
  status,
  signed_at,
  created_at,
  updated_at
)
values (
  '61de0f94-37e7-48fe-b366-23f6259a8596',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
  '6a6dcf04-f0fc-4fef-b339-f49976911c79',
  null,
  'signed',
  '2026-04-18T13:00:00.000Z',
  '2026-04-14T11:00:00.000Z',
  '2026-04-18T13:00:00.000Z'
)
on conflict (id) do nothing;

insert into public.contract_versions (
  id,
  professional_id,
  contract_id,
  version_number,
  file_name,
  storage_path,
  file_size_bytes,
  uploaded_at,
  status,
  created_at,
  updated_at
)
values (
  '05e4318c-36ee-4691-ae9a-f81a5ef0c2f5',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  '61de0f94-37e7-48fe-b366-23f6259a8596',
  1,
  'contrato-marina-v1.pdf',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6/ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b/contrato-marina-v1.pdf',
  520000,
  '2026-04-14T11:10:00.000Z',
  'signed',
  '2026-04-14T11:10:00.000Z',
  '2026-04-18T13:00:00.000Z'
)
on conflict (id) do nothing;

update public.contracts
set current_version_id = '05e4318c-36ee-4691-ae9a-f81a5ef0c2f5'
where id = '61de0f94-37e7-48fe-b366-23f6259a8596';

insert into public.client_documents (
  id,
  professional_id,
  client_id,
  event_id,
  document_type,
  file_name,
  storage_path,
  mime_type,
  status,
  created_at,
  updated_at
)
values (
  'b4ca2ca9-0272-4407-9bb4-0b7247b6ff55',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
  '6a6dcf04-f0fc-4fef-b339-f49976911c79',
  'briefing',
  'checklist-noiva.pdf',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6/ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b/checklist-noiva.pdf',
  'application/pdf',
  'active',
  '2026-04-17T10:40:00.000Z',
  '2026-04-17T10:40:00.000Z'
)
on conflict (id) do nothing;

insert into public.conversations (
  id,
  professional_id,
  client_id,
  channel,
  external_thread_id,
  last_message_at,
  status,
  created_at,
  updated_at
)
values (
  'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
  'whatsapp',
  'wa-thread-marina',
  '+55 71 99123-8801',
  '2026-04-22T18:30:00.000Z',
  '2026-04-22T18:10:00.000Z',
  '2026-04-22T18:30:00.000Z',
  'Claro. Reservei 22/05 às 10h e já anexei o checklist de preparação.',
  'outbound',
  'read',
  'active',
  '2026-04-09T12:00:00.000Z',
  '2026-04-22T18:30:00.000Z'
)
on conflict (id) do nothing;

insert into public.messages (
  id,
  professional_id,
  conversation_id,
  client_id,
  direction,
  channel,
  message_type,
  status,
  body,
  template_id,
  template_name,
  template_language,
  external_message_id,
  sent_at,
  delivered_at,
  read_at,
  failed_at,
  metadata,
  raw_payload,
  created_at,
  updated_at
)
values
  (
    '20b4f4bb-d522-4981-8136-7752d10f2d29',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'inbound',
    'whatsapp',
    'text',
    'received',
    'Amei o PDF do orçamento. Podemos marcar o teste para maio?',
    null,
    null,
    null,
    'wamid.INBOUND1',
    '2026-04-22T18:10:00.000Z',
    '2026-04-22T18:10:00.000Z',
    '2026-04-22T18:15:00.000Z',
    null,
    '{"contactName":"Marina Alves"}'::jsonb,
    '{}'::jsonb,
    '2026-04-22T18:10:00.000Z',
    '2026-04-22T18:15:00.000Z'
  ),
  (
    'af1574ef-b573-4a31-a21c-fad682266fb0',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'outbound',
    'whatsapp',
    'template',
    'read',
    'Claro. Reservei 22/05 às 10h e já anexei o checklist de preparação.',
    '8d6913b6-c7b7-44fd-95fa-eb039d02d347',
    'aura_trial_reminder',
    'pt_BR',
    'wamid.OUTBOUND1',
    '2026-04-22T18:30:00.000Z',
    '2026-04-22T18:30:00.000Z',
    '2026-04-22T18:32:00.000Z',
    null,
    '{"source":"seed"}'::jsonb,
    '{}'::jsonb,
    '2026-04-22T18:30:00.000Z',
    '2026-04-22T18:32:00.000Z'
  )
on conflict (id) do nothing;

insert into public.communication_opt_ins (
  id,
  professional_id,
  client_id,
  channel,
  status,
  source,
  granted_at,
  notes,
  metadata,
  created_at,
  updated_at
)
values (
  'bd9f5d8d-f5ab-4c2f-a3fb-c7666918e14f',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
  'whatsapp',
  'opted_in',
  'manual',
  '2026-04-20T11:00:00.000Z',
  'Consentimento confirmado na reunião de briefing.',
  '{"recordedBy":"seed"}'::jsonb,
  '2026-04-20T11:00:00.000Z',
  '2026-04-20T11:00:00.000Z'
)
on conflict (id) do nothing;

insert into public.message_status_events (
  id,
  professional_id,
  message_id,
  conversation_id,
  client_id,
  external_message_id,
  status,
  occurred_at,
  payload,
  created_at,
  updated_at
)
values
  (
    '8a9292c5-3f40-48c4-a443-72805544f06e',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'af1574ef-b573-4a31-a21c-fad682266fb0',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'wamid.OUTBOUND1',
    'delivered',
    '2026-04-22T18:31:00.000Z',
    '{}'::jsonb,
    '2026-04-22T18:31:00.000Z',
    '2026-04-22T18:31:00.000Z'
  ),
  (
    '302c80cf-e4b9-4992-afc6-f3eb91a2962c',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'af1574ef-b573-4a31-a21c-fad682266fb0',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'wamid.OUTBOUND1',
    'read',
    '2026-04-22T18:32:00.000Z',
    '{}'::jsonb,
    '2026-04-22T18:32:00.000Z',
    '2026-04-22T18:32:00.000Z'
  )
on conflict (id) do nothing;

insert into public.integration_logs (
  id,
  professional_id,
  client_id,
  conversation_id,
  message_id,
  channel,
  direction,
  log_type,
  event_key,
  status,
  payload,
  response,
  created_at,
  updated_at
)
values
  (
    'f61d13e1-443a-4285-b0c7-ff341a7a24a1',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    '20b4f4bb-d522-4981-8136-7752d10f2d29',
    'whatsapp',
    'inbound',
    'webhook',
    'webhook:message:wamid.INBOUND1',
    'processed',
    '{}'::jsonb,
    '{"persisted":true}'::jsonb,
    '2026-04-22T18:10:00.000Z',
    '2026-04-22T18:10:00.000Z'
  ),
  (
    '0c5efc7a-301a-4e16-a34f-8f06158cb9dc',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    'a6518ea9-a1e8-4c25-8d61-af58a15c0d1b',
    'af1574ef-b573-4a31-a21c-fad682266fb0',
    'whatsapp',
    'outbound',
    'send',
    'manual:wamid.OUTBOUND1',
    'processed',
    '{"templateId":"8d6913b6-c7b7-44fd-95fa-eb039d02d347"}'::jsonb,
    '{"messageId":"wamid.OUTBOUND1"}'::jsonb,
    '2026-04-22T18:30:00.000Z',
    '2026-04-22T18:30:00.000Z'
  )
on conflict (id) do nothing;

insert into public.automation_rules (
  id,
  professional_id,
  name,
  trigger_type,
  channel,
  template_id,
  event_offset_minutes,
  is_active,
  payload,
  created_at,
  updated_at
)
values
  (
    '1c3ca531-4b50-4a8e-a1f8-c1e1e4302a39',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Lembrete de teste',
    'appointment_reminder',
    'whatsapp',
    '8d6913b6-c7b7-44fd-95fa-eb039d02d347',
    -1440,
    true,
    '{"scope":"appointment","status":"confirmed"}'::jsonb,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'ba519aaf-e8be-4f6e-9730-2e6acdd6f3d0',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'Pós-atendimento noiva',
    'follow_up',
    'whatsapp',
    'a2cab851-93f8-468b-9cd7-3a4d1af1bcb7',
    720,
    true,
    '{"scope":"event","status":"completed"}'::jsonb,
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;

insert into public.notification_logs (
  id,
  professional_id,
  automation_rule_id,
  client_id,
  event_id,
  channel,
  execution_kind,
  idempotency_key,
  status,
  scheduled_for,
  processed_at,
  metadata,
  created_at,
  updated_at
)
values (
  '6ef03021-875d-4288-b577-1fca9cf62d99',
  'c337fb95-55ef-4400-a5fa-355a591a0fa6',
  '1c3ca531-4b50-4a8e-a1f8-c1e1e4302a39',
  'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
  '6a6dcf04-f0fc-4fef-b339-f49976911c79',
  'whatsapp',
  'pre_appointment_24h',
  '1c3ca531-4b50-4a8e-a1f8-c1e1e4302a39:event:6a6dcf04-f0fc-4fef-b339-f49976911c79:2026-05-21T13:00:00.000Z',
  'processed',
  '2026-05-21T13:00:00.000Z',
  '2026-05-21T13:01:00.000Z',
  '{"source":"seed"}'::jsonb,
  '2026-04-23T09:00:00.000Z',
  '2026-04-23T09:00:00.000Z'
)
on conflict (id) do nothing;

insert into public.customer_scores (
  id,
  professional_id,
  client_id,
  priority_score,
  budget_potential_score,
  engagement_score,
  no_show_risk_score,
  last_calculated_at,
  notes,
  created_at,
  updated_at
)
values
  (
    '608f6001-3637-4aa8-a61c-b7a72f1a7399',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    'ac5cc052-c7d8-49d7-a97a-f4a44d4c2b7b',
    92,
    88,
    90,
    8,
    '2026-04-22T12:00:00.000Z',
    'Cliente responsiva, alto potencial de indicação e contrato assinado.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  ),
  (
    'aa645d65-ec98-4c80-92b4-15fa0ccb1e1a',
    'c337fb95-55ef-4400-a5fa-355a591a0fa6',
    '4d2c3f66-fd37-45fe-b48d-9ebc9f2af431',
    74,
    65,
    72,
    18,
    '2026-04-21T12:00:00.000Z',
    'Bom potencial, aguardando validação interna da empresa.',
    '2026-04-23T09:00:00.000Z',
    '2026-04-23T09:00:00.000Z'
  )
on conflict (id) do nothing;
