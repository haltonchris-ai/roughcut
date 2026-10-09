-- Private, revocable feed token per company (used by /api/feed/{token}).
-- RLS is enabled with NO policies: only the server (service role) can read or
-- write it, so tokens never reach foremen/installers or the browser client.
create table if not exists public.company_feeds (
  company_id uuid primary key references public.companies (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.company_feeds enable row level security;
