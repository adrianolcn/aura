"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageTemplateSchema = exports.automationRuleSchema = exports.messageSchema = exports.conversationSchema = exports.mediaUploadInputSchema = exports.noteInputSchema = exports.contractsQuerySchema = exports.budgetsQuerySchema = exports.appointmentsQuerySchema = exports.clientsQuerySchema = exports.contractStatusUpdateSchema = exports.contractInputSchema = exports.budgetInputSchema = exports.budgetItemInputSchema = exports.appointmentInputSchema = exports.clientEventInputSchema = exports.clientInputSchema = exports.clientDocumentSchema = exports.contractVersionSchema = exports.contractSchema = exports.appointmentSchema = exports.budgetItemSchema = exports.budgetSchema = exports.serviceSchema = exports.clientMediaSchema = exports.clientNoteSchema = exports.clientEventSchema = exports.clientSchema = exports.professionalSchema = exports.authSignUpSchema = exports.authSignInSchema = exports.supportedLocaleSchema = exports.appointmentTypeSchema = exports.clientEventStatusSchema = exports.clientLifecycleStageSchema = exports.documentTypeSchema = exports.mediaTypeSchema = exports.automationExecutionKindSchema = exports.automationTriggerSchema = exports.messageTemplateCategorySchema = exports.communicationConsentSourceSchema = exports.communicationConsentStatusSchema = exports.messageTypeSchema = exports.messageStatusSchema = exports.conversationStatusSchema = exports.messageChannelSchema = exports.messageDirectionSchema = exports.contractStatusSchema = exports.appointmentStatusSchema = exports.budgetStatusSchema = void 0;
exports.customerScoreSchema = exports.messageSendInputSchema = exports.automationDispatchRunSchema = exports.integrationLogSchema = exports.messageStatusEventSchema = exports.communicationOptInInputSchema = exports.communicationOptInSchema = exports.notificationLogSchema = void 0;
const zod_1 = require("zod");
exports.budgetStatusSchema = zod_1.z.enum([
    'draft',
    'sent',
    'approved',
    'rejected',
    'expired',
]);
exports.appointmentStatusSchema = zod_1.z.enum([
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
]);
exports.contractStatusSchema = zod_1.z.enum([
    'draft',
    'uploaded',
    'sent',
    'signed',
    'cancelled',
]);
exports.messageDirectionSchema = zod_1.z.enum(['inbound', 'outbound']);
exports.messageChannelSchema = zod_1.z.enum(['whatsapp', 'internal', 'email']);
exports.conversationStatusSchema = zod_1.z.enum(['active', 'archived', 'pending']);
exports.messageStatusSchema = zod_1.z.enum([
    'pending',
    'accepted',
    'sent',
    'delivered',
    'read',
    'received',
    'failed',
]);
exports.messageTypeSchema = zod_1.z.enum([
    'text',
    'template',
    'image',
    'document',
    'system',
]);
exports.communicationConsentStatusSchema = zod_1.z.enum([
    'opted_in',
    'opted_out',
    'pending',
]);
exports.communicationConsentSourceSchema = zod_1.z.enum([
    'manual',
    'whatsapp',
    'contract',
    'form',
    'import',
]);
exports.messageTemplateCategorySchema = zod_1.z.enum([
    'utility',
    'marketing',
    'authentication',
]);
exports.automationTriggerSchema = zod_1.z.enum([
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
exports.automationExecutionKindSchema = zod_1.z.enum([
    'appointment_confirmation',
    'pre_appointment_24h',
    'same_day_reminder',
    'trial_reminder',
    'day_before_guidance',
    'post_service_follow_up',
    'manual',
]);
exports.mediaTypeSchema = zod_1.z.enum(['image', 'pdf', 'video', 'file']);
exports.documentTypeSchema = zod_1.z.enum(['contract', 'briefing', 'checklist', 'invoice', 'other']);
exports.clientLifecycleStageSchema = zod_1.z.enum([
    'lead',
    'qualified',
    'proposal',
    'confirmed',
    'archived',
]);
exports.clientEventStatusSchema = zod_1.z.enum([
    'lead',
    'quoted',
    'booked',
    'completed',
    'cancelled',
]);
exports.appointmentTypeSchema = zod_1.z.enum([
    'consultation',
    'trial',
    'event',
    'follow_up',
]);
exports.supportedLocaleSchema = zod_1.z.enum(['pt-BR', 'en-US']);
exports.authSignInSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
exports.authSignUpSchema = exports.authSignInSchema.extend({
    fullName: zod_1.z.string().min(2),
    businessName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(8),
    whatsappPhone: zod_1.z.string().min(8).optional(),
});
const baseEntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime().optional(),
});
const tenantEntitySchema = baseEntitySchema.extend({
    professionalId: zod_1.z.string().uuid(),
});
exports.professionalSchema = baseEntitySchema.extend({
    authUserId: zod_1.z.string().uuid(),
    fullName: zod_1.z.string().min(2),
    businessName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(8),
    whatsappPhone: zod_1.z.string().min(8),
    whatsappPhoneNumberId: zod_1.z.string().min(3).optional(),
    whatsappBusinessAccountId: zod_1.z.string().min(3).optional(),
    email: zod_1.z.string().email(),
    locale: exports.supportedLocaleSchema.default('pt-BR'),
    timezone: zod_1.z.string().default('America/Sao_Paulo'),
    planTier: zod_1.z.string().default('mvp'),
});
exports.clientSchema = tenantEntitySchema.extend({
    fullName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(8),
    email: zod_1.z.string().email().optional(),
    city: zod_1.z.string().optional(),
    instagramHandle: zod_1.z.string().optional(),
    lifecycleStage: exports.clientLifecycleStageSchema,
    priorityScore: zod_1.z.number().int().min(0).max(100),
    notes: zod_1.z.string().optional(),
});
exports.clientEventSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(2),
    eventType: zod_1.z.string().min(2),
    eventDate: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    status: exports.clientEventStatusSchema,
    guestCount: zod_1.z.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
});
exports.clientNoteSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2),
    body: zod_1.z.string().min(1),
});
exports.clientMediaSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    fileName: zod_1.z.string().min(2),
    mediaType: exports.mediaTypeSchema,
    mimeType: zod_1.z.string().min(3),
    storagePath: zod_1.z.string().min(3),
    sizeBytes: zod_1.z.number().int().nonnegative().optional(),
    caption: zod_1.z.string().optional(),
});
exports.serviceSchema = tenantEntitySchema.extend({
    name: zod_1.z.string().min(2),
    category: zod_1.z.enum(['makeup', 'hair', 'combo', 'trial', 'other']),
    description: zod_1.z.string().optional(),
    basePrice: zod_1.z.number().nonnegative(),
    durationMinutes: zod_1.z.number().int().positive(),
    isActive: zod_1.z.boolean(),
});
exports.budgetSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid(),
    status: exports.budgetStatusSchema,
    currency: zod_1.z.string().length(3),
    subtotal: zod_1.z.number().nonnegative(),
    discountAmount: zod_1.z.number().nonnegative(),
    totalAmount: zod_1.z.number().nonnegative(),
    validUntil: zod_1.z.string().datetime().optional(),
    sentAt: zod_1.z.string().datetime().optional(),
});
exports.budgetItemSchema = tenantEntitySchema.extend({
    budgetId: zod_1.z.string().uuid(),
    serviceId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(2),
    quantity: zod_1.z.number().positive(),
    unitPrice: zod_1.z.number().nonnegative(),
    totalPrice: zod_1.z.number().nonnegative(),
});
exports.appointmentSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2),
    appointmentType: exports.appointmentTypeSchema,
    status: exports.appointmentStatusSchema,
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.contractSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid(),
    currentVersionId: zod_1.z.string().uuid().optional(),
    status: exports.contractStatusSchema,
    signedAt: zod_1.z.string().datetime().optional(),
});
exports.contractVersionSchema = tenantEntitySchema.extend({
    contractId: zod_1.z.string().uuid(),
    versionNumber: zod_1.z.number().int().positive(),
    fileName: zod_1.z.string().min(2),
    storagePath: zod_1.z.string().min(3),
    fileSizeBytes: zod_1.z.number().int().nonnegative().optional(),
    status: exports.contractStatusSchema,
    uploadedAt: zod_1.z.string().datetime(),
});
exports.clientDocumentSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    contractId: zod_1.z.string().uuid().optional(),
    contractVersionId: zod_1.z.string().uuid().optional(),
    documentType: exports.documentTypeSchema,
    fileName: zod_1.z.string().min(2),
    storagePath: zod_1.z.string().min(3),
    mimeType: zod_1.z.string().min(3),
    fileSizeBytes: zod_1.z.number().int().nonnegative().optional(),
    status: zod_1.z.enum(['active', 'archived']),
});
exports.clientInputSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(8),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')).transform((value) => value || undefined),
    city: zod_1.z.string().optional(),
    instagramHandle: zod_1.z.string().optional(),
    lifecycleStage: exports.clientLifecycleStageSchema.default('lead'),
    priorityScore: zod_1.z.coerce.number().int().min(0).max(100).default(50),
    notes: zod_1.z.string().optional(),
});
exports.clientEventInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    title: zod_1.z.string().min(2),
    eventType: zod_1.z.string().min(2),
    eventDate: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    status: exports.clientEventStatusSchema.default('lead'),
    guestCount: zod_1.z.coerce.number().int().nonnegative().optional(),
    notes: zod_1.z.string().optional(),
});
exports.appointmentInputSchema = zod_1.z
    .object({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2),
    appointmentType: exports.appointmentTypeSchema,
    status: exports.appointmentStatusSchema.default('scheduled'),
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
    location: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
})
    .refine((value) => new Date(value.startsAt).getTime() < new Date(value.endsAt).getTime(), {
    message: 'A data final deve ser posterior ao início.',
    path: ['endsAt'],
});
exports.budgetItemInputSchema = zod_1.z.object({
    id: zod_1.z.string().uuid().optional(),
    serviceId: zod_1.z.string().uuid().optional(),
    description: zod_1.z.string().min(2),
    quantity: zod_1.z.coerce.number().positive(),
    unitPrice: zod_1.z.coerce.number().nonnegative(),
});
exports.budgetInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid(),
    status: exports.budgetStatusSchema.default('draft'),
    currency: zod_1.z.string().length(3).default('BRL'),
    discountAmount: zod_1.z.coerce.number().nonnegative().default(0),
    validUntil: zod_1.z.string().datetime().optional(),
    items: zod_1.z.array(exports.budgetItemInputSchema).min(1),
});
exports.contractInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid(),
    status: exports.contractStatusSchema.default('uploaded'),
    signedAt: zod_1.z.string().datetime().optional(),
});
exports.contractStatusUpdateSchema = zod_1.z.object({
    status: exports.contractStatusSchema,
    signedAt: zod_1.z.string().datetime().optional(),
});
exports.clientsQuerySchema = zod_1.z.object({
    search: zod_1.z.string().trim().min(1).optional(),
    lifecycleStage: exports.clientLifecycleStageSchema.optional(),
    orderBy: zod_1.z.enum(['createdAt', 'updatedAt', 'priorityScore', 'fullName']).default('updatedAt'),
    orderDirection: zod_1.z.enum(['asc', 'desc']).default('desc'),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
exports.appointmentsQuerySchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    status: exports.appointmentStatusSchema.optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
    orderDirection: zod_1.z.enum(['asc', 'desc']).default('asc'),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
exports.budgetsQuerySchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    status: exports.budgetStatusSchema.optional(),
    orderBy: zod_1.z.enum(['createdAt', 'updatedAt', 'validUntil', 'totalAmount']).default('createdAt'),
    orderDirection: zod_1.z.enum(['asc', 'desc']).default('desc'),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
exports.contractsQuerySchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid().optional(),
    status: exports.contractStatusSchema.optional(),
    orderBy: zod_1.z.enum(['createdAt', 'updatedAt', 'signedAt']).default('createdAt'),
    orderDirection: zod_1.z.enum(['asc', 'desc']).default('desc'),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
exports.noteInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(2),
    body: zod_1.z.string().min(1),
});
exports.mediaUploadInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    caption: zod_1.z.string().optional(),
});
exports.conversationSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    channel: exports.messageChannelSchema,
    externalThreadId: zod_1.z.string().optional(),
    clientPhone: zod_1.z.string().min(8).optional(),
    lastMessageAt: zod_1.z.string().datetime().optional(),
    lastInboundAt: zod_1.z.string().datetime().optional(),
    lastOutboundAt: zod_1.z.string().datetime().optional(),
    lastMessagePreview: zod_1.z.string().optional(),
    lastMessageDirection: exports.messageDirectionSchema.optional(),
    lastMessageStatus: exports.messageStatusSchema.optional(),
    status: exports.conversationStatusSchema,
});
exports.messageSchema = tenantEntitySchema.extend({
    conversationId: zod_1.z.string().uuid(),
    clientId: zod_1.z.string().uuid(),
    direction: exports.messageDirectionSchema,
    channel: exports.messageChannelSchema,
    messageType: exports.messageTypeSchema.default('text'),
    status: exports.messageStatusSchema.default('pending'),
    body: zod_1.z.string().min(1),
    templateId: zod_1.z.string().uuid().optional(),
    templateName: zod_1.z.string().optional(),
    templateLanguage: zod_1.z.string().optional(),
    externalMessageId: zod_1.z.string().optional(),
    errorMessage: zod_1.z.string().optional(),
    sentAt: zod_1.z.string().datetime().optional(),
    deliveredAt: zod_1.z.string().datetime().optional(),
    readAt: zod_1.z.string().datetime().optional(),
    failedAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.automationRuleSchema = tenantEntitySchema.extend({
    name: zod_1.z.string().min(2),
    triggerType: exports.automationTriggerSchema,
    channel: exports.messageChannelSchema,
    templateId: zod_1.z.string().uuid().optional(),
    automationKind: exports.automationExecutionKindSchema.default('manual'),
    eventOffsetMinutes: zod_1.z.number().int(),
    requiresOptIn: zod_1.z.boolean().default(true),
    isActive: zod_1.z.boolean(),
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.messageTemplateSchema = tenantEntitySchema.extend({
    name: zod_1.z.string().min(2),
    channel: exports.messageChannelSchema,
    templateType: zod_1.z.enum([
        'appointment_confirmation',
        'reminder',
        'trial_reminder',
        'day_before_guidance',
        'follow_up',
        'budget',
        'custom',
    ]),
    category: exports.messageTemplateCategorySchema.default('utility'),
    body: zod_1.z.string().min(1),
    variables: zod_1.z.array(zod_1.z.string()).default([]),
    externalTemplateName: zod_1.z.string().optional(),
    languageCode: zod_1.z.string().default('pt_BR'),
    parameterSchema: zod_1.z.array(zod_1.z.string()).default([]),
    requiresOptIn: zod_1.z.boolean().default(true),
    isActive: zod_1.z.boolean(),
});
exports.notificationLogSchema = tenantEntitySchema.extend({
    automationRuleId: zod_1.z.string().uuid().optional(),
    clientId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid().optional(),
    conversationId: zod_1.z.string().uuid().optional(),
    messageId: zod_1.z.string().uuid().optional(),
    templateId: zod_1.z.string().uuid().optional(),
    channel: exports.messageChannelSchema,
    executionKind: exports.automationExecutionKindSchema.default('manual'),
    idempotencyKey: zod_1.z.string().optional(),
    status: zod_1.z.enum(['scheduled', 'processed', 'failed', 'cancelled', 'skipped']),
    scheduledFor: zod_1.z.string().datetime(),
    processedAt: zod_1.z.string().datetime().optional(),
    errorMessage: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.communicationOptInSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    channel: exports.messageChannelSchema.default('whatsapp'),
    status: exports.communicationConsentStatusSchema,
    source: exports.communicationConsentSourceSchema.default('manual'),
    grantedAt: zod_1.z.string().datetime().optional(),
    revokedAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.communicationOptInInputSchema = zod_1.z.object({
    clientId: zod_1.z.string().uuid(),
    channel: exports.messageChannelSchema.default('whatsapp'),
    status: exports.communicationConsentStatusSchema,
    source: exports.communicationConsentSourceSchema.default('manual'),
    grantedAt: zod_1.z.string().datetime().optional(),
    revokedAt: zod_1.z.string().datetime().optional(),
    notes: zod_1.z.string().optional(),
});
exports.messageStatusEventSchema = tenantEntitySchema.extend({
    messageId: zod_1.z.string().uuid(),
    conversationId: zod_1.z.string().uuid(),
    clientId: zod_1.z.string().uuid(),
    externalMessageId: zod_1.z.string().optional(),
    status: exports.messageStatusSchema,
    occurredAt: zod_1.z.string().datetime(),
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.integrationLogSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid().optional(),
    conversationId: zod_1.z.string().uuid().optional(),
    messageId: zod_1.z.string().uuid().optional(),
    channel: exports.messageChannelSchema,
    direction: zod_1.z.enum(['inbound', 'outbound', 'system']),
    logType: zod_1.z.enum([
        'webhook',
        'send',
        'automation',
        'status',
        'verification',
        'scheduler',
    ]),
    eventKey: zod_1.z.string(),
    status: zod_1.z.enum(['received', 'processed', 'skipped', 'failed']),
    payload: zod_1.z.record(zod_1.z.unknown()).default({}),
    response: zod_1.z.record(zod_1.z.unknown()).default({}),
    errorMessage: zod_1.z.string().optional(),
});
exports.automationDispatchRunSchema = tenantEntitySchema.extend({
    triggerSource: zod_1.z.enum(['manual', 'scheduler', 'retry']),
    executionKey: zod_1.z.string(),
    status: zod_1.z.enum(['running', 'processed', 'failed', 'partial']),
    processedCount: zod_1.z.number().int().nonnegative().default(0),
    skippedCount: zod_1.z.number().int().nonnegative().default(0),
    failedCount: zod_1.z.number().int().nonnegative().default(0),
    startedAt: zod_1.z.string().datetime(),
    finishedAt: zod_1.z.string().datetime().optional(),
    errorMessage: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.messageSendInputSchema = zod_1.z
    .object({
    clientId: zod_1.z.string().uuid(),
    conversationId: zod_1.z.string().uuid().optional(),
    eventId: zod_1.z.string().uuid().optional(),
    templateId: zod_1.z.string().uuid().optional(),
    body: zod_1.z.string().trim().optional(),
    parameters: zod_1.z.record(zod_1.z.string()).default({}),
})
    .refine((value) => Boolean(value.templateId || value.body), {
    message: 'Informe um texto de resposta ou selecione um template.',
    path: ['body'],
});
exports.customerScoreSchema = tenantEntitySchema.extend({
    clientId: zod_1.z.string().uuid(),
    priorityScore: zod_1.z.number().int().min(0).max(100),
    budgetPotentialScore: zod_1.z.number().int().min(0).max(100),
    engagementScore: zod_1.z.number().int().min(0).max(100),
    noShowRiskScore: zod_1.z.number().int().min(0).max(100),
    lastCalculatedAt: zod_1.z.string().datetime(),
    notes: zod_1.z.string().optional(),
});
