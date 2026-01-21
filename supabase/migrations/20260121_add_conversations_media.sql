-- Add media fields to chat history so LiveChat can render WhatsApp-like previews

alter table if exists public.conversations
  add column if not exists media_type text;

alter table if exists public.conversations
  add column if not exists media_url text;

alter table if exists public.conversations
  add column if not exists mime_type text;

alter table if exists public.conversations
  add column if not exists file_name text;

alter table if exists public.conversations
  add column if not exists caption text;
