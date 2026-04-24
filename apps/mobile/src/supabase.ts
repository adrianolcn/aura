import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAuraSupabaseClient } from '@aura/core';

import { runtimeEnv } from '@/runtime-env';

export const mobileSupabaseClient = createAuraSupabaseClient(runtimeEnv, {
  auth: {
    storage: AsyncStorage as never,
    detectSessionInUrl: false,
    storageKey: 'aura-mobile-auth',
  },
});
