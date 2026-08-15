create extension if not exists pgcrypto;

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_token text not null unique,
  visitor_label text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('visitor', 'agent')),
  body text,
  image_url text,
  created_at timestamptz not null default now(),
  constraint support_messages_content check (body is not null or image_url is not null)
);

create table if not exists public.support_devices (
  id uuid primary key default gen_random_uuid(),
  expo_push_token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_messages_conversation_created_idx on public.support_messages (conversation_id, created_at);
create index if not exists support_conversations_last_message_idx on public.support_conversations (last_message_at desc);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_devices enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-images', 'support-images', true, 1572864, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
