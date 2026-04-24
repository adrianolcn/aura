# Arquitetura da AURA

## Estrutura do monorepo

- [`apps/web`](C:/dev/aura/apps/web): Next.js para operação web.
- [`apps/mobile`](C:/dev/aura/apps/mobile): Expo/React Native para operação móvel.
- [`packages/core`](C:/dev/aura/packages/core): domínio, hooks, serviços, i18n, uploads, auth, mensageria e observabilidade.
- [`packages/types`](C:/dev/aura/packages/types): schemas Zod e tipos compartilhados.
- [`packages/ui`](C:/dev/aura/packages/ui): primitives visuais do web.
- [`supabase`](C:/dev/aura/supabase): migrations, seed e Edge Functions.

## Decisões principais

### Multi-tenant

- O tenant é o `professional_id`.
- RLS continua sendo a barreira principal de isolamento.
- Toda leitura/escrita operacional relevante passa por tabelas com `professional_id`.

### Mensageria

- A integração sensível com WhatsApp permanece no server/edge.
- O frontend trabalha com serviços compartilhados e dados persistidos.
- Idempotência e rastreabilidade continuam centralizadas em logs e chaves operacionais.

### Observabilidade

- Provider definitivo do web/mobile: Sentry via DSN público.
- Provider alternativo para edge/server: Sentry ou endpoint HTTP autenticado.
- Tokens de ingestão autenticados não são mais parte do fluxo do frontend.

### Internacionalização

- Idioma padrão: `pt-BR`.
- Idioma secundário inicial: `en-US`.
- Preferência persistida no `professional.locale` e também localmente como fallback.
- Dicionários e formatadores ficam em [`packages/core/src/i18n.tsx`](C:/dev/aura/packages/core/src/i18n.tsx).

### Inbox: polling vs realtime

Decisão atual: manter polling controlado de 15 segundos.

Motivos:

- menor superfície operacional para o piloto monitorado
- troubleshooting mais simples
- menos acoplamento entre web, mobile e Supabase Realtime
- custo de complexidade ainda não justificado pelo estágio atual do produto

Critério para rever:

- aumento perceptível de latência operacional no piloto
- volume maior de conversas simultâneas
- necessidade clara de resposta instantânea no atendimento

## Fluxo de alto nível

1. Auth no Supabase.
2. Operação web/mobile usando `packages/core`.
3. Edge Functions tratam webhook, envio e scheduler.
4. Dados operacionais e de mensageria compõem a timeline da cliente.
5. Observabilidade registra erros e eventos críticos com contexto mínimo de tenant.
