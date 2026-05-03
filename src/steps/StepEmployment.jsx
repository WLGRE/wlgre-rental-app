import React from 'react'
import { Field, Input, Select } from '../components/FormElements.jsx'

const YEARS = Array.from({ length: 31 }, (_, i) => i)

export default function StepEmployment({ data, onChange }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value })
  const setBool = (key) => (e) => onChange({ ...data, [key]: e.target.value === 'true' })

  return (
    <div className="step-fields">

      {/* Current Job */}
      <Field label="Employer name" required>
        <Input value={data.employer_name} onChange={set('employer_name')} placeholder="Company name" />
      </Field>
      <div className="field-row">
        <Field label="Position / title">
          <Input value={data.position} onChange={set('position')} placeholder="Job title" />
        </Field>
        <Field label="Employment status">
          <Select value={data.employment_status} onChange={set('employment_status')}>
            <option value="">Select...</option>
            <option>Full-time</option>
            <option>Part-time</option>
            <option>Self-employed</option>
            <option>Retired</option>
            <option>Other income source</option>
          </Select>
        </Field>
      </div>

      <Field label="Employer phone">
        <Input type="tel" value={data.employer_phone} onChange={set('employer_phone')} placeholder="(555) 000-0000" />
      </Field>

      <Field label="Time at current job" required>
        <div className="field-row" style={{ marginTop: 0 }}>
          <Select value={data.job_years ?? ''} onChange={set('job_years')}>
            <option value="">Years</option>
            {YEARS.map(y => (
              <option key={y} value={y}>{y === 0 ? 'Less than 1 year' : y === 30 ? '30+ years' : `${y} ${y === 1 ? 'year' : 'years'}`}</option>
            ))}
          </Select>
          <Select value={data.job_months ?? ''} onChange={set('job_months')}>
            <option value="">Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i === 1 ? '1 month' : `${i} months`}</option>
            ))}
          </Select>
        </div>
      </Field>

      <Field label="Gross Monthly Income" required>
        <Input
          type="number"
          value={data.monthly_income}
          onChange={set('monthly_income')}
          placeholder="0.00"
          min="0"
          step="100"
        />
      </Field>

      {/* Previous Job */}
      <div className="section-divider"><span>Previous employment</span></div>

      <Field label="Previous employer name">
        <Input value={data.prev_employer_name ?? ''} onChange={set('prev_employer_name')} placeholder="Company name" />
      </Field>
      <div className="field-row">
        <Field label="Previous position / title">
          <Input value={data.prev_position ?? ''} onChange={set('prev_position')} placeholder="Job title" />
        </Field>
        <Field label="Previous employer phone">
          <Input type="tel" value={data.prev_employer_phone ?? ''} onChange={set('prev_employer_phone')} placeholder="(555) 000-0000" />
        </Field>
      </div>

      <Field label="Time at previous job" required>
        <div className="field-row" style={{ marginTop: 0 }}>
          <Select value={data.prev_job_years ?? ''} onChange={set('prev_job_years')}>
            <option value="">Years</option>
            {YEARS.map(y => (
              <option key={y} value={y}>{y === 0 ? 'Less than 1 year' : y === 30 ? '30+ years' : `${y} ${y === 1 ? 'year' : 'years'}`}</option>
            ))}
          </Select>
          <Select value={data.prev_job_months ?? ''} onChange={set('prev_job_months')}>
            <option value="">Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i === 1 ? '1 month' : `${i} months`}</option>
            ))}
          </Select>
        </div>
      </Field>

      {/* Housing assistance */}
      <div className="section-divider"><span>Housing assistance</span></div>

      <Field label="Are you currently receiving housing assistance?">
        <Select value={String(data.housing_assistance ?? '')} onChange={setBool('housing_assistance')}>
          <option value="">Select...</option>
          <option value="false">No</option>
          <option value="true">Yes</option>
        </Select>
      </Field>

      {data.housing_assistance === true && (
        <>
          <Field label="Program / voucher type">
            <Select value={data.assistance_type ?? ''} onChange={set('assistance_type')}>
              <option value="">Select...</option>
              <option>Section 8 / Housing Choice Voucher</option>
              <option>HUD housing</option>
              <option>Veterans Affairs (VASH)</option>
              <option>State or local program</option>
              <option>Other</option>
            </Select>
          </Field>
          <Field label="Monthly stipend / voucher amount">
            <Input
              type="number"
              value={data.assistance_amount ?? ''}
              onChange={set('assistance_amount')}
              placeholder="0.00"
              min="0"
              step="50"
            />
          </Field>
        </>
      )}
    </div>
  )
}
