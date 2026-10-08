-- Enable RLS everywhere. The service role (used only on the server) bypasses
-- RLS entirely, which is how signup, invites, webhooks, and admin actions
-- write across company boundaries. The mobile app and browser only ever get
-- the anon key plus a user's session, so these policies are the real
-- enforcement, not just UI hiding.

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.boxes enable row level security;
alter table public.scans enable row level security;
alter table public.sticker_orders enable row level security;
alter table public.print_assets enable row level security;
alter table public.invites enable row level security;
alter table public.audit_log enable row level security;

-- companies -------------------------------------------------------------
create policy companies_select on public.companies
  for select using (public.is_platform_owner() or id = public.current_company_id());

create policy companies_update_admin on public.companies
  for update
  using (id = public.current_company_id() and public.current_role() = 'company_admin')
  with check (id = public.current_company_id());

-- profiles ------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select using (
    public.is_platform_owner()
    or id = auth.uid()
    or company_id = public.current_company_id()
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- jobs ------------------------------------------------------------------
create policy jobs_select on public.jobs
  for select using (public.is_platform_owner() or company_id = public.current_company_id());

create policy jobs_insert on public.jobs
  for insert with check (
    company_id = public.current_company_id()
    and public.current_role() in ('company_admin', 'foreman')
  );

create policy jobs_update on public.jobs
  for update
  using (
    company_id = public.current_company_id()
    and public.current_role() in ('company_admin', 'foreman')
  )
  with check (company_id = public.current_company_id());

-- no delete policy: jobs are never deleted (spec: "Do not delete data")

-- boxes -----------------------------------------------------------------
create policy boxes_select on public.boxes
  for select using (public.is_platform_owner() or company_id = public.current_company_id());

create policy boxes_insert on public.boxes
  for insert with check (
    company_id = public.current_company_id()
    and public.current_role() in ('company_admin', 'foreman')
  );

create policy boxes_update on public.boxes
  for update
  using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());
  -- column-level enforcement (installer may only flip to installed, spec
  -- fields are foreman/admin only, installed never reverts) happens in the
  -- enforce_box_update_rules() trigger, since RLS alone is row-level only.

-- scans -------------------------------------------------------------------
create policy scans_select on public.scans
  for select using (
    public.is_platform_owner()
    or exists (
      select 1 from public.boxes b
      where b.id = scans.box_id and b.company_id = public.current_company_id()
    )
  );

create policy scans_insert on public.scans
  for insert with check (
    exists (
      select 1 from public.boxes b
      where b.id = scans.box_id and b.company_id = public.current_company_id()
    )
  );

-- sticker_orders ----------------------------------------------------------
create policy sticker_orders_select on public.sticker_orders
  for select using (public.is_platform_owner() or company_id = public.current_company_id());

create policy sticker_orders_insert on public.sticker_orders
  for insert with check (
    company_id = public.current_company_id()
    and public.current_role() = 'company_admin'
  );

create policy sticker_orders_update on public.sticker_orders
  for update
  using (company_id = public.current_company_id() and public.current_role() = 'company_admin')
  with check (company_id = public.current_company_id());

-- print_assets --------------------------------------------------------------
-- read-only to clients; written only by the server (service role) once a
-- print job is rendered.
create policy print_assets_select on public.print_assets
  for select using (
    public.is_platform_owner()
    or exists (
      select 1 from public.boxes b
      where b.id = print_assets.box_id and b.company_id = public.current_company_id()
    )
  );

-- invites -------------------------------------------------------------------
create policy invites_select on public.invites
  for select using (
    public.is_platform_owner()
    or (company_id = public.current_company_id() and public.current_role() = 'company_admin')
  );

create policy invites_insert on public.invites
  for insert with check (
    company_id = public.current_company_id()
    and public.current_role() = 'company_admin'
    and role <> 'company_admin'
  );

-- accepting an invite (setting accepted_at) is done server-side with the
-- service role as part of account creation, so no authenticated update policy.

-- audit_log -----------------------------------------------------------------
create policy audit_log_select on public.audit_log
  for select using (public.is_platform_owner());

-- no insert/update/delete policy for authenticated users: only the server
-- (service role) writes audit entries.
