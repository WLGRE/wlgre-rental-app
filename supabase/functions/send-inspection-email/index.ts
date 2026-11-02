// Emails a submitted inspection: a copy to the tenant (a move-in's includes the private move-out
// link) and to staff, plus a one-line text. Move-outs are shown next to their move-in, with every
// item that got worse highlighted. Each inspection is emailed once.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { esc, detailRows, section, layout, sendEmail, ADMIN_EMAIL, ADMIN_SMS } from '../_shared/email.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SERVICE_ROLE_KEY')!)
const INSPECTION_URL = 'https://inspection.wlgre.com'
const PHOTO_LINK_SECONDS = 30 * 24 * 60 * 60
const DASHBOARD = 'https://supabase.com/dashboard/project/hoouyjfsavketbdeipcb'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const LABELS: Record<string, string> = { good: 'Good', fair: 'Fair', poor: 'Poor', damaged: 'Damaged', na: 'N/A' }
const COLORS: Record<string, string> = { good: '#2d7a4f', fair: '#a0803c', poor: '#c47a2c', damaged: '#b94040', na: '#8a8a82' }
const RANK: Record<string, number> = { good: 0, fair: 1, poor: 2, damaged: 3 }
const worse = (before?: string, after?: string) =>
  before! in RANK && after! in RANK && RANK[after!] > RANK[before!]

const condition = (c?: string) => c ? `<span style="color:${COLORS[c] ?? '#1a1a18'};font-weight:600;">${LABELS[c] ?? esc(c)}</span>` : '—'

type Item = { name: string, condition: string, notes: string, photos: string[] }
type Room = { name: string, items: Item[] }

// One table per room. Move-outs get a Move-in column and a red background on items that got worse.
function roomTables(rooms: Room[], photoLinks: Map<string, string>, moveInRooms?: Room[]) {
  const cell = 'padding:7px 6px;border-bottom:1px solid #e4e0d8;vertical-align:top;'
  const head = `<tr style="color:#8a8a82;font-size:12px;text-align:left;">
      <th style="${cell}">Item</th>${moveInRooms ? `<th style="${cell}">Move-in</th><th style="${cell}">Move-out</th>` : `<th style="${cell}">Condition</th>`}<th style="${cell}">Notes</th>
    </tr>`

  return rooms.map((room, ri) => section(room.name, head + room.items.map((item, ii) => {
    const before = moveInRooms?.[ri]?.items[ii]
    const flagged = before && worse(before.condition, item.condition)
    const photos = item.photos
      .map((p, n) => photoLinks.get(p) ? `<a href="${photoLinks.get(p)}" style="color:#b8964a;">Photo ${n + 1}</a>` : '')
      .filter(Boolean).join(' · ')
    const notes = [
      before?.notes ? `<span style="color:#8a8a82;">Move-in: ${esc(before.notes)}</span>` : '',
      esc(item.notes),
      photos,
    ].filter(Boolean).join('<br>')
    return `<tr style="${flagged ? 'background:#fbeaea;' : ''}">
        <td style="${cell}">${esc(item.name)}</td>
        ${moveInRooms ? `<td style="${cell}">${condition(before?.condition)}</td>` : ''}
        <td style="${cell}">${condition(item.condition)}</td>
        <td style="${cell}">${notes || '—'}</td>
      </tr>`
  }).join(''))).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let claimed: string | null = null
  try {
    const { inspectionId } = await req.json()
    if (typeof inspectionId !== 'string' || !/^[0-9a-f-]{36}$/i.test(inspectionId)) {
      return json({ error: 'Invalid inspection id' }, 400)
    }

    // Claim it first, so a repeated call can't send the emails twice
    const { data: insp, error } = await db
      .from('inspections')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', inspectionId)
      .is('emailed_at', null)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!insp) return json({ skipped: 'Not found or already emailed' })
    claimed = insp.id

    const isMoveOut = insp.kind === 'move_out'
    let moveIn = null
    if (isMoveOut) {
      const { data, error: moveInErr } = await db.from('inspections').select('*').eq('id', insp.move_in_id).single()
      if (moveInErr) throw moveInErr
      moveIn = data
    }

    const rooms: Room[] = insp.rooms
    const paths = rooms.flatMap((r) => r.items.flatMap((i) => i.photos))
    const photoLinks = new Map<string, string>()
    if (paths.length > 0) {
      const { data: signed, error: signErr } = await db.storage.from('inspection-photos').createSignedUrls(paths, PHOTO_LINK_SECONDS)
      if (signErr) throw signErr
      signed.forEach((s) => s.signedUrl && photoLinks.set(s.path!, s.signedUrl))
    }

    const kind = isMoveOut ? 'Move-out' : 'Move-in'
    const property = [insp.property_address, insp.unit].filter(Boolean).join(', ')
    const items = rooms.flatMap((r) => r.items)
    const worseItems = isMoveOut
      ? rooms.flatMap((r, ri) => r.items
          .filter((i, ii) => worse(moveIn.rooms[ri]?.items[ii]?.condition, i.condition))
          .map((i) => `${r.name}: ${i.name}`))
      : []
    const moveOutLink = isMoveOut ? null : `${INSPECTION_URL}/?ref=${insp.access_token}`

    const details = section(`${kind} details`, detailRows([
      ['Tenant', esc(insp.tenant_name)],
      ['Email', esc(insp.tenant_email)],
      ['Phone', esc(insp.tenant_phone)],
      ['Property', esc(property)],
      [`${kind} date`, esc(insp.inspection_date)],
      ...(isMoveOut ? [
        ['Moved in', esc(moveIn.inspection_date)],
        ['Forwarding address', esc(insp.forwarding_address)],
      ] as [string, string][] : []),
      ['Items', `${items.length} rated · ${items.filter((i) => i.condition === 'poor' || i.condition === 'damaged').length} poor or damaged · ${paths.length} photos`],
      ['Other notes', esc(insp.general_notes)],
      ['Signed', `${esc(insp.signature_name)} · ${new Date(insp.submitted_at).toLocaleString('en-US', { timeZone: 'America/New_York' })}`],
    ]))

    const changes = isMoveOut ? section('Worse than at move-in', worseItems.length
      ? detailRows(worseItems.map((w, n) => [`${n + 1}`, esc(w)]))
      : detailRows([['', 'Nothing got worse than at move-in.']])) : ''

    const report = details + changes + roomTables(rooms, photoLinks, moveIn?.rooms)
    const photoNote = paths.length ? `<p style="font-size:13px;color:#8a8a82;margin-bottom:24px;">Photo links work for 30 days.</p>` : ''

    // 1. Tenant's copy
    await sendEmail({
      to: [insp.tenant_email],
      subject: `Your ${kind.toLowerCase()} inspection — ${property}`,
      html: layout(`Your ${kind.toLowerCase()} inspection`, `
        <p style="font-size:16px;line-height:1.7;color:#4a4a45;margin-bottom:24px;">
          Thank you, ${esc(insp.tenant_name.split(' ')[0])}. Here's a copy of the inspection you submitted for your records.
        </p>
        ${moveOutLink ? `
        <div style="background:#fdf8ee;border:1px solid #e8d9b0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
          <p style="font-size:15px;color:#1a1a18;font-weight:600;margin-bottom:6px;">Keep this email</p>
          <p style="font-size:15px;color:#4a4a45;line-height:1.6;">
            When you move out, use this link for your move-out inspection. It shows what you recorded today next to each item.<br>
            <a href="${moveOutLink}" style="color:#b8964a;">${moveOutLink}</a>
          </p>
        </div>` : ''}
        ${photoNote}${report}`),
    })

    // 2. Staff copy
    await sendEmail({
      to: [ADMIN_EMAIL],
      reply_to: insp.tenant_email,
      subject: `${kind} inspection: ${insp.tenant_name}, ${property}${isMoveOut ? ` — ${worseItems.length} worse` : ''}`,
      html: layout(`${kind} inspection`, `
        ${moveOutLink ? `<p style="font-size:14px;color:#4a4a45;margin-bottom:16px;">Move-out link for this tenant: <a href="${moveOutLink}" style="color:#b8964a;">${moveOutLink}</a></p>` : ''}
        <p style="font-size:13px;color:#8a8a82;margin-bottom:24px;">
          Full-size photos and the signature are in <a href="${DASHBOARD}/storage/buckets/inspection-photos" style="color:#b8964a;">Supabase Storage → inspection-photos → ${insp.id}</a>. Photo links below work for 30 days.
        </p>
        ${report}`),
    })

    // 3. One-line text
    await sendEmail({
      to: [ADMIN_SMS],
      subject: `${kind} inspection`,
      text: `${insp.tenant_name}, ${property}${isMoveOut ? `: ${worseItems.length} items worse than move-in` : ''}`,
    })

    return json({ sent: true })
  } catch (err) {
    console.error(err)
    // Let a later call try again
    if (claimed) await db.from('inspections').update({ emailed_at: null }).eq('id', claimed)
    return json({ error: 'Could not send the inspection emails.' }, 500)
  }
})
