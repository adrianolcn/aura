# Workflow de Desenvolvimento

## Setup inicial

1. `corepack pnpm install`
2. `pnpm db:start`
3. `pnpm db:reset`
4. preencher `.env.local`
5. preencher `supabase/functions/.env.local`

## Comandos principais

- `pnpm dev:web`
- `pnpm dev:mobile`
- `pnpm functions:serve`
- `corepack pnpm -r typecheck`
- `corepack pnpm -r lint`
- `corepack pnpm test`
- `corepack pnpm test:e2e`
- `corepack pnpm --filter @aura/web build`

## Quando alterar banco

1. criar migration em [`supabase/migrations`](C:/dev/aura/supabase/migrations)
2. rodar `pnpm db:reset`
3. revisar seed se necessário
4. atualizar docs e checklist de release

## Quando alterar Edge Functions

1. rodar `pnpm functions:serve`
2. validar payloads simulados localmente
3. usar [docs/whatsapp-integration.md](C:/dev/aura/docs/whatsapp-integration.md) para staging real

## Quando alterar web ou mobile

1. validar loading, empty e error states
2. revisar i18n nas áreas cobertas
3. revisar observabilidade para fluxos críticos
4. incluir evidências no PR quando houver impacto visual ou operacional

## Workflow sugerido de branch e PR

1. branch curta por assunto
2. mudanças pequenas, coerentes e testáveis
3. PR com contexto claro, riscos e evidências
4. merge só com CI verde e checklist fechado
