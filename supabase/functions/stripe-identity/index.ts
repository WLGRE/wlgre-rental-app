// Starts a Stripe Identity check (photo ID + selfie) for an applicant.
// The browser opens it with stripe.verifyIdentity(client_secret); stripe-webhook records the result.
import { stripe, corsHeaders, json } from '../_shared/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, firstName, lastName } = await req.json()

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      provided_details: { email },
      options: { document: { require_matching_selfie: true } },
      metadata: { applicant: `${firstName} ${lastName}`, email },
    })

    return json({ id: session.id, client_secret: session.client_secret })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not start ID verification.' }, 500)
  }
})
