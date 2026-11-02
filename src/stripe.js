import { loadStripe } from '@stripe/stripe-js'

// Publishable key from Stripe Dashboard → Developers → API keys. Live mode: the Supabase functions'
// STRIPE_SECRET_KEY must be the sk_live_… key from the same account, or sessions won't open.
// It's safe in the browser; the secret key lives only in the Supabase functions.
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51UTEWARzm9c0zUsw7MKvdBkU5hyGcd51FfwZy9tnOVOTK7hY2t6NAwZy6Nwgf3O1DjnIgpjH1XOPmgiIML4UU4OV00tPmDRTaB'

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
