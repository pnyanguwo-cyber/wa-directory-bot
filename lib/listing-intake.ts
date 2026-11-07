import { zimbabweCities } from '@wa-directory/shared'
import { categories as staticCategories } from '@wa-directory/shared'
import { dedupeCategories } from '@wa-directory/shared'

// WhatsApp listing-intake parser: turns any message (single line, labeled
// lines, or a full paragraph) into field updates plus a living form card.
// Rule-based and deterministic — no AI dependency.

export interface ListingFormState {
  name?: string
  categories?: string[]
  city?: string
  area?: string
  phone?: string
  phone_type?: 'whatsapp' | 'voice'
  username?: string
  price_range?: string
  website?: string
  catalog?: string
  address?: string
  description?: string
  whole_country?: boolean
  // Public logo URL queued from a photo the user sent while filling the
  // form (uploaded to the logos bucket by the bot, attached at publish).
  logo?: string
}

export function findListingCity(text: string): string | null {
  const lower = text.toLowerCase()
  for (const c of zimbabweCities) {
    if (c.name.length > 2 && lower.includes(c.name.toLowerCase())) return c.name
  }
  return null
}

export function findListingArea(city: string, text: string): string | null {
  const cityObj = zimbabweCities.find(c => c.name === city)
  if (!cityObj) return null
  const lower = text.toLowerCase()
  for (const a of cityObj.areas) {
    if (lower.includes(a.toLowerCase())) return a
  }
  return null
}

// Static category hints (DB approval is enforced again inside
// lib/listing-create.ts — these are just parsing hints).
interface CatHint {
  name: string
  haystack: string
}

const CATS: CatHint[] = staticCategories.map(c => {
  const kw = (c as { keywords?: string[] }).keywords
  const words = [
    c.name.toLowerCase(),
    ...c.name.toLowerCase().split(/\s*&\s*|\s+/),
    ...(kw ?? []),
  ]
  return { name: c.name, haystack: ' ' + words.join(' ') + ' ' }
})

function guessCategory(text: string): string | null {
  const lower = text.toLowerCase().trim().replace(/[^a-z0-9& ]+/g, ' ')
  if (!lower || lower.length > 60) return null
  for (const c of CATS) {
    const first = c.name.toLowerCase()
    if (first === lower) return c.name
  }
  const words = lower.split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (w.length < 4) continue
    for (const c of CATS) {
      if (c.haystack.includes(' ' + w + ' ')) return c.name
    }
  }
  const fallback = manualCategory(lower)
  return fallback ? fallback : null
}

// Phrases like "flower seller" or "screen printing" don't hit the database
// keywords; a coarser substring map catches them.
const EXTRA_HINTS: { hint: string; cat: string }[] = []
for (const c of staticCategories) {
  const tokens = (c.name.toLowerCase().split(/\s*&\s*|\s+/)).filter(s => s.length >= 4)
  for (const t of tokens) EXTRA_HINTS.push({ hint: t, cat: c.name })
}

function manualCategory(lower: string): string | null {
  for (const e of EXTRA_HINTS) {
    if (lower.includes(e.hint)) return e.cat
  }
  return null
}

const PHONE_RE = /(?:\+?263|0)\s?7[\d\s.\-]{8,11}(?!\d)/
const NATION_RE = /(whole country|country ?wide|nation ?wide|everywhere|anywhere|across zimbabwe|all over zimbabwe|entire zimbabwe|\bwhole zimbabwe\b|\bzimbabwe\b)/i
// Scheme'd/www URLs consume to end of token; bare domains (incl. wa.me catalog
// links) match the TLD plus an optional /path so "wa.me/c/263…" stays whole.
const URL_RE = /\b(?:(?:http|https):\/\/|www\.)[^\s]*|\b[\w-]+\.(?:co\.zw|com|org|net|biz|site|online|shop|store|africa|co|zw|me)(?:\/[^\s]*)?/i
const CATALOG_RE = /(?:https?:\/\/)?(?:www\.)?wa\.me\/c\/[\w\-]+/i

// URLs written in chat often carry trailing sentence punctuation.
function trimUrl(url: string): string {
  return url.replace(/[.,;:!?)\]]+$/, '')
}

function normalizeCatalogLink(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`
}
const USERNAME_RE = /@([a-zA-Z0-9_]{3,})/
const PRICE_RE = /\$?\s?(\d+(?:[.,]\d+)?)\s?(?:-|–|-|to)\s?\$?\s?(\d+(?:[.,]\d+)?)/i
const ME_RE = /^(me|mine|my number|this number|use mine)\b/i
const VOICE_RE = /\b(voice|hotline|landline|call only)\b/i

// A labeled line is "<label> <separator-or-space> <value>" — the separator is
// optional so bare "Name Diamond tradings", "City Harare" or "Price 100-200"
// parse just like "name: …". Values that start with a continuation word
// ("name of the business is X") get the stopword stripped in the handler.
const LABELS: { re: RegExp; field: string }[] = [
  { re: /^\s*(?:business\s+)?name\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'name' },
  { re: /^\s*categ(?:ory|ies|s)?\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'category' },
  { re: /^\s*city\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'city' },
  { re: /^\s*town\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'city' },
  { re: /^\s*(?:area|suburb)\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'area' },
  { re: /^\s*(?:phone|number|cell|contact)\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'phone' },
  { re: /^\s*price[s]?\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'price' },
  { re: /^\s*desc(?:ription)?\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'description' },
  { re: /^\s*about\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'description' },
  { re: /^\s*(?:website|web|site)\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'website' },
  { re: /^\s*catalo?g(?:ue)?\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'catalog' },
  { re: /^\s*(?:address|located?)\b(?:\s*[:\-–]\s*|\s+)(?=\S)/i, field: 'address' },
  { re: /^\s*(?:username|handle)\s+(?=@)/i, field: 'username' },
  { re: /^\s*(?:username|handle)\s*[:\-–]\s*/i, field: 'username' },
]

interface Ctx {
  patch: ListingFormState
  sender: string
  set: (k: keyof ListingFormState, v: string | boolean | undefined, opts?: { onlyIfEmpty?: boolean }) => void
}

function setCtxField(ctx: Ctx, field: string, value: string): boolean {
  const s = ctx.patch
  const apply = (): boolean => {
    ctx.set(field as keyof ListingFormState, value)
    return true
  }
  switch (field) {
    case 'name': {
      // "name of the business is X" → strip the continuation words so the
      // value is the business itself, not the connective sentence.
      const clean = value.replace(/^(?:of|for|is|it\s+is|my\s+business\s+is)\s+/i, '').trim()
      if (clean.length < 2) return false
      return apply()
    }
    case 'category': {
      // Multiple categories in one value ("jewellery, watches") all apply.
      const parts = value.split(/\s*[/&,]\s*/).filter(Boolean)
      let any = false
      const cats = s.categories ? [...s.categories] : []
      for (const part of parts) {
        const cat = guessCategory(part)
        if (!cat) continue
        // Case-insensitive check before pushing
        if (!cats.some(c => c.toLowerCase() === cat.toLowerCase()) && cats.length < 4) {
          cats.push(cat)
          any = true
        }
      }
      if (any) {
        s.categories = dedupeCategories(cats)
      }
      return any
    }
    case 'city': {
      const city = findListingCity(value)
      if (city) {
        s.city = city
        s.whole_country = false
        return true
      }
      if (NATION_RE.test(value)) {
        s.city = undefined
        s.whole_country = true
        return true
      }
      if (/^remote$/i.test(value.trim())) {
        s.city = 'remote'
        s.whole_country = false
        return true
      }
      // If not a known city/remote/whole country, still accept but mark as pending validation
      s.city = value.slice(0, 60)
      s.whole_country = false
      return true
    }
    case 'area': {
      if (!value) return false
      // Accept the area input even if not in our database
      // We'll allow any input here, validation happens at publish/admin level
      s.area = value.slice(0, 200) // Allow longer for multiple areas
      return true
    }
    case 'phone': {
      if (ME_RE.test(value.replace(/[:\-]/g, '').trim()) || /^me\b/i.test(value.trim())) {
        if (!ctx.sender) return false
        s.phone = ctx.sender
        s.phone_type = 'whatsapp'
        return true
      }
      const m = value.match(PHONE_RE)
      if (!m) return false
      const digits = m[0].replace(/[^0-9]/g, '')
      const nat = digits.startsWith('263') ? digits.slice(3) : digits.replace(/^0/, '')
      if (nat.length !== 9 || !nat.startsWith('7')) {
        // Return a special error flag that the caller can use to show a more helpful message
        throw new Error('INVALID_ZIM_PHONE')
      }
      s.phone = `263${nat}`
      s.phone_type = VOICE_RE.test(value) ? 'voice' : 'whatsapp'
      return true
    }
    case 'price': {
      const price = recordPrice(value)
      if (!price) return false
      s.price_range = price
      return true
    }
    case 'description':
      if (!value) return false
      s.description = value.slice(0, 500)
      return true
    case 'website': {
      const url = value.match(URL_RE)?.[0]
      if (!url) return false
      s.website = trimUrl(url)
      return true
    }
    case 'catalog': {
      // WhatsApp catalogs are shared as wa.me/c/… links (with or without
      // https://); any other URL is accepted as a catalog link too.
      const cat = value.match(CATALOG_RE)?.[0]
      if (cat) {
        s.catalog = normalizeCatalogLink(cat)
        return true
      }
      const url = value.match(URL_RE)?.[0]
      if (!url) return false
      s.catalog = trimUrl(url)
      return true
    }
    case 'address':
      if (!value) return false
      s.address = value.slice(0, 200)
      return true
    case 'username': {
      const h = value.match(USERNAME_RE)?.[1] || value.replace(USERNAME_RE, '').trim().replace(/[^a-zA-Z0-9_]/g, '')
      if (!h) return false
      s.username = h
      return true
    }
    default:
      return false
  }
}

function recordPrice(line: string): string | null {
  const m = line.match(PRICE_RE)
  if (m) {
    const a = Number(m[1].replace(',', '.'))
    const b = Number(m[2].replace(',', '.'))
    if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null
    const lo = Math.min(a, b)
    const hi = Math.max(a, b)
    return `$${lo} - $${hi}`
  }
  const single = line.match(/\$?\s?(\d+(?:[.,]\d+)?)/)
  if (!single) return null
  const a = Number(single[1].replace(',', '.'))
  return Number.isFinite(a) && a > 0 ? `$${a}` : null
}

export interface IntakeResult {
  state: ListingFormState
  filledCount: number
}

export function parseListingMessage(
  text: string,
  senderPhone: string,
  base: ListingFormState = {}
): IntakeResult {
  const patch: ListingFormState = { ...base }
  let filledCount = 0

  const ctx: Ctx = {
    patch,
    sender: senderPhone,
    set: (k, v, opts) => {
      const cur = patch[k]
      if (opts?.onlyIfEmpty && cur) return
      if (Array.isArray(cur) && Array.isArray(v)) {
        for (const item of v) {
          if (!cur.includes(item)) cur.push(item)
        }
        return
      }
      if (cur === v) return
      // eslint-disable-next-line
      ;(patch as Record<string, unknown>)[k] = v
      filledCount += 1
    },
  }

  const leftover: string[] = []

  // Comma-separated compound lines are common in free text
  // ("Name X, City Harare, Phone 077…" or "Job Moyo Hardware, Building Materials, Harare").
  const lines = text
    .split(/\r?\n|;\s*|\s*,\s*|\.\s+|\s{3,}/)
    .map(l => l.trim())
    .filter(Boolean)

  for (const rawLine of lines) {
    // Strip leading intent verbs so "register Job Moyo Hardware" names the
    // business instead of polluting every leftover field.
    const line = rawLine.replace(/^(?:i want to |register|list\b|add\b|sign me up|get listed|advertise)\b[:\s-]*/i, '').trim()
    // 1) Explicit field labels always win
    const label = LABELS.find(l => l.re.test(line))
    if (label) {
      const value = line.replace(label.re, '').trim()
      if (value && setCtxField(ctx, label.field, value)) continue
      const stripped = line.replace(label.re, '').trim()
      if (stripped) {
        leftover.push(stripped)
      }
      continue
    }

    // 2) Footer info: website / handle in a labeled or unlabelled line
    if (ME_RE.test(line.toLowerCase()) && !/\d/.test(line)) {
      if (ctx.sender) {
        patch.phone = ctx.sender
        patch.phone_type = /voice|landline|hotline/i.test(line) ? 'voice' : 'whatsapp'
        filledCount += 1
      }
      continue
    }

    // 3) Extract everything from a possibly compound line:
    //    "Job Moyo Hardware 077123 4567 Harare $5-40 selling tools"
    let rem = line
    const catLink = rem.match(CATALOG_RE)?.[0]
    if (catLink) {
      rem = rem.replace(catLink, ' ').trim()
      void ctx.set('catalog', catLink, { onlyIfEmpty: true })
    } else if (URL_RE.test(rem)) {
      const m = rem.match(URL_RE)!
      rem = rem.replace(m[0], ' ').trim()
      void ctx.set('website', trimUrl(m[0]), { onlyIfEmpty: true })
    }
    const handle = rem.match(USERNAME_RE)?.[1]
    if (handle && rem.replace(USERNAME_RE, '').trim().length <= 3) {
      rem = rem.replace(USERNAME_RE, ' ').trim()
      patch.username = handle
      filledCount += 1
      continue
    }
    if (!/\b(me|mine)\b/i.test(rem)) {
      const pm = rem.match(PHONE_RE)
      if (pm) {
        const digits = pm[0].replace(/[^0-9]/g, '')
        const nat = digits.startsWith('263') ? digits.slice(3) : digits.replace(/^0/, '')
        if (nat.length === 9 && nat.startsWith('7')) {
          rem = rem.replace(pm[0], ' ').replace(/^(?:phone|number|contact|cell|whatsapp)\b[\s:–-]*/i, '').trim()
          patch.phone = `263${nat}`
          patch.phone_type = voiceType(line, rem)
          filledCount += 1
        } else {
          leftover.push(rem)
          continue
        }
      }
    }

    const p = rem.match(PRICE_RE)
    if (p) {
      rem = rem.replace(p[0], ' ').trim()
      void ctx.set('price_range', recordPrice(p[0])!)
    }

    const city = findListingCity(rem)
    if (city) {
      rem = rem.replace(new RegExp(city.toLowerCase(), 'gi'), ' ').trim()
      void ctx.set('city', city)
      void ctx.set('whole_country', false)
      const area = findListingArea(city, rem)
      if (area) {
        rem = rem.replace(new RegExp(area.toLowerCase(), 'gi'), ' ').trim()
        void ctx.set('area', area, { onlyIfEmpty: true })
      }
    } else if (NATION_RE.test(rem)) {
      rem = rem.replace(NATION_RE, ' ').trim()
      patch.city = undefined
      patch.whole_country = true
    } else if (/^remote$/i.test(rem.trim())) {
      void ctx.set('city', 'remote')
      void ctx.set('whole_country', false)
    }

    if (rem) {
      const cat = guessCategory(rem)
      if (cat) {
        const cats = patch.categories ? [...patch.categories] : []
        if (!cats.includes(cat) && cats.length < 4) {
          cats.push(cat)
          patch.categories = cats
          filledCount += 1
        }
        // Whatever preceded the category is still useful as a name/description
        // candidate ("Job Moyo Hardware" contains "Hardware").
        leftover.push(rem.replace(new RegExp(cat, 'ig'), ' ').replace(/\s+/g, ' ').trim())
        rem = ''
      }
    } else {
      continue
    }

    if (rem) leftover.push(rem)
  }

  // The whole message parsed cleanly into structured fields with nothing left.

  // 4) Leftover text → name (first usable chunk) and description (longest).
  // A single leftover when the message changed nothing else is a name
  // correction ("Job Moyo Hardware" typed on its own).
  if (leftover.length) {
    const changedKeys = ([
      'name', 'categories', 'city', 'area', 'phone', 'phone_type',
      'price_range', 'website', 'address', 'username', 'description',
      'whole_country',
    ] as (keyof ListingFormState)[]).filter(k =>
      JSON.stringify(base[k] ?? null) !== JSON.stringify((patch as Record<string, unknown>)[k] ?? null)
    )
    const soloCorrection = leftover.length === 1 && changedKeys.length === 0
    const nameChunk = leftover.find(l => l.length >= 2 && l.length <= 60)
    // An auto-assigned name that is really a labeled fragment ("phone 077…",
    // "contact …") should not block a real business name.
    const staleName =
      !!patch.name &&
      (/(?:\+?263|07)/.test(patch.name.replace(/[\s.-]/g, '')) || /^(?:phone|number|contact|cell)\b/i.test(patch.name))

    if ((staleName || !patch.name) && nameChunk) {
      patch.name = nameChunk.slice(0, 80)
      leftover.splice(leftover.indexOf(nameChunk), 1)
    } else if (soloCorrection && nameChunk) {
      patch.name = nameChunk.slice(0, 80)
      leftover.splice(leftover.indexOf(nameChunk), 1)
    }

    if (leftover.length) {
      const desc = [...leftover].sort((a, b) => b.length - a.length)[0]
      if (!patch.description || desc.length > patch.description.length) {
        patch.description = desc.slice(0, 500)
      }
    }
  }

  return { state: patch, filledCount }
}

function voiceType(...texts: string[]): 'whatsapp' | 'voice' {
  return texts.some(t => VOICE_RE.test(t)) ? 'voice' : 'whatsapp'
}

function dedupeCats(cats?: string[]): string[] {
  return [...new Set(cats || [])].slice(0, 4)
}

// ── Form card rendering + publish gating ─────────────────────────────────

function fieldLines(state: ListingFormState, senderPhone: string): string[] {
  const lines: string[] = []
  const push = (ok: boolean, label: string, value: string, hint: string) => {
    lines.push(ok ? `✅ ${label}: ${value}` : `⬜ ${label}: ${hint}`)
  }

  const phoneOk = !!state.phone && state.phone.replace(/\D/g, '').length >= 9
  push(!!state.name, 'Name', state.name || '', 'missing - send the business name')
  push(
    !!state.categories?.length,
    'Category',
    state.categories?.join(', ') || '',
    "missing - e.g. Salon, Bakery, Building Materials…"
  )
  push(
    !!(state.city || state.whole_country),
    'City',
    state.whole_country ? 'Whole country' : state.city || '',
    'recommended - e.g. Harare… (or *whole country*)'
  )
  push(
    phoneOk,
    'Phone',
    phoneOk ? (state.phone_type === 'voice' ? `${state.phone} (voice)` : state.phone!) : '',
    `missing - send a number, or reply *me*${senderPhone ? ` to use ${senderPhone}` : ''}`
  )
  push(!!state.area, 'Area', state.area || '', 'optional - e.g. Avondale…')
  push(
    !!state.description,
    'Description',
    state.description || '',
    'optional - what you offer, in one line'
  )
  push(
    !!state.price_range,
    'Prices',
    state.price_range || '',
    'optional - cheapest item to most expensive, e.g. $5 - $40'
  )
  push(
    !!state.website,
    'Website',
    state.website || '',
    'optional but important - if you have one, send it (e.g. www.myshop.co.zw)'
  )
  push(
    !!state.catalog,
    'Catalog',
    state.catalog || '',
    'optional - WhatsApp catalog link (wa.me/c/…)'
  )
  push(!!state.address, 'Address', state.address || '', 'optional - street / stand number')
  return lines
}

export function renderListingForm(state: ListingFormState, senderPhone: string): string {
  const filledCount =
    (state.name ? 1 : 0) +
    (state.categories?.length ? 1 : 0) +
    (state.city || state.whole_country ? 1 : 0) +
    (state.phone && state.phone.replace(/\D/g, '').length >= 9 ? 1 : 0) +
    (state.area ? 1 : 0) +
    (state.description ? 1 : 0) +
    (state.price_range ? 1 : 0) +
    (state.website ? 1 : 0) +
    (state.catalog ? 1 : 0) +
    (state.address ? 1 : 0)

  return [
    `🏪 *Your listing* - ${filledCount}/10 ready`,
    '',
    ...fieldLines(state, senderPhone),
    '',
    ...(state.logo ? ['📷 Logo: photo attached - uploads at publish', ''] : []),
    'To edit a field, type the heading and new value (e.g. *Prices: $5 - $20*). Tap ↗ Publish when ready, or *cancel* to quit.',
  ].join('\n')
}

export function missingRequired(state: ListingFormState): string[] {
  const missing: string[] = []
  if (!state.name || state.name.trim().length < 2) missing.push('name')
  if (!state.categories?.length) missing.push('category')
  if (!state.phone || state.phone.replace(/\D/g, '').length < 9) missing.push('phone')
  return missing
}

export function renderMissingRequiredList(state: ListingFormState): string {
  const missing = missingRequired(state)
  const lines = ['⚠️ *Not ready to publish* - fill the mandatory fields first:', '']
  for (const f of missing) {
    if (f === 'name') lines.push('⬜ *Name* - just send it, e.g. "Job Moyo Hardware"')
    if (f === 'category') lines.push('⬜ *Category* - e.g. Salon, Bakery, Electrician, Building Materials…')
    if (f === 'phone') lines.push('⬜ *Phone* - send a number, or reply *me* to use your WhatsApp number')
  }
  lines.push('')
  lines.push('Everything else (city, description, prices…) is optional but helps customers find you.')
  return lines.join('\n')
}

export const LIST_INTRO = (): string => [
  "Let's list your business on WA Directory - send a quick line or a full paragraph, and I'll fill the form.",
  '',
  'Fields I pick from your text: name, category, city, phone, prices, description, website, catalog, address.',
  '',
  'Example:',
  'Bread Machine Store in Harare, contact 077123 4567, sells bread from $1',
  'Catalog: https://wa.me/c/263771234567',
  '',
  'Prices work best as a range - your cheapest item to your most expensive.',
  '',
  'Reply *cancel* to stop anytime.',
].join('\n')

// ── Guided registration wizard (one question per step) ────────────────
// First-time owners freeze when handed a 10-field wall, so the bot now
// asks questions one at a time — same ListingFormState underneath, so the
// publish path, media handling and draft-resume all stay untouched.

export interface WizardStep {
  /** State key this question answers (logo = media-only step). */
  key: 'name' | 'categories' | 'city' | 'phone' | 'area' | 'price_range' | 'description' | 'website' | 'catalog' | 'address' | 'logo'
  label: string
  prompt: string
  optional: boolean
}

export const LIST_WIZARD_STEPS: WizardStep[] = [
  { key: 'name', label: 'Name', optional: false,
    prompt: "What's your business called? Just send the name, e.g. *Job Moyo Hardware*." },
  { key: 'categories', label: 'Category', optional: false,
    prompt: 'What type of business is it? Send one word, e.g. *Salon*, *Bakery*, *Electrician*, *Hardware*…' },
  { key: 'city', label: 'Town', optional: false,
    prompt: 'Which town/city is your business physically located in? e.g. *Harare*, *Bulawayo*, *Gweru*…\n(This is just your physical location - you can still serve other areas. Reply *whole country* if you serve everywhere online, or *remote* if you have no physical shop.)' },
  { key: 'phone', label: 'Phone', optional: false,
    prompt: 'What number should customers reach you on? Send it, or reply *me* to use this WhatsApp number.\n(Reply *call only* if customers should just call it - not on WhatsApp.)\n\n*Note: Only Zimbabwean numbers are accepted (e.g. 077, 078, 071, 073, 075, 077, 078).*' },
  { key: 'area', label: 'Service Areas', optional: true,
    prompt: 'Which suburbs or areas do you serve? You can list multiple, e.g. *Avondale, Mufakose, Highfield*.\n(If you entered "whole country" or "remote" above, you can skip this.)' },
  { key: 'price_range', label: 'Prices', optional: true,
    prompt: 'Your price range, cheapest to priciest? e.g. *$1 - $50*.' },
  { key: 'description', label: 'Description', optional: true,
    prompt: 'In one line, what do you sell or do?' },
  { key: 'website', label: 'Website', optional: true,
    prompt: 'Do you have a website? Send the link, e.g. *www.myshop.co.zw*.\n(If you don\'t have one, just reply *skip* - a website will be created for you upon payment, linked to your WhatsApp.)' },
  { key: 'catalog', label: 'Catalog', optional: true,
    prompt: 'Have a WhatsApp catalog or price list link? Send it, e.g. *wa.me/c/…*.\n(You can copy your WhatsApp catalog link and paste it here for easy sharing.)' },
  { key: 'address', label: 'Address', optional: true,
    prompt: 'Physical address or stand number?' },
  { key: 'logo', label: 'Logo photo', optional: true,
    prompt: 'Last one 📷 - send a photo of your logo or shop front.' },
]

export function wizardStepAnswered(state: ListingFormState, key: WizardStep['key']): boolean {
  if (key === 'logo') return !!state.logo
  if (key === 'categories') return !!state.categories?.length
  if (key === 'phone') return !!state.phone && state.phone.replace(/\D/g, '').length >= 9
  if (key === 'city') return !!(state.city || state.whole_country)
  if (key === 'area') {
    // If whole country or remote, area is considered answered (can be skipped)
    if (state.whole_country || state.city === 'remote') return true
    return !!(state.area && state.area.trim().length > 0)
  }
  const v = (state as Record<string, unknown>)[key]
  return typeof v === 'string' ? v.trim().length > 0 : !!v
}

/** First step whose answer is still missing (so a pasted paragraph can
 * skip several questions ahead). -1 = everything answered → review. */
export function firstUnansweredWizardStep(state: ListingFormState): number {
  for (let i = 0; i < LIST_WIZARD_STEPS.length; i++) {
    if (!wizardStepAnswered(state, LIST_WIZARD_STEPS[i].key)) return i
  }
  return -1
}

export const wizardProgress = (i: number): string =>
  `📝 *Registration - question ${i + 1} of ${LIST_WIZARD_STEPS.length}*`

export const wizardIntro = (): string => [
  "Great - let's list your business. I'll ask a few quick questions, one at a time.",
  '',
  'Every optional question accepts *skip*. Reply *back* to fix an earlier answer, or *cancel* to stop.',
].join('\n')

// ── Field-patch application (AI fallback + photo perception share this) ───
// Every external source of field values funnels through the same validators,
// so garbage from any source is rejected exactly like typed text.

export interface ListingFieldPatch {
  name?: string
  categories?: string[]
  city?: string
  area?: string
  phone?: string
  phone_type?: 'whatsapp' | 'voice'
  price_range?: string
  website?: string
  catalog?: string
  address?: string
  description?: string
  whole_country?: boolean
}

export function applyListingFields(
  base: ListingFormState,
  patch: ListingFieldPatch,
  senderPhone: string
): ListingFormState {
  const state: ListingFormState = { ...base }
  const ctx: Ctx = {
    patch: state,
    sender: senderPhone,
    set: (k, v, opts) => {
      const cur = state[k]
      if (opts?.onlyIfEmpty && cur) return
      if (Array.isArray(cur) && Array.isArray(v)) {
        for (const item of v) {
          if (!cur.includes(item)) cur.push(item)
        }
        return
      }
      if (cur === v) return
      ;(state as Record<string, unknown>)[k] = v
    },
  }

  // whole_country pairs with city: an explicit city wins over a nation flag.
  if (patch.city !== undefined) setCtxField(ctx, 'city', patch.city)
  if (patch.area !== undefined) setCtxField(ctx, 'area', patch.area)
  if (patch.whole_country === true && patch.city === undefined) {
    state.city = undefined
    state.whole_country = true
  }
  if (patch.name !== undefined) setCtxField(ctx, 'name', patch.name)
  if (patch.categories?.length) setCtxField(ctx, 'category', patch.categories.join(', '))
  if (patch.phone !== undefined) setCtxField(ctx, 'phone', patch.phone)
  if (patch.phone_type === 'voice' && state.phone) state.phone_type = 'voice'
  if (patch.price_range !== undefined) setCtxField(ctx, 'price', patch.price_range)
  if (patch.website !== undefined) setCtxField(ctx, 'website', patch.website)
  if (patch.catalog !== undefined) setCtxField(ctx, 'catalog', patch.catalog)
  if (patch.address !== undefined) setCtxField(ctx, 'address', patch.address)
  if (patch.description !== undefined) {
    // Never shrink a description that rules already wrote.
    if (!state.description || patch.description.length > state.description.length) {
      setCtxField(ctx, 'description', patch.description)
    }
  }
  return state
}

// A price with no range end ("$100") — the bot should ask for the other end.
export function isSinglePriceRange(price?: string): boolean {
  return !!price && /^\$\s?\d+(?:[.,]\d+)?$/.test(price.trim())
}

// Heuristic for the AI pass: the rule parser stalled (nothing changed) or it
// left a label word inside the business name. Cheap and deterministic.
export function needsAIPass(
  text: string,
  before: ListingFormState,
  after: ListingFormState
): boolean {
  const changed = ([
    'name', 'categories', 'city', 'area', 'phone', 'phone_type',
    'price_range', 'website', 'catalog', 'address', 'username',
    'description', 'whole_country',
  ] as (keyof ListingFormState)[]).some(k =>
    JSON.stringify(before[k] ?? null) !== JSON.stringify((after as Record<string, unknown>)[k] ?? null)
  )
  if (
    changed &&
    /^\s*(?:business\s+)?name\b/i.test(after.name || '') &&
    !/^\s*(?:business\s+)?name\b/i.test(before.name || '')
  ) {
    return true
  }
  return !changed && text.trim().length >= 6
}
