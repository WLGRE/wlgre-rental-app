import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

const emptyMember = () => ({ full_name: '', date_of_birth: '', relationship: '' })

export default function StepHousehold({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })

  const setMember = (i, key) => (e) => {
    const members = [...(data.household_members || [])]
    members[i] = { ...members[i], [key]: e.target.value }
    onChange({ ...data, household_members: members })
  }

  const addMember = () => {
    onChange({ ...data, household_members: [...(data.household_members || []), emptyMember()] })
  }

  const removeMember = (i) => {
    const members = [...(data.household_members || [])]
    members.splice(i, 1)
    onChange({ ...data, household_members: members })
  }

  const setPet = (key) => (e) => onChange({ ...data, pet_info: { ...(data.pet_info || {}), [key]: e.target.value } })
  const petInfo = data.pet_info || {}
  const members = data.household_members || []

  return (
    <div className="step-fields">
      <div className="field-row">
        <Field label="Total occupants" required>
          <Input type="number" min="1" max="10" value={data.occupants} onChange={set('occupants')} placeholder="1" />
        </Field>
        <Field label="Pets?">
          <Select value={data.has_pets} onChange={(e) => onChange({ ...data, has_pets: e.target.value === 'true' })}>
            <option value="false">No pets</option>
            <option value="true">Yes — I have pets</option>
          </Select>
        </Field>
      </div>

      {data.has_pets === true || data.has_pets === 'true' ? (
        <>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            backgroundColor: '#fef9ec',
            border: '1px solid #f0d080',
            borderRadius: '8px',
            padding: '14px 16px',
            marginBottom: '4px',
          }}>
            <span style={{ fontSize: '18px', lineHeight: 1 }}>🐾</span>
            <div style={{ fontSize: '14px', color: '#6b5a1e', lineHeight: '1.6' }}>
              <strong>Pet fees apply to this property.</strong>
              <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                <li><strong>Pet deposit:</strong> $400 (one-time, refundable)</li>
                <li><strong>Pet rent:</strong> $50/month (added to your monthly rent)</li>
              </ul>
              <p style={{ margin: '8px 0 0 0', color: '#8a7230' }}>
              //  Note: Verified service animals and emotional support animals are exempt from pet fees per Fair Housing law.
              </p>
            </div>
          </div>

          <div className="member-card">
            <div className="member-card-header"><span>Pet details</span></div>
            <div className="field-row">
              <Field label="Number of pets">
                <Input type="number" min="1" max="10" value={petInfo.count ?? ''} onChange={setPet('count')} placeholder="1" />
              </Field>
              <Field label="Type(s) of pet">
                <Select value={petInfo.type ?? ''} onChange={setPet('type')}>
                  <option value="">Select...</option>
                  <option>Dog</option>
                  <option>Cat</option>
                  <option>Dog & cat</option>
                  <option>Bird</option>
                  <option>Other</option>
                </Select>
              </Field>
            </div>
            <div className="field-row">
              <Field label="Breed(s)">
                <Input value={petInfo.breed ?? ''} onChange={setPet('breed')} placeholder="e.g. Labrador mix" />
              </Field>
              <Field label="Combined weight">
                <Input value={petInfo.weight ?? ''} onChange={setPet('weight')} placeholder="e.g. 45 lbs" />
              </Field>
            </div>
            <Field label="Are all pets spayed / neutered?">
              <Select value={petInfo.neutered ?? ''} onChange={setPet('neutered')}>
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="some">Some are</option>
              </Select>
            </Field>
            <Field label="Additional notes (temperament, service animal, etc.)">
              <Input value={petInfo.notes ?? ''} onChange={setPet('notes')} placeholder="Any additional info..." />
            </Field>
          </div>
        </>
      ) : null}

      <div className="section-divider">
        <span>Additional occupants</span>
      </div>

      {members.map((m, i) => (
        <div key={i} className="member-card">
          <div className="member-card-header">
            <span>Occupant {i + 1}</span>
            <button type="button" className="remove-btn" onClick={() => removeMember(i)}>Remove</button>
          </div>
          <div className="field-row">
            <Field label="Full name">
              <Input value={m.full_name} onChange={setMember(i, 'full_name')} placeholder="Full name" />
            </Field>
            <Field label="Relationship">
              <Select value={m.relationship} onChange={setMember(i, 'relationship')}>
                <option value="">Select...</option>
                <option>Spouse / partner</option>
                <option>Child</option>
                <option>Parent</option>
                <option>Roommate</option>
                <option>Other</option>
              </Select>
            </Field>
          </div>
          <Field label="Date of birth">
            <Input type="date" value={m.date_of_birth} onChange={setMember(i, 'date_of_birth')} />
          </Field>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={addMember}>
        + Add occupant
      </button>
    </div>
  )
}
