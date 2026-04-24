import { useCallback, useEffect, useState } from 'react';

import type {
  Appointment,
  AppointmentInput,
  AppointmentsQuery,
  Budget,
  BudgetInput,
  BudgetItem,
  BudgetsQuery,
  Client,
  ClientDocument,
  ClientEvent,
  ClientEventInput,
  ClientInput,
  ClientMedia,
  ClientNote,
  ClientsQuery,
  CommunicationOptIn,
  Contract,
  ContractInput,
  ContractsQuery,
  ContractStatusUpdateInput,
  ContractVersion,
  Conversation,
  CustomerScore,
  MessageStatusEvent,
  MediaUploadInput,
  Message,
  NotificationLog,
  Professional,
} from '@aura/types';
import {
  appointmentInputSchema,
  appointmentsQuerySchema,
  budgetInputSchema,
  budgetsQuerySchema,
  clientEventInputSchema,
  clientInputSchema,
  clientsQuerySchema,
  contractInputSchema,
  contractsQuerySchema,
  contractStatusUpdateSchema,
  mediaUploadInputSchema,
} from '@aura/types';

import { getCurrentProfessional } from './auth';
import { AppError, logError, toAppError, toUserMessage } from './errors';
import type { AuraSupabaseClient } from './supabase';
import { removeStorageFile, uploadStorageFile } from './uploads';

export type DashboardSummary = {
  professional: Professional | null;
  activeClients: number;
  bookedEvents: number;
  pendingBudgets: number;
  contractsInProgress: number;
  nextAppointments: Appointment[];
  revenuePipeline: number;
  topClients: Array<Pick<Client, 'id' | 'fullName' | 'phone' | 'priorityScore'>>;
};

export type TimelineEntry = {
  id: string;
  kind:
    | 'client'
    | 'note'
    | 'budget'
    | 'appointment'
    | 'contract'
    | 'message'
    | 'document'
    | 'media'
    | 'event';
  title: string;
  description: string;
  happenedAt: string;
};

export type ContractRecord = Contract & {
  version?: ContractVersion;
  versions: ContractVersion[];
};

export type ClientWorkspaceSnapshot = {
  client: Client;
  score?: CustomerScore;
  events: ClientEvent[];
  notes: ClientNote[];
  media: ClientMedia[];
  budgets: Array<Budget & { items: BudgetItem[] }>;
  appointments: Appointment[];
  contracts: ContractRecord[];
  documents: ClientDocument[];
  optIn?: CommunicationOptIn;
  conversation?: Conversation & { messages: Message[] };
  messageStatusEvents: MessageStatusEvent[];
  notificationLogs: NotificationLog[];
  timeline: TimelineEntry[];
};

export type UploadableFile = {
  fileName: string;
  contentType: string;
  data: ArrayBuffer;
  sizeBytes?: number;
};

type Row = Record<string, unknown>;
type AsyncResourceOptions = {
  refreshIntervalMs?: number;
};

const CLIENT_ORDER_COLUMNS: Record<NonNullable<ClientsQuery['orderBy']>, string> = {
  createdAt: 'created_at',
  fullName: 'full_name',
  priorityScore: 'priority_score',
  updatedAt: 'updated_at',
};

const BUDGET_ORDER_COLUMNS: Record<NonNullable<BudgetsQuery['orderBy']>, string> = {
  createdAt: 'created_at',
  totalAmount: 'total_amount',
  updatedAt: 'updated_at',
  validUntil: 'valid_until',
};

const CONTRACT_ORDER_COLUMNS: Record<NonNullable<ContractsQuery['orderBy']>, string> = {
  createdAt: 'created_at',
  signedAt: 'signed_at',
  updatedAt: 'updated_at',
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

function mapClient(row: Row): Client {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    fullName: String(row.full_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    city: row.city ? String(row.city) : undefined,
    instagramHandle: row.instagram_handle ? String(row.instagram_handle) : undefined,
    lifecycleStage: row.lifecycle_stage as Client['lifecycleStage'],
    priorityScore: Number(row.priority_score ?? 0),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapEvent(row: Row): ClientEvent {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    title: String(row.title),
    eventType: String(row.event_type),
    eventDate: String(row.event_date),
    location: row.location ? String(row.location) : undefined,
    status: row.status as ClientEvent['status'],
    guestCount:
      row.guest_count !== null && row.guest_count !== undefined
        ? Number(row.guest_count)
        : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapAppointment(row: Row): Appointment {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: row.event_id ? String(row.event_id) : undefined,
    title: String(row.title),
    appointmentType: row.appointment_type as Appointment['appointmentType'],
    status: row.status as Appointment['status'],
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    location: row.location ? String(row.location) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapBudget(row: Row): Budget {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: String(row.event_id),
    status: row.status as Budget['status'],
    currency: String(row.currency),
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    validUntil: row.valid_until ? String(row.valid_until) : undefined,
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapBudgetItem(row: Row): BudgetItem {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    budgetId: String(row.budget_id),
    serviceId: row.service_id ? String(row.service_id) : undefined,
    description: String(row.description),
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    totalPrice: Number(row.total_price ?? 0),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapContract(row: Row): Contract {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: String(row.event_id),
    currentVersionId: row.current_version_id ? String(row.current_version_id) : undefined,
    status: row.status as Contract['status'],
    signedAt: row.signed_at ? String(row.signed_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapContractVersion(row: Row): ContractVersion {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    contractId: String(row.contract_id),
    versionNumber: Number(row.version_number ?? 1),
    fileName: String(row.file_name),
    storagePath: String(row.storage_path),
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
    status: row.status as ContractVersion['status'],
    uploadedAt: String(row.uploaded_at),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapClientMedia(row: Row): ClientMedia {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: row.event_id ? String(row.event_id) : undefined,
    fileName: String(row.file_name),
    mediaType: row.media_type as ClientMedia['mediaType'],
    mimeType: String(row.mime_type),
    storagePath: String(row.storage_path),
    sizeBytes: row.size_bytes ? Number(row.size_bytes) : undefined,
    caption: row.caption ? String(row.caption) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapClientDocument(row: Row): ClientDocument {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: row.event_id ? String(row.event_id) : undefined,
    contractId: row.contract_id ? String(row.contract_id) : undefined,
    contractVersionId: row.contract_version_id ? String(row.contract_version_id) : undefined,
    documentType: row.document_type as ClientDocument['documentType'],
    fileName: String(row.file_name),
    storagePath: String(row.storage_path),
    mimeType: String(row.mime_type),
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
    status: row.status as ClientDocument['status'],
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapClientNote(row: Row): ClientNote {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    eventId: row.event_id ? String(row.event_id) : undefined,
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
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

function mapCustomerScore(row: Row): CustomerScore {
  return {
    id: String(row.id),
    professionalId: String(row.professional_id),
    clientId: String(row.client_id),
    priorityScore: Number(row.priority_score ?? 0),
    budgetPotentialScore: Number(row.budget_potential_score ?? 0),
    engagementScore: Number(row.engagement_score ?? 0),
    noShowRiskScore: Number(row.no_show_risk_score ?? 0),
    lastCalculatedAt: String(row.last_calculated_at),
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function escapeIlikeTerm(value: string) {
  return value.replace(/[%_]/g, '').trim();
}

function dedupeStoragePaths(entries: Array<{ bucket: 'client-media' | 'contracts' | 'documents'; path: string }>) {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const key = `${entry.bucket}:${entry.path}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function mapContractsWithVersions(contracts: Contract[], versions: ContractVersion[]): ContractRecord[] {
  return contracts.map((contract) => {
    const contractVersions = versions
      .filter((version) => version.contractId === contract.id)
      .sort((left, right) => right.versionNumber - left.versionNumber);

    return {
      ...contract,
      version: contractVersions.find((version) => version.id === contract.currentVersionId),
      versions: contractVersions,
    };
  });
}

async function getProfessionalId(client: AuraSupabaseClient) {
  const professional = await getCurrentProfessional(client);
  if (!professional) {
    throw new AppError({
      code: 'auth_required',
      message: 'Professional profile not found.',
      userMessage: 'Faça login novamente para continuar.',
    });
  }

  return professional.id;
}

export function calculateBudgetTotals(input: BudgetInput) {
  const subtotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    subtotal,
    discountAmount: input.discountAmount,
    totalAmount: subtotal - input.discountAmount,
  };
}

export function buildClientTimeline(snapshot: Omit<ClientWorkspaceSnapshot, 'timeline'>): TimelineEntry[] {
  const clientEntry: TimelineEntry = {
    id: snapshot.client.id,
    kind: 'client',
    title: 'Cliente cadastrada',
    description: snapshot.client.notes ?? snapshot.client.phone,
    happenedAt: snapshot.client.createdAt,
  };

  const documentEntries = snapshot.documents
    .filter((item) => item.documentType !== 'contract')
    .map((item) => ({
      id: item.id,
      kind: 'document' as const,
      title: item.fileName,
      description: item.documentType,
      happenedAt: item.updatedAt ?? item.createdAt,
    }));

  return [
    clientEntry,
    ...snapshot.events.map((item) => ({
      id: item.id,
      kind: 'event' as const,
      title: item.title,
      description: item.location ?? item.eventType,
      happenedAt: item.updatedAt ?? item.createdAt,
    })),
    ...snapshot.notes.map((item) => ({
      id: item.id,
      kind: 'note' as const,
      title: item.title,
      description: item.body,
      happenedAt: item.updatedAt ?? item.createdAt,
    })),
    ...snapshot.media.map((item) => ({
      id: item.id,
      kind: 'media' as const,
      title: item.fileName,
      description: item.caption ?? item.mediaType,
      happenedAt: item.updatedAt ?? item.createdAt,
    })),
    ...documentEntries,
    ...snapshot.budgets.map((item) => ({
      id: item.id,
      kind: 'budget' as const,
      title: `Orçamento ${item.status}`,
      description: `${item.items.length} item(ns) • ${item.totalAmount.toFixed(2)}`,
      happenedAt: item.updatedAt ?? item.createdAt,
    })),
    ...snapshot.appointments.map((item) => ({
      id: item.id,
      kind: 'appointment' as const,
      title: item.title,
      description: item.location ?? item.appointmentType,
      happenedAt: item.updatedAt ?? item.createdAt,
    })),
    ...snapshot.contracts.map((item) => ({
      id: item.id,
      kind: 'contract' as const,
      title: item.version?.fileName ?? 'Contrato',
      description: item.status,
      happenedAt: item.version?.uploadedAt ?? item.updatedAt ?? item.createdAt,
    })),
    ...(snapshot.conversation?.messages ?? []).map((item) => ({
      id: item.id,
      kind: 'message' as const,
      title: item.direction === 'inbound' ? 'Mensagem recebida' : 'Mensagem enviada',
      description:
        item.direction === 'outbound'
          ? `${item.body} • status ${item.status}`
          : item.body,
      happenedAt: item.createdAt,
    })),
    ...snapshot.messageStatusEvents.map((item) => ({
      id: item.id,
      kind: 'message' as const,
      title: `Status de mensagem: ${item.status}`,
      description: item.externalMessageId ?? 'Atualização recebida do WhatsApp',
      happenedAt: item.occurredAt,
    })),
    ...snapshot.notificationLogs.map((item) => ({
      id: item.id,
      kind: 'message' as const,
      title:
        item.status === 'failed'
          ? 'Falha em automação'
          : item.status === 'processed'
            ? 'Automação executada'
            : 'Automação agendada',
      description: `${item.executionKind} • ${item.status}`,
      happenedAt: item.processedAt ?? item.scheduledFor,
    })),
  ].sort((left, right) => +new Date(right.happenedAt) - +new Date(left.happenedAt));
}

export async function getDashboardSummary(client: AuraSupabaseClient): Promise<DashboardSummary> {
  try {
    const professional = await getCurrentProfessional(client);

    const [
      clientsResponse,
      budgetsResponse,
      contractsResponse,
      appointmentsResponse,
      eventsResponse,
    ] = await Promise.all([
      client.from('clients').select('*').order('priority_score', { ascending: false }),
      client.from('budgets').select('*'),
      client.from('contracts').select('*'),
      client
        .from('appointments')
        .select('*')
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(5),
      client.from('client_events').select('*'),
    ]);

    const clients = (assertResponse(clientsResponse, 'Não foi possível listar clientes.') ?? []).map((row) =>
      mapClient(row as Row),
    );
    const budgets = (assertResponse(budgetsResponse, 'Não foi possível listar orçamentos.') ?? []).map((row) =>
      mapBudget(row as Row),
    );
    const contracts = (assertResponse(contractsResponse, 'Não foi possível listar contratos.') ?? []).map((row) =>
      mapContract(row as Row),
    );
    const appointments = (
      assertResponse(appointmentsResponse, 'Não foi possível listar agendamentos.') ?? []
    ).map((row) => mapAppointment(row as Row));
    const events = (assertResponse(eventsResponse, 'Não foi possível listar eventos.') ?? []).map((row) =>
      mapEvent(row as Row),
    );

    return {
      professional,
      activeClients: clients.length,
      bookedEvents: events.filter((item) => item.status === 'booked').length,
      pendingBudgets: budgets.filter((item) => item.status === 'sent').length,
      contractsInProgress: contracts.filter((item) => item.status !== 'signed').length,
      nextAppointments: appointments,
      revenuePipeline: budgets
        .filter((item) => item.status !== 'approved')
        .reduce((sum, item) => sum + item.totalAmount, 0),
      topClients: clients.slice(0, 3).map((item) => ({
        id: item.id,
        fullName: item.fullName,
        phone: item.phone,
        priorityScore: item.priorityScore,
      })),
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível carregar o dashboard.');
  }
}

export async function listClients(
  client: AuraSupabaseClient,
  options?: Partial<ClientsQuery>,
): Promise<Client[]> {
  try {
    const payload = clientsQuerySchema.parse(options ?? {});
    let query = client.from('clients').select('*');

    if (payload.search) {
      const term = escapeIlikeTerm(payload.search);
      query = query.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    }

    if (payload.lifecycleStage) {
      query = query.eq('lifecycle_stage', payload.lifecycleStage);
    }

    query = query.order(CLIENT_ORDER_COLUMNS[payload.orderBy], {
      ascending: payload.orderDirection === 'asc',
      nullsFirst: payload.orderDirection === 'asc',
    });

    if (payload.orderBy !== 'priorityScore') {
      query = query.order('priority_score', { ascending: false });
    }

    if (payload.limit) {
      query = query.limit(payload.limit);
    }

    const response = await query;

    return (assertResponse(response, 'Não foi possível listar clientes.') ?? []).map((row) =>
      mapClient(row as Row),
    );
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar clientes.', { options });
  }
}

export async function getClient(client: AuraSupabaseClient, clientId: string) {
  try {
    const response = await client.from('clients').select('*').eq('id', clientId).maybeSingle();
    const row = assertResponse(response, 'Não foi possível carregar a cliente.');
    return row ? mapClient(row as Row) : null;
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível carregar a cliente.', { clientId });
  }
}

export async function upsertClient(
  client: AuraSupabaseClient,
  input: ClientInput,
  clientId?: string,
): Promise<Client> {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = clientInputSchema.parse(input);

    const response = clientId
      ? await client
          .from('clients')
          .update({
            full_name: payload.fullName,
            phone: payload.phone,
            email: payload.email ?? null,
            city: payload.city ?? null,
            instagram_handle: payload.instagramHandle ?? null,
            lifecycle_stage: payload.lifecycleStage,
            priority_score: payload.priorityScore,
            notes: payload.notes ?? null,
          })
          .eq('id', clientId)
          .select('*')
          .single()
      : await client
          .from('clients')
          .insert({
            professional_id: professionalId,
            full_name: payload.fullName,
            phone: payload.phone,
            email: payload.email ?? null,
            city: payload.city ?? null,
            instagram_handle: payload.instagramHandle ?? null,
            lifecycle_stage: payload.lifecycleStage,
            priority_score: payload.priorityScore,
            notes: payload.notes ?? null,
          })
          .select('*')
          .single();

    return mapClient(assertResponse(response, 'Não foi possível salvar a cliente.') as Row);
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível salvar a cliente.', { clientId });
  }
}

export async function deleteClient(client: AuraSupabaseClient, clientId: string) {
  try {
    const snapshot = await getClientWorkspaceSnapshot(client, clientId);
    if (snapshot) {
      const cleanupTargets = dedupeStoragePaths([
        ...snapshot.media.map((item) => ({ bucket: 'client-media' as const, path: item.storagePath })),
        ...snapshot.documents
          .filter((item) => item.documentType !== 'contract')
          .map((item) => ({ bucket: 'documents' as const, path: item.storagePath })),
        ...snapshot.contracts.flatMap((item) =>
          item.versions.map((version) => ({ bucket: 'contracts' as const, path: version.storagePath })),
        ),
      ]);

      await Promise.all(
        cleanupTargets.map((target) => removeStorageFile(client, target.bucket, target.path)),
      );
    }

    const response = await client.from('clients').delete().eq('id', clientId);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover a cliente.', { clientId });
  }
}

export async function listEventsByClient(
  client: AuraSupabaseClient,
  clientId: string,
): Promise<ClientEvent[]> {
  try {
    const response = await client
      .from('client_events')
      .select('*')
      .eq('client_id', clientId)
      .order('event_date', { ascending: true });

    return (assertResponse(response, 'Não foi possível listar eventos.') ?? []).map((row) =>
      mapEvent(row as Row),
    );
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar eventos.', { clientId });
  }
}

export async function upsertEvent(
  client: AuraSupabaseClient,
  input: ClientEventInput,
  eventId?: string,
): Promise<ClientEvent> {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = clientEventInputSchema.parse(input);

    const response = eventId
      ? await client
          .from('client_events')
          .update({
            title: payload.title,
            event_type: payload.eventType,
            event_date: payload.eventDate,
            location: payload.location ?? null,
            status: payload.status,
            guest_count: payload.guestCount ?? null,
            notes: payload.notes ?? null,
          })
          .eq('id', eventId)
          .select('*')
          .single()
      : await client
          .from('client_events')
          .insert({
            professional_id: professionalId,
            client_id: payload.clientId,
            title: payload.title,
            event_type: payload.eventType,
            event_date: payload.eventDate,
            location: payload.location ?? null,
            status: payload.status,
            guest_count: payload.guestCount ?? null,
            notes: payload.notes ?? null,
          })
          .select('*')
          .single();

    return mapEvent(assertResponse(response, 'Não foi possível salvar o evento.') as Row);
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível salvar o evento.', { eventId });
  }
}

export async function deleteEvent(client: AuraSupabaseClient, eventId: string) {
  try {
    const response = await client.from('client_events').delete().eq('id', eventId);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover o evento.', { eventId });
  }
}

export async function listAppointments(
  client: AuraSupabaseClient,
  options?: Partial<AppointmentsQuery>,
): Promise<Appointment[]> {
  try {
    const payload = appointmentsQuerySchema.parse(options ?? {});
    let query = client.from('appointments').select('*');

    if (payload.clientId) {
      query = query.eq('client_id', payload.clientId);
    }

    if (payload.status) {
      query = query.eq('status', payload.status);
    }

    if (payload.from) {
      query = query.gte('starts_at', payload.from);
    }

    if (payload.to) {
      query = query.lte('starts_at', payload.to);
    }

    query = query.order('starts_at', {
      ascending: payload.orderDirection === 'asc',
    });

    if (payload.limit) {
      query = query.limit(payload.limit);
    }

    const response = await query;
    return (assertResponse(response, 'Não foi possível listar agendamentos.') ?? []).map((row) =>
      mapAppointment(row as Row),
    );
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar agendamentos.', { options });
  }
}

export async function upsertAppointment(
  client: AuraSupabaseClient,
  input: AppointmentInput,
  appointmentId?: string,
): Promise<Appointment> {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = appointmentInputSchema.parse(input);

    const response = appointmentId
      ? await client
          .from('appointments')
          .update({
            client_id: payload.clientId,
            event_id: payload.eventId ?? null,
            title: payload.title,
            appointment_type: payload.appointmentType,
            status: payload.status,
            starts_at: payload.startsAt,
            ends_at: payload.endsAt,
            location: payload.location ?? null,
            notes: payload.notes ?? null,
          })
          .eq('id', appointmentId)
          .select('*')
          .single()
      : await client
          .from('appointments')
          .insert({
            professional_id: professionalId,
            client_id: payload.clientId,
            event_id: payload.eventId ?? null,
            title: payload.title,
            appointment_type: payload.appointmentType,
            status: payload.status,
            starts_at: payload.startsAt,
            ends_at: payload.endsAt,
            location: payload.location ?? null,
            notes: payload.notes ?? null,
          })
          .select('*')
          .single();

    return mapAppointment(assertResponse(response, 'Não foi possível salvar o agendamento.') as Row);
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível salvar o agendamento.', { appointmentId });
  }
}

export async function deleteAppointment(client: AuraSupabaseClient, appointmentId: string) {
  try {
    const response = await client.from('appointments').delete().eq('id', appointmentId);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover o agendamento.', { appointmentId });
  }
}

export async function listBudgets(
  client: AuraSupabaseClient,
  options?: Partial<BudgetsQuery>,
): Promise<Array<Budget & { items: BudgetItem[] }>> {
  try {
    const payload = budgetsQuerySchema.parse(options ?? {});
    let budgetsQuery = client.from('budgets').select('*');

    if (payload.clientId) {
      budgetsQuery = budgetsQuery.eq('client_id', payload.clientId);
    }

    if (payload.status) {
      budgetsQuery = budgetsQuery.eq('status', payload.status);
    }

    budgetsQuery = budgetsQuery.order(BUDGET_ORDER_COLUMNS[payload.orderBy], {
      ascending: payload.orderDirection === 'asc',
      nullsFirst: payload.orderDirection === 'asc',
    });

    if (payload.limit) {
      budgetsQuery = budgetsQuery.limit(payload.limit);
    }

    const [budgetsResponse, itemsResponse] = await Promise.all([
      budgetsQuery,
      client.from('budget_items').select('*'),
    ]);

    const budgets = (assertResponse(budgetsResponse, 'Não foi possível listar orçamentos.') ?? []).map(
      (row) => mapBudget(row as Row),
    );
    const items = (
      assertResponse(itemsResponse, 'Não foi possível listar itens de orçamento.') ?? []
    ).map((row) => mapBudgetItem(row as Row));

    return budgets.map((budget) => ({
      ...budget,
      items: items.filter((item) => item.budgetId === budget.id),
    }));
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar orçamentos.', { options });
  }
}

export async function upsertBudget(
  client: AuraSupabaseClient,
  input: BudgetInput,
  budgetId?: string,
): Promise<Budget & { items: BudgetItem[] }> {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = budgetInputSchema.parse(input);
    const totals = calculateBudgetTotals(payload);
    const sentAt = payload.status === 'sent' ? new Date().toISOString() : null;

    const budgetResponse = budgetId
      ? await client
          .from('budgets')
          .update({
            client_id: payload.clientId,
            event_id: payload.eventId,
            status: payload.status,
            currency: payload.currency,
            subtotal: totals.subtotal,
            discount_amount: totals.discountAmount,
            total_amount: totals.totalAmount,
            valid_until: payload.validUntil ?? null,
            sent_at: sentAt,
          })
          .eq('id', budgetId)
          .select('*')
          .single()
      : await client
          .from('budgets')
          .insert({
            professional_id: professionalId,
            client_id: payload.clientId,
            event_id: payload.eventId,
            status: payload.status,
            currency: payload.currency,
            subtotal: totals.subtotal,
            discount_amount: totals.discountAmount,
            total_amount: totals.totalAmount,
            valid_until: payload.validUntil ?? null,
            sent_at: sentAt,
          })
          .select('*')
          .single();

    const budget = mapBudget(assertResponse(budgetResponse, 'Não foi possível salvar o orçamento.') as Row);

    if (budgetId) {
      const deleteItemsResponse = await client.from('budget_items').delete().eq('budget_id', budgetId);
      if (deleteItemsResponse.error) {
        throw deleteItemsResponse.error;
      }
    }

    const itemsResponse = await client
      .from('budget_items')
      .insert(
        payload.items.map((item) => ({
          professional_id: professionalId,
          budget_id: budget.id,
          service_id: item.serviceId ?? null,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice,
        })),
      )
      .select('*');

    const items = (
      assertResponse(itemsResponse, 'Não foi possível salvar os itens do orçamento.') ?? []
    ).map((row) => mapBudgetItem(row as Row));

    return {
      ...budget,
      items,
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível salvar o orçamento.', { budgetId });
  }
}

export async function deleteBudget(client: AuraSupabaseClient, budgetId: string) {
  try {
    const response = await client.from('budgets').delete().eq('id', budgetId);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover o orçamento.', { budgetId });
  }
}

export async function listContracts(
  client: AuraSupabaseClient,
  options?: Partial<ContractsQuery>,
): Promise<ContractRecord[]> {
  try {
    const payload = contractsQuerySchema.parse(options ?? {});
    let contractsQuery = client.from('contracts').select('*');

    if (payload.clientId) {
      contractsQuery = contractsQuery.eq('client_id', payload.clientId);
    }

    if (payload.status) {
      contractsQuery = contractsQuery.eq('status', payload.status);
    }

    contractsQuery = contractsQuery.order(CONTRACT_ORDER_COLUMNS[payload.orderBy], {
      ascending: payload.orderDirection === 'asc',
      nullsFirst: payload.orderDirection === 'asc',
    });

    if (payload.limit) {
      contractsQuery = contractsQuery.limit(payload.limit);
    }

    const [contractsResponse, versionsResponse] = await Promise.all([
      contractsQuery,
      client.from('contract_versions').select('*'),
    ]);

    const contracts = (assertResponse(contractsResponse, 'Não foi possível listar contratos.') ?? []).map(
      (row) => mapContract(row as Row),
    );
    const versions = (
      assertResponse(versionsResponse, 'Não foi possível listar versões de contrato.') ?? []
    ).map((row) => mapContractVersion(row as Row));

    return mapContractsWithVersions(contracts, versions);
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível listar contratos.', { options });
  }
}

async function getContractById(client: AuraSupabaseClient, contractId: string) {
  const response = await client.from('contracts').select('*').eq('id', contractId).maybeSingle();
  const row = assertResponse(response, 'Não foi possível carregar o contrato.', { contractId });
  return row ? mapContract(row as Row) : null;
}

async function createContractDocumentEntry(
  client: AuraSupabaseClient,
  input: {
    professionalId: string;
    clientId: string;
    eventId: string;
    contractId: string;
    contractVersionId: string;
    file: UploadableFile;
    storagePath: string;
  },
) {
  const response = await client
    .from('client_documents')
    .insert({
      professional_id: input.professionalId,
      client_id: input.clientId,
      event_id: input.eventId,
      contract_id: input.contractId,
      contract_version_id: input.contractVersionId,
      document_type: 'contract',
      file_name: input.file.fileName,
      storage_path: input.storagePath,
      mime_type: input.file.contentType,
      file_size_bytes: input.file.sizeBytes ?? input.file.data.byteLength,
      status: 'active',
    })
    .select('*')
    .single();

  return mapClientDocument(assertResponse(response, 'Não foi possível registrar o PDF do contrato.') as Row);
}

export async function createContract(
  client: AuraSupabaseClient,
  input: ContractInput,
  file: UploadableFile,
): Promise<ContractRecord> {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = contractInputSchema.parse(input);

    const contractResponse = await client
      .from('contracts')
      .insert({
        professional_id: professionalId,
        client_id: payload.clientId,
        event_id: payload.eventId,
        status: payload.status,
        signed_at: payload.signedAt ?? null,
      })
      .select('*')
      .single();

    const contract = mapContract(assertResponse(contractResponse, 'Não foi possível criar o contrato.') as Row);

    return uploadContractVersion(client, contract.id, file, {
      status: payload.status,
      signedAt: payload.signedAt,
    });
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível criar o contrato.');
  }
}

export async function uploadContractVersion(
  client: AuraSupabaseClient,
  contractId: string,
  file: UploadableFile,
  options?: {
    signedAt?: string;
    status?: ContractInput['status'];
  },
): Promise<ContractRecord> {
  try {
    const professionalId = await getProfessionalId(client);
    const contract = await getContractById(client, contractId);

    if (!contract) {
      throw new AppError({
        code: 'not_found',
        message: 'Contract not found.',
        userMessage: 'Contrato não encontrado.',
        details: { contractId },
      });
    }

    const currentVersionsResponse = await client
      .from('contract_versions')
      .select('*')
      .eq('contract_id', contractId)
      .order('version_number', { ascending: false });

    const currentVersions = (
      assertResponse(currentVersionsResponse, 'Não foi possível carregar versões do contrato.') ?? []
    ).map((row) => mapContractVersion(row as Row));

    const nextVersionNumber = (currentVersions[0]?.versionNumber ?? 0) + 1;
    const upload = await uploadStorageFile(client, {
      bucket: 'contracts',
      professionalId,
      clientId: contract.clientId,
      fileName: file.fileName,
      contentType: file.contentType,
      data: file.data,
      folder: contractId,
    });

    const versionResponse = await client
      .from('contract_versions')
      .insert({
        professional_id: professionalId,
        contract_id: contract.id,
        version_number: nextVersionNumber,
        file_name: file.fileName,
        storage_path: upload.path,
        file_size_bytes: file.sizeBytes ?? file.data.byteLength,
        status: options?.status ?? contract.status,
      })
      .select('*')
      .single();

    const version = mapContractVersion(assertResponse(versionResponse, 'Não foi possível salvar a nova versão.') as Row);

    const archiveDocumentsResponse = await client
      .from('client_documents')
      .update({
        status: 'archived',
      })
      .eq('contract_id', contractId)
      .eq('document_type', 'contract')
      .eq('status', 'active');

    if (archiveDocumentsResponse.error) {
      throw archiveDocumentsResponse.error;
    }

    await createContractDocumentEntry(client, {
      professionalId,
      clientId: contract.clientId,
      eventId: contract.eventId,
      contractId: contract.id,
      contractVersionId: version.id,
      file,
      storagePath: upload.path,
    });

    const updateContractResponse = await client
      .from('contracts')
      .update({
        current_version_id: version.id,
        status: options?.status ?? contract.status,
        signed_at:
          options?.status === 'signed' ? options.signedAt ?? new Date().toISOString() : options?.signedAt ?? contract.signedAt ?? null,
      })
      .eq('id', contract.id)
      .select('*')
      .single();

    const updatedContract = mapContract(assertResponse(updateContractResponse, 'Não foi possível concluir a nova versão.') as Row);

    return mapContractsWithVersions([updatedContract], [...currentVersions, version])[0];
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível enviar a nova versão do contrato.', {
      contractId,
    });
  }
}

export async function updateContractStatus(
  client: AuraSupabaseClient,
  contractId: string,
  input: ContractStatusUpdateInput,
) {
  try {
    const payload = contractStatusUpdateSchema.parse(input);
    const response = await client
      .from('contracts')
      .update({
        status: payload.status,
        signed_at: payload.status === 'signed' ? payload.signedAt ?? new Date().toISOString() : payload.signedAt ?? null,
      })
      .eq('id', contractId)
      .select('*')
      .single();

    const contract = mapContract(assertResponse(response, 'Não foi possível atualizar o contrato.') as Row);

    const versionStatusResponse = await client
      .from('contract_versions')
      .update({
        status: payload.status,
      })
      .eq('contract_id', contractId);

    if (versionStatusResponse.error) {
      throw versionStatusResponse.error;
    }

    return contract;
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível atualizar o contrato.', { contractId });
  }
}

export async function deleteContract(client: AuraSupabaseClient, contractId: string) {
  try {
    const versionsResponse = await client.from('contract_versions').select('*').eq('contract_id', contractId);

    const versions = (
      assertResponse(versionsResponse, 'Não foi possível carregar versões do contrato.') ?? []
    ).map((row) => mapContractVersion(row as Row));

    await Promise.all(versions.map((version) => removeStorageFile(client, 'contracts', version.storagePath)));

    const response = await client.from('contracts').delete().eq('id', contractId);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover o contrato.', { contractId });
  }
}

export async function uploadClientAsset(
  client: AuraSupabaseClient,
  input: MediaUploadInput,
  file: UploadableFile,
) {
  try {
    const professionalId = await getProfessionalId(client);
    const payload = mediaUploadInputSchema.parse(input);
    const isImage = file.contentType.startsWith('image/');

    const bucket = isImage ? 'client-media' : 'documents';
    const upload = await uploadStorageFile(client, {
      bucket,
      professionalId,
      clientId: payload.clientId,
      fileName: file.fileName,
      contentType: file.contentType,
      data: file.data,
      folder: payload.eventId ?? 'general',
    });

    if (isImage) {
      const response = await client
        .from('client_media')
        .insert({
          professional_id: professionalId,
          client_id: payload.clientId,
          event_id: payload.eventId ?? null,
          file_name: file.fileName,
          media_type: 'image',
          mime_type: file.contentType,
          storage_path: upload.path,
          size_bytes: file.sizeBytes ?? file.data.byteLength,
          caption: payload.caption ?? null,
        })
        .select('*')
        .single();

      return {
        kind: 'media' as const,
        record: mapClientMedia(assertResponse(response, 'Não foi possível salvar a imagem.') as Row),
      };
    }

    const response = await client
      .from('client_documents')
      .insert({
        professional_id: professionalId,
        client_id: payload.clientId,
        event_id: payload.eventId ?? null,
        document_type: 'other',
        file_name: file.fileName,
        storage_path: upload.path,
        mime_type: file.contentType,
        file_size_bytes: file.sizeBytes ?? file.data.byteLength,
        status: 'active',
      })
      .select('*')
      .single();

    return {
      kind: 'document' as const,
      record: mapClientDocument(assertResponse(response, 'Não foi possível salvar o arquivo.') as Row),
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível concluir o upload do arquivo.');
  }
}

export async function deleteClientMedia(client: AuraSupabaseClient, media: ClientMedia) {
  try {
    await removeStorageFile(client, 'client-media', media.storagePath);
    const response = await client.from('client_media').delete().eq('id', media.id);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover a imagem.', { mediaId: media.id });
  }
}

export async function deleteClientDocument(client: AuraSupabaseClient, document: ClientDocument) {
  try {
    if (document.contractId || document.documentType === 'contract') {
      throw new AppError({
        code: 'forbidden',
        message: 'Contract documents must be managed from the contract module.',
        userMessage: 'Arquivos de contrato devem ser gerenciados na seção de contratos.',
        details: {
          documentId: document.id,
          contractId: document.contractId,
        },
      });
    }

    await removeStorageFile(client, 'documents', document.storagePath);
    const response = await client.from('client_documents').delete().eq('id', document.id);
    if (response.error) {
      throw response.error;
    }
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível remover o arquivo.', { documentId: document.id });
  }
}

export async function getClientWorkspaceSnapshot(
  client: AuraSupabaseClient,
  clientId: string,
): Promise<ClientWorkspaceSnapshot | null> {
  try {
    const [
      clientResponse,
      eventsResponse,
      notesResponse,
      mediaResponse,
      documentsResponse,
      conversationsResponse,
      messagesResponse,
      optInResponse,
      messageStatusEventsResponse,
      notificationLogsResponse,
      scoreResponse,
      budgets,
      appointments,
      contracts,
    ] = await Promise.all([
      client.from('clients').select('*').eq('id', clientId).maybeSingle(),
      client.from('client_events').select('*').eq('client_id', clientId).order('event_date', { ascending: true }),
      client.from('client_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      client.from('client_media').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      client.from('client_documents').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      client.from('conversations').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').maybeSingle(),
      client.from('messages').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').order('created_at', { ascending: true }),
      client.from('communication_opt_ins').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').maybeSingle(),
      client.from('message_status_events').select('*').eq('client_id', clientId).order('occurred_at', { ascending: true }),
      client.from('notification_logs').select('*').eq('client_id', clientId).eq('channel', 'whatsapp').order('scheduled_for', { ascending: false }),
      client.from('customer_scores').select('*').eq('client_id', clientId).maybeSingle(),
      listBudgets(client, { clientId }),
      listAppointments(client, { clientId }),
      listContracts(client, { clientId }),
    ]);

    const clientRow = assertResponse(clientResponse, 'Não foi possível carregar a cliente.');
    if (!clientRow) {
      return null;
    }

    const snapshotBase = {
      client: mapClient(clientRow as Row),
      score: scoreResponse.data ? mapCustomerScore(scoreResponse.data as Row) : undefined,
      events: (assertResponse(eventsResponse, 'Não foi possível listar eventos da cliente.') ?? []).map((row) =>
        mapEvent(row as Row),
      ),
      notes: (assertResponse(notesResponse, 'Não foi possível listar notas da cliente.') ?? []).map((row) =>
        mapClientNote(row as Row),
      ),
      media: (assertResponse(mediaResponse, 'Não foi possível listar mídias da cliente.') ?? []).map((row) =>
        mapClientMedia(row as Row),
      ),
      budgets,
      appointments,
      contracts,
      optIn: optInResponse.data ? mapCommunicationOptIn(optInResponse.data as Row) : undefined,
      documents: (
        assertResponse(documentsResponse, 'Não foi possível listar documentos da cliente.') ?? []
      ).map((row) => mapClientDocument(row as Row)),
      conversation: conversationsResponse.data
        ? {
            ...mapConversation(conversationsResponse.data as Row),
            messages: (assertResponse(messagesResponse, 'Não foi possível listar mensagens da cliente.') ?? []).map(
              (row) => mapMessage(row as Row),
            ),
          }
        : undefined,
      messageStatusEvents: (
        assertResponse(messageStatusEventsResponse, 'Não foi possível listar os status das mensagens.') ?? []
      ).map((row) => mapMessageStatusEvent(row as Row)),
      notificationLogs: (
        assertResponse(notificationLogsResponse, 'Não foi possível listar as automações da cliente.') ?? []
      ).map((row) => mapNotificationLog(row as Row)),
    };

    return {
      ...snapshotBase,
      timeline: buildClientTimeline(snapshotBase),
    };
  } catch (reason) {
    throw toAppError(reason, 'Não foi possível carregar o detalhe da cliente.', { clientId });
  }
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
          logError(reason, { source: 'useAsyncResource' });
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
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!loader || !options?.refreshIntervalMs) {
      return;
    }

    const timer = setInterval(() => {
      setRevision((value) => value + 1);
    }, options.refreshIntervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [loader, options?.refreshIntervalMs]);

  return { data, loading, error, reload };
}

export function useDashboardSummary(client: AuraSupabaseClient | null) {
  const loader = useCallback(
    () => (client ? getDashboardSummary(client) : Promise.reject(new AppError({ code: 'auth_required', message: 'No session', userMessage: 'Faça login para continuar.' }))),
    [client],
  );
  return useAsyncResource(client ? loader : null);
}

export function useClients(client: AuraSupabaseClient | null, options?: Partial<ClientsQuery>) {
  const serializedOptions = JSON.stringify(options ?? {});
  const loader = useCallback(
    () =>
      client
        ? listClients(
            client,
            serializedOptions
              ? (JSON.parse(serializedOptions) as Partial<ClientsQuery>)
              : undefined,
          )
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client, serializedOptions],
  );
  return useAsyncResource(client ? loader : null);
}

export function useAppointments(
  client: AuraSupabaseClient | null,
  options?: Partial<AppointmentsQuery>,
) {
  const serializedOptions = JSON.stringify(options ?? {});
  const loader = useCallback(
    () =>
      client
        ? listAppointments(
            client,
            serializedOptions
              ? (JSON.parse(serializedOptions) as Partial<AppointmentsQuery>)
              : undefined,
          )
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client, serializedOptions],
  );
  return useAsyncResource(client ? loader : null);
}

export function useBudgets(client: AuraSupabaseClient | null, options?: Partial<BudgetsQuery>) {
  const serializedOptions = JSON.stringify(options ?? {});
  const loader = useCallback(
    () =>
      client
        ? listBudgets(
            client,
            serializedOptions
              ? (JSON.parse(serializedOptions) as Partial<BudgetsQuery>)
              : undefined,
          )
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client, serializedOptions],
  );
  return useAsyncResource(client ? loader : null);
}

export function useContracts(client: AuraSupabaseClient | null, options?: Partial<ContractsQuery>) {
  const serializedOptions = JSON.stringify(options ?? {});
  const loader = useCallback(
    () =>
      client
        ? listContracts(
            client,
            serializedOptions
              ? (JSON.parse(serializedOptions) as Partial<ContractsQuery>)
              : undefined,
          )
        : Promise.reject(
            new AppError({
              code: 'auth_required',
              message: 'No session',
              userMessage: 'Faça login para continuar.',
            }),
          ),
    [client, serializedOptions],
  );
  return useAsyncResource(client ? loader : null);
}

export function useClientWorkspaceSnapshot(
  client: AuraSupabaseClient | null,
  clientId: string,
  options?: AsyncResourceOptions,
) {
  const loader = useCallback(
    () =>
      client
        ? getClientWorkspaceSnapshot(client, clientId)
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
