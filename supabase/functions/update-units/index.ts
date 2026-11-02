// Saves the unit list from the staff settings page (apply.wlgre.com/?settings): adds, edits and
// removes units and sets which show in the application's dropdown. Protected by the ADMIN_PASSWORD secret:
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

type Unit = { id: string, address: string, beds: number, baths: number, level: string, available: boolean }

const validUnit = (u: any): u is Unit =>
  typeof u?.id === 'string' && /^[a-z0-9-]{1,80}$/.test(u.id) &&
  typeof u.address === 'string' && u.address.trim().length > 0 && u.address.length <= 200 &&
  Number.isInteger(u.beds) && u.beds >= 1 && u.beds <= 10 &&
  typeof u.baths === 'number' && u.baths >= 1 && u.baths <= 10 && Number.isInteger(u.baths * 2) &&
  (u.level === 'ground' || u.level === 'upper') &&
  typeof u.available === 'boolean'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { password, units } = await req.json()

    if (!(await samePassword(password))) {
      await new Promise((r) => setTimeout(r, 1000)) // slows down guessing
      return json({ error: 'Wrong password.' }, 401)
    }
    // An empty list would delete every unit, which is never what the page means to do
    if (!Array.isArray(units) || units.length === 0 || !units.every(validUnit)) {
      return json({ error: 'Every unit needs an address, bedrooms, bathrooms and a level.' }, 400)
    }
    if (new Set(units.map((u) => u.id)).size !== units.length) {
      return json({ error: 'Two units have the same address.' }, 400)
    }

    const now = new Date().toISOString()
    const { error: upsertErr } = await db.from('units').upsert(units.map((u) => ({
      id: u.id,
      address: u.address.trim(),
      beds: u.beds,
      baths: u.baths,
      level: u.level,
      available: u.available,
      updated_at: now,
    })))
    if (upsertErr) throw upsertErr

    // Units removed on the page
    const { error: deleteErr } = await db.from('units').delete().not('id', 'in', `(${units.map((u) => u.id).join(',')})`)
    if (deleteErr) throw deleteErr

    return json({ saved: true })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not save. Please try again.' }, 500)
  }
})
