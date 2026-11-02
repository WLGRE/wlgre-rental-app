import React, { useEffect, useRef } from 'react'

// Draw-with-your-finger signature. Saves a PNG Blob after each stroke, and draws a saved one
// (restored after a refresh, possibly after the pad has mounted) onto a blank pad.
export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const inked = useRef(false) // the canvas already shows the signature in `value`

  useEffect(() => {
    const canvas = canvasRef.current
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1a1a2e'
  }, [])

  useEffect(() => {
    if (!value || inked.current) return
    inked.current = true
    const canvas = canvasRef.current
    createImageBitmap(value)
      .then((img) => canvas.getContext('2d').drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight))
      .catch(() => { inked.current = false; onChange(null) })
  }, [value])

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  const start = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    inked.current = true
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(...point(e))
    ctx.lineTo(...point(e)) // a tap leaves a dot
    ctx.stroke()
  }

  const move = (e) => {
    if (!drawing.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(...point(e))
    ctx.stroke()
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current.toBlob((blob) => onChange(blob), 'image/png')
  }

  const clear = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
    inked.current = false
    onChange(null)
  }

  return (
    <div className="signature">
      <canvas
        ref={canvasRef}
        className="signature-pad"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Signature pad: sign with your finger or mouse"
      />
      <div className="signature-footer">
        <span className="upload-hint">Sign above with your finger or mouse</span>
        {value && <button type="button" className="remove-btn" onClick={clear}>Clear</button>}
      </div>
    </div>
  )
}
