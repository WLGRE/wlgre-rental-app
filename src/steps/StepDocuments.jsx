import React, { useState } from 'react'

const DOC_TYPES = [
  { key: 'id', label: 'Government-issued ID', required: true },
  { key: 'paystub', label: 'Recent pay stub', required: true },
  { key: 'bank', label: 'Bank statement (optional)', required: false },
  { key: 'other', label: 'Other supporting document', required: false },
]

export default function StepDocuments({ data, onChange }) {
  const files = data.files || {}

  const handleFile = (key) => (e) => {
    const file = e.target.files[0]
    if (!file) return
    onChange({ ...data, files: { ...files, [key]: file } })
  }

  return (
    <div className="step-fields">
      <p className="step-note">
        Upload clear photos or scans. Accepted formats: PDF, JPG, PNG. Max 10MB per file.
      </p>

      {DOC_TYPES.map(({ key, label, required }) => (
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
