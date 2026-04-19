import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_KEY = 're_2h2yU6gC_APF1rkn3CoooaSXyj3eQjJiB'

serve(async (req) => {
  const { email, firstName } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
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

  const data = await res.json()
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})