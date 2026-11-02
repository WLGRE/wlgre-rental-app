// Saves which units show in the application's dropdown, from the staff settings page
// (apply.wlgre.com/?settings). Protected by the ADMIN_PASSWORD secret:
//   npx supabase secrets set ADMIN_PASSWORD=...
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)
const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

// Compares hashes so the check takes the same time however much of the password is right
async function samePassword(given: unknown) {
  if (typeof given !== 'string' || !ADMIN_PASSWORD) return false
  const hash = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))
  const [a, b] = await Promise.all([hash(given), hash(ADMIN_PASSWORD)])
  return a.every((byte, i) => byte === b[i])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, available } = await req.json()

    if (!(await samePassword(password))) {
      await new Promise((r) => setTimeout(r, 1000)) // slows down guessing
      return json({ error: 'Wrong password.' }, 401)
    }
    if (!Array.isArray(available) || !available.every((id) => typeof id === 'string')) {
      return json({ error: 'Invalid unit list.' }, 400)
    }

    const { data: units, error } = await db.from('units').select('id')
    if (error) throw error
    const now = new Date().toISOString()
    for (const { id } of units) {
      const { error: updateErr } = await db.from('units').update({ available: available.includes(id), updated_at: now }).eq('id', id)
      if (updateErr) throw updateErr
    }

    return json({ saved: true })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not save. Please try again.' }, 500)
  }
})
