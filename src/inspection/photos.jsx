import React, { useEffect, useState } from 'react'

const MAX_SIDE = 1600
const QUALITY = 0.8
export const MAX_PHOTOS_PER_ITEM = 6

async function decode(file) {
  try {
    return await createImageBitmap(file)
  } catch {
    // Older Safari can't decode a Blob with createImageBitmap
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

// Phone photos are often 3–8MB; a 1600px JPEG is plenty to show damage and uploads in a second
export async function shrinkPhoto(file) {
  const image = await decode(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read that photo.'))), 'image/jpeg', QUALITY)
  })
}

// Shows a Blob (a photo picked in this session) or a URL (a move-in photo from the server)
export function Thumb({ src, alt = '', onRemove }) {
  const [url, setUrl] = useState(typeof src === 'string' ? src : null)

  useEffect(() => {
    if (typeof src === 'string') return setUrl(src)
    if (!src) return setUrl(null)
    const objectUrl = URL.createObjectURL(src)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [src])

  if (!url) return null
  return (
    <div className="photo-thumb">
      <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={alt} /></a>
      {onRemove && (
        <button type="button" className="photo-remove" onClick={onRemove} aria-label="Remove photo">×</button>
      )}
    </div>
  )
}
