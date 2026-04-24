'use client';

import { useState } from 'react';

import { formatCurrency, formatDate, useBudgets } from '@aura/core';
import { Badge, PageHeader, SectionCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function BudgetsScreen() {
  const auth = useAuth();
  const [status, setStatus] = useState<'all' | 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'>('all');
  const [orderBy, setOrderBy] = useState<'createdAt' | 'updatedAt' | 'validUntil' | 'totalAmount'>(
    'createdAt',
  );
  const { data, loading, error } = useBudgets(auth.client, {
    status: status === 'all' ? undefined : status,
    orderBy,
    orderDirection: 'desc',
  });

  if (auth.loading || loading) {
    return <LoadingBlock title="Orçamentos" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Sem orçamentos disponíveis.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Propostas"
        title="Orçamentos por evento"
        description="Cada evento pode concentrar proposta, itens, validade e status de aprovação sem depender de uma integração externa para o MVP."
      />

      <SectionCard
        title="Quadro de propostas"
        description="Modelo inicial pronto para criação, revisão e acompanhamento manual."
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2 text-sm text-stone-600">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as
                    | 'all'
                    | 'draft'
                    | 'sent'
                    | 'approved'
                    | 'rejected'
                    | 'expired',
                )
              }
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="all">Todos</option>
              {['draft', 'sent', 'approved', 'rejected', 'expired'].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-stone-600">
            <span>Ordenar por</span>
            <select
              value={orderBy}
              onChange={(event) =>
                setOrderBy(
                  event.target.value as 'createdAt' | 'updatedAt' | 'validUntil' | 'totalAmount',
                )
              }
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="createdAt">Cadastro recente</option>
              <option value="updatedAt">Atualização recente</option>
              <option value="validUntil">Validade</option>
              <option value="totalAmount">Valor</option>
            </select>
          </label>
        </div>

        {!data.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
            Nenhum orçamento corresponde aos filtros atuais.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
          {data.map((budget) => (
            <div key={budget.id} className="rounded-[1.25rem] border border-stone-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-stone-950">
                    {formatCurrency(budget.totalAmount)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Validade {budget.validUntil ? formatDate(budget.validUntil) : 'aberta'}
                  </p>
                </div>
                <Badge tone={budget.status === 'approved' ? 'success' : 'warning'}>
                  {budget.status}
                </Badge>
              </div>
              <div className="mt-4 space-y-2">
                {budget.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-stone-600">
                    <span>{item.description}</span>
                    <span>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
