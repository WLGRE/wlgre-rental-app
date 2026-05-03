import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

const emptyMember = () => ({ full_name: '', relationship: '', age: '' })

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
  const hasPets = data.has_pets === true || data.has_pets === 'true'

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

      {hasPets && (
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
      )}

      <div className="section-divider">
        <span>Additional occupants</span>
      </div>

      {members.map((m, i) => (
        <div key={i} className="member-card">
          <div className="member-card-header">
            <span>Occupant {i + 1}</span>
            <button type="button" className="remove-btn" onClick={() => removeMember(i)}>Remove</button>
          </div>
          <Field label="Full name" required>
            <Input value={m.full_name} onChange={setMember(i, 'full_name')} placeholder="Full name" />
          </Field>
          <div className="field-row">
            <Field label="Relationship" required>
              <Select value={m.relationship} onChange={setMember(i, 'relationship')}>
                <option value="">Select...</option>
                <option>Spouse / partner</option>
                <option>Child</option>
                <option>Parent</option>
                <option>Roommate</option>
                <option>Other</option>
              </Select>
            </Field>
            <Field label="Age" required>
              <Input
                type="number"
                min="0"
                max="120"
                value={m.age ?? ''}
                onChange={setMember(i, 'age')}
                placeholder="Age"
              />
            </Field>
          </div>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={addMember}>
        + Add occupant
      </button>
    </div>
  )
}
