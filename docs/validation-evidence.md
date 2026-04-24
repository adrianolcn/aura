# Evidências de Validação

Este documento separa com clareza o que está apenas implementado, o que foi validado com payload simulado e o que foi validado com tráfego ou credenciais reais.

## Status consolidado desta fase

### Implementado no código

- webhook server-side com verificação
- envio de template pelo `whatsapp-send`
- inbox web e mobile
- automações com auditoria em `automation_dispatch_runs`
- E2E do fluxo principal do web
- observabilidade externa

### Validado com payload simulado ou suíte local

- parsing inbound/status
- persistência multi-tenant de conversa e mensagens
- retry pragmático de envio
- build do web
- typecheck, lint e suíte local

### Validado com tráfego ou credenciais reais

- nesta execução, nenhuma evidência real nova pôde ser produzida
- o documento [go-live-evidence.md](C:/dev/aura/docs/go-live-evidence.md) está pronto para registrar a primeira janela assistida com dados reais

## Bloqueios externos atuais

- `WHATSAPP_ACCESS_TOKEN` ausente
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` ausente
- `AURA_INTEGRATION_SUPABASE_URL` ausente
- `AURA_INTEGRATION_SUPABASE_ANON_KEY` ausente
- `AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY` ausente
- `E2E_USER_EMAIL` ausente
- `E2E_USER_PASSWORD` ausente

## Evidências esperadas quando o ambiente estiver completo

1. `hub.challenge` aceito pela Meta.
2. Template outbound persistido em `messages`.
3. Inbound real persistido em `messages`.
4. Status `sent/delivered/read` persistidos em `message_status_events`.
5. Logs correlacionados em `integration_logs`.
6. Execução auditável em `automation_dispatch_runs`.
7. E2E sem `skip`.
8. Validação mobile documentada com simulador ou dispositivo.

## Como registrar a evidência real

- anexar data/hora e ambiente
- indicar quais secrets estavam presentes
- listar o tenant e a cliente usados na validação
- registrar resultado por etapa:
  - webhook
  - template outbound
  - inbound
  - status
  - scheduler
  - inbox web
  - inbox mobile
- anotar bloqueios restantes com classificação:
  - técnico
  - operacional
  - externo
