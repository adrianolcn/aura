# Validação Mobile

Este documento registra como validar a AURA mobile antes do piloto monitorado.

## Ambiente esperado

- Expo iniciado com `pnpm dev:mobile`.
- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` preenchidos.
- Projeto Supabase com dados de staging válidos.

## Fluxos mínimos

1. Login com conta real.
2. Abrir lista de clientes.
3. Abrir detalhe de uma cliente.
4. Validar resumo, timeline e inbox.
5. Enviar template aprovado.
6. Responder dentro da janela de 24h.
7. Abrir PDF de contrato.
8. Abrir imagem remota.
9. Confirmar mudança de idioma entre `pt-BR` e `en-US`.

## Evidências esperadas

- Histórico de mensagens atualizado após polling.
- Status de envio visível.
- Opt-in exibido corretamente.
- Erros amigáveis quando texto livre estiver fora da janela.
- Campos críticos do detalhe da cliente traduzidos conforme idioma selecionado.

## Registro da sessão

- data:
- simulador/dispositivo:
- sistema operacional:
- build/app:
- fluxo validado:
- limitações encontradas:
- correções aplicadas:

## Limitações conhecidas

- Esta base ainda depende de validação manual em simulador/dispositivo real para produzir evidência final.
- Alguns fluxos mais profundos do mobile continuam com cobertura de i18n parcial fora do núcleo principal da cliente.
