'use client';

import type { PropsWithChildren } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { AppShell } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';

export function WorkspaceShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const navigation = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/clients', label: 'Clientes' },
    { href: '/agenda', label: 'Agenda' },
    { href: '/budgets', label: 'Orçamentos' },
    { href: '/contracts', label: 'Contratos' },
    { href: '/automations', label: 'Automações' },
  ].map((item) => ({
    ...item,
    active:
      pathname === item.href ||
      (item.href === '/clients' && pathname.startsWith('/clients/')),
  }));

  return (
    <AppShell
      navigation={navigation}
      sidebarFooter={
        <div className="rounded-3xl bg-stone-950 p-5 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-orange-300">
            {auth.professional?.businessName ?? 'AURA'}
          </p>
          <p className="mt-3 text-sm leading-6 text-stone-200">
            {auth.professional?.fullName ?? auth.user?.email ?? 'Sessão ativa'}
          </p>
          <button
            type="button"
            className="mt-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-orange-50"
            onClick={async () => {
              await auth.signOut();
              router.replace('/login');
            }}
          >
            Sair
          </button>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
