import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import StepPersonal from './steps/StepPersonal.jsx'
import StepEmployment from './steps/StepEmployment.jsx'
import StepHousehold from './steps/StepHousehold.jsx'
import StepReferences from './steps/StepReferences.jsx'
import StepDocuments from './steps/StepDocuments.jsx'
import StepReview from './steps/StepReview.jsx'
import './App.css'
import logo from './WLG_CREST.jpg'
import { loadFields, saveFields, loadFiles, saveFiles, clearDraft } from './draft.js'

const STEPS = [
  { id: 'personal',    label: 'Personal',    title: 'Personal information',   subtitle: 'Tell us about yourself' },
  { id: 'employment',  label: 'Employment',  title: 'Employment & income',    subtitle: 'Your current job and earnings' },
  { id: 'household',   label: 'Household',   title: 'Household',              subtitle: 'Who will be living with you?' },
  { id: 'references',  label: 'References',  title: 'References',             subtitle: 'Two or more non-family contacts' },
  { id: 'documents',   label: 'Documents',   title: 'Supporting documents',   subtitle: 'ID and your two most recent pay stubs' },
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
  identity: null,   // { session_id } once the Stripe ID check is submitted
  bank: null,       // { accounts: [{ id, institution, last4 }] } from Stripe Financial Connections
}

// DEV ONLY — test application filler. Remove before going live.
const testFile = (name) => new File(['%PDF-1.4\n% test document\n'], name, { type: 'application/pdf' })

const makeTestData = () => ({
  ...initialData,
  first_name: 'Test', last_name: 'Applicant', email: 'test@example.com', phone: '(555) 010-0100',
  current_address: '123 Test St, Nashville, TN', move_reason: 'Test application',
  desired_move_in: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  employer_name: 'Test Company', position: 'Manager', employment_status: 'Full-time',
  employer_phone: '(555) 010-0200', job_years: '3', job_months: '4', monthly_income: '6000',
  prev_employer_name: 'Previous Test Co', prev_position: 'Associate', prev_employer_phone: '(555) 010-0300',
  prev_job_years: '2', prev_job_months: '0',
  housing_assistance: false,
  occupants: '2', has_pets: true, pet_details: '', pet_info: { count: '1', type: 'Dog', breed: 'Labrador mix', weight: '45 lbs', neutered: 'yes' },
  household_members: [{ full_name: 'Test Partner', relationship: 'Spouse / partner', age: '34' }],
  personal_references: [
    { name: 'Reference One', relationship: 'Former landlord', phone: '(555) 010-0400', email: 'ref1@example.com' },
    { name: 'Reference Two', relationship: 'Coworker', phone: '(555) 010-0500', email: 'ref2@example.com' },
  ],
  files: { paystub: testFile('test-paystub.pdf'), paystub2: testFile('test-paystub-previous.pdf') },
  identity: { session_id: null }, // skips the Stripe ID check
})

// Each step has its own #hash so links and the browser's back/forward buttons move between steps
const stepFromHash = () => Math.max(0, STEPS.findIndex((s) => `#${s.id}` === window.location.hash))

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function App() {
  const [step, setStep] = useState(stepFromHash)
  const [data, setData] = useState(() => ({ ...initialData, ...loadFields() }))
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [errorStep, setErrorStep] = useState(null) // step whose missing fields are being shown
  const [menuOpen, setMenuOpen] = useState(false)
  const filesLoaded = useRef(false)

  // Restore files from an earlier visit; keep any picked before the restore finished
  useEffect(() => {
    loadFiles().then((files) => {
      if (files) setData((d) => ({ ...d, files: { ...files, ...d.files } }))
      filesLoaded.current = true
    })
  }, [])

  useEffect(() => { saveFields(data) }, [data])
  useEffect(() => { if (filesLoaded.current) saveFiles(data.files) }, [data.files])

  useEffect(() => {
    const onHashChange = () => {
      setStep(stepFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goTo = (i) => { window.location.hash = STEPS[i].id }

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
      if (!data.identity) errors.push('Please verify your ID with Stripe.')
      if (!data.files?.paystub) errors.push('Your most recent pay stub is required.')
      if (!data.files?.paystub2) errors.push('Your previous pay stub is required.')
    }

    return errors
  }

  // Recomputed on every render, so each message disappears as soon as the field is filled in
  const validationErrors = errorStep === step ? validate(step) : []

  const next = () => {
    if (validate(step).length > 0) {
      setErrorStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrorStep(null)
    goTo(Math.min(step + 1, STEPS.length - 1))
  }

  const prev = () => goTo(Math.max(step - 1, 0))

  const handleSubmit = async () => {
    // Steps can be visited in any order, so check them all and send the applicant to the first gap
    const firstIncomplete = STEPS.findIndex((_, i) => validate(i).length > 0)
    if (firstIncomplete !== -1) {
      setErrorStep(firstIncomplete)
      goTo(firstIncomplete)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      // Insert application and return only the id
      const { data: appRows, error: appErr } = await supabase
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
          identity_session_id: data.identity?.session_id ?? null,
          bank_account_ids: data.bank?.accounts.map((a) => a.id) ?? null,
          status: 'pending',
        })
        .select('id')

      if (appErr) throw appErr
      const appId = appRows[0].id

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

      clearDraft()
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
        <div className="brand">
          <img className="logo" src={logo} alt="Wes Lee Group crest" />
          Rental Application
        </div>
        <nav className={`site-nav ${menuOpen ? 'open' : ''}`} id="siteNav" aria-label="Application steps">
          {STEPS.map((s, i) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`nav-step ${i === step ? 'active' : ''} ${validate(i).length === 0 ? 'done' : ''}`}
              onClick={() => setMenuOpen(false)}
              aria-current={i === step ? 'step' : undefined}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <button
          className="menu-btn"
          type="button"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="siteNav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <svg className="menu-icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
      </header>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      <main className="form-card">

        {/* Requirements — two left-aligned columns, centered in card */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--paper-border)',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto auto',
            columnGap: '32px',
            rowGap: '10px',
            fontSize: '21px',
            lineHeight: 1.3,
          }}>
            {[
              { label: 'Income Requirement', value: '3x Monthly Rent' },
              { label: 'Security Deposit',   value: '1x Monthly Rent' },
              { label: 'Background Check',   value: '$40 (Non-Refundable)' },
            ].map(({ label, value }) => (
              <React.Fragment key={label}>
                <span style={{ color: 'var(--ink-muted)' }}>{label}</span>
                <span style={{ fontWeight: '700', color: 'var(--ink)' }}>{value}</span>
              </React.Fragment>
            ))}
          </div>
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
        {currentStep.id === 'review'     && <StepReview      data={data} onNavigate={goTo} />}

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

      {/* DEV ONLY — remove before going live */}
      {import.meta.env.DEV && (
        <button
          className="dev-test-btn"
          onClick={() => { setData(makeTestData()); setErrorStep(null); goTo(STEPS.length - 1) }}
        >
          Fill test application
        </button>
      )}
    </div>
  )
}
