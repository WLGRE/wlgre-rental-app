import React from 'react'
import { docsFor, STRIPE_ID_ENABLED } from './StepDocuments.jsx'
import { formatJobTime } from './StepEmployment.jsx'
import { unitLabel } from '../units.js'

function ReviewSection({ title, rows, onNavigate }) {
  return (
    <div className="review-section">
      <h3 className="review-section-title">
        {onNavigate ? (
          <button className="review-section-link" onClick={onNavigate}>{title}</button>
        ) : title}
      </h3>
      {rows.filter(([, v]) => v).map(([label, value]) => (
        <div key={label} className="review-row">
          <span className="review-label">{label}</span>
          <span className="review-value">{value}</span>
        </div>
      ))}
    </div>
  )
}

export default function StepReview({ data, unit, onNavigate }) {
  const refs = data.personal_references || []
  const members = data.household_members || []
  const files = data.files || {}
  const vehicles = data.vehicles || []
  const pet = data.pet_info || {}
  const petSummary = [pet.count && `${pet.count} ${pet.type || 'pet'}`, pet.breed, pet.weight].filter(Boolean).join(', ')
  const uploads = docsFor(data).filter((d) => files[d.key])

  return (
    <div className="step-fields">
      <p className="step-note">Please Review Your Information Before Submitting.</p>

      <ReviewSection title="Personal information" onNavigate={() => onNavigate(0)} rows={[
        ['Applying for', unit && unitLabel(unit)],
        ['First name', data.first_name],
        ['Last name', data.last_name],
        ['Email', data.email],
        ['Phone', data.phone],
        ['Date of birth', data.date_of_birth],
        ['SSN', data.ssn_last4 ? `•••-••-${data.ssn_last4}` : ''],
        ['Current address', data.address_street && `${data.address_street}, ${data.address_city}, ${data.address_state} ${data.address_zip}`],
        ['Move reason', [data.move_reason, data.move_reason_detail].filter(Boolean).join(' — ')],
        ['Desired move-in', data.desired_move_in && `${data.desired_move_in}${data.move_in_flexible ? ' (flexible)' : ''}`],
      ]} />

      <ReviewSection title="Employment" onNavigate={() => onNavigate(1)} rows={[
        ['Employer', data.employer_name],
        ['Position', data.position],
        ['Status', data.employment_status],
        ['Monthly income', data.monthly_income ? `$${Number(data.monthly_income).toLocaleString()}` : ''],
        ['Employer phone', data.employer_phone],
        ['Time at job', formatJobTime(data.job_years, data.job_months)],
        ['Previous employer', [data.prev_employer_name, data.prev_position].filter(Boolean).join(' — ')],
        ['Time at previous job', formatJobTime(data.prev_job_years, data.prev_job_months)],
        ['Housing assistance', data.housing_assistance === true
          ? `Yes — ${data.assistance_type}${data.assistance_amount ? `, $${Number(data.assistance_amount).toLocaleString()}/mo` : ''}`
          : data.housing_assistance === false ? 'No' : ''],
      ]} />

      <ReviewSection title="Household" onNavigate={() => onNavigate(2)} rows={[
        ['Total occupants', data.occupants],
        ['Pets', data.has_pets ? `Yes — ${petSummary || 'details not provided'}` : 'No'],
        ['Vehicles', vehicles.map((v) => `${v.year} ${v.make} ${v.model} (${v.plate})`).join(', ') || 'None'],
        ['Emergency contact', data.emergency_name && `${data.emergency_name} (${data.emergency_relationship}) · ${data.emergency_phone}`],
        ['Prior evictions', data.prior_evictions === 'yes' ? `Yes${data.eviction_details ? ` — ${data.eviction_details}` : ''}` : data.prior_evictions === 'no' ? 'No' : ''],
      ]} />

      {members.length > 0 && (
        <div className="review-section">
          <h3 className="review-section-title"><button className="review-section-link" onClick={() => onNavigate(2)}>Additional occupants</button></h3>
          {members.map((m, i) => (
            <div key={i} className="review-row">
              <span className="review-label">Occupant {i + 1}</span>
              <span className="review-value">{m.full_name} {m.relationship ? `(${m.relationship})` : ''}</span>
            </div>
          ))}
        </div>
      )}

      {refs.length > 0 && (
        <div className="review-section">
          <h3 className="review-section-title"><button className="review-section-link" onClick={() => onNavigate(3)}>References</button></h3>
          {refs.map((r, i) => (
            <div key={i} className="review-row">
              <span className="review-label">Reference {i + 1}</span>
              <span className="review-value">{r.name} {r.relationship ? `— ${r.relationship}` : ''}</span>
            </div>
          ))}
        </div>
      )}

      <div className="review-section">
        <h3 className="review-section-title">Documents</h3>
        {STRIPE_ID_ENABLED && (
          <div className="review-row">
            <span className="review-label">ID verification</span>
            <span className="review-value">{data.identity ? '✓ Submitted to Stripe' : 'Not started'}</span>
          </div>
        )}
        {data.bank && (
          <div className="review-row">
            <span className="review-label">Bank account</span>
            <span className="review-value">✓ {data.bank.accounts.map((a) => `${a.institution} ••${a.last4}`).join(', ')}</span>
          </div>
        )}
        {uploads.length === 0 ? (
          <p className="review-value" style={{ color: 'var(--ink-muted)' }}>No files uploaded</p>
        ) : (
          uploads.map(({ key, label }) => (
            <div key={key} className="review-row">
              <span className="review-label">{label}</span>
              <span className="review-value">✓ {files[key].name}</span>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
