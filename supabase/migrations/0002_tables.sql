-- companies -------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan public.company_plan not null default 'free',
  -- 'free' for the free plan (no real Stripe subscription), otherwise mirrors
  -- Stripe subscription status strings (active, trialing, past_due, canceled, unpaid, ...)
  subscription_status text not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now()
);

-- profiles ----------------------------------------------------------------
-- id is shared with auth.users(id); this IS the user row for app purposes.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  role public.user_role not null,
  full_name text not null default '',
  phone text,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint profiles_platform_owner_no_company
    check (role <> 'platform_owner' or company_id is null),
  constraint profiles_company_role_requires_company
    check (role = 'platform_owner' or company_id is not null)
);

create index profiles_company_id_idx on public.profiles (company_id);

-- jobs ----------------------------------------------------------------------
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  address text not null,
  status public.job_status not null default 'open',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index jobs_company_id_idx on public.jobs (company_id);
create index jobs_company_status_idx on public.jobs (company_id, status);

-- boxes -----------------------------------------------------------------
create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid not null references public.jobs (id) on delete cascade,
  -- unguessable, used in the QR payload: {WEB_ORIGIN}/b/{public_code}
  public_code text not null unique,
  -- human-friendly, e.g. RC-4471, unique per company
  short_code text not null,
  -- Nullable: a sticker order mints boxes with a code before anyone has
  -- walked the site, so there is no spec yet. status='open' is exactly that
  -- "sticker exists, nothing specified" state. The check constraint below
  -- requires the spec fields once a box moves past 'open'.
  box_type public.box_type,
  size text,
  height_aff text,
  circuit text,
  notes text,
  photo_path text,
  status public.box_status not null default 'open',
  specified_by uuid references public.profiles (id),
  specified_at timestamptz,
  installed_by uuid references public.profiles (id),
  installed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (company_id, short_code),
  constraint boxes_spec_required_past_open check (
    status = 'open' or (box_type is not null and size is not null and height_aff is not null and circuit is not null)
  )
);

create index boxes_company_id_idx on public.boxes (company_id);
create index boxes_job_id_idx on public.boxes (job_id);
create index boxes_public_code_idx on public.boxes (public_code);

-- scans -------------------------------------------------------------------
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes (id) on delete cascade,
  user_id uuid references public.profiles (id),
  result text not null,
  created_at timestamptz not null default now()
);

create index scans_box_id_idx on public.scans (box_id);

-- sticker_orders ----------------------------------------------------------
create table public.sticker_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  job_id uuid not null references public.jobs (id),
  quantity int not null check (quantity between 10 and 500),
  ship_to jsonb not null,
  status public.sticker_order_status not null default 'draft',
  diginate_order_id text,
  tracking_number text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index sticker_orders_company_id_idx on public.sticker_orders (company_id);

-- Boxes minted by a sticker order know which order created them, so a
-- reprint/print job can find exactly the boxes it's responsible for.
-- Nullable: boxes created ad hoc from a mobile scan have no order.
alter table public.boxes
  add column sticker_order_id uuid references public.sticker_orders (id) on delete set null;

create index boxes_sticker_order_id_idx on public.boxes (sticker_order_id);

-- print_assets --------------------------------------------------------------
-- One row per box: box_id is unique so a reprint/retry upserts the same row
-- (see DECISIONS.md) rather than accumulating duplicates.
create table public.print_assets (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null unique references public.boxes (id) on delete cascade,
  png_path text not null,
  created_at timestamptz not null default now()
);

create index print_assets_box_id_idx on public.print_assets (box_id);

-- invites -------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null,
  role public.user_role not null,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_role_not_owner check (role <> 'platform_owner')
);

create index invites_company_id_idx on public.invites (company_id);

-- audit_log -----------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  target_table text,
  target_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_created_at_idx on public.audit_log (created_at);
