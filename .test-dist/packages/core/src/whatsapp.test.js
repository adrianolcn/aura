"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const whatsapp_1 = require("./whatsapp");
exports.testGroup = {
    name: 'whatsapp helpers',
    cases: [
        {
            name: 'normalizes brazilian phone numbers',
            run: () => {
                strict_1.default.equal((0, whatsapp_1.normalizePhone)('+55 (71) 99123-8801'), '5571991238801');
            },
        },
        {
            name: 'builds template payload with ordered parameters',
            run: () => {
                const payload = (0, whatsapp_1.buildWhatsAppTemplatePayload)({
                    toPhone: '+55 71 99123-8801',
                    templateName: 'aura_trial_reminder',
                    languageCode: 'pt_BR',
                    variableOrder: ['client_name', 'appointment_time'],
                    parameters: {
                        client_name: 'Marina',
                        appointment_time: '10:00',
                    },
                });
                strict_1.default.equal(payload.template.name, 'aura_trial_reminder');
                strict_1.default.equal(payload.to, '5571991238801');
                strict_1.default.deepEqual(payload.template.components[0]?.parameters, [
                    { type: 'text', text: 'Marina' },
                    { type: 'text', text: '10:00' },
                ]);
            },
        },
        {
            name: 'parses inbound and status webhook events',
            run: () => {
                const events = (0, whatsapp_1.parseWhatsAppWebhookEvents)({
                    entry: [
                        {
                            changes: [
                                {
                                    value: {
                                        metadata: {
                                            phone_number_id: '123456',
                                        },
                                        contacts: [
                                            {
                                                wa_id: '5571991238801',
                                                profile: {
                                                    name: 'Marina Alves',
                                                },
                                            },
                                        ],
                                        messages: [
                                            {
                                                from: '5571991238801',
                                                id: 'wamid.inbound',
                                                timestamp: '1713892200',
                                                type: 'text',
                                                text: {
                                                    body: 'Oi, tudo bem?',
                                                },
                                            },
                                        ],
                                        statuses: [
                                            {
                                                id: 'wamid.outbound',
                                                recipient_id: '5571991238801',
                                                status: 'delivered',
                                                timestamp: '1713892260',
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                });
                strict_1.default.equal(events.length, 2);
                strict_1.default.equal(events[0]?.eventType, 'message');
                strict_1.default.equal(events[1]?.eventType, 'status');
            },
        },
        {
            name: 'returns verification challenge only with matching token',
            run: () => {
                const success = (0, whatsapp_1.getWebhookVerificationResponse)(new URLSearchParams({
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'secret',
                    'hub.challenge': '12345',
                }), 'secret');
                const failure = (0, whatsapp_1.getWebhookVerificationResponse)(new URLSearchParams({
                    'hub.mode': 'subscribe',
                    'hub.verify_token': 'wrong',
                    'hub.challenge': '12345',
                }), 'secret');
                strict_1.default.equal(success.status, 200);
                strict_1.default.equal(success.body, '12345');
                strict_1.default.equal(failure.status, 403);
            },
        },
        {
            name: 'builds text payload without preview url',
            run: () => {
                const payload = (0, whatsapp_1.buildWhatsAppTextPayload)({
                    toPhone: '+55 71 99123-8801',
                    body: 'Mensagem livre',
                });
                strict_1.default.equal(payload.text.body, 'Mensagem livre');
                strict_1.default.equal(payload.text.preview_url, false);
            },
        },
        {
            name: 'retries transient WhatsApp Cloud API errors before succeeding',
            run: async () => {
                const originalFetch = globalThis.fetch;
                let attempt = 0;
                globalThis.fetch = (async () => {
                    attempt += 1;
                    if (attempt === 1) {
                        return new Response(JSON.stringify({
                            error: {
                                message: 'temporarily unavailable',
                            },
                        }), {
                            status: 503,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });
                    }
                    return new Response(JSON.stringify({
                        messages: [{ id: 'wamid.retry-success' }],
                    }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                });
                try {
                    const response = await (0, whatsapp_1.sendWhatsAppCloudRequest)({
                        accessToken: 'token',
                        phoneNumberId: '123',
                        apiVersion: 'v22.0',
                        maxRetries: 1,
                    }, {
                        messaging_product: 'whatsapp',
                    });
                    strict_1.default.equal(attempt, 2);
                    strict_1.default.equal((response?.messages)[0]?.id, 'wamid.retry-success');
                }
                finally {
                    globalThis.fetch = originalFetch;
                }
            },
        },
    ],
};
