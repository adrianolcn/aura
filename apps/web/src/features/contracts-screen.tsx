'use client';

import { useState } from 'react';

import { createSignedStorageUrl, formatDate, toUserMessage, useContracts } from '@aura/core';
import { Badge, PageHeader, SectionCard } from '@aura/ui';

import { useAuth } from '@/components/auth-provider';
import { ErrorBlock, LoadingBlock } from '@/components/resource-state';

export function ContractsScreen() {
  const auth = useAuth();
  const [status, setStatus] = useState<'all' | 'draft' | 'uploaded' | 'sent' | 'signed' | 'cancelled'>('all');
  const [orderBy, setOrderBy] = useState<'createdAt' | 'updatedAt' | 'signedAt'>('createdAt');
  const [actionError, setActionError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { data, loading, error } = useContracts(auth.client, {
    status: status === 'all' ? undefined : status,
    orderBy,
    orderDirection: 'desc',
  });

  if (auth.loading || loading) {
    return <LoadingBlock title="Contratos e documentos" />;
  }

  if (error || !data) {
    return <ErrorBlock message={error ?? 'Sem contratos disponíveis.'} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contratos"
        title="Documentos e status"
        description="Fluxo simples e sólido para o MVP: upload manual de PDF, versionamento e acompanhamento de status."
      />

      <SectionCard
        title="Contratos vinculados a eventos"
        description="A mesma estrutura já suporta evolução para assinatura digital e automações futuras."
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
                    | 'uploaded'
                    | 'sent'
                    | 'signed'
                    | 'cancelled',
                )
              }
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="all">Todos</option>
              {['draft', 'uploaded', 'sent', 'signed', 'cancelled'].map((item) => (
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
                setOrderBy(event.target.value as 'createdAt' | 'updatedAt' | 'signedAt')
              }
              className="w-full rounded-2xl border border-stone-200 px-4 py-3 outline-none transition focus:border-stone-950"
            >
              <option value="createdAt">Cadastro recente</option>
              <option value="updatedAt">Atualização recente</option>
              <option value="signedAt">Data de assinatura</option>
            </select>
          </label>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {!data.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
            Nenhum contrato corresponde aos filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
          {data.map((contract) => (
            <div
              key={contract.id}
              className="flex flex-col gap-3 rounded-[1.25rem] border border-stone-200 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-stone-950">
                  {contract.version?.fileName ?? 'Versão pendente'}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Upload em {contract.version ? formatDate(contract.version.uploadedAt) : 'aguardando'}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {contract.versions.length} vers{contract.versions.length === 1 ? 'ão' : 'ões'} registrada(s)
                </p>
                {contract.version ? (
                  <button
                    type="button"
                    className="mt-3 text-sm font-semibold text-cyan-700 transition hover:text-cyan-800"
                    onClick={async () => {
                      if (!auth.client || !contract.version) {
                        return;
                      }

                      setOpeningId(contract.id);
                      setActionError(null);

                      try {
                        const url = await createSignedStorageUrl(
                          auth.client,
                          'contracts',
                          contract.version.storagePath,
                        );
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } catch (reason) {
                        setActionError(
                          toUserMessage(reason, 'Não foi possível abrir o contrato no momento.'),
                        );
                      } finally {
                        setOpeningId(null);
                      }
                    }}
                  >
                    {openingId === contract.id ? 'Abrindo PDF...' : 'Abrir / baixar PDF'}
                  </button>
                ) : null}
              </div>
              <Badge tone={contract.status === 'signed' ? 'success' : 'warning'}>
                {contract.status}
              </Badge>
            </div>
          ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
