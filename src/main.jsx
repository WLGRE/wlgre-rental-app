import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import Settings from './Settings.jsx'
import './index.css'

// /?settings is the staff page for which units are available; everything else is the application
const isSettings = new URLSearchParams(window.location.search).has('settings')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSettings ? <Settings /> : <App />}
  </React.StrictMode>
)
