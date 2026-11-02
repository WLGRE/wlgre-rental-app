-- Which units show in the application's "Unit you're applying for" dropdown. The unit details
-- (address, beds/baths) live in src/properties.js; this only says whether each one is available.
-- Anyone can read it; only the update-units function (staff password) changes it, from apply.wlgre.com/?settings.

create table units (
  id text primary key,                       -- matches PROPERTIES[].id in src/properties.js
  available boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into units (id, available) values
  ('831', true),
  ('833', false),
  ('835', false),
  ('837', true);

alter table units enable row level security;

grant select on units to anon;
create policy "Anyone can see which units are available" on units
  for select to anon using (true);
