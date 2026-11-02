import { supabase } from './supabase.js'

// The units, kept in the units table and managed on the settings page (apply.wlgre.com/?settings).
// The application's dropdown shows the available ones; the inspection invite page lists them all.
// `level` decides an inspection's outdoor items (ground: patio and yard, upper: balcony and stairs).

export const BED_COUNTS = [1, 2, 3, 4, 5, 6]
export const BATH_COUNTS = [1, 1.5, 2, 2.5, 3, 3.5, 4]
export const LEVELS = [
  { key: 'ground', label: 'Ground floor / house' },
  { key: 'upper', label: 'Upper floor' },
]

export async function loadUnits({ availableOnly = false } = {}) {
  let query = supabase.from('units').select('id, address, beds, baths, level, available').order('address')
  if (availableOnly) query = query.eq('available', true)
  const { data, error } = await query
  if (error) throw error
  return data.map((u) => ({ ...u, baths: Number(u.baths) }))
}

export const unitLabel = (u) => `${u.address} - ${u.beds}Bd/${u.baths}Ba ${u.level} unit`

// A readable id for a new unit, used in inspection links (e.g. ?unit=839-willow-pointe-dr)
export function newUnitId(address, takenIds) {
  const base = address.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'unit'
  let id = base
  for (let n = 2; takenIds.includes(id); n++) id = `${base}-${n}`
  return id
}
