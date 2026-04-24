"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasSupabaseEnv = hasSupabaseEnv;
exports.createAuraSupabaseClient = createAuraSupabaseClient;
exports.assertSupabaseClient = assertSupabaseClient;
const supabase_js_1 = require("@supabase/supabase-js");
function hasSupabaseEnv(env) {
    return Boolean(env?.supabaseUrl && env?.supabaseAnonKey);
}
function createAuraSupabaseClient(env, options) {
    if (!hasSupabaseEnv(env)) {
        return null;
    }
    const { supabaseUrl, supabaseAnonKey } = env;
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            ...options?.auth,
        },
        ...options,
    });
}
function assertSupabaseClient(client) {
    if (!client) {
        throw new Error('Supabase não configurado.');
    }
    return client;
}
