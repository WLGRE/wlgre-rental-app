import React, { useState } from 'react'
import logo from '../WLG_CREST.jpg'

// Site header: the title centered with the crest after its first word ("Rental [crest] Application"),
// and the form's step links in a dropdown under the menu button. `done` marks the steps with no
// required fields left. Pages without steps get no menu button.
export default function AppHeader({ title, steps, step, done }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [first, ...rest] = title.split(' ')
  const crest = <img className="logo" src={logo} alt="" />

  return (
    <header className="app-header">
      <div className="brand" aria-label={title}>
        {rest.length > 0 ? <>{first}{crest}{rest.join(' ')}</> : <>{crest}{title}</>}
      </div>
      {steps.length > 0 && (
        <>
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
        </>
      )}
    </header>
  )
}
