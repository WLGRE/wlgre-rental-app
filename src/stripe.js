import { loadStripe } from '@stripe/stripe-js'

// Publishable key from Stripe Dashboard → Developers → API keys (pk_test_… while testing).
// It's safe in the browser; the secret key lives only in the Supabase functions.
const STRIPE_PUBLISHABLE_KEY = 'pk_test_REPLACE_ME'

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
