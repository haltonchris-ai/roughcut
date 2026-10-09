-- Fix: the alphabet is 31 chars but random index ranged 1..32, so ~1 in 31
-- characters came out empty and codes were sometimes 11 chars. Index by the
-- alphabet's real length. Existing codes are left alone (stickers may already
-- be printed); they still resolve fine.
create or replace function public.generate_public_code()
returns text
language sql as $$
  select array_to_string(
    array(
      select substr(a.alphabet, (floor(random() * length(a.alphabet)) + 1)::int, 1)
      from (select 'abcdefghjkmnpqrstuvwxyz23456789'::text as alphabet) a,
           generate_series(1, 12)
    ),
    ''
  );
$$;
