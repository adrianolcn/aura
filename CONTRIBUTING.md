# Contribuindo com a AURA

## Antes de começar

1. Use Node.js 22 e `pnpm` 10.12.4.
2. Copie [`.env.example`](C:/dev/aura/.env.example) para `.env.local`.
3. Copie [`supabase/functions/.env.local.example`](C:/dev/aura/supabase/functions/.env.local.example) para `supabase/functions/.env.local` quando for validar Edge Functions.
4. Rode:
   - `corepack pnpm install`
   - `pnpm db:start`
   - `pnpm db:reset`

## Fluxo local obrigatório

1. Faça mudanças pequenas e intencionais.
2. Valide localmente:
   - `corepack pnpm -r typecheck`
   - `corepack pnpm -r lint`
   - `corepack pnpm test`
   - `corepack pnpm --filter @aura/web build`
3. Se a mudança tocar web operacional, rode `corepack pnpm test:e2e` com `E2E_*` preenchidos.
4. Se a mudança tocar banco, rode `pnpm db:reset` e revise as migrations.

## Regras de contribuição

- Preserve o monorepo e a stack atual.
- Prefira lógica compartilhada em [`packages/core`](C:/dev/aura/packages/core) e [`packages/types`](C:/dev/aura/packages/types).
- Evite duplicar regras de negócio entre web e mobile.
- Qualquer mudança sensível em mensageria, scheduler, observabilidade ou i18n deve vir com documentação.
- Não adicione envs novos sem atualizar [`.env.example`](C:/dev/aura/.env.example) e o README.

## Pull requests

1. Abra o PR usando [`.github/pull_request_template.md`](C:/dev/aura/.github/pull_request_template.md).
2. Inclua evidências quando a mudança afetar UI, Edge Functions, scheduler ou integração.
3. Deixe claro:
   - impacto em migrations
   - impacto em secrets/envs
   - cobertura de testes
   - riscos conhecidos

## Banco e Supabase

- Cada mudança estrutural deve virar migration em [`supabase/migrations`](C:/dev/aura/supabase/migrations).
- Não edite schema remoto manualmente sem refletir isso em migration.
- Use seed apenas para dados estáveis de desenvolvimento.

## Webhook, staging e piloto

- Consulte:
  - [docs/staging-validation.md](C:/dev/aura/docs/staging-validation.md)
  - [docs/pilot-runbook.md](C:/dev/aura/docs/pilot-runbook.md)
  - [docs/incident-response-messaging.md](C:/dev/aura/docs/incident-response-messaging.md)
  - [docs/whatsapp-integration.md](C:/dev/aura/docs/whatsapp-integration.md)
