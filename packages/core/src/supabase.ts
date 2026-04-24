import {
  createClient,
  type Session,
  type SupabaseClient,
  type User,
} from '@supabase/supabase-js';

export type AuraRuntimeEnv = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

// The workspace uses hand-written row mappers instead of generated DB types for now.
// This keeps repository code practical while the domain stays strongly validated with Zod.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuraSupabaseClient = SupabaseClient<any, any, any>;
export type AuraSession = Session;
export type AuraUser = User;

export function hasSupabaseEnv(
  env?: AuraRuntimeEnv,
): env is { supabaseUrl: string; supabaseAnonKey: string } {
  return Boolean(env?.supabaseUrl && env?.supabaseAnonKey);
}

export function createAuraSupabaseClient(
  env?: AuraRuntimeEnv,
  options?: Parameters<typeof createClient>[2],
): AuraSupabaseClient | null {
  if (!hasSupabaseEnv(env)) {
    return null;
  }

  const { supabaseUrl, supabaseAnonKey } = env;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      ...options?.auth,
    },
    ...options,
  });
}

export function assertSupabaseClient(
  client: AuraSupabaseClient | null,
): AuraSupabaseClient {
  if (!client) {
    throw new Error('Supabase não configurado.');
  }

  return client;
}
