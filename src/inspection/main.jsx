import React from 'react'
import ReactDOM from 'react-dom/client'
import InspectionApp from './InspectionApp.jsx'
import InviteLink from './InviteLink.jsx'
import '../index.css'

// /?invite is the staff page that makes a tenant's link; everything else is the inspection itself
const isInvite = new URLSearchParams(window.location.search).has('invite')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isInvite ? <InviteLink /> : <InspectionApp />}
  </React.StrictMode>
)
