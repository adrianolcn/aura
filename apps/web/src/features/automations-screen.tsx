'use client';

import { useState } from 'react';

import {
  dispatchAutomationRules,
  toUserMessage,
  useAutomationRules,
} from '@aura/core';
import { Badge, EmptyState, PageHeader, SectionCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function AutomationsScreen() {
  const auth = useAuth();
  const { data, loading, error, reload } = useAutomationRules(auth.client);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (auth.loading || loading) {
    return <LoadingBlock title="Automações" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Não foi possível carregar as automações.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automações"
        title="Operação assistida"
        description="Regras operacionais baseadas em templates, com execução auditável, idempotência básica e respeito ao opt-in de WhatsApp."
      />

      {actionError ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</div>
      ) : null}
      {statusMessage ? (
        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div>
      ) : null}

      <SectionCard
        title="Dispatcher manual"
        description="Use este disparo para validar regras e templates do tenant sem esperar o agendamento externo."
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm leading-7 text-stone-600">
            O envio automático usa os mesmos guards do fluxo manual: opt-in obrigatório quando exigido, template aprovado no WhatsApp e prevenção básica de duplicidade por chave idempotente.
          </p>
          <button
            type="button"
            className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
            disabled={busy}
            onClick={async () => {
              if (!auth.client) {
                return;
              }

              setBusy(true);
              setActionError(null);
              setStatusMessage(null);

              try {
                const result = await dispatchAutomationRules(auth.client);
                setStatusMessage(
                  `${result.processedCount} processada(s), ${result.skippedCount} pulada(s) e ${result.failedCount} falha(s).`,
                );
                await reload();
              } catch (reason) {
                setActionError(toUserMessage(reason));
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? 'Executando...' : 'Executar agora'}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Regras ativas"
        description="Templates internos mapeados aos disparos operacionais da AURA."
      >
        {data.length ? (
          <div className="space-y-3">
            {data.map((rule) => (
              <div key={rule.id} className="rounded-[1.25rem] border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-stone-950">{rule.name}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      trigger {rule.triggerType} • offset {rule.eventOffsetMinutes} min
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={rule.isActive ? 'success' : 'warning'}>
                      {rule.isActive ? 'ativa' : 'pausada'}
                    </Badge>
                    <Badge tone="info">{rule.automationKind}</Badge>
                    <Badge tone={rule.requiresOptIn ? 'warning' : 'neutral'}>
                      {rule.requiresOptIn ? 'requer opt-in' : 'sem opt-in'}
                    </Badge>
                  </div>
                </div>
                <pre className="mt-4 overflow-x-auto rounded-2xl bg-stone-50 p-4 text-xs leading-6 text-stone-600">
                  {JSON.stringify(rule.payload, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma automação cadastrada"
            description="Crie templates e regras de lembrete para começar a disparar confirmações, lembretes e follow-up via WhatsApp."
          />
        )}
      </SectionCard>
    </div>
  );
}
