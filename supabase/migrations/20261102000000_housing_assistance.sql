-- Housing assistance answers from the Employment step, read by the admin notification email.
-- "if not exists" so this is safe to run whether or not they were added by hand earlier.

alter table employment_records
  add column if not exists housing_assistance boolean not null default false,
  add column if not exists assistance_type text,          -- e.g. Section 8 / Housing Choice Voucher
  add column if not exists assistance_amount numeric;     -- monthly voucher amount in dollars
