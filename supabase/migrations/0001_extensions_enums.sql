-- Extensions ----------------------------------------------------------------
create extension if not exists pgcrypto;

-- Enums -----------------------------------------------------------------
create type public.user_role as enum ('platform_owner', 'company_admin', 'foreman', 'installer');

create type public.company_plan as enum ('free', 'crew', 'company');

create type public.job_status as enum ('open', 'closed');

create type public.box_type as enum (
  'single_gang',
  'double_gang',
  'round',
  '4_inch_square',
  'octagon',
  'weatherproof',
  'panel',
  'other'
);

create type public.box_status as enum ('open', 'specified', 'installed');

create type public.sticker_order_status as enum (
  'draft',
  'submitted',
  'in_production',
  'shipped',
  'failed',
  'ready_for_manual_print'
);
