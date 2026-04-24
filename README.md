# AURA

Plataforma de gestão para maquiadoras e penteadistas com foco em CRM, agenda, contratos, arquivos, mensageria operacional e automações.

## Estado atual

Fase 11 implementada.

Entradas principais desta fase:

- fechamento adicional de i18n no detalhe da cliente do web e no núcleo da inbox mobile
- checklist de go-live controlado e validação mobile dedicados
- preflight de staging reforçado com secrets de WhatsApp e scheduler
- runbooks organizados para staging, piloto, go-live e troubleshooting
- autenticação reaproveitada no E2E via `storageState`
- artefatos explícitos de evidência para validação e go-live
- organização mantida para versionamento limpo no GitHub

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
  /ISSUE_TEMPLATE
/docs
/scripts
```

## Fluxos principais

Web:

- auth real com Supabase
- CRM, agenda, contratos, orçamentos e arquivos
- inbox operacional por cliente

Mobile:

- auth real
- operação central do núcleo
- inbox por cliente
- pickers nativos para data e hora

Server/edge:

- `whatsapp-webhook`
- `whatsapp-send`
- `automation-dispatch`

## Decisões arquiteturais atuais

- multi-tenant por `professional_id`
- integração sensível do WhatsApp apenas no lado server/edge
- observabilidade do frontend via Sentry DSN
- observabilidade do edge via Sentry ou HTTP autenticado
- inbox mantida com polling de 15s por decisão operacional do piloto atual

## Internacionalização

- padrão: `pt-BR`
- secundário: `en-US`
- fallback sempre em `pt-BR`
- seletor:
  - web: shell lateral
  - mobile: hero das telas

Cobertura principal nesta fase:

- autenticação
- navegação principal
- dashboard
- clientes
- agenda
- contratos
- inbox principal no web e no mobile
- resumo e timeline do detalhe da cliente

Detalhes em [docs/i18n.md](C:/dev/aura/docs/i18n.md).

## Variáveis de ambiente

Copie [`.env.example`](C:/dev/aura/.env.example) para `.env.local`.

Frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_RELEASE_VERSION`
- `NEXT_PUBLIC_OBSERVABILITY_ENABLED`
- `NEXT_PUBLIC_OBSERVABILITY_PROVIDER`
- `NEXT_PUBLIC_OBSERVABILITY_ENDPOINT`
- `NEXT_PUBLIC_OBSERVABILITY_SENTRY_DSN`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_RELEASE_VERSION`
- `EXPO_PUBLIC_OBSERVABILITY_ENABLED`
- `EXPO_PUBLIC_OBSERVABILITY_PROVIDER`
- `EXPO_PUBLIC_OBSERVABILITY_ENDPOINT`
- `EXPO_PUBLIC_OBSERVABILITY_SENTRY_DSN`

Edge / integração:

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

Staging / integração real:

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

## Scripts principais

```bash
pnpm dev:web
pnpm dev:mobile
pnpm functions:serve
pnpm db:start
pnpm db:reset
pnpm db:lint
corepack pnpm -r typecheck
corepack pnpm -r lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm --filter @aura/web build
```

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

## Documentação principal

- [CONTRIBUTING.md](C:/dev/aura/CONTRIBUTING.md)
- [docs/architecture.md](C:/dev/aura/docs/architecture.md)
- [docs/development-workflow.md](C:/dev/aura/docs/development-workflow.md)
- [docs/i18n.md](C:/dev/aura/docs/i18n.md)
- [docs/staging-validation.md](C:/dev/aura/docs/staging-validation.md)
- [docs/pilot-runbook.md](C:/dev/aura/docs/pilot-runbook.md)
- [docs/go-live.md](C:/dev/aura/docs/go-live.md)
- [docs/go-live-evidence.md](C:/dev/aura/docs/go-live-evidence.md)
- [docs/mobile-validation.md](C:/dev/aura/docs/mobile-validation.md)
- [docs/validation-evidence.md](C:/dev/aura/docs/validation-evidence.md)
- [docs/pilot-daily-ops.md](C:/dev/aura/docs/pilot-daily-ops.md)
- [docs/incident-response-messaging.md](C:/dev/aura/docs/incident-response-messaging.md)
- [docs/whatsapp-integration.md](C:/dev/aura/docs/whatsapp-integration.md)
- [docs/automation-rules.md](C:/dev/aura/docs/automation-rules.md)
- [docs/e2e-testing.md](C:/dev/aura/docs/e2e-testing.md)
- [docs/mobile-inbox.md](C:/dev/aura/docs/mobile-inbox.md)
- [docs/production-validation.md](C:/dev/aura/docs/production-validation.md)
- [docs/release-checklist.md](C:/dev/aura/docs/release-checklist.md)

## O que continua bloqueado neste ambiente

Não foi possível produzir evidência real de:

- webhook com tráfego da Meta
- envio real com número e credenciais reais
- validação do mobile em simulador/dispositivo
- staging-validation completa
- E2E autenticado completo sem `skip`

Motivo:

- os secrets e envs reais necessários continuam ausentes no ambiente atual
