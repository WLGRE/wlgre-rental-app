// Starts a Stripe Financial Connections session so an applicant can link a bank account.
// The browser opens it with stripe.collectFinancialConnectionsAccounts; stripe-webhook records
// the balance and account owners once Stripe has fetched them.
import { stripe, corsHeaders, json } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName } = await req.json()

    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName}`,
      metadata: { source: 'rental-application' },
    })

    const session = await stripe.financialConnections.sessions.create({
      account_holder: { type: 'customer', customer: customer.id },
      permissions: ['balances', 'ownership'],
      prefetch: ['balances', 'ownership'],
      filters: { countries: ['US'] },
    })

    return json({ id: session.id, client_secret: session.client_secret })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not start bank connection.' }, 500)
  }
})
