'use client';

import { useEffect, useMemo, type PropsWithChildren } from 'react';

import {
  AuraI18nProvider,
  auraLocaleStorageKey,
  captureError,
  normalizeLocale,
  updateProfessionalLocale,
  useI18n,
} from '@aura/core';

import { useAuth } from '@/components/auth-provider';

export function WebI18nProvider({ children }: PropsWithChildren) {
  const auth = useAuth();

  const persistenceAdapter = useMemo(
    () => ({
      load: async () => {
        if (typeof window === 'undefined') {
          return null;
        }

        const savedLocale = window.localStorage.getItem(auraLocaleStorageKey);
        return savedLocale ? normalizeLocale(savedLocale) : null;
      },
      save: async (locale: string) => {
        if (typeof window === 'undefined') {
          return;
        }

        window.localStorage.setItem(auraLocaleStorageKey, locale);
      },
    }),
    [],
  );

  return (
    <AuraI18nProvider
      preferredLocale={auth.professional?.locale}
      persistenceAdapter={persistenceAdapter}
      onLocaleChange={async (locale) => {
        if (!auth.client || !auth.professional || auth.professional.locale === locale) {
          return;
        }

        try {
          await updateProfessionalLocale(auth.client, locale);
          await auth.refresh();
        } catch (reason) {
          void captureError(reason, {
            surface: 'web-locale-change',
            locale,
          });
        }
      }}
    >
      <DocumentLanguageSync />
      {children}
    </AuraI18nProvider>
  );
}

function DocumentLanguageSync() {
  const { locale } = useI18n();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
