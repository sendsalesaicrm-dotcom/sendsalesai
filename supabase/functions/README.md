# Supabase Edge Functions (local)

Nesta pasta, **o nome da pasta é o nome da Edge Function** (slug).

Exemplos:

- `supabase/functions/whatsapp-webhook/index.ts` → endpoint `/functions/v1/whatsapp-webhook`
- `supabase/functions/bright-handler/index.ts` → endpoint `/functions/v1/bright-handler`

> Observação: todos os arquivos chamam `index.ts`, mas **são funções diferentes** porque o que define o nome é a **pasta**.

## Quais o app chama hoje

Referências encontradas no front:

- `bright-handler` (envio de mensagem / outbound) — chamado em `services/sendMessageService.ts`
- `test-whatsapp-connection` (teste de credenciais/config) — chamado em `pages/Settings.tsx`

## Webhook da instância Evolution

Para a instância conectada atualmente, o webhook configurado é:

- `/functions/v1/whatsapp-webhook`

Isso bate com os logs (inbound cai em `whatsapp-webhook`; outbound cai em `bright-handler`).

## Arquivo/funcões arquivadas

Para reduzir confusão, funções locais não usadas pelo app podem ser movidas para:

- `supabase/functions_archive/`

Atualmente:

- `send-message` foi movida para `supabase/functions_archive/send-message/`

## Nota sobre produção

A pasta `supabase/functions/` é o **código-fonte local**. Em produção roda o que estiver **deployado** no Supabase.
Se houver diferença entre o código local e o deployado, isso é "drift" (o repo não reflete 100% a produção).
