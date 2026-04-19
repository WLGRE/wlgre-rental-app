import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

export default function StepPersonal({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })

  return (
    <div className="step-fields">
      <div className="field-row">
        <Field label="First name" required>
          <Input value={data.first_name} onChange={set('first_name')} placeholder="John" />
        </Field>
        <Field label="Last name" required>
          <Input value={data.last_name} onChange={set('last_name')} placeholder="Smith" />
        </Field>
      </div>
      <Field label="Email address" required>
        <Input type="email" value={data.email} onChange={set('email')} placeholder="john@example.com" />
      </Field>
      <Field label="Phone number">
        <Input type="tel" value={data.phone} onChange={set('phone')} placeholder="(555) 000-0000" />
      </Field>
      <Field label="Current address">
        <Input value={data.current_address} onChange={set('current_address')} placeholder="123 Main St, City, State" />
      </Field>
      <Field label="Reason for moving">
        <Select value={data.move_reason} onChange={set('move_reason')}>
          <option value="">Select a reason...</option>
          <option>Lease ending</option>
          <option>Relocating</option>
          <option>Upgrading / downsizing</option>
          <option>First rental</option>
          <option>Other</option>
        </Select>
      </Field>
      <Field label="Desired move-in date">
        <Input type="date" value={data.desired_move_in} onChange={set('desired_move_in')} />
      </Field>
    </div>
  )
}
