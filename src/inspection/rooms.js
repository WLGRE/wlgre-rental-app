// Standard rooms and the items checked in each. The unit in the tenant's link (src/properties.js) builds
// the list; they can add rooms it's missing. Move-outs reuse the move-in's rooms so every item lines up.

export const CONDITIONS = [
  { key: 'good', label: 'Good' },
  { key: 'fair', label: 'Fair' },
  { key: 'poor', label: 'Poor' },
  { key: 'damaged', label: 'Damaged' },
  { key: 'na', label: 'N/A' },
]

export const conditionLabel = (key) => CONDITIONS.find((c) => c.key === key)?.label ?? ''

// Poor and damaged items need a note saying what's wrong
export const needsNote = (condition) => condition === 'poor' || condition === 'damaged'

const BASICS = ['Walls', 'Ceiling', 'Floors / carpet', 'Windows & screens', 'Blinds / window coverings', 'Lights, switches & outlets']

export const ROOM_TYPES = {
  entry:    { label: 'Entry & hallways', items: ['Front door & locks', 'Walls', 'Ceiling', 'Floors / carpet', 'Lights, switches & outlets', 'Closet'] },
  living:   { label: 'Living room', items: [...BASICS, 'Ceiling fan'] },
  dining:   { label: 'Dining area', items: [...BASICS, 'Light fixture'] },
  kitchen:  { label: 'Kitchen', items: ['Walls', 'Ceiling', 'Floors', 'Cabinets & drawers', 'Countertops', 'Sink & faucet', 'Garbage disposal', 'Refrigerator', 'Stove / oven', 'Range hood / vent', 'Dishwasher', 'Microwave', 'Windows & screens', 'Lights, switches & outlets'] },
  bedroom:  { label: 'Bedroom', items: [...BASICS, 'Closet & doors', 'Ceiling fan'] },
  bathroom: { label: 'Bathroom', items: ['Walls', 'Ceiling', 'Floors', 'Toilet', 'Sink & vanity', 'Tub / shower', 'Mirror & medicine cabinet', 'Exhaust fan', 'Towel bars & fixtures', 'Lights, switches & outlets'] },
  halfbath: { label: 'Half bath', items: ['Walls & ceiling', 'Floors', 'Toilet', 'Sink & vanity', 'Mirror', 'Exhaust fan', 'Lights, switches & outlets'] },
  laundry:  { label: 'Laundry', items: ['Washer', 'Dryer', 'Dryer vent', 'Walls & floors'] },
  garage:   { label: 'Garage / parking', items: ['Garage door & opener', 'Walls & floor', 'Lights & outlets'] },
  exterior: { label: 'Exterior', items: ['Patio / balcony / deck', 'Yard & landscaping', 'Exterior doors', 'Mailbox', 'Trash bins'] },
  ground:   { label: 'Exterior', items: ['Patio', 'Exterior doors', 'Yard & landscaping', 'Mailbox', 'Trash bins'] },
  upper:    { label: 'Exterior', items: ['Balcony', 'Exterior stairs & railing', 'Exterior doors', 'Mailbox', 'Trash bins'] },
  systems:  { label: 'Safety & systems', items: ['Smoke detectors', 'Carbon monoxide detectors', 'Heating & A/C', 'Thermostat', 'Water heater', 'Fire extinguisher', 'Keys & remotes received'] },
}

// Bedrooms and bathrooms come from the unit, so tenants can only add the rest
export const ADDABLE_ROOMS = ['dining', 'laundry', 'garage', 'exterior']

const newId = () => crypto.randomUUID()

export function makeRoom(type, name = ROOM_TYPES[type].label) {
  return {
    id: newId(),
    name,
    items: ROOM_TYPES[type].items.map((item) => ({ name: item, condition: '', notes: '', photos: [] })),
  }
}

// The rooms for a unit from src/properties.js. baths may be a half number, e.g. 2.5 is two full baths and a half bath.
export function standardRooms({ beds, baths, level }) {
  const fullBaths = Math.floor(baths)
  const halfBath = baths % 1 !== 0
  const numbered = (type, count) => Array.from({ length: count }, (_, i) =>
    makeRoom(type, count > 1 ? `${ROOM_TYPES[type].label} ${i + 1}` : ROOM_TYPES[type].label))

  return [
    makeRoom('entry'),
    makeRoom('living'),
    makeRoom('kitchen'),
    ...numbered('bedroom', beds),
    ...numbered('bathroom', fullBaths),
    ...(halfBath ? [makeRoom('halfbath')] : []),
    makeRoom('laundry'),
    makeRoom(level === 'upper' ? 'upper' : 'ground'),
    makeRoom('systems'),
  ]
}

// A move-out starts from the move-in's rooms and items, with nothing filled in yet
export const roomsFromMoveIn = (moveInRooms) => moveInRooms.map((room) => ({
  id: newId(),
  name: room.name,
  items: room.items.map((item) => ({ name: item.name, condition: '', notes: '', photos: [] })),
}))
