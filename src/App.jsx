import React, { useState } from 'react'
import { supabase } from './supabase.js'
import StepPersonal from './steps/StepPersonal.jsx'
import StepEmployment from './steps/StepEmployment.jsx'
import StepHousehold from './steps/StepHousehold.jsx'
import StepReferences from './steps/StepReferences.jsx'
import StepDocuments from './steps/StepDocuments.jsx'
import StepReview from './steps/StepReview.jsx'
import './App.css'

const STEPS = [
  { id: 'personal',    label: 'Personal',    title: 'Personal information',   subtitle: 'Tell us about yourself' },
  { id: 'employment',  label: 'Employment',  title: 'Employment & income',    subtitle: 'Your current job and earnings' },
  { id: 'household',   label: 'Household',   title: 'Household',              subtitle: 'Who will be living with you?' },
  { id: 'references',  label: 'References',  title: 'References',             subtitle: 'Two or more non-family contacts' },
  { id: 'documents',   label: 'Documents',   title: 'Supporting documents',   subtitle: 'ID and proof of income' },
  { id: 'review',      label: 'Review',      title: 'Review & submit',        subtitle: 'One last look before you submit' },
]

const initialData = {
  // Personal
  first_name: '', last_name: '', email: '', phone: '',
  current_address: '', move_reason: '', desired_move_in: '',
  // Employment
  employer_name: '', position: '', employment_status: '',
  employer_phone: '', job_years: '', job_months: '', monthly_income: '',
  housing_assistance: '', assistance_type: '', assistance_amount: '',
  // Household
  occupants: '', has_pets: false, pet_details: '', pet_info: {},
  household_members: [],
  // References
  personal_references: [
    { name: '', relationship: '', phone: '', email: '' },
    { name: '', relationship: '', phone: '', email: '' },
  ],
  // Documents
  files: {},
}

const RESEND_KEY = 're_2h2yU6gC_APF1rkn3CoooaSXyj3eQjJiB'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

async function sendConfirmationEmail(applicantEmail, firstName) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WLGRE <no-reply@wlgre.com>',
      to: [applicantEmail],
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
}

export default function App() {
  const [step, setStep] = useState(0)
  const [data, setData] = useState(initialData)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const handleSubmit = async () => {
    setSubmitting(true)
    console.log('submitting data:', JSON.stringify(data, null, 2))
    setError(null)
    try {
      // 1. Insert main application
      const { data: app, error: appErr } = await supabase
        .from('applications')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          current_address: data.current_address,
          move_reason: data.move_reason,
          desired_move_in: data.desired_move_in || null,
          occupants: data.occupants ? parseInt(data.occupants) : null,
          has_pets: data.has_pets,
          pet_details: data.pet_details,
          status: 'pending',
        })
        .select()
        .single()

      if (appErr) throw appErr
      const appId = app.id

      // 2. Insert household members
      if (data.household_members?.length > 0) {
        const { error: hmErr } = await supabase
          .from('household_members')
          .insert(data.household_members.filter(m => m.full_name).map(m => ({
            application_id: appId,
            full_name: m.full_name,
            date_of_birth: m.date_of_birth || null,
            relationship: m.relationship,
          })))
        if (hmErr) throw hmErr
      }

      // 3. Insert employment
      if (data.employer_name) {
        const jobTime = [
          data.job_years !== '' ? `${data.job_years} yr` : null,
          data.job_months !== '' ? `${MONTHS[data.job_months]}` : null,
        ].filter(Boolean).join(', ')

        const { error: empErr } = await supabase
          .from('employment_records')
          .insert({
            application_id: appId,
            employer_name: data.employer_name,
            position: data.position,
            employer_phone: data.employer_phone,
            monthly_income: data.monthly_income ? parseFloat(data.monthly_income) : null,
            employment_status: data.employment_status,
            years_at_job: jobTime || null,
          })
        if (empErr) throw empErr
      }

      // 4. Insert references
      const validRefs = (data.personal_references || []).filter(r => r.name)
      if (validRefs.length > 0) {
        const { error: refErr } = await supabase
          .from('personal_references')
          .insert(validRefs.map(r => ({
            application_id: appId,
            name: r.name,
            relationship: r.relationship,
            phone: r.phone,
            email: r.email,
          })))
        if (refErr) throw refErr
      }

      // 5. Upload documents
      const files = data.files || {}
      for (const [docType, file] of Object.entries(files)) {
        const ext = file.name.split('.').pop()
        const path = `${appId}/${docType}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('application-documents')
          .upload(path, file)
        if (uploadErr) throw uploadErr

        await supabase.from('documents').insert({
          application_id: appId,
          file_name: file.name,
          storage_path: path,
          doc_type: docType,
        })
      }

      // 6. Send confirmation email
      //await sendConfirmationEmail(data.email, data.first_name)

      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="app-shell">
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h1 className="success-title">Application submitted</h1>
          <p className="success-body">
            Thank you, {data.first_name}. We've received your application and sent a confirmation to <strong>{data.email}</strong>.
            We'll be in touch within 2–3 business days.
          </p>
        </div>
      </div>
    )
  }

  const currentStep = STEPS[step]

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrap">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="#c8a96e" fillOpacity="0.15"/>
            <path d="M7 8L10.5 18L14 11L17.5 18L21 8" stroke="#c8a96e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 20h10" stroke="#c8a96e" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="brand">WLGRE</span>
        </div>
        <span className="header-label">Rental Application</span>
      </header>

      {/* Progress bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {/* Step pills */}
      <div className="step-pills">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`step-pill ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
          >
            <span className="pill-num">{i < step ? '✓' : i + 1}</span>
            <span className="pill-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Form card */}
      <main className="form-card">
        <div className="step-header">
          <h2 className="step-title">{currentStep.title}</h2>
          <p className="step-subtitle">{currentStep.subtitle}</p>
        </div>

        {currentStep.id === 'personal'   && <StepPersonal    data={data} onChange={setData} />}
        {currentStep.id === 'employment' && <StepEmployment  data={data} onChange={setData} />}
        {currentStep.id === 'household'  && <StepHousehold   data={data} onChange={setData} />}
        {currentStep.id === 'references' && <StepReferences  data={data} onChange={setData} />}
        {currentStep.id === 'documents'  && <StepDocuments   data={data} onChange={setData} />}
        {currentStep.id === 'review'     && <StepReview      data={data} />}

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          {!isFirst && (
            <button className="btn-secondary" onClick={prev} disabled={submitting}>
              Back
            </button>
          )}
          {!isLast ? (
            <button className="btn-primary" onClick={next}>
              Continue
            </button>
          ) : (
            <button className="btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
      </main>

      <footer className="app-footer">
        Step {step + 1} of {STEPS.length} &nbsp;·&nbsp; WLGRE Properties
      </footer>
    </div>
  )
}
