import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

export default function StepPersonal({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })

  return (
    <div className="step-fields">
      <div className="field-row">
        <Field label="First Name" required>
          <Input value={data.first_name} onChange={set('first_name')} placeholder="John" />
        </Field>
        <Field label="Last Name" required>
          <Input value={data.last_name} onChange={set('last_name')} placeholder="Smith" />
        </Field>
      </div>
      <Field label="Email Address" required>
        <Input type="email" value={data.email} onChange={set('email')} placeholder="john@example.com" />
      </Field>
      <Field label="Phone Number" required>
        <Input type="tel" value={data.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
      </Field>
      <Field label="Current Address" required>
        <Input value={data.current_address} onChange={set('current_address')} placeholder="123 Main St, City, State" />
      </Field>
      <Field label="Reason For Moving" required>
        <Input value={data.move_reason} onChange={set('move_reason')} placeholder="Describe your reason for moving..." />
      </Field>
      <Field label="Desired Move-In Date">
        <Input type="date" value={data.desired_move_in} onChange={set('desired_move_in')} />
      </Field>
    </div>
  )
}
