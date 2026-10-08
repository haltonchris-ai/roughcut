-- Holds the path to the combined letter-page PDF when a sticker order falls
-- back to self-printed labels (no DIGINATE_API_KEY, or the Diginate call
-- failed). Nullable: unused for orders that ship via Diginate.
alter table public.sticker_orders
  add column pdf_path text;
