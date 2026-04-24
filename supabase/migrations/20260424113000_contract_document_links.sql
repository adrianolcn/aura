alter table public.client_documents
  add column if not exists contract_id uuid references public.contracts(id) on delete cascade,
  add column if not exists contract_version_id uuid references public.contract_versions(id) on delete set null,
  add column if not exists file_size_bytes bigint;

create index if not exists client_documents_contract_id_idx
  on public.client_documents (contract_id);

create index if not exists client_documents_contract_version_id_idx
  on public.client_documents (contract_version_id);

create index if not exists client_documents_status_idx
  on public.client_documents (status);

comment on column public.client_documents.contract_id is
  'Optional link to the contract that originated this document.';

comment on column public.client_documents.contract_version_id is
  'Optional link to the specific contract version that originated this document.';

comment on column public.client_documents.file_size_bytes is
  'Stored file size in bytes when the upload flow can capture it.';
