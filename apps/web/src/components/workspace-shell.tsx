'use client';

import type { PropsWithChildren } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AppShell } from '@aura/ui';
import { useI18n } from '@aura/core';

import { useAuth } from '@/components/auth-provider';
import { LanguageSwitcher } from '@/components/language-switcher';

export function WorkspaceShell({ children }: PropsWithChildren) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const auth = useAuth();
  const { t } = useI18n();

  const navigation = [
    { href: '/dashboard', label: t('nav.dashboard') },
    { href: '/clients', label: t('nav.clients') },
    { href: '/agenda', label: t('nav.agenda') },
    { href: '/budgets', label: t('nav.budgets') },
    { href: '/contracts', label: t('nav.contracts') },
    { href: '/automations', label: t('nav.automations') },
  ].map((item) => ({
    ...item,
    active:
      pathname === item.href ||
      (item.href === '/clients' && pathname.startsWith('/clients/')),
  }));

  return (
    <AppShell
      brandTitle={t('workspace.title')}
      brandDescription={t('workspace.description')}
      navigation={navigation}
      sidebarFooter={
        <div className="space-y-4">
          <LanguageSwitcher />
          <div className="rounded-3xl bg-stone-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-orange-300">
              {auth.professional?.businessName ?? t('common.appName')}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-200">
              {auth.professional?.fullName ?? auth.user?.email ?? t('workspace.sessionActive')}
            </p>
            <button
              type="button"
              className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-50"
              onClick={async () => {
                await auth.signOut();
                router.replace('/login');
              }}
            >
              {t('workspace.signOut')}
            </button>
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
