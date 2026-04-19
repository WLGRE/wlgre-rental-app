import React from 'react'

export function Field({ label, required, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {required && <span className="field-req">*</span>}
      </label>
      {children}
    </div>
  )
}

export function Input({ className = '', ...props }) {
  return <input className={`form-input ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`form-select ${className}`} {...props}>
      {children}
    </select>
  )
}
