import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const SUPABASE_URL = 'https://hoouyjfsavketbdeipcb.supabase.co'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchTable(table: string, applicationId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?application_id=eq.${applicationId}&select=*`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  return res.json()
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:8px 0;color:#8a8a82;width:40%;border-bottom:1px solid #e4e0d8;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;color:#1a1a18;border-bottom:1px solid #e4e0d8;">${value || '—'}</td>
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const { email, firstName, lastName, applicationId } = await req.json()

  // Fetch all related data
  const [employment, household, references] = await Promise.all([
    fetchTable('employment_records', applicationId),
    fetchTable('household_members', applicationId),
    fetchTable('personal_references', applicationId),
  ])

  // Fetch main application data
  const appRes = await fetch(`${SUPABASE_URL}/rest/v1/applications?id=eq.${applicationId}&select=*`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  })
  const [app] = await appRes.json()

  // 1. Confirmation email to applicant
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WLGRE <no-reply@wlgre.com>',
      to: [email],
      subject: 'We received your rental application',
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:560px;margin:0 auto;padding:40px 24px;color:#1a1a18;">
          <div style="margin-bottom:32px;">
            <span style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#1a1a18;">WLGRE</span>
          </div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:16px;color:#1a1a18;">
            Application received, ${firstName}.
          </h1>
          <p style="font-size:16px;line-height:1.7;color:#4a4a45;margin-bottom:24px;">
            Thank you for submitting your rental application. We've received everything and will be in touch shortly to let you know next steps.
          </p>
          <div style="background:#fdf8ee;border:1px solid #e4e0d8;border-radius:12px;padding:20px 24px;margin-bottom:32px;">
            <p style="font-size:14px;color:#8a8a82;margin-bottom:4px;">What happens next</p>
            <p style="font-size:15px;color:#4a4a45;line-height:1.6;">
              Our team will review your application, verify references, and reach out within 2–3 business days. If we need anything additional, we'll contact you at this email address.
            </p>
          </div>
          <p style="font-size:14px;color:#8a8a82;">
            Questions? Reply to this email or reach us at <a href="mailto:wlgre@wlgre.com" style="color:#b8964a;">wlgre@wlgre.com</a>
          </p>
          <hr style="border:none;border-top:1px solid #e4e0d8;margin:32px 0;">
          <p style="font-size:12px;color:#8a8a82;">WLGRE Properties · wlgre.com</p>
        </div>
      `,
    }),
  })

  // Build employment section
  const emp = employment[0] || {}
  const employmentHtml = section('Employment', [
    row('Employer', emp.employer_name),
    row('Position', emp.position),
    row('Status', emp.employment_status),
    row('Monthly income', emp.monthly_income ? `$${Number(emp.monthly_income).toLocaleString()}` : ''),
    row('Employer phone', emp.employer_phone),
    row('Housing assistance', emp.housing_assistance ? 'Yes' : 'No'),
    emp.housing_assistance ? row('Assistance type', emp.assistance_type) : '',
    emp.housing_assistance ? row('Assistance amount', emp.assistance_amount ? `$${emp.assistance_amount}` : '') : '',
  ].join(''))

  // Build household section
  const householdHtml = section('Household', [
    row('Total occupants', app.occupants),
    row('Pets', app.has_pets ? 'Yes' : 'No'),
    ...(household.length > 0 ? household.map((m: any, i: number) =>
      row(`Occupant ${i + 1}`, `${m.full_name} (${m.relationship}) — DOB: ${m.date_of_birth}`)
    ) : [row('Additional occupants', 'None')]),
  ].join(''))

  // Build references section
  const referencesHtml = references.length > 0
    ? section('References', references.map((r: any, i: number) =>
        row(`Reference ${i + 1}`, `${r.name} — ${r.relationship}<br>${r.phone} · ${r.email}`)
      ).join(''))
    : section('References', row('References', 'None provided'))

  // 2. Admin notification
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WLGRE Applications <no-reply@wlgre.com>',
      to: ['james@wlgre.com', '4047989978@mymetropcs.com'],
      subject: `New application: ${firstName} ${lastName}`,
      html: `
        <div style="font-family:'DM Sans',sans-serif;max-width:600px;margin:0 auto;padding:40px 24px;color:#1a1a18;">
          <div style="margin-bottom:32px;">
            <span style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#1a1a18;">WLGRE</span>
          </div>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:24px;color:#1a1a18;">
            New rental application
          </h1>

          ${section('Personal information', [
            row('Name', `${firstName} ${lastName}`),
            row('Email', email),
            row('Phone', app.phone),
            row('Current address', app.current_address),
            row('Reason for moving', app.move_reason),
            row('Desired move-in', app.desired_move_in),
          ].join(''))}

          ${employmentHtml}
          ${householdHtml}
          ${referencesHtml}

          <hr style="border:none;border-top:1px solid #e4e0d8;margin:32px 0;">
          <p style="font-size:12px;color:#8a8a82;">WLGRE Properties · wlgre.com</p>
        </div>
      `,
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})