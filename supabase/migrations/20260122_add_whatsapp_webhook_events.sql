-- Stores inbound webhook payloads when parsing/routing drops messages (debug/forensics)

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  provider text not null,
  event_type text null,
  instance_name text null,
  phone text null,
  external_id text null,
  parsed_count integer not null default 0,
  drop_reason text null,
  sample_content text null,
  payload jsonb null
);

create index if not exists whatsapp_webhook_events_received_at_idx
  on public.whatsapp_webhook_events (received_at desc);

alter table public.whatsapp_webhook_events enable row level security;
