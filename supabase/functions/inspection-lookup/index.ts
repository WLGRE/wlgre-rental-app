// Loads a move-in inspection for its move-out, given the secret token from the move-out link.
// The browser can't read inspections itself (the public key can only add them), so this returns
// just what the move-out form shows, with short-lived links to the move-in photos.
import { createClient } from 'npm:@supabase/supabase-js@2'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)
const PHOTO_LINK_SECONDS = 6 * 60 * 60

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (typeof token !== 'string' || !/^[0-9a-f-]{36}$/i.test(token)) {
      return json({ error: 'This move-out link isn’t valid.' }, 400)
    }

    const { data: moveIn, error } = await db
      .from('inspections')
      .select('id, tenant_name, tenant_email, tenant_phone, property_address, unit, inspection_date, rooms')
      .eq('kind', 'move_in')
      .eq('access_token', token)
      .maybeSingle()
    if (error) throw error
    if (!moveIn) return json({ error: 'This move-out link isn’t valid.' }, 404)

    const { count, error: countErr } = await db
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .eq('move_in_id', moveIn.id)
    if (countErr) throw countErr
    if (count) return json({ error: 'A move-out inspection has already been submitted for this home.' }, 409)

    // Swap each stored photo path for a link the browser can show
    const paths = moveIn.rooms.flatMap((r: any) => r.items.flatMap((i: any) => i.photos))
    const urls = new Map<string, string>()
    if (paths.length > 0) {
      const { data: signed, error: signErr } = await db.storage
        .from('inspection-photos')
        .createSignedUrls(paths, PHOTO_LINK_SECONDS)
      if (signErr) throw signErr
      signed.forEach((s) => s.signedUrl && urls.set(s.path!, s.signedUrl))
    }
    const rooms = moveIn.rooms.map((r: any) => ({
      ...r,
      items: r.items.map((i: any) => ({ ...i, photos: i.photos.map((p: string) => urls.get(p)).filter(Boolean) })),
    }))

    return json({ ...moveIn, rooms })
  } catch (err) {
    console.error(err)
    return json({ error: 'We couldn’t load your move-in inspection. Please try again in a minute.' }, 500)
  }
})
