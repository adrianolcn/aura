# E2E Testing

## Arquivos

- [playwright.config.ts](C:/dev/aura/playwright.config.ts)
- [e2e/web-inbox.spec.ts](C:/dev/aura/e2e/web-inbox.spec.ts)
- [/.github/workflows/e2e.yml](C:/dev/aura/.github/workflows/e2e.yml)
- [/.github/workflows/staging-validation.yml](C:/dev/aura/.github/workflows/staging-validation.yml)

## Envs necessários para rodar sem skip

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Opcionais:

- `E2E_CLIENT_NAME`
- `E2E_SEND_TEMPLATE`

## Execução local

```bash
corepack pnpm test:e2e
```

## Cobertura

- login
- lista de clientes
- detalhe da cliente
- seção `Conversa`
- opt-in
- envio opcional de template

## Resultado desta execução

A suíte rodou em ambiente normal e ficou `skipped` porque `E2E_USER_EMAIL` e `E2E_USER_PASSWORD` não estavam preenchidos.
