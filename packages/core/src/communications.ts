import { useCallback, useEffect, useState } from 'react';

import type {
  AutomationRule,
  AutomationDispatchRun,
  CommunicationOptIn,
  CommunicationOptInInput,
  Conversation,
  IntegrationLog,
  Message,
  MessageSendInput,
  MessageStatusEvent,
  MessageTemplate,
  NotificationLog,
} from '@aura/types';
import {
  communicationOptInInputSchema,
  messageSendInputSchema,
} from '@aura/types';

import { AppError, logError, toAppError, toUserMessage } from './errors';
import type { AuraSupabaseClient } from './supabase';

type Row = Record<string, unknown>;

export type ClientCommunicationSnapshot = {
  conversation?: Conversation & { messages: Message[] };
  optIn?: CommunicationOptIn;
  templates: MessageTemplate[];
  statusEvents: MessageStatusEvent[];
  notificationLogs: NotificationLog[];
  integrationLogs: IntegrationLog[];
  dispatchRuns: AutomationDispatchRun[];
};

export type SendMessageResult = {
  conversation: Conversation;
  message: Message;
  externalMessageId?: string;
};

export type AutomationDispatchResult = {
  processedCount: number;
  skippedCount: number;
  failedCount: number;
  notificationLogIds: string[];
};

export type AsyncResourceOptions = {
  refreshIntervalMs?: number;
};

export type ConversationWindowState = {
  canSendFreeText: boolean;
  requiresTemplate: boolean;
  lastInboundAt?: string;
  windowExpiresAt?: string;
  status: 'open' | 'expired' | 'unavailable';
  helperText: string;
};

function assertResponse<T>(
  response: { data: T | null; error: { message: string } | null },
  fallbackMessage: string,
  details?: Record<string, unknown>,
) {
  if (response.error) {
    throw new AppError({
      code: 'database_error',
      message: response.error.message || fallbackMessage,
      userMessage: fallbackMessage,
      details,
      cause: response.error,
    });
  }

  return response.data;
}

function mapConversation(row: Row): Conversation {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    channel: row.channel as Conversation['channel'],
    externalThreadId: row.external_thread_id ? String(row.external_thread_id) : undefined,
    clientPhone: row.client_phone ? String(row.client_phone) : undefined,
    lastMessageAt: row.last_message_at ? String(row.last_message_at) : undefined,
    lastInboundAt: row.last_inbound_at ? String(row.last_inbound_at) : undefined,
    lastOutboundAt: row.last_outbound_at ? String(row.last_outbound_at) : undefined,
    lastMessagePreview: row.last_message_preview ? String(row.last_message_preview) : undefined,
    lastMessageDirection: row.last_message_direction as Conversation['lastMessageDirection'],
    lastMessageStatus: row.last_message_status as Conversation['lastMessageStatus'],
    status: row.status as Conversation['status'],
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapMessage(row: Row): Message {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    conversationId: String(row.conversation_id),
    clientId: String(row.client_id),
    direction: row.direction as Message['direction'],
    channel: row.channel as Message['channel'],
    messageType: row.message_type as Message['messageType'],
    status: row.status as Message['status'],
    body: String(row.body),
    templateId: row.template_id ? String(row.template_id) : undefined,
    templateName: row.template_name ? String(row.template_name) : undefined,
    templateLanguage: row.template_language ? String(row.template_language) : undefined,
    externalMessageId: row.external_message_id ? String(row.external_message_id) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined,
    readAt: row.read_at ? String(row.read_at) : undefined,
    failedAt: row.failed_at ? String(row.failed_at) : undefined,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapMessageTemplate(row: Row): MessageTemplate {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    name: String(row.name),
    channel: row.channel as MessageTemplate['channel'],
    templateType: row.template_type as MessageTemplate['templateType'],
    category: row.category as MessageTemplate['category'],
    body: String(row.body),
    variables: Array.isArray(row.variables) ? row.variables.map((entry) => String(entry)) : [],
    externalTemplateName: row.external_template_name
      ? String(row.external_template_name)
      : undefined,
    languageCode: String(row.language_code ?? 'pt_BR'),
    parameterSchema: Array.isArray(row.parameter_schema)
      ? row.parameter_schema.map((entry) => String(entry))
      : [],
    requiresOptIn: Boolean(row.requires_opt_in ?? true),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapNotificationLog(row: Row): NotificationLog {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    automationRuleId: row.automation_rule_id ? String(row.automation_rule_id) : undefined,
    clientId: String(row.client_id),
    eventId: row.event_id ? String(row.event_id) : undefined,
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    messageId: row.message_id ? String(row.message_id) : undefined,
    templateId: row.template_id ? String(row.template_id) : undefined,
    channel: row.channel as NotificationLog['channel'],
    executionKind: row.execution_kind as NotificationLog['executionKind'],
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
    status: row.status as NotificationLog['status'],
    scheduledFor: String(row.scheduled_for),
    processedAt: row.processed_at ? String(row.processed_at) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapCommunicationOptIn(row: Row): CommunicationOptIn {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    channel: row.channel as CommunicationOptIn['channel'],
    status: row.status as CommunicationOptIn['status'],
    source: row.source as CommunicationOptIn['source'],
    grantedAt: row.granted_at ? String(row.granted_at) : undefined,
    revokedAt: row.revoked_at ? String(row.revoked_at) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapMessageStatusEvent(row: Row): MessageStatusEvent {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    messageId: String(row.message_id),
    conversationId: String(row.conversation_id),
    clientId: String(row.client_id),
    externalMessageId: row.external_message_id ? String(row.external_message_id) : undefined,
    status: row.status as MessageStatusEvent['status'],
    occurredAt: String(row.occurred_at),
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapIntegrationLog(row: Row): IntegrationLog {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: row.client_id ? String(row.client_id) : undefined,
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    messageId: row.message_id ? String(row.message_id) : undefined,
    channel: row.channel as IntegrationLog['channel'],
    direction: row.direction as IntegrationLog['direction'],
    logType: row.log_type as IntegrationLog['logType'],
    eventKey: String(row.event_key),
    status: row.status as IntegrationLog['status'],
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    response:
      row.response && typeof row.response === 'object' && !Array.isArray(row.response)
        ? (row.response as Record<string, unknown>)
        : {},
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapAutomationRule(row: Row): AutomationRule {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    name: String(row.name),
    triggerType: row.trigger_type as AutomationRule['triggerType'],
    channel: row.channel as AutomationRule['channel'],
    templateId: row.template_id ? String(row.template_id) : undefined,
    automationKind: row.automation_kind as AutomationRule['automationKind'],
    eventOffsetMinutes: Number(row.event_offset_minutes ?? 0),
    requiresOptIn: Boolean(row.requires_opt_in ?? true),
    isActive: Boolean(row.is_active),
    payload:
      row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapAutomationDispatchRun(row: Row): AutomationDispatchRun {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    triggerSource: row.trigger_source as AutomationDispatchRun['triggerSource'],
    executionKey: String(row.execution_key),
    status: row.status as AutomationDispatchRun['status'],
    processedCount: Number(row.processed_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    failedCount: Number(row.failed_count ?? 0),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    errorMessage: row.error_message ? String(row.error_message) : undefined,
    metadata:
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function useAsyncResource<T>(
  loader: (() => Promise<T>) | null,
  options?: AsyncResourceOptions,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(loader));
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!loader) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    loader()
      .then((result) => {
        if (mounted) {
          setData(result);
        }
      })
      .catch((reason: unknown) => {
        if (mounted) {
          logError(reason, { source: 'useAsyncResource:communications' });
          setError(toUserMessage(reason));
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [loader, revision]);

  const reload = useCallback(() => {
    setRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!loader || !options?.refreshIntervalMs) {
      return;
    }

    const timer = setInterval(() => {
      setRevision((current) => current + 1);
    }, options.refreshIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [loader, options?.refreshIntervalMs]);

  return { data, loading, error, reload };
}

export async function getClientCommunicationSnapshot(
  client: AuraSupabaseClient,
  clientId: string,
): Promise<ClientCommunicationSnapshot> {
  try {
    const [
      conversationResponse,
      messagesResponse,
      optInResponse,
      templatesResponse,
      statusEventsResponse,
      notificationLogsResponse,
      integrationLogsResponse,
      dispatchRunsResponse,
    ] = await Promise.all([
      client.from('conversations').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').maybeSingle(),
      client.from('messages').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').order('created_at', { ascending: true }),
      client.from('communication_opt_ins').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').maybeSingle(),
      client.from('message_templates').select('*').eq('channel', 'whatsapp').eq('is_active', true).order('name', { ascending: true }),
      client.from('message_status_events').select('*').eq('client_id', clientId).order('occurred_at', { ascending: true }),
      client.from('notification_logs').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').order('scheduled_for', { ascending: false }).limit(20),
      client.from('integration_logs').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').order('created_at', { ascending: false }).limit(20),
      client.from('automation_dispatch_runs').select('*').contains('metadata', { clientId }).order('started_at', { ascending: false }).limit(10),
    ]);

    return {
      conversation: conversationResponse.data
        ? {
            ...mapConversation(conversationResponse.data as Row),
            messages: (assertResponse(messagesResponse, 'Não foi possível listar mensagens da cliente.') ?? []).map(
              (row) => mapMessage(row as Row),
            ),
          }
        : undefined,
      optIn: optInResponse.data ? mapCommunicationOptIn(optInResponse.data as Row) : undefined,
      templates: (assertResponse(templatesResponse, 'Não foi possível listar templates.') ?? []).map((row) =>
        mapMessageTemplate(row as Row),
      ),
      statusEvents: (
        assertResponse(statusEventsResponse, 'Não foi possível listar status das mensagens.') ?? []
      ).map((row) => mapMessageStatusEvent(row as Row)),
      notificationLogs: (
        assertResponse(notificationLogsResponse, 'Não foi possível listar execuções de automação.') ?? []
      ).map((row) => mapNotificationLog(row as Row)),
      integrationLogs: (
        assertResponse(integrationLogsResponse, 'Não foi possível listar logs de integração.') ?? []
      ).map((row) => mapIntegrationLog(row as Row)),
      dispatchRuns: (
        assertResponse(dispatchRunsResponse, 'Não foi possível listar execuções do scheduler.') ?? []
      ).map((row) => mapAutomationDispatchRun(row as Row)),
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível carregar a conversa da cliente.', { clientId });
  }
}

export async function listAutomationRules(client: AuraSupabaseClient): Promise<AutomationRule[]> {
  try {
    const response = await client
      .from('automation_rules')
      .select('*')
      .eq('channel', 'whatsapp')
      .order('is_active', { ascending: false })
      .order('name', { ascending: true });

    return (assertResponse(response, 'Não foi possível listar as automações.') ?? []).map((row) =>
      mapAutomationRule(row as Row),
    );
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar as automações.');
  }
}

export async function upsertCommunicationOptIn(
  client: AuraSupabaseClient,
  input: CommunicationOptInInput,
) {
  try {
    const payload = communicationOptInInputSchema.parse(input);
    const professionalResponse = await client.rpc('current_professional_id');
    const professionalId = assertResponse(
      professionalResponse as { data: string | null; error: { message: string } | null },
      'Não foi possível identificar a profissional.',
    );

    if (!professionalId) {
      throw new AppError({
        code: 'auth_required',
        message: 'Professional not found.',
        userMessage: 'Faça login novamente para continuar.',
      });
    }

    const response = await client
      .from('communication_opt_ins')
      .upsert(
        {
          professional_id: professionalId,
          client_id: payload.clientId,
          channel: payload.channel,
          status: payload.status,
          source: payload.source,
          granted_at:
            payload.status === 'opted_in'
              ? payload.grantedAt ?? new Date().toISOString()
              : null,
          revoked_at:
            payload.status === 'opted_out'
              ? payload.revokedAt ?? new Date().toISOString()
              : null,
          notes: payload.notes ?? null,
        },
        {
          onConflict: 'professional_id,client_id,channel',
        },
      )
      .select('*')
      .single();

    return mapCommunicationOptIn(assertResponse(response, 'Não foi possível salvar o consentimento.') as Row);
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível salvar o consentimento.');
  }
}

export async function sendClientMessage(
  client: AuraSupabaseClient,
  input: MessageSendInput,
): Promise<SendMessageResult> {
  try {
    const payload = messageSendInputSchema.parse(input);
    const response = await client.functions.invoke('whatsapp-send', {
      body: payload,
    });

    if (response.error) {
      throw response.error;
    }

    const data =
      response.data && typeof response.data === 'object' && !Array.isArray(response.data)
        ? (response.data as Record<string, unknown>)
        : null;

    const conversation = data?.conversation;
    const message = data?.message;

    if (!conversation || typeof conversation !== 'object' || !message || typeof message !== 'object') {
      throw new AppError({
        code: 'network_error',
        message: 'Unexpected function response.',
        userMessage: 'O envio foi concluído com resposta inesperada. Tente novamente.',
      });
    }

    return {
      conversation: mapConversation(conversation as Row),
      message: mapMessage(message as Row),
      externalMessageId:
        typeof data?.externalMessageId === 'string' ? data.externalMessageId : undefined,
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível enviar a mensagem.');
  }
}

export async function dispatchAutomationRules(
  client: AuraSupabaseClient,
  options?: { clientId?: string },
): Promise<AutomationDispatchResult> {
  try {
    const response = await client.functions.invoke('automation-dispatch', {
      body: {
        clientId: options?.clientId,
        mode: 'manual',
      },
    });

    if (response.error) {
      throw response.error;
    }

    const data =
      response.data && typeof response.data === 'object' && !Array.isArray(response.data)
        ? (response.data as Record<string, unknown>)
        : {};

    return {
      processedCount: Number(data.processedCount ?? 0),
      skippedCount: Number(data.skippedCount ?? 0),
      failedCount: Number(data.failedCount ?? 0),
      notificationLogIds: Array.isArray(data.notificationLogIds)
        ? data.notificationLogIds.map((entry) => String(entry))
        : [],
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível executar as automações agora.');
  }
}

export function getConversationWindowState(
  conversation?: Pick<Conversation, 'lastInboundAt'>,
  referenceTime = new Date().toISOString(),
): ConversationWindowState {
  if (!conversation?.lastInboundAt) {
    return {
      canSendFreeText: false,
      requiresTemplate: true,
      status: 'unavailable',
      helperText:
        'Nenhuma mensagem inbound recente abriu a janela de atendimento. Use template aprovado para iniciar a conversa.',
    };
  }

  const lastInboundAt = new Date(conversation.lastInboundAt);
  const windowExpiresAt = new Date(lastInboundAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const isOpen = new Date(referenceTime).getTime() <= new Date(windowExpiresAt).getTime();

  return {
    canSendFreeText: isOpen,
    requiresTemplate: !isOpen,
    lastInboundAt: conversation.lastInboundAt,
    windowExpiresAt,
    status: isOpen ? 'open' : 'expired',
    helperText: isOpen
      ? `Janela aberta até ${new Date(windowExpiresAt).toLocaleString('pt-BR')}.`
      : 'Janela expirada. Fora de 24h, a AURA exige template aprovado para mensagens iniciadas pela empresa.',
  };
}

export function canSendSelectedTemplate(
  template: Pick<MessageTemplate, 'requiresOptIn'> | undefined,
  optIn?: Pick<CommunicationOptIn, 'status'>,
) {
  if (!template) {
    return false;
  }

  if (!template.requiresOptIn) {
    return true;
  }

  return optIn?.status === 'opted_in';
}

export function buildRetryMessageInput(
  clientId: string,
  message: Pick<
    Message,
    'conversationId' | 'messageType' | 'templateId' | 'body' | 'metadata'
  >,
): MessageSendInput {
  const metadata =
    message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
      ? message.metadata
      : {};
  const parameters =
    metadata.parameters &&
    typeof metadata.parameters === 'object' &&
    !Array.isArray(metadata.parameters)
      ? Object.fromEntries(
          Object.entries(metadata.parameters as Record<string, unknown>).map(([key, value]) => [
            key,
            String(value ?? ''),
          ]),
        )
      : {};
  const eventId = typeof metadata.eventId === 'string' ? metadata.eventId : undefined;

  return message.messageType === 'template' && message.templateId
    ? {
        clientId,
        conversationId: message.conversationId,
        templateId: message.templateId,
        parameters,
        eventId,
      }
    : {
        clientId,
        conversationId: message.conversationId,
        body: message.body,
        parameters,
        eventId,
      };
}

export function useClientCommunicationSnapshot(
  client: AuraSupabaseClient | null,
  clientId: string,
  options?: AsyncResourceOptions,
) {
  const loader = useCallback(
    () =>
      client
        ? getClientCommunicationSnapshot(client, clientId)
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client, clientId],
  );

  return useAsyncResource(client ? loader : null, options);
}

export function useAutomationRules(
  client: AuraSupabaseClient | null,
  options?: AsyncResourceOptions,
) {
  const loader = useCallback(
    () =>
      client
        ? listAutomationRules(client)
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client],
  );

  return useAsyncResource(client ? loader : null, options);
}
