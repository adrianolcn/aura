# Production Validation

## Objetivo

Fechar a transição de staging para piloto assistido com checklist verificável.

## Checklist mínimo

- webhook validado
- template real enviado
- inbound real recebido
- status outbound visível
- scheduler executado
- erros indo para observabilidade externa
- E2E e integração sem regressão

## Bloqueios desta execução

Os seguintes envs/secrets não estavam presentes:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `AURA_INTEGRATION_SUPABASE_URL`
- `AURA_INTEGRATION_SUPABASE_ANON_KEY`
- `AURA_INTEGRATION_SUPABASE_SERVICE_ROLE_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Por isso, a validação real com Meta e staging não pôde ser concluída aqui.
