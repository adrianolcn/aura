"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureObservability = configureObservability;
exports.captureError = captureError;
exports.captureMessage = captureMessage;
const errors_1 = require("./errors");
let config = {
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
function normalizeContext(context) {
    return context ?? {};
}
function resolveSentryTarget(dsn) {
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
    }
    catch {
        return null;
    }
}
function buildSentryEnvelope(event, dsn) {
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
        message: event.type === 'message'
            ? {
                formatted: event.message,
            }
            : undefined,
        exception: event.type === 'error'
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
function configureObservability(nextConfig) {
    config = {
        provider: nextConfig.sentryDsn ? 'sentry' : nextConfig.provider ?? 'http',
        ...nextConfig,
    };
}
async function sendHttpEvent(event) {
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
async function sendSentryEvent(event) {
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
async function sendEvent(event) {
    if (!config.enabled) {
        return;
    }
    if (config.provider === 'sentry' && config.sentryDsn) {
        await sendSentryEvent(event);
        return;
    }
    await sendHttpEvent(event);
}
async function captureError(reason, context) {
    const error = (0, errors_1.logError)(reason, context);
    const event = {
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
    }
    catch (sendReason) {
        console.error('[aura-observability]', sendReason);
    }
}
async function captureMessage(message, context) {
    const event = {
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
    }
    catch (reason) {
        console.error('[aura-observability]', reason);
    }
}
