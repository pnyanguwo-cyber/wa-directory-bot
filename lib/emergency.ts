// Emergency-contacts manager for the WhatsApp directory bot.
// Stores a JSON array in bot_settings under the key `emergency_contacts`.
// Each entry: { phone, category, suburb, city, name? }
// category ∈ police | ambulance | fire | vet | tow | other
//
// Seeding spec (confirmed by the owner): the admin command carries
// CONTACT, SURBURB and CITY — suburb + city are the lookup key pair, so they
// are required here. Multi-word suburbs ("Waterford Estate") are fine.
// Helpers are safe to call from the webhook route or admin REST API.

import { getBotSetting, setBotSetting } from '@wa-directory/shared'

export const VALID_CATEGORIES = new Set(['police', 'ambulance', 'fire', 'vet', 'tow', 'other'])

const CATEGORY_ICONS: Record<string, string> = {
  police: '👮',
  ambulance: '🚑',
  fire: '🚒',
  vet: '🐾',
  tow: '🛻',
  other: '📞',
}

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] || '📞'
}

export interface EmergencyContact {
  name?: string
  phone: string // digits-only, e.g. "263771234567" (E.164 local: 263 or 0… kept as typed digits)
  category: string // one of VALID_CATEGORIES (default: police)
  suburb: string
  city: string
}

function parseContacts(raw: string | null): EmergencyContact[] {
  try {
    const arr = JSON.parse(raw || '[]')
    if (!Array.isArray(arr)) return []
    return arr
      .filter(
        (x): x is EmergencyContact =>
          typeof x === 'object' &&
          x !== null &&
          typeof (x as { phone?: unknown }).phone === 'string' &&
          typeof (x as { category?: unknown }).category === 'string' &&
          VALID_CATEGORIES.has((x as { category?: string }).category || '')
      )
      .map((x) => ({
        name: typeof x.name === 'string' && x.name.trim() ? x.name.trim() : undefined,
        phone: x.phone,
        category: x.category,
        suburb: typeof x.suburb === 'string' ? x.suburb : '',
        city: typeof x.city === 'string' ? x.city : '',
      }))
  } catch {
    return []
  }
}

export async function listEmergencyContacts(): Promise<EmergencyContact[]> {
  const raw = await getBotSetting('emergency_contacts')
  return parseContacts(raw)
}

export async function addEmergencyContact(contact: EmergencyContact): Promise<boolean> {
  const current = await listEmergencyContacts()
  // Duplicates are judged by phone + category + city — same number can sit in
  // two cities, but the same rescue line twice in one city is a mistake.
  const already = current.some(
    c => c.phone === contact.phone && c.category === contact.category && c.city.toLowerCase() === contact.city.toLowerCase()
  )
  if (already) return false
  current.push(contact)
  const json = JSON.stringify(current)
  try {
    setBotSetting('emergency_contacts', json)
    return true
  } catch {
    return false
  }
}

export async function clearEmergencyContacts(): Promise<boolean> {
  try {
    setBotSetting('emergency_contacts', JSON.stringify([]))
    return true
  } catch {
    return false
  }
}

// Remove by phone (digits-insensitive to formatting) narrowed by an optional
// city substring. Returns how many rows went.
export async function deleteEmergencyContact(phone: string, city?: string): Promise<number> {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return 0
  const current = await listEmergencyContacts()
  const cityLC = (city || '').toLowerCase()
  const keep = current.filter(
    c => !(c.phone.replace(/\D/g, '') === digits && (!cityLC || c.city.toLowerCase().includes(cityLC)))
  )
  const removed = current.length - keep.length
  if (removed > 0) setBotSetting('emergency_contacts', JSON.stringify(keep))
  return removed
}

/** Contacts matching a city/suburb substring (case-insensitive); when none
 *  match, nationwide fallback — category-less contacts with empty city. */
export async function findEmergencyNear(city: string, category?: string): Promise<EmergencyContact[]> {
  const all = await listEmergencyContacts()
  const cityLC = (city || '').toLowerCase()
  const local = all.filter(
    c => c.city?.toLowerCase().includes(cityLC) || (c.suburb?.toLowerCase().includes(cityLC) ?? false)
  )
  if (local.length > 0 || category) return local
  return all.filter(c => !c.city)
}

// ── WhatsApp-parsing seam ─────────────────────────────────────────────────────

export interface ParseEmergencyAddResult {
  ok: boolean
  error?: string
  contact?: EmergencyContact
}

// Spec: `emergency add <phone> [category] <suburb…> <city>`
//  • token 1 = phone (digits; formats 263… or 07… kept as digits)
//  • a known category may directly follow (defaults to 'police')
//  • LAST token = city, everything between = suburb (multi-word allowed)
export function parseEmergencyAdd(input: string): ParseEmergencyAddResult {
  const parts = input.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 3) {
    return { ok: false, error: 'Usage: *emergency add <phone> [category] <suburb> <city>*\ne.g. *add 263771234567 ambulance Waterford Bulawayo*' }
  }
  const phone = parts[0].replace(/\D/g, '')
  if (phone.length < 6) {
    return { ok: false, error: 'That phone is too short - international digits, e.g. *263771234567* or *0771234567*.' }
  }
  let category = 'police'
  let rest = parts.slice(1)
  const first = rest[0].toLowerCase()
  if (VALID_CATEGORIES.has(first)) {
    category = first
    rest = rest.slice(1)
    if (rest.length < 2) {
      return { ok: false, error: 'Missing suburb and city. e.g. *add 263771234567 ambulance Waterford Bulawayo*' }
    }
  }
  if (rest.length < 2) {
    return { ok: false, error: 'Missing suburb and city. e.g. *add 263771234567 Waterford Bulawayo*' }
  }
  const city = rest[rest.length - 1]
  const suburb = rest.slice(0, -1).join(' ')
  return { ok: true, contact: { phone, category, suburb, city } }
}

// wa.me link for a stored contact — 263-prefixed numbers pass through, 07/08
// style trailing digits get lifted to international form for chat previews.
export function emergencyWaLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 6) return null
  const intl = digits.startsWith('263') ? digits : digits.startsWith('0') ? `263${digits.slice(1)}` : null
  if (!intl) return null
  return `https://wa.me/${intl}`
}
