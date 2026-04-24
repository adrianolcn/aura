# WhatsApp Integration

## Arquivos centrais

- [packages/core/src/whatsapp.ts](C:/dev/aura/packages/core/src/whatsapp.ts)
- [packages/core/src/communications.ts](C:/dev/aura/packages/core/src/communications.ts)
- [supabase/functions/whatsapp-webhook/index.ts](C:/dev/aura/supabase/functions/whatsapp-webhook/index.ts)
- [supabase/functions/whatsapp-send/index.ts](C:/dev/aura/supabase/functions/whatsapp-send/index.ts)
- [supabase/functions/automation-dispatch/index.ts](C:/dev/aura/supabase/functions/automation-dispatch/index.ts)

## Regras já implementadas

- texto livre fora da janela de 24h é bloqueado
- template aprovado pode iniciar conversa
- opt-in é exigido quando o template/regra exigir
- retries transitórios da Cloud API são tratados no adapter
- webhook e scheduler registram contexto auditável

## Observabilidade externa

Suporte configurado para:

- `http` com endpoint autenticado
- `sentry` via DSN

Envs de frontend:

- `NEXT_PUBLIC_OBSERVABILITY_PROVIDER`
- `NEXT_PUBLIC_OBSERVABILITY_ENDPOINT`
- `NEXT_PUBLIC_OBSERVABILITY_AUTH_TOKEN`
- `NEXT_PUBLIC_OBSERVABILITY_SENTRY_DSN`
- `EXPO_PUBLIC_OBSERVABILITY_PROVIDER`
- `EXPO_PUBLIC_OBSERVABILITY_ENDPOINT`
- `EXPO_PUBLIC_OBSERVABILITY_AUTH_TOKEN`
- `EXPO_PUBLIC_OBSERVABILITY_SENTRY_DSN`

Env de edge:

- `OBSERVABILITY_ENABLED`
- `OBSERVABILITY_PROVIDER`
- `OBSERVABILITY_ENDPOINT`
- `OBSERVABILITY_AUTH_TOKEN`
- `OBSERVABILITY_SENTRY_DSN`
- `APP_ENV`
- `RELEASE_VERSION`

## Validação real

Checklist mínimo:

- verificar `hub.challenge`
- enviar template real
- receber inbound real
- receber status outbound
- confirmar logs no banco e no provedor externo

## Resultado desta execução

Validado aqui:

- parser de webhook
- status inbound/outbound por payload simulado
- retry do adapter
- integração do web/mobile/edge com observabilidade externa

Não validado aqui:

- webhook com tráfego real da Meta
- envio real com credenciais ativas
