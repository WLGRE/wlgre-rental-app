import React from 'react'

// Shared footer: contact, a privacy reassurance, and the Equal Housing Opportunity mark
export default function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="footer-name">WLGRE Properties</div>
      <div>
        Questions? <a href="mailto:wlgre@wlgre.com">wlgre@wlgre.com</a>
      </div>
      <div className="footer-line">
        <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        Your information is sent securely and kept private.
      </div>
      <div className="footer-line">
        <svg className="footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 11 12 4l9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M9 13h6M9 16h6" />
        </svg>
        Equal Housing Opportunity
      </div>
      <div className="footer-copy">© {new Date().getFullYear()} WLGRE Properties</div>
    </footer>
  )
}
