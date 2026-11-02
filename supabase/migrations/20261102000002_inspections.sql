-- Move-in / move-out inspections, filled out by the tenant at inspection.wlgre.com.
-- Like applications, the public (anon) key can only add inspections and photos, never read them.
-- A move-out starts from the private link in the move-in email (?ref=<access_token>); the
-- inspection-lookup function uses that token to load the move-in record for comparison.

create table inspections (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('move_in', 'move_out')),
  move_in_id uuid unique references inspections (id),  -- move-outs: the move-in being compared (one move-out each)
  access_token uuid unique,                            -- move-ins: secret in the move-out link
  tenant_name text not null,
  tenant_email text not null,
  tenant_phone text,
  property_address text not null,
  unit text,
  inspection_date date not null,
  forwarding_address text,                             -- move-outs: where to send the deposit
  rooms jsonb not null,  -- [{ name, items: [{ name, condition, notes, photos: [storage paths] }] }]
  general_notes text,
  signature_name text not null,
  signature_path text not null,                        -- drawn signature, in the inspection-photos bucket
  submitted_at timestamptz not null default now(),
  emailed_at timestamptz,                              -- set once the copies are sent, so they go out once
  check (
    (kind = 'move_in' and move_in_id is null and access_token is not null) or
    (kind = 'move_out' and move_in_id is not null and access_token is null)
  )
);

alter table inspections enable row level security;

grant insert on inspections to anon;
create policy "Anyone can submit an inspection" on inspections
  for insert to anon with check (emailed_at is null);

-- Private: staff view photos in the dashboard or through the signed links in the emails
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inspection-photos', 'inspection-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "Anyone can upload inspection photos" on storage.objects
  for insert to anon with check (bucket_id = 'inspection-photos');
