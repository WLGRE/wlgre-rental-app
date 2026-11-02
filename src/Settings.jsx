import React, { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import AppHeader from './components/AppHeader.jsx'
import { Field, Input } from './components/FormElements.jsx'
import { PROPERTIES, propertyLabel, loadAvailableIds } from './properties.js'

// Staff page at apply.wlgre.com/?settings: which units show in the application's dropdown.
// Saving goes through the update-units function, which checks the ADMIN_PASSWORD secret.
export default function Settings() {
  document.title = 'Settings — WLGRE'
  const [available, setAvailable] = useState(null) // ids of checked units; null while loading
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)       // { ok, message }
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAvailableIds().then(setAvailable, () => setStatus({ ok: false, message: 'Couldn’t load the units. Please refresh.' }))
  }, [])

  const toggle = (id) => (e) => {
    setStatus(null)
    setAvailable((ids) => (e.target.checked ? [...ids, id] : ids.filter((x) => x !== id)))
  }

  const save = async () => {
    setSaving(true)
    setStatus(null)
    const { error } = await supabase.functions.invoke('update-units', { body: { password, available } })
    let message = 'Saved. The application now shows only the checked units.'
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      message = body?.error || 'Could not save. Please try again.'
    }
    setStatus({ ok: !error, message })
    setSaving(false)
  }

  return (
    <div className="app-shell">
      <AppHeader title="Settings" steps={[]} step={0} done={[]} />
      <main className="form-card" style={{ marginTop: 24 }}>
        <div className="step-header">
          <h2 className="step-title">Available units</h2>
          <p className="step-subtitle">Checked units show in the application’s dropdown</p>
        </div>

        <div className="step-fields">
          {available === null ? (
            !status && <p className="step-subtitle">Loading…</p>
          ) : (
            PROPERTIES.map((p) => (
              <label key={p.id} className="checkbox-row">
                <input type="checkbox" checked={available.includes(p.id)} onChange={toggle(p.id)} />
                {propertyLabel(p)}
              </label>
            ))
          )}

          <Field label="Password" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>

          {status && <div className={status.ok ? 'step-note' : 'error-msg'}>{status.message}</div>}

          <div className="form-actions" style={{ marginTop: 8 }}>
            <button className="btn-primary" onClick={save} disabled={saving || available === null || !password}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
