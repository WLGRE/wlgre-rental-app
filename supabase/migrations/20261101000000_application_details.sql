-- Fields added to the rental application form (Personal, Household and Documents steps).
-- current_address is still filled in (street, city, state zip) for anything that reads it.

alter table applications
  add column date_of_birth date,
  add column ssn_last4 text check (ssn_last4 ~ '^[0-9]{4}$'),
  add column address_street text,
  add column address_city text,
  add column address_state text,
  add column address_zip text,
  add column move_reason_detail text,
  add column move_in_flexible boolean not null default false,
  add column pet_info jsonb,               -- { count, type, breed, weight, neutered, notes }
  add column vehicles jsonb not null default '[]',  -- [{ year, make, model, plate }]
  add column emergency_name text,
  add column emergency_relationship text,
  add column emergency_phone text,
  add column prior_evictions boolean,
  add column eviction_details text,
  add column self_employed boolean not null default false;  -- uploaded a 1099 + bank statements instead of pay stubs
