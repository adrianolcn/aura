'use client';

import { useTransition } from 'react';

import { useI18n } from '@aura/core';

export function LanguageSwitcher() {
  const { locale, locales, localeLabel, setLocale, t } = useI18n();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-3xl border border-stone-200 bg-white/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
        {t('common.localeSelectorLabel')}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {locales.map((supportedLocale) => (
          <button
            key={supportedLocale}
            type="button"
            disabled={isPending}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              locale === supportedLocale
                ? 'bg-stone-950 text-white'
                : 'border border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
            }`}
            onClick={() => {
              startTransition(() => {
                void setLocale(supportedLocale);
              });
            }}
          >
            {localeLabel(supportedLocale)}
          </button>
        ))}
      </div>
    </div>
  );
}
