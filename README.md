# AURA

Plataforma de gestão para maquiadoras e penteadistas com foco em CRM, agenda, contratos, arquivos, mensageria e automações operacionais.

## Estado atual

Fase 7 implementada.

Entradas centrais desta fase:

- preparo de staging real e piloto assistido
- inbox web/mobile mais alinhada
- sincronização pragmática por polling controlado
- observabilidade externa com suporte a endpoint autenticado e Sentry por DSN
- testes integrados das Edge Functions contra ambiente real quando os envs existirem
- workflows de staging, E2E e scheduler
- runbooks e checklists operacionais de piloto

## Estrutura

```text
/apps
  /web
  /mobile
/packages
  /ui
  /core
  /types
  /config
/supabase
  /functions
  /migrations
  seed.sql
/.github
  /workflows
/docs
```

## Fluxos principais

Web:

- login e signup reais
- CRM, eventos, agenda, orçamentos, contratos e arquivos
- inbox por cliente com opt-in, template, janela de 24h, retry de falha e automações

Mobile:

- login e signup reais
- operação central do núcleo
- inbox por cliente com o mesmo domínio do web
- polling controlado para sincronização do histórico

Server/edge:

- `whatsapp-webhook`
- `whatsapp-send`
- `automation-dispatch`
- logs auditáveis e observabilidade externa opcional

## Migrations

- [supabase/migrations/20260423103000_init_aura.sql](C:/dev/aura/supabase/migrations/20260423103000_init_aura.sql)
- [supabase/migrations/20260424100000_auth_and_tenant_guards.sql](C:/dev/aura/supabase/migrations/20260424100000_auth_and_tenant_guards.sql)
- [supabase/migrations/20260424113000_contract_document_links.sql](C:/dev/aura/supabase/migrations/20260424113000_contract_document_links.sql)
- [supabase/migrations/20260423143000_whatsapp_communications.sql](C:/dev/aura/supabase/migrations/20260423143000_whatsapp_communications.sql)
- [supabase/migrations/20260424153000_automation_dispatch_runs.sql](C:/dev/aura/supabase/migrations/20260424153000_automation_dispatch_runs.sql)

## Variáveis de ambiente

Copie `.env.example` para `.env.local`.

Web:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_RELEASE_VERSION`
- `NEXT_PUBLIC_OBSERVABILITY_ENABLED`
- `NEXT_PUBLIC_OBSERVABILITY_PROVIDER`
- `NEXT_PUBLIC_OBSERVABILITY_ENDPOINT`
- `NEXT_PUBLIC_OBSERVABILITY_AUTH_TOKEN`
- `NEXT_PUBLIC_OBSERVABILITY_SENTRY_DSN`

Mobile:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_RELEASE_VERSION`
- `EXPO_PUBLIC_OBSERVABILITY_ENABLED`
- `EXPO_PUBLIC_OBSERVABILITY_PROVIDER`
- `EXPO_PUBLIC_OBSERVABILITY_ENDPOINT`
- `EXPO_PUBLIC_OBSERVABILITY_AUTH_TOKEN`
- `EXPO_PUBLIC_OBSERVABILITY_SENTRY_DSN`

Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `AUTOMATION_JOB_SECRET`
- `APP_ENV`
- `RELEASE_VERSION`
- `OBSERVABILITY_ENABLED`
- `OBSERVABILITY_PROVIDER`
- `OBSERVABILITY_ENDPOINT`
- `OBSERVABILITY_AUTH_TOKEN`
- `OBSERVABILITY_SENTRY_DSN`

Observacao:

- use `*_OBSERVABILITY_AUTH_TOKEN` no frontend apenas se o provedor oferecer token publico de ingestao; caso contrario, prefira `sentry` com DSN ou encaminhamento server-side

Integração/staging:

- `AURA_AUTOMATION_DISPATCH_URL`
- `AURA_WHATSAPP_WEBHOOK_URL`
- `AURA_INTEGRATION_SUPABASE_URL`
- `AURA_INTEGRATION_SUPABASE_ANON_KEY`
- `AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
- `AURA_EDGE_BASE_URL`
- `AURA_INTEGRATION_META_READY`

E2E:

- `E2E_BASE_URL`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_CLIENT_NAME`
- `E2E_SEND_TEMPLATE`

## Scripts

```bash
pnpm dev:web
pnpm dev:mobile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm functions:serve
pnpm --filter @aura/web build
```

## Workflows

- [/.github/workflows/ci.yml](C:/dev/aura/.github/workflows/ci.yml)
- [/.github/workflows/db-validation.yml](C:/dev/aura/.github/workflows/db-validation.yml)
- [/.github/workflows/e2e.yml](C:/dev/aura/.github/workflows/e2e.yml)
- [/.github/workflows/automation-dispatch-schedule.yml](C:/dev/aura/.github/workflows/automation-dispatch-schedule.yml)
- [/.github/workflows/staging-validation.yml](C:/dev/aura/.github/workflows/staging-validation.yml)

## Ordem recomendada de validação local

1. `corepack pnpm install`
2. `pnpm db:start`
3. `pnpm db:reset`
4. preencher `.env.local`
5. preencher `supabase/functions/.env.local`
6. `corepack pnpm -r typecheck`
7. `corepack pnpm -r lint`
8. `corepack pnpm test`
9. `corepack pnpm --filter @aura/web build`
10. `pnpm functions:serve`
11. `pnpm dev:web`
12. `pnpm dev:mobile`
13. `corepack pnpm test:e2e`

## Staging e piloto

Documentos operacionais:

- [docs/staging-validation.md](C:/dev/aura/docs/staging-validation.md)
- [docs/pilot-runbook.md](C:/dev/aura/docs/pilot-runbook.md)
- [docs/incident-response-messaging.md](C:/dev/aura/docs/incident-response-messaging.md)
- [docs/whatsapp-integration.md](C:/dev/aura/docs/whatsapp-integration.md)
- [docs/automation-rules.md](C:/dev/aura/docs/automation-rules.md)
- [docs/e2e-testing.md](C:/dev/aura/docs/e2e-testing.md)
- [docs/mobile-inbox.md](C:/dev/aura/docs/mobile-inbox.md)
- [docs/production-validation.md](C:/dev/aura/docs/production-validation.md)
- [docs/release-checklist.md](C:/dev/aura/docs/release-checklist.md)

## O que foi validado nesta execução

Validado aqui:

- typecheck, lint, suíte principal e build do web
- E2E executável em ambiente normal, mas pulado sem secrets de autenticação
- inbox web/mobile alinhada em código
- polling controlado de 15s nas telas de detalhe da cliente
- observabilidade externa preparada no web, mobile e edge
- suíte integrada das Edge Functions pronta para ambiente real

Não validado aqui:

- webhook com tráfego real da Meta
- envio real com número e credenciais reais
- mobile em simulador/dispositivo
- staging real com Supabase/Meta configurados

Motivo:

- os envs e secrets reais não estavam presentes neste ambiente de trabalho
