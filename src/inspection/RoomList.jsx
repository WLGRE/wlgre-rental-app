import React, { useState } from 'react'
import { CONDITIONS, ADDABLE_ROOMS, ROOM_TYPES, conditionLabel, needsNote, makeRoom } from './rooms.js'
import { shrinkPhoto, Thumb, MAX_PHOTOS_PER_ITEM } from './photos.jsx'

export const itemDone = (item) => item.condition !== '' && (!needsNote(item.condition) || item.notes.trim() !== '')
export const roomDone = (room) => room.items.every(itemDone)

// Applies fn to one item, returning new data (fn gets the item, returns the changed fields)
const withItem = (d, roomId, i, fn) => ({
  ...d,
  rooms: d.rooms.map((r) => r.id !== roomId ? r : {
    ...r,
    items: r.items.map((item, j) => (j === i ? { ...item, ...fn(item) } : item)),
  }),
})

// onChange is a state setter: photo handling is async, so updates use the latest data
export default function RoomList({ data, onChange, moveIn, showErrors }) {
  const rooms = data.rooms
  const files = data.files || {}
  // Until the tenant opens or closes one, the first unfinished room is open
  const [picked, setOpen] = useState(undefined)
  const open = picked === undefined ? rooms.find((r) => !roomDone(r))?.id : picked
  const [busy, setBusy] = useState(null)     // `${roomId}/${i}` while its photos are processed
  const [photoError, setPhotoError] = useState({})
  const [addType, setAddType] = useState('')

  const setItem = (roomId, i, fields) => onChange((d) => withItem(d, roomId, i, () => fields))

  const addPhotos = (roomId, i) => async (e) => {
    const picked = [...e.target.files]
    e.target.value = '' // so picking the same photo again still fires onChange
    if (picked.length === 0) return
    const key = `${roomId}/${i}`
    setBusy(key)
    setPhotoError((err) => ({ ...err, [key]: null }))
    try {
      const blobs = await Promise.all(picked.map(shrinkPhoto))
      onChange((d) => {
        const item = d.rooms.find((r) => r.id === roomId).items[i]
        const added = blobs.slice(0, MAX_PHOTOS_PER_ITEM - item.photos.length).map((blob) => [crypto.randomUUID(), blob])
        return {
          ...withItem(d, roomId, i, (it) => ({ photos: [...it.photos, ...added.map(([id]) => id)] })),
          files: { ...d.files, ...Object.fromEntries(added) },
        }
      })
    } catch {
      setPhotoError((err) => ({ ...err, [key]: 'One of those photos couldn’t be read. Try taking it again.' }))
    } finally {
      setBusy(null)
    }
  }

  const removePhoto = (roomId, i, photoId) => onChange((d) => {
    const { [photoId]: _, ...rest } = d.files
    return { ...withItem(d, roomId, i, (it) => ({ photos: it.photos.filter((p) => p !== photoId) })), files: rest }
  })

  const markRestGood = (roomId) => onChange((d) => ({
    ...d,
    rooms: d.rooms.map((r) => r.id !== roomId ? r : {
      ...r,
      items: r.items.map((item) => (item.condition ? item : { ...item, condition: 'good' })),
    }),
  }))

  const addRoom = () => {
    if (!addType) return
    const { label } = ROOM_TYPES[addType]
    const count = rooms.filter((r) => r.name.startsWith(label)).length
    // Only rooms the tenant added can be removed; the standard list follows the staff link
    const room = { ...makeRoom(addType, count > 0 ? `${label} ${count + 1}` : label), added: true }
    onChange((d) => ({ ...d, rooms: [...d.rooms, room] }))
    setOpen(room.id)
    setAddType('')
  }

  const removeRoom = (room) => {
    const started = room.items.some((item) => item.condition || item.notes || item.photos.length)
    if (started && !window.confirm(`Remove ${room.name} and everything entered for it?`)) return
    onChange((d) => {
      const files = { ...d.files }
      room.items.forEach((item) => item.photos.forEach((p) => delete files[p]))
      return { ...d, files, rooms: d.rooms.filter((r) => r.id !== room.id) }
    })
  }

  return (
    <div className="step-fields">
      <p className="step-note">
        {moveIn
          ? 'Under each item is what was recorded when you moved in. Rate how it looks now, and add notes and photos for anything that has changed.'
          : 'Rate every item. Add a note and photos for anything that isn’t in good condition, so it’s on record that it was that way when you moved in. If the home has a room that isn’t listed, add it at the bottom.'}
      </p>

      {rooms.map((room, ri) => {
        const rated = room.items.filter(itemDone).length
        const isOpen = open === room.id
        return (
          <div key={room.id} className={`room-card ${roomDone(room) ? 'done' : ''} ${showErrors && !roomDone(room) ? 'has-error' : ''}`}>
            <button type="button" className="room-header" onClick={() => setOpen(isOpen ? null : room.id)} aria-expanded={isOpen}>
              <span className="room-name">{roomDone(room) && <span className="upload-check">✓</span>}{room.name}</span>
              <span className="room-count">{rated} of {room.items.length}</span>
              <span className={`room-chevron ${isOpen ? 'open' : ''}`} aria-hidden="true">›</span>
            </button>

            {isOpen && (
              <div className="room-body">
                {room.items.map((item, i) => {
                  const before = moveIn?.rooms[ri]?.items[i]
                  const key = `${room.id}/${i}`
                  const missingNote = needsNote(item.condition) && !item.notes.trim()
                  return (
                    <div key={i} className="inspect-item">
                      <div className="inspect-item-name">{item.name}</div>

                      {before && (
                        <div className="before-box">
                          <span className="before-label">Move-in:</span>{' '}
                          <strong>{conditionLabel(before.condition)}</strong>
                          {before.notes && <> — {before.notes}</>}
                          {before.photos.length > 0 && (
                            <div className="photo-row">
                              {before.photos.map((url) => <Thumb key={url} src={url} alt={`${item.name} at move-in`} />)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="condition-group" role="radiogroup" aria-label={`${item.name} condition`}>
                        {CONDITIONS.map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            role="radio"
                            aria-checked={item.condition === c.key}
                            className={`condition-btn ${c.key} ${item.condition === c.key ? 'selected' : ''}`}
                            onClick={() => setItem(room.id, i, { condition: c.key })}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      <input
                        className={`form-input ${showErrors && missingNote ? 'input-error' : ''}`}
                        value={item.notes}
                        onChange={(e) => setItem(room.id, i, { notes: e.target.value })}
                        placeholder={needsNote(item.condition) ? 'Describe the damage (required)' : 'Notes (optional)'}
                      />

                      <div className="photo-row">
                        {item.photos.map((id) => (
                          <Thumb key={id} src={files[id]} alt={item.name} onRemove={() => removePhoto(room.id, i, id)} />
                        ))}
                        {item.photos.length < MAX_PHOTOS_PER_ITEM && (
                          <label className="photo-add">
                            <input type="file" accept="image/*" multiple onChange={addPhotos(room.id, i)} style={{ display: 'none' }} />
                            {busy === key ? '…' : '+ Photo'}
                          </label>
                        )}
                      </div>
                      {photoError[key] && <p className="upload-error">{photoError[key]}</p>}
                      {showErrors && !item.condition && <p className="upload-error">Choose a condition.</p>}
                    </div>
                  )
                })}

                <div className="room-actions">
                  {rated < room.items.length && (
                    <button type="button" className="add-btn" onClick={() => markRestGood(room.id)}>
                      Mark the rest Good
                    </button>
                  )}
                  {!moveIn && room.added && (
                    <button type="button" className="remove-btn" onClick={() => removeRoom(room)}>Remove this room</button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!moveIn && (
        <div className="add-room">
          <select className="form-select" value={addType} onChange={(e) => setAddType(e.target.value)} aria-label="Room to add">
            <option value="">Add a room…</option>
            {ADDABLE_ROOMS.map((type) => <option key={type} value={type}>{ROOM_TYPES[type].label}</option>)}
          </select>
          <button type="button" className="btn-secondary" onClick={addRoom} disabled={!addType}>Add</button>
        </div>
      )}
    </div>
  )
}
