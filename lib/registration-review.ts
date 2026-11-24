/**
 * Registration review card helpers: read the shared flow's context, build the
 * listing the webhook will publish, and parse "City: Bulawayo" corrections.
 * Pure functions - the webhook keeps the sending and the shared state calls.
 */
import { normalizeOwnerPhone } from './agents.js'

export type RegistrationReviewEdit = { key: string; label: string; value: string }

type RegistrationFields = Record<string, { value?: string } | undefined> | undefined

export function registrationField(fields: RegistrationFields, key: string): string {
  return (fields?.[key]?.value || '').toString().trim()
}

export type RegistrationListing = {
  name: string
  categories: string[]
  city: string
  phone: string
  area: string
  description: string
  website: string
  address: string
  calls: string
  priceRange: string
  requestedCategory: string
  notify: boolean
}

export function buildRegistrationListing(
  fields: RegistrationFields,
  ownerPhone?: string
): RegistrationListing {
  // An on-behalf registration seeds the owner's number into `phone`, so an
  // admin edit still wins; the stored owner number is only a fallback.
  const cardPhone = registrationField(fields, 'phone')
  const phone = cardPhone || normalizeOwnerPhone(ownerPhone || '')
  return {
    name: registrationField(fields, 'business_name'),
    categories: [registrationField(fields, 'category') || 'Other'],
    city: registrationField(fields, 'city'),
    phone,
    area: registrationField(fields, 'area'),
    description: registrationField(fields, 'description'),
    website: registrationField(fields, 'website'),
    address: registrationField(fields, 'address'),
    calls: registrationField(fields, 'calls'),
    priceRange: registrationField(fields, 'price_range'),
    requestedCategory: registrationField(fields, 'requested_category'),
    notify: false,
  }
}

export function parseRegistrationReviewEdit(text: string): RegistrationReviewEdit | null {
  const m = text.match(/^(?:edit\s+)?([A-Za-z][A-Za-z ]{2,20}?)\s*:\s*([\s\S]+)$/i)
  if (!m) return null
  const label = m[1].trim().toLowerCase()
  const value = m[2].trim()
  if (!value || value.length > 400) return null
  if (label.includes('call') || label.includes('telephone')) return { key: 'calls', label: 'Calls number', value }
  if (label.includes('name')) return { key: 'business_name', label: 'Business name', value }
  if (label.includes('categor')) return { key: 'category', label: 'Category', value }
  if (label.includes('city') || label.includes('town')) return { key: 'city', label: 'City', value }
  if (label.includes('phone') || label.includes('whatsapp') || label.includes('number')) return { key: 'phone', label: 'WhatsApp number', value }
  if (label.includes('description') || label.includes('offer') || label.includes('bio')) return { key: 'description', label: 'Description', value }
  if (label.includes('website') || label.includes('site')) return { key: 'website', label: 'Website', value }
  if (label.includes('address')) return { key: 'address', label: 'Physical address', value }
  if (label.includes('area') || label.includes('suburb')) return { key: 'area', label: 'Area', value }
  if (label.includes('price')) return { key: 'price_range', label: 'Price range', value }
  return null
}

export function registrationReviewLines(context: {
  fields?: RegistrationFields
  password?: string
}): string[] {
  const fields = context.fields || {}
  const rows: Array<[string, string]> = [
    ['Name', registrationField(fields, 'business_name')],
    ['Category', registrationField(fields, 'category')],
    ['City', registrationField(fields, 'city')],
    ['Phone', registrationField(fields, 'phone')],
    ['Calls', registrationField(fields, 'calls')],
    ['Area', registrationField(fields, 'area')],
    ['Description', registrationField(fields, 'description')],
    ['Website', registrationField(fields, 'website')],
    ['Address', registrationField(fields, 'address')],
    ['Prices', registrationField(fields, 'price_range')],
  ]
  const described = registrationField(fields, 'requested_category')
  const lines = rows.filter(([, value]) => value).map(([label, value]) => `✓ ${label}: ${value}`)
  if (described) lines.push(`· Category you described: ${described} (our team confirms this)`)
  if (context.password) lines.push('✓ Portal password: set')
  return lines
}
