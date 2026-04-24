"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const node_crypto_1 = require("node:crypto");
const supabase_js_1 = require("@supabase/supabase-js");
const communications_1 = require("./communications");
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
    const email = `integration+${label}-${(0, node_crypto_1.randomUUID)()}@aura.test`;
    const password = 'Aura123456!';
    const userResponse = await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: `Integration ${label}`,
            business_name: `AURA ${label}`,
            phone: '+55 71 90000-0000',
            whatsapp_phone: '+55 71 90000-0000',
        },
    });
    if (userResponse.error || !userResponse.data.user) {
        throw new Error(userResponse.error?.message ?? 'Could not create integration user.');
    }
    const professionalId = (0, node_crypto_1.randomUUID)();
    const clientId = (0, node_crypto_1.randomUUID)();
    const professionalResponse = await service.from('professionals').insert({
        id: professionalId,
        auth_user_id: userResponse.data.user.id,
        full_name: `Integration ${label}`,
        business_name: `AURA ${label}`,
        phone: '+55 71 90000-0000',
        whatsapp_phone: '+55 71 90000-0000',
        whatsapp_phone_number_id: `phone-${label}`,
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
        phone: `+55 71 9${Math.floor(Math.random() * 89999999 + 10000000)}`,
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
        service,
        anon,
        professionalId,
        clientId,
        userId: userResponse.data.user.id,
    };
}
exports.testGroup = {
    name: 'communications integration',
    cases: [
        {
            name: 'upserts opt-in and reads the tenant-scoped communication snapshot',
            run: async () => {
                const tenant = await createTenant('snapshot');
                if (!tenant) {
                    return;
                }
                const optIn = await (0, communications_1.upsertCommunicationOptIn)(tenant.anon, {
                    clientId: tenant.clientId,
                    channel: 'whatsapp',
                    status: 'opted_in',
                    source: 'manual',
                });
                const snapshot = await (0, communications_1.getClientCommunicationSnapshot)(tenant.anon, tenant.clientId);
                strict_1.default.equal(optIn.status, 'opted_in');
                strict_1.default.equal(snapshot.optIn?.status, 'opted_in');
            },
        },
        {
            name: 'does not expose another tenant communication data through RLS',
            run: async () => {
                const leftTenant = await createTenant('left');
                const rightTenant = await createTenant('right');
                if (!leftTenant || !rightTenant) {
                    return;
                }
                await leftTenant.service.from('communication_opt_ins').insert({
                    professional_id: leftTenant.professionalId,
                    client_id: leftTenant.clientId,
                    channel: 'whatsapp',
                    status: 'opted_in',
                    source: 'manual',
                });
                const response = await rightTenant.anon
                    .from('communication_opt_ins')
                    .select('*')
                    .eq('client_id', leftTenant.clientId);
                if (response.error) {
                    throw new Error(response.error.message);
                }
                strict_1.default.equal(response.data?.length ?? 0, 0);
            },
        },
    ],
};
