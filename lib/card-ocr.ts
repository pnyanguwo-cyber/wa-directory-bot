import { callGeminiJson, prepareImageForAnalysis } from '@wa-directory/shared'
import { callVisionJson } from './vision-fallback.js'

/**
 * Fast business-card reader.
 *
 * The full registration extractor asks one vision call for a large schema
 * (offerings, socials, legal name, provenance, warnings). On a slow network
 * that call can hit the 25-second model timeout and the card is lost. This
 * reader asks for only the five details the listing needs, with a small
 * response schema and a short deadline, so most cards finish before the
 * structured call would have returned.
 */
export interface FastCardFields {
  business_name: string
  category: string
  phone: string
  city: string
  description: string
  website: string
  address: string
  area: string
  price_range: string
}

const SCHEMA = {
  type: 'object',
  properties: {
    business_name: { type: 'string' },
    category: { type: 'string' },
    phone: { type: 'string' },
    city: { type: 'string' },
    description: { type: 'string' },
    website: { type: 'string' },
    address: { type: 'string' },
    area: { type: 'string' },
    price_range: { type: 'string' },
  },
  required: ['business_name', 'category', 'phone', 'city', 'description'],
} as const

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''
}

export function normalizeFastCard(raw: unknown): FastCardFields | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const phoneRaw = readString(obj.phone, 30)
  const phone = phoneRaw.replace(/[^\d+]/g, '')
  return {
    business_name: readString(obj.business_name, 120),
    category: readString(obj.category, 60),
    phone: /^\d{7,15}$|^\+\d{9,15}$/.test(phone) ? phone : '',
    city: readString(obj.city, 80),
    description: readString(obj.description, 400),
    website: readString(obj.website, 200),
    address: readString(obj.address, 200),
    area: readString(obj.area, 80),
    price_range: readString(obj.price_range, 100),
  }
}

export async function extractBusinessCardFast(
  bytes: Uint8Array,
  caption = ''
): Promise<FastCardFields | null> {
  if (!bytes || bytes.length === 0) return null
  const prepared = await prepareImageForAnalysis(bytes)
  if (!prepared) return null

  const captionLine = caption.trim()
    ? `\nThe sender's caption says: "${caption.trim().slice(0, 200)}".`
    : ''
  const prompt =
    `Read this photo of a Zimbabwe business card, flyer, banner or sign. ` +
    `Only use text that is actually visible; do not guess.${captionLine}\n\n` +
    `Return JSON with these keys:\n` +
    `- business_name: the trading name (not the person's name unless no business name is shown)\n` +
    `- category: a short category such as Plumbing, Bakery, Hardware, Clothing & Fashion, Transport\n` +
    `- phone: the first phone or WhatsApp number, keeping the leading + if shown\n` +
    `- city: the Zimbabwe city or town\n` +
    `- description: one short sentence saying what the business sells or does\n` +
    `- website, address, area, price_range: only when visible\n` +
    `Leave a value as an empty string when it is not visible. No markdown.`

  const raw = await callGeminiJson(
    [
      { text: prompt },
      { inline_data: { mime_type: prepared.mimeType, data: prepared.base64 } },
    ],
    {
      schema: SCHEMA as unknown as Record<string, unknown>,
      temperature: 0,
      maxOutputTokens: 300,
      // 8s per model, 16s total: short enough that a fallback to the full
      // extractor still fits inside the webhook's execution window.
      timeoutMs: 8_000,
    }
  )

  let parsed: unknown = raw
  if (!parsed) {
    parsed = await callVisionJson(
      `${prompt}\n\nReturn JSON only.`,
      [{ bytes: Buffer.from(prepared.base64, 'base64'), mime: prepared.mimeType }],
      15_000
    )
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  return normalizeFastCard(parsed)
}

export function hasRequiredCardField(fields: FastCardFields | null): boolean {
  if (!fields) return false
  return Boolean(
    fields.business_name ||
      fields.category ||
      fields.phone ||
      fields.city ||
      fields.description
  )
}
