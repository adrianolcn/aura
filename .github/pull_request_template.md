## Contexto

Descreva o problema, hipótese ou oportunidade que motivou esta mudança.

## Tipo da mudança

- [ ] feature
- [ ] fix
- [ ] refactor
- [ ] chore
- [ ] docs
- [ ] infra / CI

## O que foi implementado

- 
- 
- 

## Como testar localmente

1. `corepack pnpm install`
2. `corepack pnpm -r typecheck`
3. `corepack pnpm -r lint`
4. `corepack pnpm test`
5. `corepack pnpm --filter @aura/web build`
6. Validar web/manual:
7. Validar mobile/manual:
8. Se aplicável, `corepack pnpm test:e2e`
9. Se aplicável, `pnpm db:reset`

## Banco / migrations

- [ ] não houve mudança de banco
- [ ] houve nova migration
- [ ] `supabase db reset --local` foi validado
- [ ] seed foi revisada quando necessário

Detalhes:

## Env / secrets

- [ ] não houve mudança de env
- [ ] `.env.example` foi atualizado
- [ ] CI não exige novos secrets
- [ ] observabilidade exige configuração opcional

Variáveis novas ou impactadas:

- 

## Checklist de qualidade

- [ ] typecheck local passou
- [ ] lint local passou
- [ ] testes passaram
- [ ] build web passou
- [ ] E2E foi validado ou o motivo do skip foi documentado
- [ ] fluxo manual principal foi validado
- [ ] i18n foi revisado nas áreas tocadas
- [ ] observabilidade foi revisada nas áreas críticas
- [ ] documentação foi atualizada

## Riscos conhecidos

- 

## Evidências

Inclua screenshots, gravações, logs, saídas de comando ou links relevantes quando aplicável.
