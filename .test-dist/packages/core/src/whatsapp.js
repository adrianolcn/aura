"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppCloudRequestError = void 0;
exports.normalizePhone = normalizePhone;
exports.buildTemplateParameters = buildTemplateParameters;
exports.buildWhatsAppTemplatePayload = buildWhatsAppTemplatePayload;
exports.buildWhatsAppTextPayload = buildWhatsAppTextPayload;
exports.getWebhookVerificationResponse = getWebhookVerificationResponse;
exports.parseWhatsAppWebhookEvents = parseWhatsAppWebhookEvents;
exports.sendWhatsAppCloudRequest = sendWhatsAppCloudRequest;
exports.sendWhatsAppTextMessage = sendWhatsAppTextMessage;
exports.sendWhatsAppTemplateMessage = sendWhatsAppTemplateMessage;
class WhatsAppCloudRequestError extends Error {
    status;
    retryable;
    responseBody;
    constructor(input) {
        super(input.message);
        this.name = 'WhatsAppCloudRequestError';
        this.status = input.status;
        this.retryable = input.retryable;
        this.responseBody = input.responseBody;
    }
}
exports.WhatsAppCloudRequestError = WhatsAppCloudRequestError;
function asRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : null;
}
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function readString(record, key) {
    if (!record || typeof record[key] !== 'string') {
        return undefined;
    }
    return record[key];
}
function unixSecondsToIso(value) {
    if (!value) {
        return new Date().toISOString();
    }
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp)) {
        return new Date().toISOString();
    }
    return new Date(timestamp * 1000).toISOString();
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isRetryableStatus(status) {
    return status === 429 || status >= 500;
}
function isRetryableError(error) {
    if (error instanceof WhatsAppCloudRequestError) {
        return error.retryable;
    }
    return error instanceof TypeError;
}
function buildRetryDelay(attempt) {
    return Math.min(400 * 2 ** attempt, 2_000);
}
function normalizePhone(value) {
    return value.replace(/\D/g, '');
}
function buildTemplateParameters(variableOrder, parameters) {
    return variableOrder.map((name) => ({
        type: 'text',
        text: parameters[name] ?? '',
    }));
}
function buildWhatsAppTemplatePayload(input) {
    return {
        messaging_product: 'whatsapp',
        to: normalizePhone(input.toPhone),
        type: 'template',
        template: {
            name: input.templateName,
            language: {
                code: input.languageCode,
            },
            components: input.variableOrder.length
                ? [
                    {
                        type: 'body',
                        parameters: buildTemplateParameters(input.variableOrder, input.parameters),
                    },
                ]
                : [],
        },
    };
}
function buildWhatsAppTextPayload(input) {
    return {
        messaging_product: 'whatsapp',
        to: normalizePhone(input.toPhone),
        type: 'text',
        text: {
            preview_url: false,
            body: input.body,
        },
    };
}
function getWebhookVerificationResponse(searchParams, verifyToken) {
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    if (mode !== 'subscribe' || !challenge || !verifyToken || token !== verifyToken) {
        return {
            ok: false,
            status: 403,
            body: 'forbidden',
        };
    }
    return {
        ok: true,
        status: 200,
        body: challenge,
    };
}
function parseWhatsAppWebhookEvents(payload) {
    const root = asRecord(payload);
    const entries = asArray(root?.entry);
    const events = [];
    entries.forEach((entry) => {
        const entryRecord = asRecord(entry);
        const changes = asArray(entryRecord?.changes);
        changes.forEach((change) => {
            const changeRecord = asRecord(change);
            const value = asRecord(changeRecord?.value);
            const metadata = asRecord(value?.metadata);
            const phoneNumberId = readString(metadata, 'phone_number_id');
            const contactsByWaId = new Map();
            asArray(value?.contacts).forEach((contact) => {
                const contactRecord = asRecord(contact);
                const profile = asRecord(contactRecord?.profile);
                const waId = readString(contactRecord, 'wa_id');
                const name = readString(profile, 'name');
                if (waId && name) {
                    contactsByWaId.set(normalizePhone(waId), name);
                }
            });
            asArray(value?.messages).forEach((message) => {
                const messageRecord = asRecord(message);
                const text = asRecord(messageRecord?.text);
                const type = readString(messageRecord, 'type');
                const body = type === 'text'
                    ? readString(text, 'body')
                    : readString(messageRecord, 'caption') ?? `[${type ?? 'message'}]`;
                const fromPhone = readString(messageRecord, 'from');
                const externalMessageId = readString(messageRecord, 'id');
                if (!fromPhone || !body || !externalMessageId) {
                    return;
                }
                events.push({
                    eventType: 'message',
                    externalMessageId,
                    externalThreadId: readString(asRecord(messageRecord?.context), 'id'),
                    phoneNumberId,
                    fromPhone: normalizePhone(fromPhone),
                    contactName: contactsByWaId.get(normalizePhone(fromPhone)),
                    body,
                    receivedAt: unixSecondsToIso(readString(messageRecord, 'timestamp')),
                    rawPayload: messageRecord,
                });
            });
            asArray(value?.statuses).forEach((status) => {
                const statusRecord = asRecord(status);
                const externalMessageId = readString(statusRecord, 'id');
                const statusValue = readString(statusRecord, 'status');
                if (!externalMessageId || !statusValue) {
                    return;
                }
                const normalizedStatus = statusValue === 'read' || statusValue === 'delivered' || statusValue === 'sent'
                    ? statusValue
                    : statusValue === 'failed'
                        ? 'failed'
                        : 'accepted';
                const errors = asArray(statusRecord?.errors)
                    .map((entry) => {
                    const errorRecord = asRecord(entry);
                    return readString(errorRecord, 'title') ?? readString(errorRecord, 'message');
                })
                    .filter((entry) => Boolean(entry));
                events.push({
                    eventType: 'status',
                    externalMessageId,
                    phoneNumberId,
                    recipientPhone: readString(statusRecord, 'recipient_id')
                        ? normalizePhone(readString(statusRecord, 'recipient_id'))
                        : undefined,
                    status: normalizedStatus,
                    occurredAt: unixSecondsToIso(readString(statusRecord, 'timestamp')),
                    errorMessage: errors[0],
                    rawPayload: statusRecord,
                });
            });
        });
    });
    return events;
}
async function sendWhatsAppCloudRequest(config, payload) {
    const baseUrl = config.baseUrl ?? 'https://graph.facebook.com';
    const maxRetries = Math.max(0, config.maxRetries ?? 2);
    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const response = await fetch(`${baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const body = (await response.json().catch(() => null));
            if (!response.ok) {
                const errorRecord = asRecord(body?.error);
                throw new WhatsAppCloudRequestError({
                    message: readString(errorRecord, 'message') ??
                        readString(errorRecord, 'error_user_msg') ??
                        'WhatsApp Cloud API request failed.',
                    status: response.status,
                    retryable: isRetryableStatus(response.status),
                    responseBody: body,
                });
            }
            return body;
        }
        catch (error) {
            if (attempt >= maxRetries || !isRetryableError(error)) {
                throw error;
            }
            await delay(buildRetryDelay(attempt));
            attempt += 1;
        }
    }
    throw new Error('WhatsApp Cloud API request failed.');
}
async function sendWhatsAppTextMessage(config, input) {
    return sendWhatsAppCloudRequest(config, buildWhatsAppTextPayload(input));
}
async function sendWhatsAppTemplateMessage(config, input) {
    return sendWhatsAppCloudRequest(config, buildWhatsAppTemplatePayload(input));
}
