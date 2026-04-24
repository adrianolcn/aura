type EdgeObservabilityEvent = {
  type: 'error' | 'message';
  app: 'edge';
  environment?: string;
  release?: string;
  message: string;
  context?: Record<string, unknown>;
  stack?: string;
  timestamp: string;
};

type EdgeObservabilityProvider = 'http' | 'sentry';

function readOptionalEnv(name: string) {
  return Deno.env.get(name) ?? undefined;
}

function resolveProvider(): EdgeObservabilityProvider {
  if (readOptionalEnv('OBSERVABILITY_PROVIDER') === 'sentry') {
    return 'sentry';
  }

  return readOptionalEnv('OBSERVABILITY_SENTRY_DSN') ? 'sentry' : 'http';
}

function isEnabled() {
  return readOptionalEnv('OBSERVABILITY_ENABLED') === 'true';
}

function createEventId() {
  return crypto.randomUUID().replace(/-/g, '');
}

function resolveSentryTarget(dsn?: string) {
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

function buildSentryEnvelope(event: EdgeObservabilityEvent, dsn: string) {
  const eventId = createEventId();
  const level = event.type === 'error' ? 'error' : 'info';

  return [
    JSON.stringify({ event_id: eventId, dsn, sent_at: event.timestamp }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify({
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
                },
              ],
            }
          : undefined,
      extra: event.context ?? {},
    }),
  ].join('\n');
}

async function sendEvent(event: EdgeObservabilityEvent) {
  if (!isEnabled()) {
    return;
  }

  const provider = resolveProvider();

  if (provider === 'sentry') {
    const target = resolveSentryTarget(readOptionalEnv('OBSERVABILITY_SENTRY_DSN'));
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
    return;
  }

  const endpoint = readOptionalEnv('OBSERVABILITY_ENDPOINT');
  if (!endpoint) {
    return;
  }

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(readOptionalEnv('OBSERVABILITY_AUTH_TOKEN')
        ? {
            Authorization: `Bearer ${readOptionalEnv('OBSERVABILITY_AUTH_TOKEN')}`,
          }
        : {}),
    },
    body: JSON.stringify(event),
  });
}

export async function captureEdgeError(
  reason: unknown,
  context?: Record<string, unknown>,
) {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  try {
    await sendEvent({
      type: 'error',
      app: 'edge',
      environment: readOptionalEnv('APP_ENV') ?? 'local',
      release: readOptionalEnv('RELEASE_VERSION') ?? 'dev',
      message,
      context,
      stack,
      timestamp: new Date().toISOString(),
    });
  } catch (sendReason) {
    console.error('[aura-edge-observability]', sendReason);
  }
}

export async function captureEdgeMessage(
  message: string,
  context?: Record<string, unknown>,
) {
  try {
    await sendEvent({
      type: 'message',
      app: 'edge',
      environment: readOptionalEnv('APP_ENV') ?? 'local',
      release: readOptionalEnv('RELEASE_VERSION') ?? 'dev',
      message,
      context,
      timestamp: new Date().toISOString(),
    });
  } catch (sendReason) {
    console.error('[aura-edge-observability]', sendReason);
  }
}
