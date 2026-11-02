import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL = 'https://hoouyjfsavketbdeipcb.supabase.co'
const REPLY_TO = 'wlgre@wlgre.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DOC_LABELS: Record<string, string> = {
  photo_id: 'Photo ID',
  paystub: 'Pay stub — most recent',
  paystub2: 'Pay stub — second most recent',
  form1099: '1099 or tax return',
  bank_statement: 'Bank statement — most recent',
  bank_statement2: 'Bank statement — second most recent',
  other: 'Other supporting document',
}

async function fetchRows(table: string, filter: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}&select=*`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) throw new Error(`Could not read ${table}: ${await res.text()}`)
  return res.json()
}

// Everything below comes from the applicant, so it is escaped before going into the HTML
function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

// value may be several lines, given as an array
function row(label: string, value: unknown) {
  const lines = (Array.isArray(value) ? value : [value]).filter((v) => v !== null && v !== undefined && v !== '')
  return `
    <tr>
      <td style="padding:8px 0;color:#8a8a82;width:40%;border-bottom:1px solid #e4e0d8;vertical-align:top;">${esc(label)}</td>
      <td style="padding:8px 0;color:#1a1a18;border-bottom:1px solid #e4e0d8;">${lines.map(esc).join('<br>') || '—'}</td>
    </tr>`
}

function section(title: string, content: string) {
  return `
    <div style="margin-bottom:24px;">
      <p style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#8a8a82;margin:0 0 12px;">${title}</p>
      <div style="background:#fdf8ee;border:1px solid #e4e0d8;border-radius:12px;padding:20px 24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${content}</table>
      </div>
    </div>`
}

const money = (n: unknown) => (n === null || n === undefined || n === '' ? '' : `$${Number(n).toLocaleString()}`)
const join = (parts: unknown[], sep = ' — ') => parts.filter(Boolean).join(sep)

async function sendEmail(email: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reply_to: REPLY_TO, ...email }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Resend: ${JSON.stringify(body)}`)
  return body
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    // Only the id comes from the browser; who to email is read from the saved application,
    // so this function can't be used to send mail to arbitrary addresses
    const { applicationId } = await req.json()
    if (typeof applicationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
      return respond({ error: 'Invalid application id' }, 400)
    }

    const byApp = `application_id=eq.${applicationId}`
    const [[app], employment, household, references, documents] = await Promise.all([
      fetchRows('applications', `id=eq.${applicationId}`),
      fetchRows('employment_records', byApp),
      fetchRows('household_members', byApp),
      fetchRows('personal_references', byApp),
      fetchRows('documents', byApp),
    ])
    if (!app) return respond({ error: 'Application not found' }, 404)

    // 1. Confirmation email to applicant
    await sendEmail({
      from: 'WLGRE <no-reply@wlgre.com>',
      to: [app.email],
      subject: 'We received your rental application',
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1a1a18;">
          <div style="margin-bottom:32px;">
            <span style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#1a1a18;">WLGRE</span>
          </div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:16px;color:#1a1a18;">
            Application received, ${esc(app.first_name)}.
          </h1>
          <p style="font-size:16px;line-height:1.7;color:#4a4a45;margin-bottom:24px;">
            Thank you for submitting your rental application${app.property_address ? ` for ${esc(app.property_address)}` : ''}. We've received everything and will be in touch shortly to let you know next steps.
          </p>
          <div style="background:#fdf8ee;border:1px solid #e4e0d8;border-radius:12px;padding:20px 24px;margin-bottom:32px;">
            <p style="font-size:14px;color:#8a8a82;margin-bottom:4px;">What happens next</p>
            <p style="font-size:15px;color:#4a4a45;line-height:1.6;">
              Our team will review your application, verify references, and reach out within 2–3 business days. If we need anything additional, we'll contact you at this email address.
            </p>
          </div>
          <p style="font-size:14px;color:#8a8a82;">
            Questions? Reply to this email or reach us at <a href="mailto:${REPLY_TO}" style="color:#b8964a;">${REPLY_TO}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e4e0d8;margin:32px 0;">
          <p style="font-size:12px;color:#8a8a82;">WLGRE Properties · wlgre.com</p>
        </div>
      `,
    })

    // Build employment section
    const emp = employment[0] || {}
    const employmentHtml = section('Employment', [
      row('Employer', emp.employer_name),
      row('Position', emp.position),
      row('Status', emp.employment_status),
      row('Time at job', emp.years_at_job),
      row('Monthly income', money(emp.monthly_income)),
      row('Employer phone', emp.employer_phone),
      row('Previous employer', [join([emp.prev_employer_name, emp.prev_position]), emp.prev_employer_phone, emp.prev_years_at_job]),
      row('Housing assistance', emp.housing_assistance ? join([emp.assistance_type, emp.assistance_amount != null && `${money(emp.assistance_amount)}/mo`]) || 'Yes' : 'No'),
    ].join(''))

    // Build household section
    const pet = app.pet_info || {}
    const householdHtml = section('Household', [
      row('Total occupants', app.occupants),
      row('Pets', app.has_pets
        ? [join([pet.count && `${pet.count} ${pet.type || 'pet'}`, pet.breed, pet.weight], ', ') || 'Yes',
           pet.neutered && `Spayed / neutered: ${pet.neutered}`, pet.notes]
        : 'No'),
      row('Vehicles', (app.vehicles || []).map((v: any) => `${v.year} ${v.make} ${v.model} (${v.plate})`).join(', ') || 'None'),
      ...(household.length > 0 ? household.map((m: any, i: number) =>
        row(`Occupant ${i + 1}`, `${m.full_name} (${m.relationship})${m.age != null ? `, age ${m.age}` : ''}`)
      ) : [row('Additional occupants', 'None')]),
    ].join(''))

    // Build references section
    const referencesHtml = references.length > 0
      ? section('References', references.map((r: any, i: number) =>
          row(`Reference ${i + 1}`, [join([r.name, r.relationship]), join([r.phone, r.email], ' · ')])
        ).join(''))
      : section('References', row('References', 'None provided'))

    // Build verification & documents section
    const documentsHtml = section('Verification & documents', [
      app.identity_session_id ? row('Stripe ID check', `Submitted (${app.identity_session_id})`) : '',
      row('Bank account', app.bank_account_ids?.length ? `Connected via Stripe (${app.bank_account_ids.join(', ')})` : 'Not connected'),
      row('Income documents', app.self_employed ? '1099 + bank statements (self-employed)' : 'Pay stubs'),
      ...documents.map((d: any) => row(DOC_LABELS[d.doc_type] || d.doc_type, d.file_name)),
    ].join(''))

    // 2. Admin notification
    const data = await sendEmail({
      from: 'WLGRE Applications <no-reply@wlgre.com>',
      to: ['james@wlgre.com', '4047989978@mymetropcs.com'],
      reply_to: app.email,
      subject: `New application: ${app.first_name} ${app.last_name}${app.property_address ? ` — ${app.property_address}` : ''}`,
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;color:#1a1a18;">
          <div style="margin-bottom:32px;">
            <span style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#1a1a18;">WLGRE</span>
          </div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:24px;color:#1a1a18;">
            New rental application
          </h1>

          ${section('Personal information', [
            row('Applying for', app.property_address),
            row('Name', `${app.first_name} ${app.last_name}`),
            row('Email', app.email),
            row('Phone', app.phone),
            row('Date of birth', app.date_of_birth),
            row('Current address', app.current_address),
            row('Reason for moving', join([app.move_reason, app.move_reason_detail])),
            row('Desired move-in', app.desired_move_in ? `${app.desired_move_in}${app.move_in_flexible ? ' (flexible)' : ''}` : ''),
            row('Emergency contact', app.emergency_name ? `${app.emergency_name} (${app.emergency_relationship}) · ${app.emergency_phone}` : ''),
            row('Prior evictions', app.prior_evictions ? join(['Yes', app.eviction_details]) : 'No'),
          ].join(''))}

          ${employmentHtml}
          ${householdHtml}
          ${referencesHtml}
          ${documentsHtml}

          <hr style="border:none;border-top:1px solid #e4e0d8;margin:32px 0;">
          <p style="font-size:12px;color:#8a8a82;">WLGRE Properties · wlgre.com</p>
        </div>
      `,
    })

    return respond(data)
  } catch (err) {
    console.error(err)
    return respond({ error: 'Could not send confirmation email.' }, 500)
  }
})
