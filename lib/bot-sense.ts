import { callGeminiParts, type GeminiPart } from '@wa-directory/shared'

// Bot perception: download a WhatsApp voice note or photo, then have Gemini
// turn it into a search query or, mid-registration, form fields. Best-effort
// everywhere — failures return null and callers reply with a text fallback.

const WA_GRAPH = 'https://graph.facebook.com/v18.0'
const MAX_MEDIA_BYTES = 20 * 1024 * 1024
// Gemini inline payloads are base64-expanded (×1.37) — keep raw bytes under
// this so the request stays inside the inline limit.
const MAX_ANALYZE_BYTES = 13 * 1024 * 1024

// ── Rate limit: 3 AI media recognitions per phone per hour ───────────────
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000
const rateBuckets = new Map<string, number[]>()

export function mediaRateOk(phone: string): boolean {
  const now = Date.now()
  const hits = (rateBuckets.get(phone) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_LIMIT) {
    rateBuckets.set(phone, hits)
    return false
  }
  hits.push(now)
  rateBuckets.set(phone, hits)
  return true
}

export type MediaKind = 'audio' | 'image'

export async function fetchWhatsAppMedia(
  mediaId: string
): Promise<{ buffer: Buffer; mime: string } | null> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!mediaId || !token) {
    console.warn(`[bot-sense] media fetch skipped: ${!mediaId ? 'missing mediaId' : 'missing WHATSAPP_ACCESS_TOKEN'}`)
    return null
  }
  try {
    // Two-step Graph API: metadata (includes the CDN url), then the bytes.
    const res = await fetch(`${WA_GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn(`[bot-sense] media metadata ${res.status} for ${mediaId}`)
      return null
    }
    const meta = (await res.json()) as { url?: string; mime_type?: string }
    const url = meta?.url
    if (!url || typeof url !== 'string') {
      console.warn(`[bot-sense] media metadata missing url for ${mediaId}`)
      return null
    }

    const bin = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!bin.ok) {
      console.warn(`[bot-sense] media download ${bin.status} for ${mediaId}`)
      return null
    }
    const ab = await bin.arrayBuffer()
    if (ab.byteLength === 0 || ab.byteLength > MAX_MEDIA_BYTES) {
      console.warn(`[bot-sense] media size ${ab.byteLength} out of range for ${mediaId}`)
      return null
    }
    return {
      buffer: Buffer.from(ab),
      mime: typeof meta.mime_type === 'string' ? meta.mime_type : '',
    }
  } catch (err) {
    console.warn(`[bot-sense] media fetch error for ${mediaId}: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

export interface ShelfRecognition {
  name: string
  price: number | null
  description: string
}


/** A caption only carries a price when a dollar sign is present. "50" alone
 * (or "50 usd" typed as a caption) is description, not price. */
export function priceFromCaption(caption: string): number | null {
  if (!caption || !caption.includes('$')) return null
  const m = caption.match(/\$\s*(\d+(?:[.,]\d{1,2})?)|(\d+(?:[.,]\d{1,2})?)\s*\$/)
  if (!m) return null
  const value = Number((m[1] || m[2] || '').replace(',', '.'))
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Identify the product(s) in one photo for a seller's shop shelf. One photo
 * can hold several recognisable items (a bed, chair and stove in a room).
 * Best-effort: null means the caller should fall back to asking for a name. */
export async function recognizeShelfItems(
  buffer: Buffer,
  mime: string,
  caption?: string
): Promise<ShelfRecognition[] | null> {
  if (buffer.length === 0 || buffer.length > MAX_ANALYZE_BYTES) return null
  const dataMime = inlineMime('image', mime)
  if (!dataMime) return null

  const captionLine = caption ? `\nThe seller's caption: "${caption}".` : ''
  const instruction =
    `This is a product photo a Zimbabwe shop owner is adding to their online shelf.${captionLine}\n\n` +
    `Identify every distinct product the seller is offering in the photo, in plain English (1-4 words each), e.g. "wooden bed", "office chair", "gas stove". ` +
    `If the photo shows one product, return one item. If it clearly shows several products, return each one.\n` +
    `PRICE RULE: a price is allowed ONLY when a dollar sign ($) appears in the caption or is clearly written on the item. ` +
    `If no $ appears anywhere, price MUST be null and all caption words are a description, not a price.\n` +
    `The description is the seller's own words about the item (colour, size, condition, delivery, etc.), or a short plain description of what is visible.\n` +
    `Reply ONLY with a JSON object: {"items":[{"name":"<product name>","price":<number or null>,"description":"<short description or empty>"}]}. No markdown.`

  const parts: GeminiPart[] = [
    { text: instruction },
    { inline_data: { mime_type: dataMime, data: buffer.toString('base64') } },
  ]

  const raw = await callGeminiParts(parts)
  if (!raw) return null
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as { items?: unknown }
    const list = Array.isArray(parsed.items) ? parsed.items : []
    const out: ShelfRecognition[] = []
    const captionPrice = priceFromCaption(caption || '')
    for (const entry of list.slice(0, 6)) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const str = (k: string) =>
        typeof row[k] === 'string' ? (row[k] as string).trim().slice(0, 300) : ''
      const rawPrice = Number(row.price)
      let price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : null
      // Enforce the seller rule in code too: caption text without a $ cannot be
      // a price, even if the model guessed one.
      if (caption && caption.trim() && !caption.includes('$')) price = null
      if (price == null && captionPrice != null) price = captionPrice
      out.push({
        name: (str('name') || 'Item').slice(0, 80),
        price,
        description: str('description'),
      })
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

export interface MediaSense {
  transcript?: string
  term?: string
  city?: string
  category?: string
  description?: string
  // Signboard / registration extras (photos only, best-effort):
  business_name?: string
  phone?: string
  price_range?: string
  website?: string
  catalog?: string
}

// Meta sends mimes with codec params ("audio/ogg; codecs=opus") — normalize to
// what the Gemini API accepts, and keep to a small whitelist.
function inlineMime(kind: MediaKind, mime: string): string | null {
  const base = (mime.split(';')[0] || '').trim().toLowerCase()
  if (kind === 'image') {
    return ['image/jpeg', 'image/png', 'image/webp'].includes(base) ? base : 'image/jpeg'
  }
  if (['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac'].includes(base)) {
    return base
  }
  // WhatsApp voice notes are opus-in-ogg; octet-stream from the CDN is that.
  return 'audio/ogg'
}

// One Vision/ASR pass over the bytes. Voice notes get a full transcript plus
// the distilled query; photos are described in Zimbabwe-customer terms.
export async function perceiveMedia(
  kind: MediaKind,
  buffer: Buffer,
  mime: string,
  caption?: string
): Promise<MediaSense | null> {
  if (buffer.length === 0 || buffer.length > MAX_ANALYZE_BYTES) return null
  const dataMime = inlineMime(kind, mime)
  if (!dataMime) return null

  const captionLine = caption ? `\nThe attached caption from the customer: "${caption}".` : ''
  const instruction =
    kind === 'audio'
      ? `This is a WhatsApp voice note from a Zimbabwe customer. Transcribe the speech, then distill what product, service or business they are looking for${captionLine}. Reply ONLY with a JSON object: {"transcript":"<full transcription>","term":"<1-3 word search term>","city":"<Zimbabwe town in English, or empty>"}. Ignore greetings and filler. If the note is not asking for something, reply with an empty term. No markdown.`
      : `This is a picture from a Zimbabwe customer on WhatsApp. Guess what product, service or business they are looking for${captionLine}. Also read any registration details visible on signs, boards or labels. Reply ONLY with a JSON object: {"term":"<1-3 word search term>","city":"<Zimbabwe town if identifiable, or empty>","category":"<likely business category, e.g. Plumbing, Bakery, or empty>","description":"<one plain-sentence line describing the business or item>","business_name":"<business name visible on a signboard or label, or empty>","phone":"<phone number visible in the image, or empty>","price_range":"<prices visible, cheapest to most expensive e.g. $5 - $40, or empty>","website":"<website visible, or empty>","catalog":"<WhatsApp catalog link visible, or empty>"} No markdown.`

  const parts: GeminiPart[] = [
    { text: instruction },
    { inline_data: { mime_type: dataMime, data: buffer.toString('base64') } },
  ]

  const raw = await callGeminiParts(parts)
  if (!raw) return null
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    const str = (k: string) => (typeof parsed[k] === 'string' ? (parsed[k] as string).trim().slice(0, 400) : '')
    return {
      transcript: str('transcript'),
      term: str('term'),
      city: str('city'),
      category: str('category'),
      description: str('description'),
      business_name: str('business_name'),
      phone: str('phone'),
      price_range: str('price_range'),
      website: str('website'),
      catalog: str('catalog'),
    }
  } catch {
    return null
  }
}
