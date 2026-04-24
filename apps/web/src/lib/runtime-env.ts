import type { AuraRuntimeEnv } from '@aura/core';

export const runtimeEnv: AuraRuntimeEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};
