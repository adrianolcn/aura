import { z } from 'zod';

export const budgetStatusSchema = z.enum([
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired',
]);
export const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);
export const contractStatusSchema = z.enum([
  'draft',
  'uploaded',
  'sent',
  'signed',
  'cancelled',
]);
export const messageDirectionSchema = z.enum(['inbound', 'outbound']);
export const messageChannelSchema = z.enum(['whatsapp', 'internal', 'email']);
export const conversationStatusSchema = z.enum(['active', 'archived', 'pending']);
export const messageStatusSchema = z.enum([
  'pending',
  'accepted',
  'sent',
  'delivered',
  'read',
  'received',
  'failed',
]);
export const messageTypeSchema = z.enum([
  'text',
  'template',
  'image',
  'document',
  'system',
]);
export const communicationConsentStatusSchema = z.enum([
  'opted_in',
  'opted_out',
  'pending',
]);
export const communicationConsentSourceSchema = z.enum([
  'manual',
  'whatsapp',
  'contract',
  'form',
  'import',
]);
export const messageTemplateCategorySchema = z.enum([
  'utility',
  'marketing',
  'authentication',
]);
export const automationTriggerSchema = z.enum([
  'appointment_confirmation',
  'appointment_reminder',
  'same_day_reminder',
  'follow_up',
  'budget_nudge',
  'contract_reminder',
  'day_before_guidance',
  'trial_reminder',
  'manual',
]);
export const automationExecutionKindSchema = z.enum([
  'appointment_confirmation',
  'pre_appointment_24h',
  'same_day_reminder',
  'trial_reminder',
  'day_before_guidance',
  'post_service_follow_up',
  'manual',
]);
export const mediaTypeSchema = z.enum(['image', 'pdf', 'video', 'file']);
export const documentTypeSchema = z.enum(['contract', 'briefing', 'checklist', 'invoice', 'other']);
export const clientLifecycleStageSchema = z.enum([
  'lead',
  'qualified',
  'proposal',
  'confirmed',
  'archived',
]);
export const clientEventStatusSchema = z.enum([
  'lead',
  'quoted',
  'booked',
  'completed',
  'cancelled',
]);
export const appointmentTypeSchema = z.enum([
  'consultation',
  'trial',
  'event',
  'follow_up',
]);
export const supportedLocaleSchema = z.enum(['pt-BR', 'en-US']);

export const authSignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const authSignUpSchema = authSignInSchema.extend({
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  phone: z.string().min(8),
  whatsappPhone: z.string().min(8).optional(),
});

const baseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

const tenantEntitySchema = baseEntitySchema.extend({
  professionalId: z.string().uuid(),
});

export const professionalSchema = baseEntitySchema.extend({
  authUserId: z.string().uuid(),
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  phone: z.string().min(8),
  whatsappPhone: z.string().min(8),
  whatsappPhoneNumberId: z.string().min(3).optional(),
  whatsappBusinessAccountId: z.string().min(3).optional(),
  email: z.string().email(),
  locale: supportedLocaleSchema.default('pt-BR'),
  timezone: z.string().default('America/Sao_Paulo'),
  planTier: z.string().default('mvp'),
});

export const clientSchema = tenantEntitySchema.extend({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional(),
  city: z.string().optional(),
  instagramHandle: z.string().optional(),
  lifecycleStage: clientLifecycleStageSchema,
  priorityScore: z.number().int().min(0).max(100),
  notes: z.string().optional(),
});

export const clientEventSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  title: z.string().min(2),
  eventType: z.string().min(2),
  eventDate: z.string().datetime(),
  location: z.string().optional(),
  status: clientEventStatusSchema,
  guestCount: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const clientNoteSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  title: z.string().min(2),
  body: z.string().min(1),
});

export const clientMediaSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  fileName: z.string().min(2),
  mediaType: mediaTypeSchema,
  mimeType: z.string().min(3),
  storagePath: z.string().min(3),
  sizeBytes: z.number().int().nonnegative().optional(),
  caption: z.string().optional(),
});

export const serviceSchema = tenantEntitySchema.extend({
  name: z.string().min(2),
  category: z.enum(['makeup', 'hair', 'combo', 'trial', 'other']),
  description: z.string().optional(),
  basePrice: z.number().nonnegative(),
  durationMinutes: z.number().int().positive(),
  isActive: z.boolean(),
});

export const budgetSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: budgetStatusSchema,
  currency: z.string().length(3),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  validUntil: z.string().datetime().optional(),
  sentAt: z.string().datetime().optional(),
});

export const budgetItemSchema = tenantEntitySchema.extend({
  budgetId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  description: z.string().min(2),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
});

export const appointmentSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  title: z.string().min(2),
  appointmentType: appointmentTypeSchema,
  status: appointmentStatusSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

export const contractSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid(),
  currentVersionId: z.string().uuid().optional(),
  status: contractStatusSchema,
  signedAt: z.string().datetime().optional(),
});

export const contractVersionSchema = tenantEntitySchema.extend({
  contractId: z.string().uuid(),
  versionNumber: z.number().int().positive(),
  fileName: z.string().min(2),
  storagePath: z.string().min(3),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  status: contractStatusSchema,
  uploadedAt: z.string().datetime(),
});

export const clientDocumentSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  contractVersionId: z.string().uuid().optional(),
  documentType: documentTypeSchema,
  fileName: z.string().min(2),
  storagePath: z.string().min(3),
  mimeType: z.string().min(3),
  fileSizeBytes: z.number().int().nonnegative().optional(),
  status: z.enum(['active', 'archived']),
});

export const clientInputSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')).transform((value) => value || undefined),
  city: z.string().optional(),
  instagramHandle: z.string().optional(),
  lifecycleStage: clientLifecycleStageSchema.default('lead'),
  priorityScore: z.coerce.number().int().min(0).max(100).default(50),
  notes: z.string().optional(),
});

export const clientEventInputSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(2),
  eventType: z.string().min(2),
  eventDate: z.string().datetime(),
  location: z.string().optional(),
  status: clientEventStatusSchema.default('lead'),
  guestCount: z.coerce.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});

export const appointmentInputSchema = z
  .object({
    clientId: z.string().uuid(),
    eventId: z.string().uuid().optional(),
    title: z.string().min(2),
    appointmentType: appointmentTypeSchema,
    status: appointmentStatusSchema.default('scheduled'),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    location: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((value) => new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(), {
    message: 'A data final deve ser posterior ao início.',
    path: ['endsAt'],
  });

export const budgetItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unitPrice: z.coerce.number().nonnegative(),
});

export const budgetInputSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: budgetStatusSchema.default('draft'),
  currency: z.string().length(3).default('BRL'),
  discountAmount: z.coerce.number().nonnegative().default(0),
  validUntil: z.string().datetime().optional(),
  items: z.array(budgetItemInputSchema).min(1),
});

export const contractInputSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid(),
  status: contractStatusSchema.default('uploaded'),
  signedAt: z.string().datetime().optional(),
});

export const contractStatusUpdateSchema = z.object({
  status: contractStatusSchema,
  signedAt: z.string().datetime().optional(),
});

export const clientsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  lifecycleStage: clientLifecycleStageSchema.optional(),
  orderBy: z.enum(['createdAt', 'updatedAt', 'priorityScore', 'fullName']).default('updatedAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const appointmentsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: appointmentStatusSchema.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  orderDirection: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const budgetsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: budgetStatusSchema.optional(),
  orderBy: z.enum(['createdAt', 'updatedAt', 'validUntil', 'totalAmount']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const contractsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  status: contractStatusSchema.optional(),
  orderBy: z.enum(['createdAt', 'updatedAt', 'signedAt']).default('createdAt'),
  orderDirection: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const noteInputSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  title: z.string().min(2),
  body: z.string().min(1),
});

export const mediaUploadInputSchema = z.object({
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  caption: z.string().optional(),
});

export const conversationSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  channel: messageChannelSchema,
  externalThreadId: z.string().optional(),
  clientPhone: z.string().min(8).optional(),
  lastMessageAt: z.string().datetime().optional(),
  lastInboundAt: z.string().datetime().optional(),
  lastOutboundAt: z.string().datetime().optional(),
  lastMessagePreview: z.string().optional(),
  lastMessageDirection: messageDirectionSchema.optional(),
  lastMessageStatus: messageStatusSchema.optional(),
  status: conversationStatusSchema,
});

export const messageSchema = tenantEntitySchema.extend({
  conversationId: z.string().uuid(),
  clientId: z.string().uuid(),
  direction: messageDirectionSchema,
  channel: messageChannelSchema,
  messageType: messageTypeSchema.default('text'),
  status: messageStatusSchema.default('pending'),
  body: z.string().min(1),
  templateId: z.string().uuid().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  externalMessageId: z.string().optional(),
  errorMessage: z.string().optional(),
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  failedAt: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const automationRuleSchema = tenantEntitySchema.extend({
  name: z.string().min(2),
  triggerType: automationTriggerSchema,
  channel: messageChannelSchema,
  templateId: z.string().uuid().optional(),
  automationKind: automationExecutionKindSchema.default('manual'),
  eventOffsetMinutes: z.number().int(),
  requiresOptIn: z.boolean().default(true),
  isActive: z.boolean(),
  payload: z.record(z.unknown()).default({}),
});

export const messageTemplateSchema = tenantEntitySchema.extend({
  name: z.string().min(2),
  channel: messageChannelSchema,
  templateType: z.enum([
    'appointment_confirmation',
    'reminder',
    'trial_reminder',
    'day_before_guidance',
    'follow_up',
    'budget',
    'custom',
  ]),
  category: messageTemplateCategorySchema.default('utility'),
  body: z.string().min(1),
  variables: z.array(z.string()).default([]),
  externalTemplateName: z.string().optional(),
  languageCode: z.string().default('pt_BR'),
  parameterSchema: z.array(z.string()).default([]),
  requiresOptIn: z.boolean().default(true),
  isActive: z.boolean(),
});

export const notificationLogSchema = tenantEntitySchema.extend({
  automationRuleId: z.string().uuid().optional(),
  clientId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  channel: messageChannelSchema,
  executionKind: automationExecutionKindSchema.default('manual'),
  idempotencyKey: z.string().optional(),
  status: z.enum(['scheduled', 'processed', 'failed', 'cancelled', 'skipped']),
  scheduledFor: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const communicationOptInSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  channel: messageChannelSchema.default('whatsapp'),
  status: communicationConsentStatusSchema,
  source: communicationConsentSourceSchema.default('manual'),
  grantedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const communicationOptInInputSchema = z.object({
  clientId: z.string().uuid(),
  channel: messageChannelSchema.default('whatsapp'),
  status: communicationConsentStatusSchema,
  source: communicationConsentSourceSchema.default('manual'),
  grantedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const messageStatusEventSchema = tenantEntitySchema.extend({
  messageId: z.string().uuid(),
  conversationId: z.string().uuid(),
  clientId: z.string().uuid(),
  externalMessageId: z.string().optional(),
  status: messageStatusSchema,
  occurredAt: z.string().datetime(),
  payload: z.record(z.unknown()).default({}),
});

export const integrationLogSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  channel: messageChannelSchema,
  direction: z.enum(['inbound', 'outbound', 'system']),
  logType: z.enum([
    'webhook',
    'send',
    'automation',
    'status',
    'verification',
    'scheduler',
  ]),
  eventKey: z.string(),
  status: z.enum(['received', 'processed', 'skipped', 'failed']),
  payload: z.record(z.unknown()).default({}),
  response: z.record(z.unknown()).default({}),
  errorMessage: z.string().optional(),
});

export const automationDispatchRunSchema = tenantEntitySchema.extend({
  triggerSource: z.enum(['manual', 'scheduler', 'retry']),
  executionKey: z.string(),
  status: z.enum(['running', 'processed', 'failed', 'partial']),
  processedCount: z.number().int().nonnegative().default(0),
  skippedCount: z.number().int().nonnegative().default(0),
  failedCount: z.number().int().nonnegative().default(0),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const messageSendInputSchema = z
  .object({
    clientId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
    body: z.string().trim().optional(),
    parameters: z.record(z.string()).default({}),
  })
  .refine((value) => Boolean(value.templateId || value.body), {
    message: 'Informe um texto de resposta ou selecione um template.',
    path: ['body'],
  });

export const customerScoreSchema = tenantEntitySchema.extend({
  clientId: z.string().uuid(),
  priorityScore: z.number().int().min(0).max(100),
  budgetPotentialScore: z.number().int().min(0).max(100),
  engagementScore: z.number().int().min(0).max(100),
  noShowRiskScore: z.number().int().min(0).max(100),
  lastCalculatedAt: z.string().datetime(),
  notes: z.string().optional(),
});

export type Professional = z.infer<typeof professionalSchema>;
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type AuthSignInInput = z.infer<typeof authSignInSchema>;
export type AuthSignUpInput = z.infer<typeof authSignUpSchema>;
export type Client = z.infer<typeof clientSchema>;
export type ClientInput = z.infer<typeof clientInputSchema>;
export type ClientEvent = z.infer<typeof clientEventSchema>;
export type ClientEventInput = z.infer<typeof clientEventInputSchema>;
export type ClientNote = z.infer<typeof clientNoteSchema>;
export type NoteInput = z.infer<typeof noteInputSchema>;
export type ClientMedia = z.infer<typeof clientMediaSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadInputSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInput = z.infer<typeof budgetInputSchema>;
export type BudgetItem = z.infer<typeof budgetItemSchema>;
export type BudgetItemInput = z.infer<typeof budgetItemInputSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type AppointmentInput = z.infer<typeof appointmentInputSchema>;
export type Contract = z.infer<typeof contractSchema>;
export type ContractInput = z.infer<typeof contractInputSchema>;
export type ContractStatusUpdateInput = z.infer<typeof contractStatusUpdateSchema>;
export type ClientsQuery = z.infer<typeof clientsQuerySchema>;
export type AppointmentsQuery = z.infer<typeof appointmentsQuerySchema>;
export type BudgetsQuery = z.infer<typeof budgetsQuerySchema>;
export type ContractsQuery = z.infer<typeof contractsQuerySchema>;
export type ContractVersion = z.infer<typeof contractVersionSchema>;
export type ClientDocument = z.infer<typeof clientDocumentSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type Message = z.infer<typeof messageSchema>;
export type AutomationRule = z.infer<typeof automationRuleSchema>;
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
export type NotificationLog = z.infer<typeof notificationLogSchema>;
export type CommunicationOptIn = z.infer<typeof communicationOptInSchema>;
export type CommunicationOptInInput = z.infer<typeof communicationOptInInputSchema>;
export type MessageStatusEvent = z.infer<typeof messageStatusEventSchema>;
export type IntegrationLog = z.infer<typeof integrationLogSchema>;
export type AutomationDispatchRun = z.infer<typeof automationDispatchRunSchema>;
export type MessageSendInput = z.infer<typeof messageSendInputSchema>;
export type CustomerScore = z.infer<typeof customerScoreSchema>;
