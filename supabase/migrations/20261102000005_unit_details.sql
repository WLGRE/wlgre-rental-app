-- Unit details move from src/properties.js into the units table, so staff can add, edit and remove
-- units on the settings page (apply.wlgre.com/?settings) without a code change.
-- level decides an inspection's outdoor items: ground = patio and yard, upper = balcony and stairs.

alter table units
  add column address text,
  add column beds integer,
  add column baths numeric,
  add column level text;

update units set
  address = id || ' Willow Pointe Dr',
  beds = 2,
  baths = 2,
  level = case when id in ('833', '837') then 'upper' else 'ground' end;

alter table units
  alter column address set not null,
  alter column beds set not null,
  alter column baths set not null,
  alter column level set not null,
  add constraint units_beds_check check (beds between 1 and 10),
  add constraint units_baths_check check (baths between 1 and 10 and baths * 2 = floor(baths * 2)),  -- whole or half baths
  add constraint units_level_check check (level in ('ground', 'upper'));
