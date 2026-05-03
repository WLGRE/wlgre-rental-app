import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

export default function StepPersonal({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })

  return (
    <div className="step-fields">

      <div className="info-box" style={{
        background: '#fdf8ee',
        border: '1px solid #e4e0d8',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '24px',
        fontSize: '14px',
        color: '#4a4a45',
        lineHeight: '1.7',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
          <div><span style={{ color: '#8a8a82' }}>Income Requirement</span><br /><strong>3x Monthly Rent</strong></div>
          <div><span style={{ color: '#8a8a82' }}>Security Deposit</span><br /><strong>1x Monthly Rent</strong></div>
        </div>
      </div>

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
        <Input value={data.move_reason} onChange={set('move_reason')} placeholder="Describe your reason for moving..." />
      </Field>
      <Field label="Desired move-in date">
        <Input type="date" value={data.desired_move_in} onChange={set('desired_move_in')} />
      </Field>
    </div>
  )
}
