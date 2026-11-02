import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase.js'
import { createDraft } from '../draft.js'
import AppHeader from '../components/AppHeader.jsx'
import { Field, Input } from '../components/FormElements.jsx'
import RoomList, { itemDone, roomDone } from './RoomList.jsx'
import SignaturePad from './SignaturePad.jsx'
import { standardRooms, roomsFromMoveIn } from './rooms.js'
import { findProperty, propertyLabel } from '../properties.js'
import '../App.css'
import './Inspection.css'

// A move-in opens from the link staff make at /?invite, whose ?unit=<id> sets the (locked) unit and
// its rooms. The link in the move-in email has ?ref=<token> instead, for the move-out.
const params = new URLSearchParams(window.location.search)
const REF = params.get('ref')
const IS_MOVE_OUT = REF !== null
const PROPERTY = IS_MOVE_OUT ? null : findProperty(params.get('unit'))
const KIND = IS_MOVE_OUT ? 'Move-Out' : 'Move-In'
const draft = createDraft(IS_MOVE_OUT ? 'wlgre-inspection-out' : 'wlgre-inspection-in')
document.title = `${KIND} Inspection — WLGRE`

const STEPS = [
  { id: 'details', label: 'Details', title: `${KIND} inspection`, subtitle: 'Who you are and which home this is for' },
  { id: 'rooms',   label: 'Rooms',   title: 'Room by room',          subtitle: 'The condition of each item, with photos' },
  { id: 'sign',    label: 'Sign',    title: 'Review & sign',         subtitle: 'Check the summary, then sign and submit' },
]

const today = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local time

const initialData = {
  tenant_name: '', tenant_email: '', tenant_phone: '',
  property_id: '', property_address: '', unit: '', inspection_date: today(),
  forwarding_address: '',
  rooms: [],
  general_notes: '',
  signature_name: '', agree: false,
  files: {}, // photo id → Blob, plus `signature`
}

const stepFromHash = () => Math.max(0, STEPS.findIndex((s) => `#${s.id}` === window.location.hash))

const CONDITION_RANK = { good: 0, fair: 1, poor: 2, damaged: 3 }
const gotWorse = (before, after) =>
  before in CONDITION_RANK && after in CONDITION_RANK && CONDITION_RANK[after] > CONDITION_RANK[before]

async function lookupMoveIn(token) {
  const { data, error } = await supabase.functions.invoke('inspection-lookup', { body: { token } })
  if (!error) return data
  const body = await error.context?.json?.().catch(() => null)
  throw new Error(body?.error || 'We couldn’t load your move-in inspection. Please check your connection and reload.')
}

// Runs the uploads a few at a time, reporting how many are done
async function uploadAll(uploads, onProgress) {
  let done = 0
  const queue = [...uploads]
  const worker = async () => {
    for (let u = queue.shift(); u; u = queue.shift()) {
      const { error } = await supabase.storage.from('inspection-photos').upload(u.path, u.blob, { contentType: u.blob.type })
      // A retry after a dropped connection re-sends files that already made it
      if (error && !/exists|duplicate/i.test(error.message)) throw error
      onProgress(++done)
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
}

export default function InspectionApp() {
  const [step, setStep] = useState(stepFromHash)
  const [data, setData] = useState(() => {
    const saved = { ...initialData, ...draft.loadFields() }
    if (!PROPERTY) return saved
    // A move-in draft for a different unit starts over
    const start = saved.property_id === PROPERTY.id ? saved : initialData
    return {
      ...start,
      property_id: PROPERTY.id,
      property_address: PROPERTY.address,
      rooms: start.rooms.length > 0 ? start.rooms : standardRooms(PROPERTY),
    }
  })
  const [moveIn, setMoveIn] = useState(null)
  const [lookupError, setLookupError] = useState(null)
  const [errorStep, setErrorStep] = useState(null)
  const [submitting, setSubmitting] = useState(null) // progress message while submitting
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const filesLoaded = useRef(false)
  const ids = useRef(null) // { id, token } kept across retries so a retry doesn't duplicate photos

  // Restore photos from an earlier visit, dropping any the browser didn't keep
  useEffect(() => {
    draft.loadFiles().then((saved) => {
      setData((d) => {
        const files = { ...saved, ...d.files }
        const rooms = d.rooms.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i, photos: i.photos.filter((p) => files[p]) })) }))
        return { ...d, files, rooms }
      })
      filesLoaded.current = true
    })
  }, [])

  useEffect(() => { draft.saveFields(data) }, [data])
  useEffect(() => { if (filesLoaded.current) draft.saveFiles(data.files) }, [data.files])

  // Move-out: load the move-in this link belongs to, and start from its rooms and tenant details
  useEffect(() => {
    if (!IS_MOVE_OUT) return
    lookupMoveIn(REF).then((found) => {
      setMoveIn(found)
      setData((d) => d.rooms.length > 0 ? d : {
        ...d,
        tenant_name: found.tenant_name,
        tenant_email: found.tenant_email,
        tenant_phone: found.tenant_phone || '',
        property_address: found.property_address,
        unit: found.unit || '',
        rooms: roomsFromMoveIn(found.rooms),
      })
    }, (err) => setLookupError(err.message))
  }, [])

  useEffect(() => {
    const onHashChange = () => {
      setStep(stepFromHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const goTo = (i) => { window.location.hash = STEPS[i].id }

  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }))

  const validate = (stepIndex) => {
    const errors = []
    if (stepIndex === 0) {
      if (!data.tenant_name.trim()) errors.push('Your full name is required.')
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.tenant_email)) errors.push('Enter a valid email address.')
      if (!data.tenant_phone.trim()) errors.push('Phone number is required.')
      if (!data.inspection_date) errors.push('Inspection date is required.')
      if (IS_MOVE_OUT && !data.forwarding_address.trim()) errors.push('Forwarding address is required.')
    }
    if (stepIndex === 1) {
      if (data.rooms.length === 0) errors.push('Add at least one room.')
      data.rooms.filter((r) => !roomDone(r)).forEach((r) => {
        const left = r.items.filter((i) => !itemDone(i)).length
        errors.push(`${r.name}: ${left} ${left === 1 ? 'item needs' : 'items need'} a rating${r.items.some((i) => i.condition && !itemDone(i)) ? ' or a note' : ''}.`)
      })
    }
    if (stepIndex === 2) {
      if (!data.files.signature) errors.push('Please sign in the box.')
      if (!data.signature_name.trim()) errors.push('Type your full name under your signature.')
      if (!data.agree) errors.push('Please confirm the report is accurate.')
    }
    return errors
  }

  const done = STEPS.map((_, i) => validate(i).length === 0)
  const percentComplete = Math.round((done.filter(Boolean).length / STEPS.length) * 100)
  const validationErrors = errorStep === step ? validate(step) : []
  const isLast = step === STEPS.length - 1

  const next = () => {
    if (validate(step).length > 0) {
      setErrorStep(step)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setErrorStep(null)
    goTo(step + 1)
  }

  const handleSubmit = async () => {
    const firstIncomplete = STEPS.findIndex((_, i) => validate(i).length > 0)
    if (firstIncomplete !== -1) {
      setErrorStep(firstIncomplete)
      goTo(firstIncomplete)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setError(null)
    ids.current ??= { id: crypto.randomUUID(), token: IS_MOVE_OUT ? null : crypto.randomUUID() }
    const { id, token } = ids.current
    const path = (photoId) => `${id}/${photoId}.jpg`

    try {
      const uploads = [
        ...data.rooms.flatMap((r) => r.items.flatMap((i) => i.photos.map((p) => ({ path: path(p), blob: data.files[p] })))),
        { path: `${id}/signature.png`, blob: data.files.signature },
      ]
      setSubmitting(`Uploading photos… 0 of ${uploads.length}`)
      await uploadAll(uploads, (n) => setSubmitting(`Uploading photos… ${n} of ${uploads.length}`))

      setSubmitting('Saving…')
      const { error: insertErr } = await supabase.from('inspections').insert({
        id,
        kind: IS_MOVE_OUT ? 'move_out' : 'move_in',
        move_in_id: moveIn?.id ?? null,
        access_token: token,
        tenant_name: data.tenant_name.trim(),
        tenant_email: data.tenant_email.trim(),
        tenant_phone: data.tenant_phone.trim(),
        property_address: data.property_address.trim(),
        unit: data.unit.trim() || null,
        inspection_date: data.inspection_date,
        forwarding_address: IS_MOVE_OUT ? data.forwarding_address.trim() : null,
        rooms: data.rooms.map((r) => ({
          name: r.name,
          items: r.items.map((i) => ({ name: i.name, condition: i.condition, notes: i.notes.trim(), photos: i.photos.map(path) })),
        })),
        general_notes: data.general_notes.trim() || null,
        signature_name: data.signature_name.trim(),
        signature_path: `${id}/signature.png`,
      })
      if (insertErr) {
        const duplicate = insertErr.code === '23505'
        // Saved by an earlier attempt whose reply got lost: carry on and send the emails
        if (!(duplicate && insertErr.message.includes('inspections_pkey'))) {
          throw duplicate ? new Error('A move-out inspection has already been submitted for this home.') : insertErr
        }
      }

      const { error: emailErr } = await supabase.functions.invoke('send-inspection-email', { body: { inspectionId: id } })
      if (emailErr) console.error(emailErr) // saved either way; staff still see it in the dashboard

      draft.clearDraft()
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(null)
    }
  }

  if (submitted) {
    return (
      <div className="app-shell">
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h1 className="success-title">Inspection submitted</h1>
          <p className="success-body">
            Thank you, {data.tenant_name.split(' ')[0]}. We’ve emailed a copy to <strong>{data.tenant_email}</strong>.{' '}
            {IS_MOVE_OUT
              ? 'We’ll be in touch about your security deposit.'
              : 'Please keep that email: it has your link for the move-out inspection when you leave.'}
          </p>
        </div>
      </div>
    )
  }

  if (!IS_MOVE_OUT && !PROPERTY) {
    return (
      <div className="app-shell">
        <AppHeader title={`${KIND} Inspection`} steps={[]} step={0} done={[]} />
        <div className="success-screen">
          <p className="success-body">
            Please open the inspection link your property manager sent you.<br />
            Don’t have it? Email <a href="mailto:wlgre@wlgre.com">wlgre@wlgre.com</a>.
          </p>
        </div>
      </div>
    )
  }

  if (IS_MOVE_OUT && !moveIn) {
    return (
      <div className="app-shell">
        <AppHeader title={`${KIND} Inspection`} steps={[]} step={0} done={[]} />
        <div className="success-screen">
          <p className="success-body">
            {lookupError
              ? <>{lookupError}<br />Questions? Email <a href="mailto:wlgre@wlgre.com">wlgre@wlgre.com</a>.</>
              : 'Loading your move-in inspection…'}
          </p>
        </div>
      </div>
    )
  }

  const current = STEPS[step]
  const items = data.rooms.flatMap((r) => r.items)
  const photoCount = items.reduce((n, i) => n + i.photos.length, 0)
  const issues = items.filter((i) => i.condition === 'poor' || i.condition === 'damaged').length
  const worse = moveIn
    ? data.rooms.reduce((n, r, ri) => n + r.items.filter((i, ii) => gotWorse(moveIn.rooms[ri]?.items[ii]?.condition, i.condition)).length, 0)
    : 0

  return (
    <div className="app-shell">
      <AppHeader title={`${KIND} Inspection`} steps={STEPS} step={step} done={done} />

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentComplete}%` }} />
      </div>
      <div className="progress-label">
        <span>Step {step + 1} of {STEPS.length} · {current.label}</span>
        <span>{percentComplete}% complete</span>
      </div>

      <main className="form-card">
        <div className="step-header">
          <h2 className="step-title">{current.title}</h2>
          <p className="step-subtitle">{current.subtitle}</p>
        </div>

        {validationErrors.length > 0 && (
          <div className="validation-errors">
            {validationErrors.map((e, i) => <p key={i} className="validation-error">⚠ {e}</p>)}
          </div>
        )}

        {current.id === 'details' && (
          <div className="step-fields">
            <Field label="Full Name" required>
              <Input value={data.tenant_name} onChange={set('tenant_name')} placeholder="John Smith" autoComplete="name" />
            </Field>
            <div className="field-row">
              <Field label="Email" required>
                <Input type="email" value={data.tenant_email} onChange={set('tenant_email')} placeholder="john@example.com" autoComplete="email" />
              </Field>
              <Field label="Phone" required>
                <Input type="tel" value={data.tenant_phone} onChange={set('tenant_phone')} placeholder="(555) 000-0000" autoComplete="tel" />
              </Field>
            </div>

            <div className="section-divider"><span>Property</span></div>
            <Field label="Property">
              <Input value={PROPERTY ? propertyLabel(PROPERTY) : [data.property_address, data.unit].filter(Boolean).join(', ')} disabled />
            </Field>
            <Field label={`${KIND} Date`} required>
              <Input type="date" value={data.inspection_date} onChange={set('inspection_date')} />
            </Field>

            {IS_MOVE_OUT && (
              <>
                <p className="field-hint">Moved in on {moveIn.inspection_date}.</p>
                <Field label="Forwarding Address" required>
                  <Input value={data.forwarding_address} onChange={set('forwarding_address')} placeholder="Where we should send your security deposit" autoComplete="street-address" />
                </Field>
              </>
            )}
          </div>
        )}

        {current.id === 'rooms' && (
          <RoomList data={data} onChange={setData} moveIn={moveIn} showErrors={errorStep === step} />
        )}

        {current.id === 'sign' && (
          <div className="step-fields">
            <div className="review-section">
              <h3 className="review-section-title">Summary</h3>
              {[
                ['Property', [data.property_address, data.unit].filter(Boolean).join(', ')],
                [`${KIND} date`, data.inspection_date],
                ['Rooms', data.rooms.length],
                ['Items rated', `${items.filter(itemDone).length} of ${items.length}`],
                ['Poor or damaged', issues],
                ...(IS_MOVE_OUT ? [['Worse than at move-in', worse], ['Forwarding address', data.forwarding_address]] : []),
                ['Photos', photoCount],
              ].map(([label, value]) => (
                <div key={label} className="review-row">
                  <span className="review-label">{label}</span>
                  <span className="review-value">{value}</span>
                </div>
              ))}
            </div>

            <Field label="Anything Else We Should Know?">
              <textarea
                className="form-input"
                rows={3}
                value={data.general_notes}
                onChange={set('general_notes')}
                placeholder="Optional"
              />
            </Field>

            <div className="section-divider"><span>Signature</span></div>
            <SignaturePad
              value={data.files.signature}
              onChange={(blob) => setData((d) => {
                const { signature, ...rest } = d.files
                return { ...d, files: blob ? { ...rest, signature: blob } : rest }
              })}
            />
            <Field label="Type Your Full Name" required>
              <Input value={data.signature_name} onChange={set('signature_name')} placeholder={data.tenant_name || 'Full name'} />
            </Field>
            <label className="checkbox-row">
              <input type="checkbox" checked={data.agree} onChange={(e) => setData((d) => ({ ...d, agree: e.target.checked }))} />
              I confirm this report accurately describes the condition of the property on the date above, to the best of my knowledge.
            </label>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        <div className="form-actions">
          {step > 0 && (
            <button className="btn-secondary" onClick={() => goTo(step - 1)} disabled={!!submitting}>Back</button>
          )}
          {!isLast ? (
            <button className="btn-primary" onClick={next}>Save &amp; Continue</button>
          ) : (
            <button className="btn-primary btn-submit" onClick={handleSubmit} disabled={!!submitting}>
              {submitting || 'Submit inspection'}
            </button>
          )}
        </div>
      </main>

      <footer className="app-footer">WLGRE Properties</footer>
    </div>
  )
}
