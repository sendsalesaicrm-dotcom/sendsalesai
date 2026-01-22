-- Store raw inbound provider payload for debugging (optional)

alter table if exists public.conversations
  add column if not exists raw jsonb;
