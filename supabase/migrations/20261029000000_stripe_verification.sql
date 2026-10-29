-- Stripe Identity (government ID) and Financial Connections (bank account) results.
-- The applicant finishes each Stripe flow before submitting, and Stripe reports the outcome
-- later by webhook, so results are stored by Stripe id and the application points at them.

alter table applications
  add column identity_session_id text,
  add column bank_account_ids text[];

-- One row per Stripe Identity VerificationSession, written by the stripe-webhook function
create table identity_verifications (
  session_id text primary key,
  status text not null,          -- processing, verified, requires_input, canceled
  verified_name text,            -- name read off the ID, to compare with the application
  error text,                    -- why it failed, when status is requires_input
  updated_at timestamptz not null default now()
);

-- One row per linked bank account, written by the stripe-webhook function
create table bank_accounts (
  account_id text primary key,
  institution text,
  account_name text,
  last4 text,
  balance_cents bigint,
  currency text,
  owners text,                   -- account holder names reported by the bank
  updated_at timestamptz not null default now()
);

-- No policies: only the service role (the webhook) can read or write these
alter table identity_verifications enable row level security;
alter table bank_accounts enable row level security;
