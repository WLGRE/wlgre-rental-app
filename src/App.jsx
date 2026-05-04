import React, { useState } from 'react'
import { supabase } from './supabase.js'
import StepPersonal from './steps/StepPersonal.jsx'
import StepEmployment from './steps/StepEmployment.jsx'
import StepHousehold from './steps/StepHousehold.jsx'
import StepReferences from './steps/StepReferences.jsx'
import StepDocuments from './steps/StepDocuments.jsx'
import StepReview from './steps/StepReview.jsx'
import './App.css'
import logo from './WLGRE_LOGO.jpg'

const STEPS = [
  { id: 'personal',    label: 'Personal',    title: 'Personal information',   subtitle: 'Tell us about yourself' },
  { id: 'employment',  label: 'Employment',  title: 'Employment & income',    subtitle: 'Your current job and earnings' },
  { id: 'household',   label: 'Household',   title: 'Household',              subtitle: 'Who will be living with you?' },
  { id: 'references',  label: 'References',  title: 'References',             subtitle: 'Two or more non-family contacts' },
  { id: 'documents',   label: 'Documents',   title: 'Supporting documents',   subtitle: 'ID and proof of income' },
  { id: 'review',      label: 'Review',      title: 'Review & submit',        subtitle: 'One last look before you submit' },
]

const initialData = {
  first_name: '', last_name: '', email: '', phone: '',
  current_address: '', move_reason: '', desired_move_in: '',
  employer_name: '', position: '', employment_status: '',
  employer_phone: '', job_years: '', job_months: '', monthly_income: '',
  prev_employer_name: '', prev_position: '', prev_employer_phone: '',
  prev_job_years: '', prev_job_months: '',
  housing_assistance: '', assistance_type: '', assistance_amount: '',
  occupants: '', has_pets: false, pet_details: '', pet_info: {},
  household_members: [],
  personal_references: [
    { name: '', relationship: '', phone: '', email: '' },
    { name: '', relationship: '', phone: '', email: '' },
  ],
  files: {},
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function App() {
  const [step, setStep] = useState(5)
  const [data, setData] = useState(initialData)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState([])

  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  const validate = (stepIndex) => {
    const errors = []

    if (stepIndex === 0) {
      if (!data.first_name.trim()) errors.push('First name is required.')
      if (!data.last_name.trim()) errors.push('Last name is required.')
      if (!data.email.trim()) errors.push('Email is required.')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Enter a valid email address.')
      if (!data.phone.trim()) errors.push('Phone number is required.')
    }

    if (stepIndex === 1) {
      if (!data.employer_name.trim()) errors.push('Employer name is required.')
      if (!data.monthly_income) errors.push('Monthly income is required.')
      else if (isNaN(data.monthly_income) || Number(data.monthly_income) < 0) errors.push('Enter a valid monthly income.')
      if (data.job_years === '' || data.job_years === null) errors.push('Time at current job (years) is required.')
      if (data.prev_job_years === '' || data.prev_job_years === null) errors.push('Time at previous job (years) is required.')
    }

    if (stepIndex === 2) {
      if (!data.occupants) errors.push('Total occupants is required.')
      else if (isNaN(data.occupants) || Number(data.occupants) < 1) errors.push('At least 1 occupant is required.')
      const members = data.household_members || []
      members.forEach((m, i) => {
        if (!m.full_name?.trim()) errors.push(`Occupant ${i + 1} full name is required.`)
        if (!m.relationship?.trim()) errors.push(`Occupant ${i + 1} relationship is required.`)
        if (!m.age?.toString().trim()) errors.push(`Occupant ${i + 1} age is required.`)
      })
    }

    if (stepIndex === 3) {
      const validRefs = (data.personal_references || []).filter(r => r.name.trim() && r.phone.trim())
      if (validRefs.length < 2) errors.push('At least 2 references with name and phone are required.')
    }

    if (stepIndex === 4) {
      if (!data.files?.id) errors.push('Government-issued ID is required.')
      if (!data.files?.paystub) errors.push('A recent pay stub is required.')
    }

    return errors
  }

  const next = () => {
    const errors = validate(step)
    if (errors.length > 0) {
      setValidationErrors(errors)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setValidationErrors([])
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const prev = () => {
    setValidationErrors([])
    setStep((s) => Math.max(s - 1, 0))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
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

      if (data.household_members?.length > 0) {
        const { error: hmErr } = await supabase
          .from('household_members')
          .insert(data.household_members.filter(m => m.full_name).map(m => ({
            application_id: appId,
            full_name: m.full_name,
            relationship: m.relationship,
            age: m.age ? parseInt(m.age) : null,
          })))
        if (hmErr) throw hmErr
      }

      if (data.employer_name) {
        const jobTime = [
          data.job_years !== '' ? `${data.job_years} yr` : null,
          data.job_months !== '' ? `${MONTHS[data.job_months]}` : null,
        ].filter(Boolean).join(', ')

        const prevJobTime = [
          data.prev_job_years !== '' ? `${data.prev_job_years} yr` : null,
          data.prev_job_months !== '' ? `${MONTHS[data.prev_job_months]}` : null,
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
            prev_employer_name: data.prev_employer_name || null,
            prev_position: data.prev_position || null,
            prev_employer_phone: data.prev_employer_phone || null,
            prev_years_at_job: prevJobTime || null,
          })
        if (empErr) throw empErr
      }

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

      await supabase.functions.invoke('send-confirmation-email', {
        body: {
          email: data.email,
          firstName: data.first_name,
          lastName: data.last_name,
          applicationId: appId,
        }
      })

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
      <header className="app-header">
        <div className="brand-wrap">
          <img src={logo} alt="WLGRE" style={{ height: '36px', width: 'auto' }} />
          <span className="header-label">Rental Application</span>
        </div>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

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

      <main className="form-card">

        {/* Requirements rows — centered in card */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--paper-border)',
        }}>
          {[
            { label: 'Income Requirement', value: '3x Monthly Rent' },
            { label: 'Security Deposit',   value: '1x Monthly Rent' },
            { label: 'Background Check',   value: '$40 (Non-Refundable)' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              maxWidth: '340px',
              gap: '24px',
            }}>
              <span style={{ fontSize: '14px', color: 'var(--ink-muted)', textAlign: 'right', flex: 1 }}>{label}</span>
              <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--ink)', flex: 1 }}>{value}</span>
            </div>
          ))}
        </div>

        <div className="step-header">
          <h2 className="step-title">{currentStep.title}</h2>
          <p className="step-subtitle">{currentStep.subtitle}</p>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            {validationErrors.map((e, i) => (
              <p key={i} className="validation-error">⚠ {e}</p>
            ))}
          </div>
        )}

        {currentStep.id === 'personal'   && <StepPersonal    data={data} onChange={setData} />}
        {currentStep.id === 'employment' && <StepEmployment  data={data} onChange={setData} />}
        {currentStep.id === 'household'  && <StepHousehold   data={data} onChange={setData} />}
        {currentStep.id === 'references' && <StepReferences  data={data} onChange={setData} />}
        {currentStep.id === 'documents'  && <StepDocuments   data={data} onChange={setData} />}
        {currentStep.id === 'review'     && <StepReview      data={data} onNavigate={setStep} />}

        {error && <div className="error-msg">{error}</div>}

        {isLast && (
          <p className="consent-text">
            By submitting this application, I authorize WLGRE Properties to conduct a comprehensive background check, including 
            credit reports, criminal history, and eviction records. I further authorize the verification of all income, employment,
            and rental history, including contacting prior landlords and references. I certify that the information I have provided
            is true and complete, and I understand that false statements may result in the rejection of this application.
          </p>
        )}

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
