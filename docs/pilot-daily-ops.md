# Operação Diária do Piloto

## Abertura do dia

1. Confirmar observabilidade externa ativa.
2. Confirmar scheduler sem falhas críticas na última execução.
3. Confirmar ausência de backlog anormal em `integration_logs`.
4. Verificar mensagens `failed` do período anterior.
5. Confirmar webhook ativo e válido.

## Durante o dia

- acompanhar inbox web e mobile
- observar atraso perceptível do polling de 15s
- acompanhar templates enviados e status recebidos
- revisar opt-ins inconsistentes antes de automações

## Fechamento do dia

1. Revisar `automation_dispatch_runs`.
2. Revisar `notification_logs` com erro.
3. Revisar eventos `failed` ou sem status de retorno.
4. Registrar incidentes em `docs/incident-response-messaging.md` quando necessário.

## Sinais de alerta

- aumento de mensagens outbound sem status
- inbound sem associação de cliente
- opt-in faltando para fluxo operacional
- scheduler sem execução auditável
- mistura de idioma em áreas críticas do piloto

## Decisão operacional atual

- inbox continua com polling de 15s
- rationale:
  - mais simples de auditar
  - mais previsível para suporte inicial
  - ainda sem evidência real que justifique a migração imediata para realtime leve
