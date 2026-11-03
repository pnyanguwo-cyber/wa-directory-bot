// Quick parse checks for lib/emergency.ts (owner spec: contact, suburb, city).
import { parseEmergencyAdd, emergencyWaLink, categoryIcon, VALID_CATEGORIES } from '../lib/emergency.ts'

const cases = [
  ['263771234567 Waterford Bulawayo', { phone: '263771234567', category: 'police', suburb: 'Waterford', city: 'Bulawayo' }],
  ['263771234567 ambulance Waterford Bulawayo', { phone: '263771234567', category: 'ambulance', suburb: 'Waterford', city: 'Bulawayo' }],
  ['0771234567 police Waterford Estate East Harare', { phone: '0771234567', category: 'police', suburb: 'Waterford Estate East', city: 'Harare' }],
  ['123', null], // no suburb/city
  ['263771234567 vet', null], // category but no suburb/city
  ['263771 ambulance Waterford Bulawayo', null], // phone too short
]

let pass = 0
for (const [input, want] of cases) {
  const got = parseEmergencyAdd(input)
  if (want === null) {
    if (!got.ok) { pass++; console.log('ok  reject:', input) } else { console.log('FAIL should reject:', input, JSON.stringify(got)) }
  } else {
    const c = got.contact
    if (got.ok && c && c.phone === want.phone && c.category === want.category && c.suburb === want.suburb && c.city === want.city) {
      pass++; console.log('ok  parse:', input)
    } else {
      console.log('FAIL parse:', input, '→', JSON.stringify(got), 'want', JSON.stringify(want))
    }
  }
}
console.log('wa links:', emergencyWaLink('263771234567'), '|', emergencyWaLink('0771234567'), '|', emergencyWaLink('123'))
console.log('icons:', VALID_CATEGORIES.size, categoryIcon('ambulance'), categoryIcon('tow'))
console.log(`passes ${pass}/${cases.length}`)
