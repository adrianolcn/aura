'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { AuraSupabaseClient } from '@aura/core';

let browserClient: AuraSupabaseClient | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Variáveis públicas do Supabase não configuradas.');
    }

    browserClient = createBrowserClient(url, key);
  }

  return browserClient;
}
