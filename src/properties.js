// The units, shown in the application's "Unit you're applying for" dropdown and on the staff page
// that makes a tenant's inspection link. `level` decides an inspection's outdoor items
// (ground units have a patio, upper units a balcony and stairs).
export const PROPERTIES = [
  { id: '831', address: '831 Willow Pointe Dr', beds: 2, baths: 2, level: 'ground' },
  { id: '833', address: '833 Willow Pointe Dr', beds: 2, baths: 2, level: 'upper' },
  { id: '835', address: '835 Willow Pointe Dr', beds: 2, baths: 2, level: 'ground' },
  { id: '837', address: '837 Willow Pointe Dr', beds: 2, baths: 2, level: 'upper' },
]

export const findProperty = (id) => PROPERTIES.find((p) => p.id === id)

export const propertyLabel = (p) => `${p.address} - ${p.beds}Bd/${p.baths}Ba ${p.level} unit`
