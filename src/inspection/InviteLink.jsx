import React, { useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import { Field, Select } from '../components/FormElements.jsx'
import { PROPERTIES, propertyLabel } from '../properties.js'

// Staff page at inspection.wlgre.com/?invite: makes a tenant's move-in link for one unit, which the
// tenant sees locked. It only makes a link, so it needs no login.
export default function InviteLink() {
  document.title = 'Inspection Link — WLGRE'
  const [unit, setUnit] = useState('')
  const [copied, setCopied] = useState(false)

  const link = `${window.location.origin}/?unit=${unit}`
  const message = `Please complete your move-in inspection within 3 days of moving in: ${link}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy this link:', link)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader title="Inspection Link" steps={[]} step={0} done={[]} />
      <main className="form-card" style={{ marginTop: 24 }}>
        <div className="step-header">
          <h2 className="step-title">Send a move-in inspection</h2>
          <p className="step-subtitle">The tenant sees this unit filled in and can’t change it</p>
        </div>

        <div className="step-fields">
          <Field label="Unit" required>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="">Select a unit...</option>
              {PROPERTIES.map((p) => <option key={p.id} value={p.id}>{propertyLabel(p)}</option>)}
            </Select>
          </Field>

          {unit && (
            <>
              <div className="invite-link">{link}</div>
              <div className="invite-actions">
                <button type="button" className="btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
                <a className="btn-secondary" href={`sms:?&body=${encodeURIComponent(message)}`}>Text it</a>
                <a className="btn-secondary" href={`mailto:?subject=${encodeURIComponent('Your move-in inspection')}&body=${encodeURIComponent(message)}`}>Email it</a>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
