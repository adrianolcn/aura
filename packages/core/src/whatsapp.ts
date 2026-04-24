export type WhatsAppMessageStatus =
  | 'pending'
  | 'accepted'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'received'
  | 'failed';

export type WhatsAppNormalizedEvent =
  | {
      eventType: 'message';
      externalMessageId: string;
      externalThreadId?: string;
      phoneNumberId?: string;
      fromPhone: string;
      contactName?: string;
      body: string;
      receivedAt: string;
      rawPayload: unknown;
    }
  | {
      eventType: 'status';
      externalMessageId: string;
      phoneNumberId?: string;
      recipientPhone?: string;
      status: Extract<WhatsAppMessageStatus, 'sent' | 'delivered' | 'read' | 'failed' | 'accepted'>;
      occurredAt: string;
      errorMessage?: string;
      rawPayload: unknown;
    };

export type WhatsAppTemplateSendInput = {
  toPhone: string;
  templateName: string;
  languageCode: string;
  variableOrder: string[];
  parameters: Record<string, string>;
};

export type WhatsAppTextSendInput = {
  toPhone: string;
  body: string;
};

export type WhatsAppCloudConfig = {
  accessToken: string;
  phoneNumberId: string;
  apiVersion: string;
  baseUrl?: string;
  maxRetries?: number;
};

export class WhatsAppCloudRequestError extends Error {
  status: number;
  retryable: boolean;
  responseBody: Record<string, unknown> | null;

  constructor(input: {
    message: string;
    status: number;
    retryable: boolean;
    responseBody: Record<string, unknown> | null;
  }) {
    super(input.message);
    this.name = 'WhatsAppCloudRequestError';
    this.status = input.status;
    this.retryable = input.retryable;
    this.responseBody = input.responseBody;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(record: Record<string, unknown> | null, key: string) {
  if (!record || typeof record[key] !== 'string') {
    return undefined;
  }

  return record[key] as string;
}

function unixSecondsToIso(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) {
    return new Date().toISOString();
  }

  return new Date(timestamp * 1000).toISOString();
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return status === 429 || status >= 500;
}

function isRetryableError(error: unknown) {
  if (error instanceof WhatsAppCloudRequestError) {
    return error.retryable;
  }

  return error instanceof TypeError;
}

function buildRetryDelay(attempt: number) {
  return Math.min(400 * 2 ** attempt, 2_000);
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function buildTemplateParameters(
  variableOrder: string[],
  parameters: Record<string, string>,
) {
  return variableOrder.map((name) => ({
    type: 'text',
    text: parameters[name] ?? '',
  }));
}

export function buildWhatsAppTemplatePayload(input: WhatsAppTemplateSendInput) {
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

export function buildWhatsAppTextPayload(input: WhatsAppTextSendInput) {
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

export function getWebhookVerificationResponse(searchParams: URLSearchParams, verifyToken?: string) {
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

export function parseWhatsAppWebhookEvents(payload: unknown): WhatsAppNormalizedEvent[] {
  const root = asRecord(payload);
  const entries = asArray(root?.entry);
  const events: WhatsAppNormalizedEvent[] = [];

  entries.forEach((entry) => {
    const entryRecord = asRecord(entry);
    const changes = asArray(entryRecord?.changes);

    changes.forEach((change) => {
      const changeRecord = asRecord(change);
      const value = asRecord(changeRecord?.value);
      const metadata = asRecord(value?.metadata);
      const phoneNumberId = readString(metadata, 'phone_number_id');
      const contactsByWaId = new Map<string, string>();

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
        const body =
          type === 'text'
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

        const normalizedStatus =
          statusValue === 'read' || statusValue === 'delivered' || statusValue === 'sent'
            ? statusValue
            : statusValue === 'failed'
              ? 'failed'
              : 'accepted';

        const errors = asArray(statusRecord?.errors)
          .map((entry) => {
            const errorRecord = asRecord(entry);
            return readString(errorRecord, 'title') ?? readString(errorRecord, 'message');
          })
          .filter((entry): entry is string => Boolean(entry));

        events.push({
          eventType: 'status',
          externalMessageId,
          phoneNumberId,
          recipientPhone: readString(statusRecord, 'recipient_id')
            ? normalizePhone(readString(statusRecord, 'recipient_id') as string)
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

export async function sendWhatsAppCloudRequest(
  config: WhatsAppCloudConfig,
  payload: Record<string, unknown>,
) {
  const baseUrl = config.baseUrl ?? 'https://graph.facebook.com';
  const maxRetries = Math.max(0, config.maxRetries ?? 2);
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(
        `${baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        const errorRecord = asRecord(body?.error);
        throw new WhatsAppCloudRequestError({
          message:
            readString(errorRecord, 'message') ??
            readString(errorRecord, 'error_user_msg') ??
            'WhatsApp Cloud API request failed.',
          status: response.status,
          retryable: isRetryableStatus(response.status),
          responseBody: body,
        });
      }

      return body;
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableError(error)) {
        throw error;
      }

      await delay(buildRetryDelay(attempt));
      attempt += 1;
    }
  }

  throw new Error('WhatsApp Cloud API request failed.');
}

export async function sendWhatsAppTextMessage(
  config: WhatsAppCloudConfig,
  input: WhatsAppTextSendInput,
) {
  return sendWhatsAppCloudRequest(config, buildWhatsAppTextPayload(input));
}

export async function sendWhatsAppTemplateMessage(
  config: WhatsAppCloudConfig,
  input: WhatsAppTemplateSendInput,
) {
  return sendWhatsAppCloudRequest(config, buildWhatsAppTemplatePayload(input));
}
