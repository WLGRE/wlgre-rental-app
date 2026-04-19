import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

const emptyRef = () => ({ name: '', relationship: '', phone: '', email: '' })

export default function StepReferences({ data, onChange }) {
  const refs = data.personal_references || [emptyRef(), emptyRef()]

  const setRef = (i, key) => (e) => {
    const updated = [...refs]
    updated[i] = { ...updated[i], [key]: e.target.value }
    onChange({ ...data, personal_references: updated })
  }

  const addRef = () => onChange({ ...data, personal_references: [...refs, emptyRef()] })

  const removeRef = (i) => {
    const updated = [...refs]
    updated.splice(i, 1)
    onChange({ ...data, personal_references: updated })
  }

  return (
    <div className="step-fields">
      <p className="step-note">Please provide at least two personal or professional references. No family members.</p>

      {refs.map((r, i) => (
        <div key={i} className="member-card">
          <div className="member-card-header">
            <span>Reference {i + 1}</span>
            {refs.length > 2 && (
              <button type="button" className="remove-btn" onClick={() => removeRef(i)}>Remove</button>
            )}
          </div>
          <Field label="Full name" required={i < 2}>
            <Input value={r.name} onChange={setRef(i, 'name')} placeholder="Reference name" />
          </Field>
          <Field label="Relationship">
            <Select value={r.relationship} onChange={setRef(i, 'relationship')}>
              <option value="">Select...</option>
              <option>Employer / supervisor</option>
              <option>Coworker</option>
              <option>Former landlord</option>
              <option>Friend</option>
              <option>Other</option>
            </Select>
          </Field>
          <div className="field-row">
            <Field label="Phone">
              <Input type="tel" value={r.phone} onChange={setRef(i, 'phone')} placeholder="(555) 000-0000" />
            </Field>
            <Field label="Email">
              <Input type="email" value={r.email} onChange={setRef(i, 'email')} placeholder="email@example.com" />
            </Field>
          </div>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={addRef}>
        + Add another reference
      </button>
    </div>
  )
}
