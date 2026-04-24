# Incident Response Messaging

## Incidentes mais comuns

- webhook não recebe eventos
- envio falha na Cloud API
- status não retorna
- mensagem inbound não associa cliente
- scheduler executa com falhas
- observabilidade externa não recebe eventos

## Primeira triagem

1. confirmar secrets e URLs
2. checar `integration_logs`
3. checar `automation_dispatch_runs`
4. checar `message_status_events`
5. checar provedor externo de observabilidade

## Diagnóstico por categoria

Webhook:

- validar `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- validar URL publicada
- confirmar `phone_number_id`

Envio:

- validar `WHATSAPP_ACCESS_TOKEN`
- validar template aprovado
- validar opt-in e janela de 24h

Associação inbound:

- validar `whatsapp_phone_number_id`
- validar telefone normalizado da cliente

Scheduler:

- validar `AUTOMATION_JOB_SECRET`
- validar `AURA_AUTOMATION_DISPATCH_URL`
- revisar `automation_dispatch_runs`

## Fallback operacional

- usar envio manual por template no web
- desativar automação específica com falha
- pausar scheduler até estabilizar
