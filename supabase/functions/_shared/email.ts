// Sending and laying out emails through Resend, in the same look as the application emails.

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')!

export const REPLY_TO = 'wlgre@wlgre.com'
export const ADMIN_EMAIL = 'james@wlgre.com'
export const ADMIN_SMS = '4047989978@mymetropcs.com'

// Anything that came from a tenant is escaped before going into the HTML
export function esc(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

// label/value rows; value is already-escaped HTML
export function detailRows(rows: [string, string][]) {
  return rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 0;color:#8a8a82;width:40%;border-bottom:1px solid #e4e0d8;vertical-align:top;">${esc(label)}</td>
      <td style="padding:8px 0;color:#1a1a18;border-bottom:1px solid #e4e0d8;">${value || '—'}</td>
    </tr>`).join('')
}

export function section(title: string, tableHtml: string) {
  return `
    <div style="margin-bottom:24px;">
      <p style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#8a8a82;margin:0 0 12px;">${esc(title)}</p>
      <div style="background:#fdf8ee;border:1px solid #e4e0d8;border-radius:12px;padding:16px 20px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">${tableHtml}</table>
      </div>
    </div>`
}

export function layout(heading: string, body: string) {
  return `
    <div style="font-family:'DM Sans',sans-serif;max-width:640px;margin:0 auto;padding:40px 24px;color:#1a1a18;">
      <div style="margin-bottom:32px;">
        <span style="font-family:'Playfair Display',Georgia,serif;font-size:24px;color:#1a1a18;">WLGRE</span>
      </div>
      <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:28px;font-weight:400;margin-bottom:24px;color:#1a1a18;">
        ${heading}
      </h1>
      ${body}
      <hr style="border:none;border-top:1px solid #e4e0d8;margin:32px 0;">
      <p style="font-size:12px;color:#8a8a82;">WLGRE Properties · wlgre.com · Questions? <a href="mailto:${REPLY_TO}" style="color:#b8964a;">${REPLY_TO}</a></p>
    </div>`
}

export async function sendEmail(email: Record<string, unknown>) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: 'WLGRE <no-reply@wlgre.com>', reply_to: REPLY_TO, ...email }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`Resend: ${JSON.stringify(body)}`)
  return body
}
