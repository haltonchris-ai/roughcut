-- Helper functions used by RLS policies ------------------------------------
-- security definer + fixed search_path: these read public.profiles without
-- being subject to profiles' own RLS, which avoids recursive-policy issues.

create or replace function public.current_company_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_owner()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'platform_owner', false);
$$;

create or replace function public.is_company_disabled()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select disabled_at is not null from public.profiles where id = auth.uid()), false);
$$;

-- Code generation -------------------------------------------------------
-- 12-char unguessable code from an unambiguous alphabet (no 0/O/1/I/L).
create or replace function public.generate_public_code()
returns text
language sql as $$
  select array_to_string(
    array(
      select substr('abcdefghjkmnpqrstuvwxyz23456789', (floor(random() * 32) + 1)::int, 1)
      from generate_series(1, 12)
    ),
    ''
  );
$$;

create or replace function public.next_short_code(p_company_id uuid)
returns text
language plpgsql as $$
declare
  n int;
begin
  select count(*) + 1 into n from public.boxes where company_id = p_company_id;
  return 'RC-' || lpad(n::text, 4, '0');
end;
$$;

create or replace function public.boxes_before_insert()
returns trigger
language plpgsql as $$
declare
  candidate text;
  tries int := 0;
begin
  if NEW.public_code is null then
    loop
      candidate := public.generate_public_code();
      exit when not exists (select 1 from public.boxes where public_code = candidate);
      tries := tries + 1;
      if tries > 20 then
        raise exception 'could not generate a unique public_code';
      end if;
    end loop;
    NEW.public_code := candidate;
  end if;

  if NEW.short_code is null then
    loop
      candidate := public.next_short_code(NEW.company_id);
      exit when not exists (
        select 1 from public.boxes where company_id = NEW.company_id and short_code = candidate
      );
      -- extremely unlikely race; bump by scanning again next loop iteration
    end loop;
    NEW.short_code := candidate;
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger boxes_before_insert_trg
before insert on public.boxes
for each row execute function public.boxes_before_insert();

-- Enforce box update rules: installer may only transition to installed and
-- may never revert an installed status; foreman/company_admin may edit spec
-- fields but not re-open an installed box via this trigger either.
create or replace function public.enforce_box_update_rules()
returns trigger
language plpgsql as $$
declare
  r public.user_role;
begin
  if auth.role() = 'service_role' then
    NEW.updated_at := now();
    return NEW;
  end if;

  r := public.current_role();

  if OLD.status = 'installed' and NEW.status <> 'installed' then
    raise exception 'installed status cannot revert';
  end if;

  if r = 'installer' then
    if NEW.box_type is distinct from OLD.box_type
       or NEW.size is distinct from OLD.size
       or NEW.height_aff is distinct from OLD.height_aff
       or NEW.circuit is distinct from OLD.circuit
       or NEW.notes is distinct from OLD.notes
       or NEW.job_id is distinct from OLD.job_id
       or NEW.public_code is distinct from OLD.public_code
       or NEW.short_code is distinct from OLD.short_code
    then
      raise exception 'installer cannot edit spec fields';
    end if;
    if NEW.status <> 'installed' then
      raise exception 'installer can only mark a box installed';
    end if;
    NEW.installed_by := auth.uid();
    NEW.installed_at := now();
  end if;

  NEW.updated_at := now();
  return NEW;
end;
$$;

create trigger boxes_enforce_update_trg
before update on public.boxes
for each row execute function public.enforce_box_update_rules();

-- Prevent a user from escalating their own role/company/disabled_at.
-- The service role (used by admin server actions) bypasses this check.
create or replace function public.prevent_profile_self_escalation()
returns trigger
language plpgsql as $$
begin
  if auth.role() <> 'service_role' then
    if NEW.role is distinct from OLD.role
       or NEW.company_id is distinct from OLD.company_id
       or NEW.disabled_at is distinct from OLD.disabled_at
    then
      raise exception 'not permitted to change role, company, or disabled_at';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger profiles_prevent_escalation_trg
before update on public.profiles
for each row execute function public.prevent_profile_self_escalation();

-- Plan caps: enforced here as defense-in-depth in addition to the
-- application-layer check in web server actions. Raises an exception which
-- the server action maps to an HTTP 402 response.
create or replace function public.plan_limits(p_plan public.company_plan, out max_jobs int, out max_boxes int, out max_users int)
language sql immutable as $$
  select
    case p_plan when 'free' then 3 when 'crew' then 15 else null end,
    case p_plan when 'free' then 25 when 'crew' then 300 else null end,
    case p_plan when 'free' then 2 when 'crew' then 8 else 40 end;
$$;

create or replace function public.enforce_company_can_write(p_company_id uuid)
returns void
language plpgsql as $$
declare
  status text;
begin
  select subscription_status into status from public.companies where id = p_company_id;
  if status in ('past_due', 'unpaid', 'canceled', 'incomplete_expired') then
    raise exception 'subscription inactive, writes rejected (402)' using errcode = 'P0402';
  end if;
end;
$$;

create or replace function public.enforce_job_caps()
returns trigger
language plpgsql as $$
declare
  cur_plan public.company_plan;
  lim record;
  open_jobs int;
begin
  if auth.role() = 'service_role' then
    return NEW;
  end if;
  perform public.enforce_company_can_write(NEW.company_id);
  select plan into cur_plan from public.companies where id = NEW.company_id;
  select * into lim from public.plan_limits(cur_plan);
  if lim.max_jobs is not null then
    select count(*) into open_jobs from public.jobs where company_id = NEW.company_id and status = 'open';
    if open_jobs >= lim.max_jobs then
      raise exception 'plan job limit reached' using errcode = 'P0402';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger jobs_enforce_caps_trg
before insert on public.jobs
for each row execute function public.enforce_job_caps();

create or replace function public.enforce_box_caps()
returns trigger
language plpgsql as $$
declare
  cur_plan public.company_plan;
  lim record;
  box_count int;
begin
  if auth.role() = 'service_role' then
    return NEW;
  end if;
  perform public.enforce_company_can_write(NEW.company_id);
  select plan into cur_plan from public.companies where id = NEW.company_id;
  select * into lim from public.plan_limits(cur_plan);
  if lim.max_boxes is not null then
    select count(*) into box_count from public.boxes where company_id = NEW.company_id;
    if box_count >= lim.max_boxes then
      raise exception 'plan box limit reached' using errcode = 'P0402';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger boxes_enforce_caps_trg
before insert on public.boxes
for each row execute function public.enforce_box_caps();

create or replace function public.enforce_invite_caps()
returns trigger
language plpgsql as $$
declare
  cur_plan public.company_plan;
  lim record;
  user_count int;
begin
  if auth.role() = 'service_role' then
    return NEW;
  end if;
  perform public.enforce_company_can_write(NEW.company_id);
  select plan into cur_plan from public.companies where id = NEW.company_id;
  select * into lim from public.plan_limits(cur_plan);
  if lim.max_users is not null then
    select count(*) into user_count
      from public.profiles
      where company_id = NEW.company_id and disabled_at is null;
    if user_count >= lim.max_users then
      raise exception 'plan user limit reached' using errcode = 'P0402';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger invites_enforce_caps_trg
before insert on public.invites
for each row execute function public.enforce_invite_caps();
