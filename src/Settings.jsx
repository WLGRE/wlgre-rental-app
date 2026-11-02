import React, { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import AppHeader from './components/AppHeader.jsx'
import { Field, Input, Select } from './components/FormElements.jsx'
import { loadUnits, newUnitId, BED_COUNTS, BATH_COUNTS, LEVELS } from './units.js'

// Staff page at apply.wlgre.com/?settings: add, edit and remove units, and choose which show in the
// application's dropdown. Everything is saved at once through the update-units function, which
// checks the ADMIN_PASSWORD secret.
const blankUnit = () => ({ id: null, address: '', beds: 2, baths: 2, level: 'ground', available: true })

export default function Settings() {
  document.title = 'Settings — WLGRE'
  const [units, setUnits] = useState(null)   // null while loading; new units have id: null until saved
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null) // { ok, message }
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    loadUnits().then(setUnits, () => setStatus({ ok: false, message: 'Couldn’t load the units. Please refresh.' }))
  }, [])

  const change = (fn) => {
    setUnits(fn)
    setDirty(true)
    setStatus(null)
  }
  const setField = (i, key, value) => change((list) => list.map((u, j) => (j === i ? { ...u, [key]: value } : u)))
  const addUnit = () => change((list) => [...list, blankUnit()])
  const removeUnit = (i) => {
    const u = units[i]
    if (u.id && !window.confirm(`Remove ${u.address}? It will disappear from the application and the inspection invite page.`)) return
    change((list) => list.filter((_, j) => j !== i))
  }

  const save = async () => {
    const addresses = units.map((u) => u.address.trim().toLowerCase())
    if (addresses.some((a) => !a)) return setStatus({ ok: false, message: 'Every unit needs an address.' })
    if (new Set(addresses).size !== addresses.length) return setStatus({ ok: false, message: 'Two units have the same address.' })
    if (units.length === 0) return setStatus({ ok: false, message: 'Keep at least one unit.' })

    // New units get a readable id from their address, used in inspection links
    const taken = units.filter((u) => u.id).map((u) => u.id)
    const withIds = units.map((u) => {
      if (u.id) return u
      const id = newUnitId(u.address, taken)
      taken.push(id)
      return { ...u, id }
    })

    setSaving(true)
    setStatus(null)
    const { error } = await supabase.functions.invoke('update-units', { body: { password, units: withIds } })
    if (error) {
      const body = await error.context?.json?.().catch(() => null)
      setStatus({ ok: false, message: body?.error || 'Could not save. Please try again.' })
    } else {
      setUnits(withIds)
      setDirty(false)
      setStatus({ ok: true, message: 'Saved. The application and inspection pages now use this list.' })
    }
    setSaving(false)
  }

  return (
    <div className="app-shell">
      <AppHeader title="Settings" steps={[]} step={0} done={[]} />
      <main className="form-card" style={{ marginTop: 24 }}>
        <div className="step-header">
          <h2 className="step-title">Units</h2>
          <p className="step-subtitle">Available units show in the application’s dropdown</p>
        </div>

        <div className="step-fields">
          {units === null ? (
            !status && <p className="step-subtitle">Loading…</p>
          ) : (
            <>
              {units.map((u, i) => (
                <div key={u.id ?? `new-${i}`} className="member-card">
                  <div className="member-card-header">
                    <span>{u.address.trim() || 'New unit'}</span>
                    <button type="button" className="remove-btn" onClick={() => removeUnit(i)}>Remove</button>
                  </div>
                  <Field label="Address" required>
                    <Input value={u.address} onChange={(e) => setField(i, 'address', e.target.value)} placeholder="839 Willow Pointe Dr" />
                  </Field>
                  <div className="field-row">
                    <Field label="Bedrooms">
                      <Select value={u.beds} onChange={(e) => setField(i, 'beds', Number(e.target.value))}>
                        {BED_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    </Field>
                    <Field label="Bathrooms">
                      <Select value={u.baths} onChange={(e) => setField(i, 'baths', Number(e.target.value))}>
                        {BATH_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Level">
                    <Select value={u.level} onChange={(e) => setField(i, 'level', e.target.value)}>
                      {LEVELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </Select>
                  </Field>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={u.available} onChange={(e) => setField(i, 'available', e.target.checked)} />
                    Available: show in the application’s dropdown
                  </label>
                </div>
              ))}
              <button type="button" className="add-btn" onClick={addUnit}>+ Add unit</button>
            </>
          )}

          <div className="section-divider"><span>Save changes</span></div>
          <Field label="Password" required>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </Field>

          {status && <div className={status.ok ? 'step-note' : 'error-msg'}>{status.message}</div>}

          <div className="form-actions" style={{ marginTop: 8 }}>
            <button className="btn-primary" onClick={save} disabled={saving || units === null || !password || !dirty}>
              {saving ? 'Saving…' : dirty ? 'Save' : 'No changes'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
