# Staging Validation

## Objetivo

Validar a integração real da AURA com Meta/WhatsApp em ambiente de staging antes do piloto.

## Secrets necessários

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_API_VERSION`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `AUTOMATION_JOB_SECRET`
- `AURA_AUTOMATION_DISPATCH_URL`
- `AURA_EDGE_BASE_URL`
- `AURA_INTEGRATION_SUPABASE_URL`
- `AURA_INTEGRATION_SUPABASE_ANON_KEY`
- `AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

## Passos

1. confirmar templates aprovados na Meta
2. preencher envs de staging no GitHub, no web e nas Edge Functions
3. publicar Edge Functions
4. apontar webhook da Meta para `whatsapp-webhook`
5. validar `hub.challenge`
6. enviar um template real da AURA
7. responder do WhatsApp para gerar inbound real
8. confirmar status `sent/delivered/read` quando disponível
9. validar a inbox web
10. validar a inbox mobile em simulador/dispositivo
11. rodar `staging-validation.yml`
12. rodar o checklist de piloto
13. registrar resultado em `validation-evidence.md` e `go-live-evidence.md`

## Critério de sucesso operacional

- webhook verificado pela Meta
- template real enviado pela AURA
- inbound real persistido e associado à cliente correta
- status outbound registrado
- logs em observabilidade externa
- scheduler gerando `automation_dispatch_runs`
- E2E sem skip indevido

## Evidências esperadas

- mensagem outbound em `messages`
- mensagem inbound em `messages`
- status em `message_status_events`
- logs em `integration_logs`
- conversa atualizada em `conversations`
- execução do scheduler em `automation_dispatch_runs`

## Bloqueios desta execução

Nesta execução local, os envs reais de Meta e staging estavam ausentes. Por isso:

- não foi possível validar o webhook com tráfego real
- não foi possível validar o envio real de template
- não foi possível rodar a suíte integrada contra staging real
