import React, { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase.js'
import StepPersonal from './steps/StepPersonal.jsx'
import StepEmployment, { formatJobTime } from './steps/StepEmployment.jsx'
import StepHousehold from './steps/StepHousehold.jsx'
import StepReferences from './steps/StepReferences.jsx'
import StepDocuments, { docsFor, isSelfEmployed, STRIPE_ID_ENABLED } from './steps/StepDocuments.jsx'
import StepReview from './steps/StepReview.jsx'
import './App.css'
import AppHeader from './components/AppHeader.jsx'
import { Field, Select } from './components/FormElements.jsx'
import { loadUnits, unitLabel } from './units.js'
import { loadFields, saveFields, loadFiles, saveFiles, clearDraft } from './draft.js'

// Household includes references; the last step has the uploads, then the review summary and submit
const STEPS = [
  { id: 'personal',    label: 'About you',  title: 'Personal information',   subtitle: 'Tell us about yourself' },
  { id: 'employment',  label: 'Income',     title: 'Employment & income',    subtitle: 'Your current job and earnings' },
  { id: 'household',   label: 'Household',  title: 'Household',              subtitle: 'Who will live with you, and your references' },
  { id: 'documents',   label: 'Documents',  title: 'Documents & submit',     subtitle: 'ID and proof of income, then one last look' },
]

const initialData = {
  property_id: '',
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', ssn_last4: '',
  address_street: '', address_city: '', address_state: '', address_zip: '',
  move_reason: '', move_reason_detail: '', desired_move_in: '', move_in_flexible: false,
  employer_name: '', position: '', employment_status: '',
  employer_phone: '', job_years: '', job_months: '', monthly_income: '',
  prev_employer_name: '', prev_position: '', prev_employer_phone: '',
  prev_job_years: '', prev_job_months: '',
  housing_assistance: '', assistance_type: '', assistance_amount: '',
  occupants: '', has_pets: false, pet_details: '', pet_info: {},
  household_members: [],
  vehicles: [],
  emergency_name: '', emergency_relationship: '', emergency_phone: '',
  prior_evictions: '', eviction_details: '',
  personal_references: [
    { name: '', relationship: '', phone: '', email: '' },
    { name: '', relationship: '', phone: '', email: '' },
  ],
  self_employed: null, // null = follow the Employment step's status
  files: {},
  identity: null,   // { session_id } once the Stripe ID check is submitted
  bank: null,       // { accounts: [{ id, institution, last4 }] } from Stripe Financial Connections
}

// DEV ONLY — test application filler. Remove before going live.
const testFile = (name) => new File(['%PDF-1.4\n% test document\n'], name, { type: 'application/pdf' })

const makeTestData = () => ({
  ...initialData,
  property_id: '831',
  first_name: 'Test', last_name: 'Applicant', email: 'test@example.com', phone: '(555) 010-0100',
  date_of_birth: '1990-01-15', ssn_last4: '0000',
  address_street: '123 Test St', address_city: 'Nashville', address_state: 'TN', address_zip: '37201',
  move_reason: 'Relocation', move_reason_detail: 'Test application', move_in_flexible: true,
  desired_move_in: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
  employer_name: 'Test Company', position: 'Manager', employment_status: 'Full-time',
  employer_phone: '(555) 010-0200', job_years: '3', job_months: '4', monthly_income: '6000',
  prev_employer_name: 'Previous Test Co', prev_position: 'Associate', prev_employer_phone: '(555) 010-0300',
  prev_job_years: '2', prev_job_months: '0',
  housing_assistance: false,
  occupants: '2', has_pets: true, pet_details: '', pet_info: { count: '1', type: 'Dog', breed: 'Labrador mix', weight: '45 lbs', neutered: 'yes' },
  household_members: [{ full_name: 'Test Partner', relationship: 'Spouse / partner', age: '34' }],
  vehicles: [{ year: '2020', make: 'Toyota', model: 'Camry', plate: 'TEST123' }],
  emergency_name: 'Emergency Contact', emergency_relationship: 'Sister', emergency_phone: '(555) 010-0600',
  prior_evictions: 'no',
  personal_references: [
    { name: 'Reference One', relationship: 'Former landlord', phone: '(555) 010-0400', email: 'ref1@example.com' },
    { name: 'Reference Two', relationship: 'Coworker', phone: '(555) 010-0500', email: 'ref2@example.com' },
  ],
  files: { photo_id: testFile('test-id.pdf'), paystub: testFile('test-paystub.pdf'), paystub2: testFile('test-paystub-previous.pdf') },
  identity: STRIPE_ID_ENABLED ? { session_id: null } : null, // skips the Stripe ID check
})

// Each step has its own #hash so links and the browser's back/forward buttons move between steps
const stepFromHash = () => Math.max(0, STEPS.findIndex((s) => `#${s.id}` === window.location.hash))

export default function App() {
  const [step, setStep] = useState(stepFromHash)
  const [data, setData] = useState(() => ({ ...initialData, ...loadFields() }))
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [errorStep, setErrorStep] = useState(null) // step whose missing fields are being shown
  const [units, setUnits] = useState(null) // units marked available on the settings page; null while loading
  const [unitsError, setUnitsError] = useState(false)
  const filesLoaded = useRef(false)

  // Restore files from an earlier visit; keep any picked before the restore finished
  useEffect(() => {
    loadFiles().then((files) => {
      if (files) setData((d) => ({ ...d, files: { ...files, ...d.files } }))
      filesLoaded.current = true
    })
  }, [])

  useEffect(() => {
    loadUnits({ availableOnly: true }).then(setUnits, () => setUnitsError(true))
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

  // The chosen unit, if it's still offered (a saved draft may name one that's since been taken off)
  const selectedUnit = units?.find((u) => u.id === data.property_id)

  const validate = (stepIndex) => {
    const errors = []

    if (stepIndex === 0) {
      if (!selectedUnit) errors.push('Choose the unit you’re applying for.')
      if (!data.first_name.trim()) errors.push('First name is required.')
      if (!data.last_name.trim()) errors.push('Last name is required.')
      if (!data.email.trim()) errors.push('Email is required.')
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Enter a valid email address.')
      if (!data.phone.trim()) errors.push('Phone number is required.')
      if (!data.date_of_birth) errors.push('Date of birth is required.')
      if (!/^\d{4}$/.test(data.ssn_last4)) errors.push('Enter the last 4 digits of your SSN.')
      if (!data.address_street.trim()) errors.push('Street address is required.')
      if (!data.address_city.trim()) errors.push('City is required.')
      if (!data.address_state) errors.push('State is required.')
      if (!/^\d{5}$/.test(data.address_zip)) errors.push('Enter a 5-digit zip code.')
      if (!data.move_reason) errors.push('Reason for moving is required.')
      else if (data.move_reason === 'Other' && !data.move_reason_detail.trim()) errors.push('Please explain your reason for moving.')
    }

    if (stepIndex === 1) {
      if (!data.employer_name.trim()) errors.push('Employer name is required.')
      if (!data.monthly_income) errors.push('Monthly income is required.')
      else if (isNaN(data.monthly_income) || Number(data.monthly_income) < 0) errors.push('Enter a valid monthly income.')
      if (data.job_years === '' || data.job_years === null) errors.push('Time at current job (years) is required.')
      if (data.prev_job_years === '' || data.prev_job_years === null) errors.push('Time at previous job (years) is required.')
      if (data.housing_assistance === true) {
        if (!data.assistance_type) errors.push('Housing assistance program is required.')
        if (data.assistance_amount === '' || isNaN(data.assistance_amount) || Number(data.assistance_amount) < 0) errors.push('Enter your monthly voucher amount.')
      }
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
      ;(data.vehicles || []).forEach((v, i) => {
        if (!/^\d{4}$/.test(v.year)) errors.push(`Vehicle ${i + 1} year is required.`)
        if (!v.make.trim()) errors.push(`Vehicle ${i + 1} make is required.`)
        if (!v.model.trim()) errors.push(`Vehicle ${i + 1} model is required.`)
        if (!v.plate.trim()) errors.push(`Vehicle ${i + 1} license plate is required.`)
      })
      if (!data.emergency_name.trim()) errors.push('Emergency contact name is required.')
      if (!data.emergency_relationship.trim()) errors.push('Emergency contact relationship is required.')
      if (!data.emergency_phone.trim()) errors.push('Emergency contact phone is required.')
      if (!data.prior_evictions) errors.push('Please answer the eviction question.')
      const validRefs = (data.personal_references || []).filter(r => r.name.trim() && r.phone.trim())
      if (validRefs.length < 2) errors.push('At least 2 references with name and phone are required.')
    }

    if (stepIndex === 3) {
      if (STRIPE_ID_ENABLED && !data.identity) errors.push('Please verify your ID with Stripe.')
      docsFor(data).forEach((d) => {
        if (d.required && !data.files?.[d.key]) errors.push(`${d.label} is required.`)
      })
    }

    return errors
  }

  // Share of the steps with no required fields left
  const percentComplete = Math.round(
    (STEPS.filter((_, i) => validate(i).length === 0).length / STEPS.length) * 100,
  )

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
      // The id is made here because the public key can add applications but not read them back
      const appId = crypto.randomUUID()
      const { error: appErr } = await supabase
        .from('applications')
        .insert({
          id: appId,
          property_address: selectedUnit.address,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          date_of_birth: data.date_of_birth,
          ssn_last4: data.ssn_last4,
          // Full address kept in current_address too, for the email and anything else that reads it
          current_address: `${data.address_street}, ${data.address_city}, ${data.address_state} ${data.address_zip}`,
          address_street: data.address_street,
          address_city: data.address_city,
          address_state: data.address_state,
          address_zip: data.address_zip,
          move_reason: data.move_reason,
          move_reason_detail: data.move_reason_detail || null,
          desired_move_in: data.desired_move_in || null,
          move_in_flexible: data.move_in_flexible,
          occupants: data.occupants ? parseInt(data.occupants) : null,
          has_pets: data.has_pets,
          pet_details: data.pet_details,
          pet_info: data.has_pets ? data.pet_info : null,
          vehicles: data.vehicles,
          emergency_name: data.emergency_name,
          emergency_relationship: data.emergency_relationship,
          emergency_phone: data.emergency_phone,
          prior_evictions: data.prior_evictions === 'yes',
          eviction_details: data.prior_evictions === 'yes' ? data.eviction_details || null : null,
          self_employed: isSelfEmployed(data),
          identity_session_id: data.identity?.session_id ?? null,
          bank_account_ids: data.bank?.accounts.map((a) => a.id) ?? null,
          status: 'pending',
        })

      if (appErr) throw appErr

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
        const jobTime = formatJobTime(data.job_years, data.job_months)
        const prevJobTime = formatJobTime(data.prev_job_years, data.prev_job_months)
        const assisted = data.housing_assistance === true

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
            housing_assistance: assisted,
            assistance_type: assisted ? data.assistance_type : null,
            assistance_amount: assisted ? parseFloat(data.assistance_amount) : null,
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

      // Only the uploads that apply (switching the self-employed toggle leaves the other set behind)
      const files = data.files || {}
      for (const { key: docType } of docsFor(data)) {
        const file = files[docType]
        if (!file) continue
        const ext = file.name.split('.').pop()
        const path = `${appId}/${docType}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('application-documents')
          .upload(path, file)
        if (uploadErr) throw uploadErr

        const { error: docErr } = await supabase.from('documents').insert({
          application_id: appId,
          file_name: file.name,
          storage_path: path,
          doc_type: docType,
        })
        if (docErr) throw docErr
      }

      // The function looks up the applicant's name and email from the saved application
      await supabase.functions.invoke('send-confirmation-email', {
        body: { applicationId: appId },
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
      <AppHeader
        title="Rental Application"
        steps={STEPS}
        step={step}
        done={STEPS.map((_, i) => validate(i).length === 0)}
      />

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentComplete}%` }} />
      </div>
      <div className="progress-label">
        <span>Step {step + 1} of {STEPS.length} · {STEPS[step].label}</span>
        <span>{percentComplete}% complete</span>
      </div>

      <main className="form-card">

        {/* Requirements — two left-aligned columns, centered in card (stacked on phones) */}
        <div className="requirements">
          <div className="requirements-grid">
            {[
              { label: 'Income Requirement', value: '3x Monthly Rent' },
              { label: 'Security Deposit',   value: '1x Monthly Rent' },
              { label: 'Background Check',   value: '$40 (Non-Refundable)' },
            ].map(({ label, value }) => (
              <React.Fragment key={label}>
                <span className="requirements-label">{label}</span>
                <span className="requirements-value">{value}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="property-pick">
          <Field label="Unit You’re Applying For" required>
            <Select value={data.property_id} onChange={(e) => setData((d) => ({ ...d, property_id: e.target.value }))}>
              <option value="">
                {unitsError ? 'Couldn’t load units. Please refresh.' : units === null ? 'Loading units…' : 'Select a unit...'}
              </option>
              {(units || []).map((u) => <option key={u.id} value={u.id}>{unitLabel(u)}</option>)}
            </Select>
          </Field>
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
        {currentStep.id === 'household' && (
          <>
            <StepHousehold data={data} onChange={setData} />
            <div className="section-divider step-section"><span>References</span></div>
            <StepReferences data={data} onChange={setData} />
          </>
        )}
        {currentStep.id === 'documents' && (
          <>
            <StepDocuments data={data} onChange={setData} />
            <div className="section-divider step-section"><span>Review</span></div>
            <StepReview data={data} unit={selectedUnit} onNavigate={goTo} />
          </>
        )}

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
              Save &amp; Continue
            </button>
          ) : (
            <button className="btn-primary btn-submit" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit application'}
            </button>
          )}
        </div>
      </main>

      <footer className="app-footer">
        WLGRE Properties
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
