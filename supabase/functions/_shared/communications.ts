import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

import {
  normalizePhone,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
} from '../../../packages/core/src/whatsapp.ts';

type DbClient = ReturnType<typeof createClient>;
type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type ProfessionalRow = {
  id: string;
  auth_user_id: string;
  full_name: string;
  business_name: string;
  whatsapp_phone: string;
  whatsapp_phone_number_id?: string | null;
  whatsapp_business_account_id?: string | null;
};

type ClientRow = {
  id: string;
  professional_id: string;
  full_name: string;
  phone: string;
};

type ConversationRow = {
  id: string;
  professional_id: string;
  client_id: string;
  channel: string;
  external_thread_id?: string | null;
  client_phone?: string | null;
  last_message_at?: string | null;
  last_inbound_at?: string | null;
  last_outbound_at?: string | null;
  last_message_preview?: string | null;
  last_message_direction?: string | null;
  last_message_status?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
};

type MessageRow = {
  id: string;
  professional_id: string;
  conversation_id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  channel: string;
  message_type: string;
  status: string;
  body: string;
  template_id?: string | null;
  template_name?: string | null;
  template_language?: string | null;
  external_message_id?: string | null;
  error_message?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  failed_at?: string | null;
  metadata?: Record<string, JsonValue>;
  raw_payload?: Record<string, JsonValue>;
  created_at: string;
  updated_at?: string | null;
};

type MessageTemplateRow = {
  id: string;
  professional_id: string;
  name: string;
  body: string;
  variables: string[] | null;
  external_template_name?: string | null;
  language_code?: string | null;
  parameter_schema?: string[] | null;
  requires_opt_in?: boolean | null;
};

type OptInRow = {
  id: string;
  status: string;
  granted_at?: string | null;
  revoked_at?: string | null;
};

type SendPersistedMessageInput = {
  service: DbClient;
  professional: ProfessionalRow;
  client: ClientRow;
  conversation?: ConversationRow | null;
  template?: MessageTemplateRow | null;
  body?: string;
  parameters?: Record<string, string>;
  eventId?: string;
  source: 'manual' | 'automation';
  metadata?: Record<string, JsonValue>;
};

export function jsonResponse(
  body: JsonValue,
  status = 200,
  headers?: HeadersInit,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function readEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createServiceClient() {
  return createClient(readEnv('SUPABASE_URL'), readEnv('SUPABASE_SERVICE_ROLE_KEY'));
}

export async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const anonClient = createClient(readEnv('SUPABASE_URL'), readEnv('SUPABASE_ANON_KEY'), {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const service = createServiceClient();
  const userResponse = await anonClient.auth.getUser();

  if (userResponse.error || !userResponse.data.user) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const professionalResponse = await service
    .from('professionals')
    .select('*')
    .eq('auth_user_id', userResponse.data.user.id)
    .single();

  if (professionalResponse.error || !professionalResponse.data) {
    throw new Response('Professional not found', { status: 403 });
  }

  return {
    service,
    authorization,
    user: userResponse.data.user,
    professional: professionalResponse.data as ProfessionalRow,
  };
}

export function assertJobSecret(request: Request) {
  const expected = readEnv('AUTOMATION_JOB_SECRET');
  const provided = request.headers.get('x-aura-job-secret');

  if (!provided || provided !== expected) {
    throw new Response('Forbidden', { status: 403 });
  }
}

export async function resolveProfessionalByWhatsApp(
  service: DbClient,
  input: {
    phoneNumberId?: string;
    displayPhone?: string;
  },
) {
  if (input.phoneNumberId) {
    const byNumberId = await service
      .from('professionals')
      .select('*')
      .eq('whatsapp_phone_number_id', input.phoneNumberId)
      .maybeSingle();

    if (byNumberId.data) {
      return byNumberId.data as ProfessionalRow;
    }
  }

  if (input.displayPhone) {
    const byPhone = await service
      .from('professionals')
      .select('*')
      .eq('whatsapp_phone_normalized', normalizePhone(input.displayPhone))
      .maybeSingle();

    if (byPhone.data) {
      return byPhone.data as ProfessionalRow;
    }
  }

  return null;
}

export async function resolveClientByPhone(
  service: DbClient,
  professionalId: string,
  phone: string,
) {
  const clientIdResponse = await service.rpc('find_client_by_phone', {
    professional_uuid: professionalId,
    phone_value: phone,
  });

  if (clientIdResponse.error || !clientIdResponse.data) {
    return null;
  }

  const clientResponse = await service
    .from('clients')
    .select('*')
    .eq('id', clientIdResponse.data as string)
    .single();

  if (clientResponse.error || !clientResponse.data) {
    return null;
  }

  return clientResponse.data as ClientRow;
}

export async function getClientById(
  service: DbClient,
  professionalId: string,
  clientId: string,
) {
  const response = await service
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('professional_id', professionalId)
    .single();

  if (response.error || !response.data) {
    throw new Error('Cliente não encontrada para a profissional atual.');
  }

  return response.data as ClientRow;
}

export async function getConversationById(
  service: DbClient,
  professionalId: string,
  conversationId: string,
) {
  const response = await service
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('professional_id', professionalId)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data as ConversationRow | null;
}

export async function ensureConversation(
  service: DbClient,
  input: {
    professionalId: string;
    clientId: string;
    clientPhone: string;
    externalThreadId?: string;
    lastMessageAt?: string;
    lastMessagePreview?: string;
    lastMessageDirection?: 'inbound' | 'outbound';
    lastMessageStatus?: string;
  },
) {
  const response = await service
    .from('conversations')
    .upsert(
      {
        professional_id: input.professionalId,
        client_id: input.clientId,
        channel: 'whatsapp',
        external_thread_id: input.externalThreadId ?? null,
        client_phone: input.clientPhone,
        last_message_at: input.lastMessageAt ?? null,
        last_inbound_at: input.lastMessageDirection === 'inbound' ? input.lastMessageAt ?? null : undefined,
        last_outbound_at: input.lastMessageDirection === 'outbound' ? input.lastMessageAt ?? null : undefined,
        last_message_preview: input.lastMessagePreview ?? null,
        last_message_direction: input.lastMessageDirection ?? null,
        last_message_status: input.lastMessageStatus ?? null,
        status: 'active',
      },
      {
        onConflict: 'professional_id,client_id,channel',
      },
    )
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? 'Could not create conversation.');
  }

  return response.data as ConversationRow;
}

export async function updateConversationSnapshot(
  service: DbClient,
  conversationId: string,
  input: {
    externalThreadId?: string;
    lastMessageAt: string;
    lastMessagePreview: string;
    lastMessageDirection: 'inbound' | 'outbound';
    lastMessageStatus: string;
  },
) {
  const response = await service
    .from('conversations')
    .update({
      external_thread_id: input.externalThreadId ?? null,
      last_message_at: input.lastMessageAt,
      last_message_preview: input.lastMessagePreview,
      last_message_direction: input.lastMessageDirection,
      last_message_status: input.lastMessageStatus,
      last_inbound_at: input.lastMessageDirection === 'inbound' ? input.lastMessageAt : undefined,
      last_outbound_at: input.lastMessageDirection === 'outbound' ? input.lastMessageAt : undefined,
      status: 'active',
    })
    .eq('id', conversationId)
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? 'Could not update conversation snapshot.');
  }

  return response.data as ConversationRow;
}

export async function findOptIn(
  service: DbClient,
  professionalId: string,
  clientId: string,
) {
  const response = await service
    .from('communication_opt_ins')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('client_id', clientId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data as OptInRow | null;
}

export async function getTemplateById(
  service: DbClient,
  professionalId: string,
  templateId: string,
) {
  const response = await service
    .from('message_templates')
    .select('*')
    .eq('id', templateId)
    .eq('professional_id', professionalId)
    .eq('channel', 'whatsapp')
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data as MessageTemplateRow | null;
}

export function renderTemplateBody(
  body: string,
  parameters: Record<string, string>,
) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => parameters[key] ?? '');
}

function readMessageIdFromResponse(
  response: unknown,
) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return undefined;
  }

  const record = response as Record<string, unknown>;
  if (!Array.isArray(record.messages)) {
    return undefined;
  }

  const first = record.messages[0];
  if (!first || typeof first !== 'object' || Array.isArray(first)) {
    return undefined;
  }

  return typeof (first as Record<string, unknown>).id === 'string'
    ? ((first as Record<string, unknown>).id as string)
    : undefined;
}

export async function registerIntegrationLog(
  service: DbClient,
  input: {
    professionalId: string;
    clientId?: string;
    conversationId?: string;
    messageId?: string;
    direction: 'inbound' | 'outbound' | 'system';
    logType: 'webhook' | 'send' | 'automation' | 'status' | 'verification' | 'scheduler';
    eventKey: string;
    status: 'received' | 'processed' | 'skipped' | 'failed';
    payload?: Record<string, JsonValue>;
    response?: Record<string, JsonValue>;
    errorMessage?: string;
  },
) {
  const response = await service
    .from('integration_logs')
    .upsert(
      {
        professional_id: input.professionalId,
        client_id: input.clientId ?? null,
        conversation_id: input.conversationId ?? null,
        message_id: input.messageId ?? null,
        channel: 'whatsapp',
        direction: input.direction,
        log_type: input.logType,
        event_key: input.eventKey,
        status: input.status,
        payload: input.payload ?? {},
        response: input.response ?? {},
        error_message: input.errorMessage ?? null,
      },
      {
        onConflict: 'channel,event_key',
        ignoreDuplicates: true,
      },
    )
    .select('*')
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    inserted: Boolean(response.data),
    row: response.data ?? null,
  };
}

export async function updateIntegrationLog(
  service: DbClient,
  logId: string,
  input: {
    status: 'received' | 'processed' | 'skipped' | 'failed';
    response?: Record<string, JsonValue>;
    errorMessage?: string;
    messageId?: string;
    conversationId?: string;
    clientId?: string;
  },
) {
  const response = await service
    .from('integration_logs')
    .update({
      status: input.status,
      response: input.response ?? {},
      error_message: input.errorMessage ?? null,
      message_id: input.messageId ?? null,
      conversation_id: input.conversationId ?? null,
      client_id: input.clientId ?? null,
    })
    .eq('id', logId)
    .select('*')
    .single();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function createInboundMessage(
  service: DbClient,
  input: {
    professionalId: string;
    clientId: string;
    conversationId: string;
    body: string;
    externalMessageId: string;
    contactName?: string;
    occurredAt: string;
    rawPayload?: Record<string, JsonValue>;
  },
) {
  const response = await service
    .from('messages')
    .insert({
      professional_id: input.professionalId,
      conversation_id: input.conversationId,
      client_id: input.clientId,
      direction: 'inbound',
      channel: 'whatsapp',
      message_type: 'text',
      status: 'received',
      body: input.body,
      external_message_id: input.externalMessageId,
      sent_at: input.occurredAt,
      delivered_at: input.occurredAt,
      metadata: input.contactName ? { contactName: input.contactName } : {},
      raw_payload: input.rawPayload ?? {},
    })
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? 'Could not persist inbound message.');
  }

  return response.data as MessageRow;
}

export async function recordMessageStatus(
  service: DbClient,
  input: {
    professionalId: string;
    clientId: string;
    conversationId: string;
    messageId: string;
    externalMessageId?: string;
    status: string;
    occurredAt: string;
    payload?: Record<string, JsonValue>;
  },
) {
  const response = await service
    .from('message_status_events')
    .insert({
      professional_id: input.professionalId,
      client_id: input.clientId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      external_message_id: input.externalMessageId ?? null,
      status: input.status,
      occurred_at: input.occurredAt,
      payload: input.payload ?? {},
    })
    .select('*')
    .single();

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export async function updateMessageDelivery(
  service: DbClient,
  input: {
    messageId: string;
    status: string;
    occurredAt: string;
    errorMessage?: string;
  },
) {
  const patch: Record<string, JsonValue> = {
    status: input.status,
    error_message: input.errorMessage ?? null,
  };

  if (input.status === 'sent' || input.status === 'accepted') {
    patch.sent_at = input.occurredAt;
  }
  if (input.status === 'delivered') {
    patch.delivered_at = input.occurredAt;
  }
  if (input.status === 'read') {
    patch.read_at = input.occurredAt;
  }
  if (input.status === 'failed') {
    patch.failed_at = input.occurredAt;
  }

  const response = await service
    .from('messages')
    .update(patch)
    .eq('id', input.messageId)
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? 'Could not update message status.');
  }

  return response.data as MessageRow;
}

function assertTemplateParameters(
  template: MessageTemplateRow,
  parameters: Record<string, string>,
) {
  const requiredParameters = template.parameter_schema?.length
    ? template.parameter_schema
    : template.variables ?? [];
  const missing = requiredParameters.filter((name) => !parameters[name]);

  if (missing.length) {
    throw new Error(`Parâmetros ausentes para o template: ${missing.join(', ')}.`);
  }
}

function isFreeformReplyAllowed(conversation?: ConversationRow | null) {
  if (!conversation?.last_inbound_at) {
    return false;
  }

  return (
    Date.now() - new Date(conversation.last_inbound_at).getTime() <=
    24 * 60 * 60 * 1000
  );
}

export async function sendPersistedMessage(input: SendPersistedMessageInput) {
  const parameters = input.parameters ?? {};
  const conversation =
    input.conversation ??
    (await ensureConversation(input.service, {
      professionalId: input.professional.id,
      clientId: input.client.id,
      clientPhone: input.client.phone,
    }));

  if (input.template?.requires_opt_in) {
    const optIn = await findOptIn(input.service, input.professional.id, input.client.id);
    if (!optIn || optIn.status !== 'opted_in') {
      throw new Error('A cliente precisa ter opt-in de WhatsApp para receber automações e templates operacionais.');
    }
  }

  if (!input.template && !isFreeformReplyAllowed(conversation)) {
    throw new Error('Fora da janela de 24 horas do WhatsApp, use um template aprovado para iniciar a conversa.');
  }

  if (!input.professional.whatsapp_phone_number_id) {
    throw new Error('A profissional ainda não configurou o phone number id do WhatsApp.');
  }

  const accessToken = readEnv('WHATSAPP_ACCESS_TOKEN');
  const apiVersion = readEnv('WHATSAPP_API_VERSION');
  const now = new Date().toISOString();

  let apiResponse: unknown;
  let messageBody = input.body?.trim() ?? '';
  let externalMessageId: string | undefined;

  if (input.template) {
    if (!input.template.external_template_name) {
      throw new Error('O template selecionado ainda não possui mapeamento aprovado no WhatsApp.');
    }

    assertTemplateParameters(input.template, parameters);
    messageBody = renderTemplateBody(input.template.body, parameters);
    apiResponse = await sendWhatsAppTemplateMessage(
      {
        accessToken,
        phoneNumberId: input.professional.whatsapp_phone_number_id,
        apiVersion,
      },
      {
        toPhone: input.client.phone,
        templateName: input.template.external_template_name,
        languageCode: input.template.language_code ?? 'pt_BR',
        variableOrder:
          input.template.parameter_schema?.length
            ? input.template.parameter_schema
            : input.template.variables ?? [],
        parameters,
      },
    );
  } else {
    if (!messageBody) {
      throw new Error('Informe um texto para enviar a resposta.');
    }

    apiResponse = await sendWhatsAppTextMessage(
      {
        accessToken,
        phoneNumberId: input.professional.whatsapp_phone_number_id,
        apiVersion,
      },
      {
        toPhone: input.client.phone,
        body: messageBody,
      },
    );
  }

  externalMessageId = readMessageIdFromResponse(apiResponse);

  const messageResponse = await input.service
    .from('messages')
    .insert({
      professional_id: input.professional.id,
      conversation_id: conversation.id,
      client_id: input.client.id,
      direction: 'outbound',
      channel: 'whatsapp',
      message_type: input.template ? 'template' : 'text',
      status: 'accepted',
      body: messageBody,
      template_id: input.template?.id ?? null,
      template_name: input.template?.external_template_name ?? null,
      template_language: input.template?.language_code ?? null,
      external_message_id: externalMessageId ?? null,
      sent_at: now,
      metadata: {
        source: input.source,
        eventId: input.eventId ?? null,
        parameters,
        ...input.metadata,
      },
      raw_payload:
        apiResponse && typeof apiResponse === 'object' && !Array.isArray(apiResponse)
          ? (apiResponse as Record<string, JsonValue>)
          : {},
    })
    .select('*')
    .single();

  if (messageResponse.error || !messageResponse.data) {
    throw new Error(messageResponse.error?.message ?? 'Could not persist outbound message.');
  }

  const message = messageResponse.data as MessageRow;
  const updatedConversation = await updateConversationSnapshot(input.service, conversation.id, {
    lastMessageAt: now,
    lastMessagePreview: messageBody,
    lastMessageDirection: 'outbound',
    lastMessageStatus: message.status,
  });

  await registerIntegrationLog(input.service, {
    professionalId: input.professional.id,
    clientId: input.client.id,
    conversationId: updatedConversation.id,
    messageId: message.id,
    direction: 'outbound',
    logType: input.source === 'automation' ? 'automation' : 'send',
    eventKey: `${input.source}:${message.external_message_id ?? message.id}`,
    status: 'processed',
    payload: {
      eventId: input.eventId ?? null,
      parameters,
      templateId: input.template?.id ?? null,
    },
    response:
      apiResponse && typeof apiResponse === 'object' && !Array.isArray(apiResponse)
        ? (apiResponse as Record<string, JsonValue>)
        : {},
  });

  return {
    conversation: updatedConversation,
    message,
    externalMessageId,
    apiResponse,
  };
}
