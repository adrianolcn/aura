import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';

import {
  AuraI18nProvider,
  auraLocaleStorageKey,
  captureError,
  normalizeLocale,
  updateProfessionalLocale,
} from '@aura/core';
import type { SupportedLocale } from '@aura/types';

import { mobileSupabaseClient } from '@/supabase';

export function MobileI18nProvider({
  children,
  preferredLocale,
}: PropsWithChildren<{
  preferredLocale?: SupportedLocale | null;
}>) {
  return (
    <AuraI18nProvider
      preferredLocale={preferredLocale}
      persistenceAdapter={{
        load: async () => {
          const savedLocale = await AsyncStorage.getItem(auraLocaleStorageKey);
          return savedLocale ? normalizeLocale(savedLocale) : null;
        },
        save: async (locale) => {
          await AsyncStorage.setItem(auraLocaleStorageKey, locale);
        },
      }}
      onLocaleChange={async (locale) => {
        if (!mobileSupabaseClient || !preferredLocale || preferredLocale === locale) {
          return;
        }

        try {
          await updateProfessionalLocale(mobileSupabaseClient, locale);
        } catch (reason) {
          void captureError(reason, {
            surface: 'mobile-locale-change',
            locale,
          });
        }
      }}
    >
      {children}
    </AuraI18nProvider>
  );
}
