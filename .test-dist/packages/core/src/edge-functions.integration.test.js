"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const supabase_js_1 = require("@supabase/supabase-js");
function normalizePhone(value) {
    return value.replace(/\D/g, '');
}
function readIntegrationEnv() {
    const supabaseUrl = process.env.AURA_INTEGRATION_SUPABASE_URL;
    const supabaseAnonKey = process.env.AURA_INTEGRATION_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return null;
    }
    return {
        supabaseUrl,
        supabaseAnonKey,
        serviceRoleKey,
        edgeBaseUrl: process.env.AURA_EDGE_BASE_URL ?? `${supabaseUrl.replace(/\/$/, '')}/functions/v1`,
        metaReady: process.env.AURA_INTEGRATION_META_READY === 'true',
    };
}
async function createTenant(label) {
    const env = readIntegrationEnv();
    if (!env) {
        return null;
    }
    const service = (0, supabase_js_1.createClient)(env.supabaseUrl, env.serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    const anon = (0, supabase_js_1.createClient)(env.supabaseUrl, env.supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
    const email = `edge-integration+${label}-${(0, node_crypto_1.randomUUID)()}@aura.test`;
    const password = 'Aura123456!';
    const whatsappPhoneNumberId = `phone-${label}-${Date.now()}`;
    const userResponse = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: `Edge Integration ${label}`,
            business_name: `AURA Edge ${label}`,
            phone: '+55 71 90000-0000',
            whatsapp_phone: '+55 71 90000-0000',
        },
    });
    if (userResponse.error || !userResponse.data.user) {
        throw new Error(userResponse.error?.message ?? 'Could not create integration user.');
    }
    const professionalId = (0, node_crypto_1.randomUUID)();
    const clientId = (0, node_crypto_1.randomUUID)();
    const phone = `+55 71 9${Math.floor(Math.random() * 89999999 + 10000000)}`;
    const professionalResponse = await service.from('professionals').insert({
        id: professionalId,
        auth_user_id: userResponse.data.user.id,
        full_name: `Edge Integration ${label}`,
        business_name: `AURA Edge ${label}`,
        phone: '+55 71 90000-0000',
        whatsapp_phone: '+55 71 90000-0000',
        whatsapp_phone_number_id: whatsappPhoneNumberId,
        email,
        timezone: 'America/Bahia',
        plan_tier: 'mvp',
    });
    if (professionalResponse.error) {
        throw new Error(professionalResponse.error.message);
    }
    const clientResponse = await service.from('clients').insert({
        id: clientId,
        professional_id: professionalId,
        full_name: `Cliente ${label}`,
        phone,
        lifecycle_stage: 'lead',
        priority_score: 50,
    });
    if (clientResponse.error) {
        throw new Error(clientResponse.error.message);
    }
    const signInResponse = await anon.auth.signInWithPassword({
        email,
        password,
    });
    if (signInResponse.error) {
        throw new Error(signInResponse.error.message);
    }
    return {
        env,
        service,
        anon,
        professionalId,
        clientId,
        phone,
        whatsappPhoneNumberId,
    };
}
async function invokeWebhook(edgeBaseUrl, payload) {
    const response = await fetch(`${edgeBaseUrl}/whatsapp-webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw new Error(`Webhook failed with ${response.status}.`);
    }
    return response.json();
}
exports.testGroup = {
    name: 'edge functions integration',
    cases: [
        {
            name: 'persists inbound webhook messages in the integrated function layer',
            run: async () => {
                const tenant = await createTenant('webhook-message');
                if (!tenant) {
                    return;
                }
                await invokeWebhook(tenant.env.edgeBaseUrl, {
                    entry: [
                        {
                            changes: [
                                {
                                    value: {
                                        metadata: {
                                            phone_number_id: tenant.whatsappPhoneNumberId,
                                        },
                                        contacts: [
                                            {
                                                wa_id: normalizePhone(tenant.phone),
                                                profile: {
                                                    name: 'Cliente Edge',
                                                },
                                            },
                                        ],
                                        messages: [
                                            {
                                                from: normalizePhone(tenant.phone),
                                                id: `wamid.inbound.${(0, node_crypto_1.randomUUID)()}`,
                                                timestamp: '1713892200',
                                                type: 'text',
                                                text: {
                                                    body: 'Mensagem inbound real da camada edge.',
                                                },
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    ],
                });
                const conversationResponse = await tenant.service
                    .from('conversations')
                    .select('*')
                    .eq('professional_id', tenant.professionalId)
                    .eq('client_id', tenant.clientId)
                    .eq('channel', 'whatsapp')
                    .maybeSingle();
                const messagesResponse = await tenant.service
                    .from('messages')
                    .select('*')
                    .eq('professional_id', tenant.professionalId)
                    .eq('client_id', tenant.clientId)
                    .eq('direction', 'inbound');
                strict_1.default.ok(conversationResponse.data);
                strict_1.default.equal(messagesResponse.data?.length ?? 0, 1);
            },
        },
        {
            name: 'persists status updates through the integrated webhook',
            run: async () => {
                const tenant = await createTenant('webhook-status');
                if (!tenant) {
                    return;
                }
                const conversationResponse = await tenant.service
                    .from('conversations')
                    .insert({
                    professional_id: tenant.professionalId,
                    client_id: tenant.clientId,
                    channel: 'whatsapp',
                    client_phone: tenant.phone,
                    status: 'active',
                })
                    .select('*')
                    .single();
                if (conversationResponse.error || !conversationResponse.data) {
                    throw new Error(conversationResponse.error?.message ?? 'Could not create conversation.');
                }
                const messageResponse = await tenant.service
                    .from('messages')
                    .insert({
                    professional_id: tenant.professionalId,
                    conversation_id: conversationResponse.data.id,
                    client_id: tenant.clientId,
                    direction: 'outbound',
                    channel: 'whatsapp',
                    message_type: 'template',
                    status: 'accepted',
                    body: 'Template outbound',
                    external_message_id: `wamid.status.${(0, node_crypto_1.randomUUID)()}`,
                    sent_at: new Date().toISOString(),
                    metadata: {},
                    raw_payload: {},
                })
                    .select('*')
                    .single();
                if (messageResponse.error || !messageResponse.data) {
                    throw new Error(messageResponse.error?.message ?? 'Could not create outbound message.');
                }
                await invokeWebhook(tenant.env.edgeBaseUrl, {
                    entry: [
                        {
                            changes: [
                                {
                                    value: {
                                        metadata: {
                                            phone_number_id: tenant.whatsappPhoneNumberId,
                                        },
                                        statuses: [
                                            {
                                                id: messageResponse.data.external_message_id,
                                                recipient_id: normalizePhone(tenant.phone),
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
                const updatedMessageResponse = await tenant.service
                    .from('messages')
                    .select('*')
                    .eq('id', messageResponse.data.id)
                    .single();
                const eventsResponse = await tenant.service
                    .from('message_status_events')
                    .select('*')
                    .eq('message_id', messageResponse.data.id);
                strict_1.default.equal(updatedMessageResponse.data?.status, 'delivered');
                strict_1.default.equal(eventsResponse.data?.length ?? 0, 1);
            },
        },
        {
            name: 'creates scheduler audit runs through the integrated dispatch function',
            run: async () => {
                const tenant = await createTenant('dispatch-audit');
                if (!tenant) {
                    return;
                }
                const dispatchResponse = await tenant.anon.functions.invoke('automation-dispatch', {
                    body: {
                        clientId: tenant.clientId,
                        mode: 'manual',
                    },
                });
                if (dispatchResponse.error) {
                    throw new Error(dispatchResponse.error.message);
                }
                const auditResponse = await tenant.service
                    .from('automation_dispatch_runs')
                    .select('*')
                    .eq('professional_id', tenant.professionalId)
                    .order('started_at', { ascending: false })
                    .limit(1);
                strict_1.default.equal((auditResponse.data?.length ?? 0) > 0, true);
            },
        },
        {
            name: 'sends a real template through the integrated send function when Meta is configured',
            run: async () => {
                const tenant = await createTenant('send-template');
                if (!tenant || !tenant.env.metaReady) {
                    return;
                }
                await tenant.service.from('communication_opt_ins').insert({
                    professional_id: tenant.professionalId,
                    client_id: tenant.clientId,
                    channel: 'whatsapp',
                    status: 'opted_in',
                    source: 'manual',
                });
                const templateResponse = await tenant.service
                    .from('message_templates')
                    .insert({
                    professional_id: tenant.professionalId,
                    name: 'Confirmacao E2E',
                    channel: 'whatsapp',
                    template_type: 'reminder',
                    category: 'utility',
                    body: 'Oi {{client_name}}, sua confirmação está pronta.',
                    variables: ['client_name'],
                    external_template_name: 'aura_confirmacao_e2e',
                    language_code: 'pt_BR',
                    parameter_schema: ['client_name'],
                    requires_opt_in: true,
                    is_active: true,
                })
                    .select('*')
                    .single();
                if (templateResponse.error || !templateResponse.data) {
                    throw new Error(templateResponse.error?.message ?? 'Could not create template.');
                }
                const sendResponse = await tenant.anon.functions.invoke('whatsapp-send', {
                    body: {
                        clientId: tenant.clientId,
                        templateId: templateResponse.data.id,
                        parameters: {
                            client_name: 'Cliente Edge',
                        },
                    },
                });
                if (sendResponse.error) {
                    throw new Error(sendResponse.error.message);
                }
                strict_1.default.equal(typeof sendResponse.data?.message === 'object', true);
            },
        },
    ],
};
