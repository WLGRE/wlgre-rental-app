import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

export const MOVE_REASONS = ['Lease ending', 'Relocation', 'Roommate situation', 'Cost', 'Other']

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD',
  'TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

export default function StepPersonal({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })
  const setDigits = (key, max) => (e) => onChange({ ...data, [key]: e.target.value.replace(/\D/g, '').slice(0, max) })

  return (
    <div className="step-fields">
      <div className="field-row">
        <Field label="First Name" required>
          <Input value={data.first_name} onChange={set('first_name')} placeholder="John" autoComplete="given-name" />
        </Field>
        <Field label="Last Name" required>
          <Input value={data.last_name} onChange={set('last_name')} placeholder="Smith" autoComplete="family-name" />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Date Of Birth" required>
          <Input type="date" value={data.date_of_birth} onChange={set('date_of_birth')} autoComplete="bday" />
        </Field>
        <Field label="SSN (Last 4 Digits)" required>
          <Input
            value={data.ssn_last4}
            onChange={setDigits('ssn_last4', 4)}
            inputMode="numeric"
            placeholder="1234"
            autoComplete="off"
          />
        </Field>
      </div>
      <p className="field-hint">Your full SSN is collected securely during the background check.</p>
      <Field label="Email Address" required>
        <Input type="email" value={data.email} onChange={set('email')} placeholder="john@example.com" autoComplete="email" />
      </Field>
      <Field label="Phone Number" required>
        <Input type="tel" value={data.phone} onChange={set('phone')} placeholder="(555) 000-0000" autoComplete="tel" />
      </Field>

      <Field label="Street Address" required>
        <Input value={data.address_street} onChange={set('address_street')} placeholder="123 Main St, Apt 4" autoComplete="street-address" />
      </Field>
      <div className="field-row field-row-address">
        <Field label="City" required>
          <Input value={data.address_city} onChange={set('address_city')} placeholder="City" autoComplete="address-level2" />
        </Field>
        <Field label="State" required>
          <Select value={data.address_state} onChange={set('address_state')} autoComplete="address-level1">
            <option value="">—</option>
            {US_STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Zip" required>
          <Input value={data.address_zip} onChange={setDigits('address_zip', 5)} inputMode="numeric" placeholder="30303" autoComplete="postal-code" />
        </Field>
      </div>

      <Field label="Reason For Moving" required>
        <Select value={data.move_reason} onChange={set('move_reason')}>
          <option value="">Select...</option>
          {MOVE_REASONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label={data.move_reason === 'Other' ? 'Please Explain' : 'Details (Optional)'} required={data.move_reason === 'Other'}>
        <Input value={data.move_reason_detail} onChange={set('move_reason_detail')} placeholder="Anything else we should know..." />
      </Field>

      <Field label="Desired Move-In Date">
        <Input type="date" value={data.desired_move_in} onChange={set('desired_move_in')} />
      </Field>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={data.move_in_flexible}
          onChange={(e) => onChange({ ...data, move_in_flexible: e.target.checked })}
        />
        My move-in date is flexible
      </label>
    </div>
  )
}
