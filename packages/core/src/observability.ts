import { logError } from './errors';

export type ObservabilityProvider = 'http' | 'sentry';

export type ObservabilityConfig = {
  app: 'web' | 'mobile';
  environment?: string;
  release?: string;
  endpoint?: string;
  enabled?: boolean;
  provider?: ObservabilityProvider;
  authToken?: string;
  sentryDsn?: string;
};

export type ObservabilityEvent = {
  type: 'error' | 'message';
  app: 'web' | 'mobile';
  environment?: string;
  release?: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
};

type SentryTarget = {
  endpoint: string;
  dsn: string;
};

let config: ObservabilityConfig = {
  app: 'web',
  enabled: false,
  provider: 'http',
};

function createEventId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function normalizeContext(context?: Record<string, unknown>) {
  return context ?? {};
}

function resolveSentryTarget(dsn?: string): SentryTarget | null {
  if (!dsn) {
    return null;
  }

  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, '');

    if (!publicKey || !projectId) {
      return null;
    }

    return {
      dsn,
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

function buildSentryEnvelope(event: ObservabilityEvent, dsn: string) {
  const eventId = createEventId();
  const level = event.type === 'error' ? 'error' : 'info';
  const payload = {
    event_id: eventId,
    timestamp: event.timestamp,
    level,
    platform: 'javascript',
    environment: event.environment,
    release: event.release,
    tags: {
      app: event.app,
      environment: event.environment,
      release: event.release,
    },
    message:
      event.type === 'message'
        ? {
            formatted: event.message,
          }
        : undefined,
    exception:
      event.type === 'error'
        ? {
            values: [
              {
                type: 'Error',
                value: event.message,
                stacktrace: event.stack
                  ? {
                      frames: [
                        {
                          filename: 'aura',
                          function: 'captureError',
                          lineno: 1,
                          colno: 1,
                        },
                      ],
                    }
                  : undefined,
              },
            ],
          }
        : undefined,
    extra: normalizeContext(event.context),
  };

  return [
    JSON.stringify({ event_id: eventId, dsn, sent_at: event.timestamp }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(payload),
  ].join('\n');
}

export function configureObservability(nextConfig: ObservabilityConfig) {
  config = {
    provider: nextConfig.sentryDsn ? 'sentry' : nextConfig.provider ?? 'http',
    ...nextConfig,
  };
}

async function sendHttpEvent(event: ObservabilityEvent) {
  if (!config.endpoint) {
    return;
  }

  await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.authToken
        ? {
            Authorization: `Bearer ${config.authToken}`,
          }
        : {}),
    },
    body: JSON.stringify(event),
  });
}

async function sendSentryEvent(event: ObservabilityEvent) {
  const target = resolveSentryTarget(config.sentryDsn);
  if (!target) {
    return;
  }

  await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    body: buildSentryEnvelope(event, target.dsn),
  });
}

async function sendEvent(event: ObservabilityEvent) {
  if (!config.enabled) {
    return;
  }

  if (config.provider === 'sentry' && config.sentryDsn) {
    await sendSentryEvent(event);
    return;
  }

  await sendHttpEvent(event);
}

export async function captureError(reason: unknown, context?: Record<string, unknown>) {
  const error = logError(reason, context);
  const event: ObservabilityEvent = {
    type: 'error',
    app: config.app,
    environment: config.environment,
    release: config.release,
    message: error.message,
    context: {
      ...context,
      code: error.code,
      userMessage: error.userMessage,
      details: error.details,
    },
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  try {
    await sendEvent(event);
  } catch (sendReason) {
    console.error('[aura-observability]', sendReason);
  }
}

export async function captureMessage(message: string, context?: Record<string, unknown>) {
  const event: ObservabilityEvent = {
    type: 'message',
    app: config.app,
    environment: config.environment,
    release: config.release,
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  console.info('[aura]', event);

  try {
    await sendEvent(event);
  } catch (reason) {
    console.error('[aura-observability]', reason);
  }
}
