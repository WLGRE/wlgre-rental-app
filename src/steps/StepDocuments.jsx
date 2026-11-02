import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { stripePromise } from '../stripe.js'

export const DOC_TYPES = [
  { key: 'paystub', label: 'Pay stub — most recent' },
  { key: 'paystub2', label: 'Pay stub — second most recent' },
  { key: 'form1099', label: '1099 or most recent tax return' },
  { key: 'bank_statement', label: 'Bank statement — most recent' },
  { key: 'bank_statement2', label: 'Bank statement — second most recent' },
  { key: 'other', label: 'Other supporting document' },
]

const label = (key) => DOC_TYPES.find((d) => d.key === key).label

// Follows the Employment step's status until the applicant flips the toggle themselves
export const isSelfEmployed = (data) => data.self_employed ?? data.employment_status === 'Self-employed'

// The uploads this applicant needs: pay stubs, or for the self-employed a 1099 plus bank
// statements (which a connected bank account replaces)
export function docsFor(data) {
  const docs = isSelfEmployed(data)
    ? [
        { key: 'form1099', required: true },
        { key: 'bank_statement', required: !data.bank },
        { key: 'bank_statement2', required: !data.bank },
      ]
    : [
        { key: 'paystub', required: true },
        { key: 'paystub2', required: true },
      ]
  return [...docs, { key: 'other', required: false }].map((d) => ({ ...d, label: label(d.key) }))
}

export default function StepDocuments({ data, onChange }) {
  const files = data.files || {}
  const [busy, setBusy] = useState(null)
  const [stripeError, setStripeError] = useState({})

  const handleFile = (key) => (e) => {
    const file = e.target.files[0]
    if (!file) return
    onChange({ ...data, files: { ...files, [key]: file } })
  }

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
        ID and bank checks are handled securely by Stripe. We never see your bank login.
      </p>

      <div className="upload-zone">
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
      </div>

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

      {docsFor(data).map(({ key, label, required }) => (
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
            <label className="upload-input-label">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFile(key)}
                style={{ display: 'none' }}
              />
              <span className="upload-btn">Choose file</span>
              <span className="upload-hint">or drag and drop</span>
            </label>
          )}
        </div>
      ))}
    </div>
  )
}
