import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { stripePromise } from '../stripe.js'

export const DOC_TYPES = [
  { key: 'photo_id', label: 'Government-issued photo ID', hint: 'Front of your driver’s license, state ID or passport' },
  { key: 'paystub', label: 'Pay stub — most recent' },
  { key: 'paystub2', label: 'Pay stub — second most recent' },
  { key: 'form1099', label: '1099 or most recent tax return' },
  { key: 'bank_statement', label: 'Bank statement — most recent' },
  { key: 'bank_statement2', label: 'Bank statement — second most recent' },
  { key: 'other', label: 'Other supporting document' },
]

const MAX_FILE_BYTES = 10 * 1024 * 1024

// Off: applicants upload a photo of their ID instead. Stripe Identity can't be used to decide housing
// eligibility unless Stripe confirms otherwise; turning this on also needs Identity activated on the
// account and the Identity permission added to the secret key.
export const STRIPE_ID_ENABLED = false

const docType = (key) => DOC_TYPES.find((d) => d.key === key)

// Follows the Employment step's status until the applicant flips the toggle themselves
export const isSelfEmployed = (data) => data.self_employed ?? data.employment_status === 'Self-employed'

// The uploads this applicant needs: a photo ID, then pay stubs, or for the self-employed a 1099
// plus bank statements (which a connected bank account replaces)
export function docsFor(data) {
  const id = STRIPE_ID_ENABLED ? [] : [{ key: 'photo_id', required: true }]
  const income = isSelfEmployed(data)
    ? [
        { key: 'form1099', required: true },
        { key: 'bank_statement', required: !data.bank },
        { key: 'bank_statement2', required: !data.bank },
      ]
    : [
        { key: 'paystub', required: true },
        { key: 'paystub2', required: true },
      ]
  return [...id, ...income, { key: 'other', required: false }].map((d) => ({ ...docType(d.key), ...d }))
}

export default function StepDocuments({ data, onChange }) {
  const files = data.files || {}
  const [busy, setBusy] = useState(null)
  const [stripeError, setStripeError] = useState({})
  const [fileError, setFileError] = useState({})
  const [dragOver, setDragOver] = useState(null)

  const addFile = (key, file) => {
    if (!file) return
    const ok = /\.(pdf|jpe?g|png)$/i.test(file.name)
    const error = !ok ? 'Please upload a PDF, JPG or PNG.'
      : file.size > MAX_FILE_BYTES ? 'That file is over 10MB. Please upload a smaller copy.'
      : null
    setFileError((e) => ({ ...e, [key]: error }))
    if (!error) onChange({ ...data, files: { ...files, [key]: file } })
  }

  const handleFile = (key) => (e) => {
    addFile(key, e.target.files[0])
    e.target.value = '' // so picking the same file again after an error still fires onChange
  }

  const dropProps = (key) => ({
    onDragOver: (e) => { e.preventDefault(); setDragOver(key) },
    onDragLeave: () => setDragOver(null),
    onDrop: (e) => { e.preventDefault(); setDragOver(null); addFile(key, e.dataTransfer.files[0]) },
  })

  // Asks a Supabase function to start a Stripe session and returns its client secret
  const startSession = async (fn) => {
    const { data: session, error } = await supabase.functions.invoke(fn, {
      body: { email: data.email, firstName: data.first_name, lastName: data.last_name },
    })
    if (error || !session?.client_secret) throw new Error(session?.error || 'Could not reach Stripe. Please try again.')
    return session
  }

  const verifyId = async () => {
    setBusy('identity')
    setStripeError((e) => ({ ...e, identity: null }))
    try {
      const session = await startSession('stripe-identity')
      const stripe = await stripePromise
      const { error } = await stripe.verifyIdentity(session.client_secret)
      if (error) {
        throw new Error(error.code === 'session_cancelled'
          ? 'ID verification wasn’t finished. Please try again.'
          : error.message)
      }
      onChange({ ...data, identity: { session_id: session.id } })
    } catch (err) {
      setStripeError((e) => ({ ...e, identity: err.message }))
    } finally {
      setBusy(null)
    }
  }

  const connectBank = async () => {
    setBusy('bank')
    setStripeError((e) => ({ ...e, bank: null }))
    try {
      const session = await startSession('stripe-bank')
      const stripe = await stripePromise
      const { financialConnectionsSession, error } = await stripe.collectFinancialConnectionsAccounts({
        clientSecret: session.client_secret,
      })
      if (error) throw new Error(error.message)
      const accounts = financialConnectionsSession?.accounts || []
      if (accounts.length === 0) return // closed without linking an account
      onChange({
        ...data,
        bank: { accounts: accounts.map((a) => ({ id: a.id, institution: a.institution_name, last4: a.last4 })) },
      })
    } catch (err) {
      setStripeError((e) => ({ ...e, bank: err.message }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="step-fields">
      <p className="step-note">
        {STRIPE_ID_ENABLED ? 'ID and bank checks are' : 'Bank connections are'} handled securely by Stripe. We never see your bank login.
      </p>

      {STRIPE_ID_ENABLED && <div className="upload-zone">
        <div className="upload-label">
          Government-issued ID
          <span className="req-badge">Required</span>
        </div>
        {data.identity ? (
          <div className="upload-success">
            <span className="upload-check">✓</span>
            <span>ID submitted for verification</span>
          </div>
        ) : (
          <div className="upload-input-label">
            <button type="button" className="upload-btn" onClick={verifyId} disabled={busy !== null}>
              {busy === 'identity' ? 'Opening…' : 'Verify my ID'}
            </button>
            <span className="upload-hint">Photo of your ID plus a quick selfie</span>
          </div>
        )}
        {stripeError.identity && <p className="upload-error">{stripeError.identity}</p>}
      </div>}

      <div className="upload-zone">
        <div className="upload-label">
          Bank account
          <span className="speed-badge">Speeds up approval</span>
        </div>
        {data.bank ? (
          <div className="upload-success">
            <span className="upload-check">✓</span>
            <span>{data.bank.accounts.map((a) => `${a.institution} ••${a.last4}`).join(', ')}</span>
            <button
              type="button"
              className="remove-btn"
              onClick={() => onChange({ ...data, bank: null })}
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="upload-input-label">
            <button type="button" className="upload-btn" onClick={connectBank} disabled={busy !== null}>
              {busy === 'bank' ? 'Opening…' : 'Connect bank account'}
            </button>
            <span className="upload-hint">Verifies your income in about a minute</span>
          </div>
        )}
        {stripeError.bank && <p className="upload-error">{stripeError.bank}</p>}
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={isSelfEmployed(data)}
          onChange={(e) => onChange({ ...data, self_employed: e.target.checked })}
        />
        I’m self-employed (upload a 1099 and bank statements instead of pay stubs)
      </label>

      <p className="step-note">
        Upload clear photos or scans. Accepted formats: PDF, JPG, PNG. Max 10MB per file.
        {isSelfEmployed(data) && data.bank && ' Bank statements are optional since you connected your bank.'}
      </p>

      {docsFor(data).map(({ key, label, hint, required }) => (
        <div key={key} className="upload-zone">
          <div className="upload-label">
            {label}
            {required && <span className="req-badge">Required</span>}
          </div>
          {files[key] ? (
            <div className="upload-success">
              <span className="upload-check">✓</span>
              <span>{files[key].name}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => {
                  const updated = { ...files }
                  delete updated[key]
                  onChange({ ...data, files: updated })
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label className={`upload-input-label ${dragOver === key ? 'drag-over' : ''}`} {...dropProps(key)}>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFile(key)}
                style={{ display: 'none' }}
              />
              <span className="upload-btn">Choose file</span>
              <span className="upload-hint">{hint || 'or drag and drop'}</span>
            </label>
          )}
          {fileError[key] && <p className="upload-error">{fileError[key]}</p>}
        </div>
      ))}
    </div>
  )
}
