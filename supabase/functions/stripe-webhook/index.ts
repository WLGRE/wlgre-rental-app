// Receives Stripe events and saves ID and bank results to Supabase.
// Subscribe the endpoint to:
//   identity.verification_session.processing / .verified / .requires_input / .canceled
//   financial_connections.account.refreshed_balance / .refreshed_ownership
import { createClient } from 'npm:@supabase/supabase-js@2'
import { stripe, cryptoProvider } from '../_shared/stripe.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)

// Events can arrive out of order, so each handler re-reads the object from Stripe
// and saves its current state rather than trusting the event payload.
async function saveIdentity(sessionId: string) {
  const session = await stripe.identity.verificationSessions.retrieve(sessionId, {
    expand: ['verified_outputs'],
  })
  const out = session.verified_outputs
  const { error } = await db.from('identity_verifications').upsert({
    session_id: session.id,
    status: session.status,
    verified_name: out ? [out.first_name, out.last_name].filter(Boolean).join(' ') : null,
    error: session.last_error?.reason ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function saveBankAccount(accountId: string) {
  const account = await stripe.financialConnections.accounts.retrieve(accountId)

  // balance.current is keyed by currency, e.g. { usd: 123456 } in cents
  const [currency, cents] = Object.entries(account.balance?.current ?? {})[0] ?? [null, null]

  const ownership = typeof account.ownership === 'string' ? account.ownership : account.ownership?.id
  let owners = null
  if (ownership) {
    const list = await stripe.financialConnections.accounts.listOwners(account.id, { ownership })
    owners = list.data.map((o) => o.name).join(', ')
  }

  const { error } = await db.from('bank_accounts').upsert({
    account_id: account.id,
    institution: account.institution_name,
    account_name: account.display_name,
    last4: account.last4,
    balance_cents: cents,
    currency,
    owners,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

Deno.serve(async (req) => {
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      req.headers.get('stripe-signature') ?? '',
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
      undefined,
      cryptoProvider,
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    if (event.type.startsWith('identity.verification_session.')) {
      await saveIdentity(event.data.object.id)
    } else if (event.type.startsWith('financial_connections.account.')) {
      await saveBankAccount(event.data.object.id)
    }
  } catch (err) {
    // A 500 makes Stripe retry the event later
    console.error(err)
    return new Response('Failed to save', { status: 500 })
  }

  return new Response('ok')
})
