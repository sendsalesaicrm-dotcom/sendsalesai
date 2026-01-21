-- Adds idempotency fields to avoid message loss/duplication on webhook retries

alter table if exists public.conversations
  add column if not exists provider text;

alter table if exists public.conversations
  add column if not exists external_id text;

-- One message ID per provider (Meta/Evolution/etc)
create unique index if not exists conversations_provider_external_id_uniq
  on public.conversations (provider, external_id)
  where external_id is not null;

-- Helpful for chat loading
create index if not exists conversations_lead_id_created_at_idx
  on public.conversations (lead_id, created_at);
