# Release Checklist

## Pré-PR

- [ ] revisar escopo da mudança e impacto nos fluxos centrais
- [ ] garantir que o código segue a arquitetura do monorepo
- [ ] confirmar que não houve regressão nos fluxos da fase anterior
- [ ] revisar `.env.example` se houve mudança de ambiente

## Validação local

- [ ] `corepack pnpm install`
- [ ] `corepack pnpm -r typecheck`
- [ ] `corepack pnpm -r lint`
- [ ] `corepack pnpm test`
- [ ] `corepack pnpm --filter @aura/web build`
- [ ] `corepack pnpm test:e2e`

## Banco / migrations

- [ ] `pnpm db:start`
- [ ] `pnpm db:reset`
- [ ] `pnpm db:lint`
- [ ] confirmar que `supabase/seed.sql` continua consistente
- [ ] validar que a migration nova não quebra seeds nem RLS
- [ ] validar manualmente o fluxo `cliente -> evento -> orçamento -> contrato`
- [ ] validar manualmente o fluxo `cliente -> inbox -> template -> status -> automação`

## CI

- [ ] workflow `CI` passou
- [ ] workflow `Database Validation` passou
- [ ] workflow `E2E Web` passou ou foi conscientemente pulado por falta de secrets
- [ ] workflow `Staging Validation` passou ou está bloqueado com motivo documentado
- [ ] artifacts relevantes foram conferidos quando necessário
- [ ] falhas intermitentes foram investigadas antes do merge

## Secrets / environments

- [ ] confirmar se o CI realmente precisa de secrets extras
- [ ] revisar variáveis públicas de web e mobile
- [ ] revisar configuração opcional de observabilidade
- [ ] revisar `OBSERVABILITY_PROVIDER` e credenciais externas
- [ ] revisar secrets de WhatsApp e jobs server-side
- [ ] revisar secrets do scheduler real (`AURA_AUTOMATION_DISPATCH_URL`, `AUTOMATION_JOB_SECRET`)
- [ ] revisar secrets do E2E (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`)
- [ ] registrar novos secrets no GitHub quando houver deploy ou integrações futuras

Secrets e envs hoje esperados:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_RELEASE_VERSION`
- `EXPO_PUBLIC_RELEASE_VERSION`
- `NEXT_PUBLIC_OBSERVABILITY_ENABLED`
- `EXPO_PUBLIC_OBSERVABILITY_ENABLED`
- `NEXT_PUBLIC_OBSERVABILITY_ENDPOINT` opcional
- `EXPO_PUBLIC_OBSERVABILITY_ENDPOINT` opcional
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `AUTOMATION_JOB_SECRET`
- `AURA_AUTOMATION_DISPATCH_URL`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `AURA_EDGE_BASE_URL`
- `AURA_INTEGRATION_SUPABASE_URL`
- `AURA_INTEGRATION_SUPABASE_ANON_KEY`
- `AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`

## Build web

- [ ] login carregando corretamente
- [ ] rotas protegidas funcionando
- [ ] clientes, agenda, orçamentos e contratos abrindo sem erro
- [ ] preview e abertura de arquivos funcionando
- [ ] inbox da cliente carregando com histórico e status
- [ ] envio manual e template funcionando com feedback claro

## Mobile

- [ ] login funcionando em dispositivo ou simulador
- [ ] criação e edição de cliente funcionando
- [ ] inbox da cliente funcionando
- [ ] template e resposta respeitando a janela de 24h
- [ ] criação de evento e agendamento validada
- [ ] criação de orçamento validada
- [ ] contrato com PDF e nova versão validados
- [ ] abertura de arquivos e imagens validada
- [ ] formulários com picker de data/hora validados

## Observabilidade

- [ ] endpoint opcional configurado ou conscientemente desativado
- [ ] erro manual relevante foi capturado em web ou mobile
- [ ] erro relevante de webhook/envio foi registrado com contexto
- [ ] release/version do build está preenchido

## Publicação no GitHub

- [ ] branch atual revisada e limpa
- [ ] PR aberta com template preenchido
- [ ] descrição contém impacto em banco, env e riscos
- [ ] reviewers definidos
- [ ] CI verde antes do merge

## Antes do merge / release

- [ ] README atualizado
- [ ] docs de WhatsApp, automações, E2E e validação integrada revisadas
- [ ] docs de staging, piloto e incidentes revisadas
- [ ] docs de i18n, arquitetura e workflow de desenvolvimento revisadas quando impactadas
- [ ] `docs/release-checklist.md` revisado se o fluxo mudou
- [ ] `.github/pull_request_template.md` continua adequado
- [ ] decisão de polling vs realtime continua válida para o estágio atual
- [ ] pendências e riscos conhecidos estão documentados
