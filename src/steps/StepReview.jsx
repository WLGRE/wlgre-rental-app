import React from 'react'

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

export default function StepReview({ data, onNavigate }) {
  const refs = data.personal_references || []
  const members = data.household_members || []
  const files = data.files || {}

  return (
    <div className="step-fields">
      <p className="step-note">Please Review Your Information Before Submitting.</p>

      <ReviewSection title="Personal information" onNavigate={() => onNavigate(0)} rows={[
        ['First name', data.first_name],
        ['Last name', data.last_name],
        ['Email', data.email],
        ['Phone', data.phone],
        ['Current address', data.current_address],
        ['Move reason', data.move_reason],
        ['Desired move-in', data.desired_move_in],
      ]} />

      <ReviewSection title="Employment" onNavigate={() => onNavigate(1)} rows={[
        ['Employer', data.employer_name],
        ['Position', data.position],
        ['Status', data.employment_status],
        ['Monthly income', data.monthly_income ? `$${Number(data.monthly_income).toLocaleString()}` : ''],
        ['Employer phone', data.employer_phone],
        ['Years at job', data.years_at_job],
      ]} />

      <ReviewSection title="Household" onNavigate={() => onNavigate(2)} rows={[
        ['Total occupants', data.occupants],
        ['Pets', data.has_pets ? `Yes — ${data.pet_details || 'details not provided'}` : 'No'],
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
        {Object.entries(files).length === 0 ? (
          <p className="review-value" style={{ color: 'var(--ink-muted)' }}>No files uploaded</p>
        ) : (
          Object.entries(files).map(([key, file]) => (
            <div key={key} className="review-row">
              <span className="review-label">{key}</span>
              <span className="review-value">✓ {file.name}</span>
            </div>
          ))
        )}
      </div>

    </div>
  )
}
