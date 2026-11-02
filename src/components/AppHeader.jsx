import React, { useState } from 'react'
import logo from '../WLG_CREST.jpg'

// Site header with the form's step links (a dropdown under the menu button on phones).
// `done` marks the steps with no required fields left.
export default function AppHeader({ title, steps, step, done }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="app-header">
      <div className="brand">
        <img className="logo" src={logo} alt="Wes Lee Group crest" />
        {title}
      </div>
      <nav className={`site-nav ${menuOpen ? 'open' : ''}`} id="siteNav" aria-label="Form steps">
        {steps.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={`nav-step ${i === step ? 'active' : ''} ${done[i] ? 'done' : ''}`}
            onClick={() => setMenuOpen(false)}
            aria-current={i === step ? 'step' : undefined}
          >
            {s.label}
          </a>
        ))}
      </nav>
      <button
        className="menu-btn"
        type="button"
        aria-label="Menu"
        aria-expanded={menuOpen}
        aria-controls="siteNav"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <svg className="menu-icon" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
    </header>
  )
}
