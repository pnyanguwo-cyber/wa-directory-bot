// lib/radar.ts — S18.5 Supplier Demand Radar
// Every user search (minus masked/sensitive terms) is stored as an
// anonymized demand event. Verified suppliers opt in via bot_settings
// (radar_sub:<digits> = '' | 'all' | lowercase city), get pinged with the
// search term only, and can `claim` the newest matching lead. The buyer is
// asked for consent BEFORE any of their info moves — approval opens the
// normal need flow, numbers still only exchange via quote acceptance.
// All data helpers fail open: radar must never break the search flow.

import { createHash } from 'node:crypto'
import { getSupabase } from '@wa-directory/shared'
import { digitsOnly } from '@wa-directory/shared'
import { getBotSetting, setBotSetting } from '@wa-directory/shared'
import { sendWhatsAppMessage } from '@wa-directory/shared'
import type { Business } from '@wa-directory/shared'

export const DEMAND_SUB_KEY = 'radar_sub'
const DEMAND_DEDUPE_MS = 24 * 60 * 60 * 1000
const CLAIM_TTL_MS = 60 * 60 * 1000
// Buyers hunting for a contact number, opening hours or an address are not
// demand leads — those terms are never written to demand_events.
const MASK_HINTS =
  /(contact|phone|number|whatsapp|hours|open|closing|address|where|direction|working|call)\b/i
const PHONE_RUN = /(?:\+?263|0)[0-9]{6,}/

export interface DemandEventRow {
  id: number
  term: string
  city: string
  result_count: number
  buyer: string
  claimed_by: string | null
  claimed_at: string | null
  rq_id: string | null
}

/** True when the term looks like a contact request, not a purchase lead. */
export function maskSearchTerm(term: string): boolean {
  const t = (term || '').trim()
  if (!t) return true
  return MASK_HINTS.test(t) || PHONE_RUN.test(t)
}

/** Stable dedupe id for one (term, city) demand — sha1 of the lowercase pair. */
export function demandPingKey(term: string, city: string): string {
  const base = `${(term || '').trim().toLowerCase()}|${(city || '').trim().toLowerCase()}`
  return `radar_ping:${createHash('sha1').update(base).digest('hex')}`
}

/** Does a subscription ('all' | city) cover this event's city? */
export function subCoversCity(sub: string | null | undefined, eventCity: string): boolean {
  const s = (sub || '').trim().toLowerCase()
  if (!s) return false
  if (s === 'all') return true
  const c = (eventCity || '').trim().toLowerCase()
  if (!c) return false
  return s === c
}

/** Record the search as a demand lead (gated), then ping matching suppliers. */
export async function emitDemandSearch(opts: {
  term: string
  city: string | null
  resultCount: number
  buyer: string
}): Promise<void> {
  try {
    const term = (opts.term || '').trim()
    const city = (opts.city || '').trim()
    const buyer = digitsOnly(opts.buyer || '')
    if (!term || term.length < 3 || maskSearchTerm(term) || !buyer) return
    await emitDemandEvent({ term, city, resultCount: opts.resultCount, buyer })
  } catch {
    /* radar never breaks the search flow */
  }
}

export async function emitDemandEvent(opts: {
  term: string
  city: string
  resultCount: number
  buyer: string
}): Promise<void> {
  try {
    const { data } = await getSupabase()
      .from('demand_events')
      .insert({
        term: (opts.term || '').trim(),
        city: (opts.city || '').trim(),
        result_count: Math.max(0, Math.floor(opts.resultCount || 0)),
        buyer: digitsOnly(opts.buyer || ''),
      })
      .select('id, term, city, result_count')
      .single()
    if (data) {
      void pingSuppliersDemand(data as { term: string; city: string; result_count: number })
    }
  } catch {
    /* fail open */
  }
}

/** Push one demand event to subscribed verified suppliers, deduped per supplier. */
export async function pingSuppliersDemand(ev: {
  term: string
  city: string
  result_count: number
}): Promise<void> {
  try {
    const subs = await listDemandSubscribers()
    const body = [
      `📡 *Radar ping* — someone searched "${ev.term}"${ev.city ? ` in ${ev.city}` : ''} on wa.directory (${ev.result_count} result${ev.result_count === 1 ? '' : 's'}).`,
      'Reply `claim` to take this lead and get the buyer\'s consent.',
    ].join('\n')
    for (const sub of subs) {
      if (!subCoversCity(sub.city, ev.city)) continue
      const digits = digitsOnly(sub.phone || '')
      if (!digits) continue
      const setKey = `${digits}:${demandPingKey(ev.term, ev.city)}`
      let last = ''
      try {
        last = (await getBotSetting(setKey)) || ''
      } catch {
        last = ''
      }
      if (last) {
        const seen = Date.parse(last)
        if (!Number.isNaN(seen) && Date.now() - seen < DEMAND_DEDUPE_MS) continue
      }
      try {
        await setBotSetting(setKey, new Date().toISOString())
      } catch {
        /* best-effort dedupe, fail open */
      }
      await sendWhatsAppMessage(digits, body).catch(() => {})
    }
  } catch {
    /* fail open */
  }
}

export async function listDemandSubscribers(): Promise<
  { phone: string; city: string }[]
> {
  try {
    const { data } = await getSupabase()
      .from('bot_settings')
      .select('key, value')
      .like('key', `${DEMAND_SUB_KEY}:%`)
    return (data || [])
      .map((row: { key: string; value: string }) => ({
        phone: (row.key || '').slice(DEMAND_SUB_KEY.length + 1),
        city: String(row.value || ''),
      }))
      .filter((r) => !!r.phone && !!r.city)
  } catch {
    return []
  }
}

export async function recordDemandSub(digits: string, city: string): Promise<void> {
  try {
    await setBotSetting(
      `${DEMAND_SUB_KEY}:${digitsOnly(digits)}`,
      (city || '').trim().toLowerCase()
    )
  } catch {
    /* fail open */
  }
}

/** Current radar subscription: '' = off, 'all', or a lowercase city. */
export async function getDemandSub(digits: string): Promise<string> {
  try {
    return (await getBotSetting(`${DEMAND_SUB_KEY}:${digitsOnly(digits)}`)) || ''
  } catch {
    return ''
  }
}

/** Newest unclaimed demand event the supplier's subscription covers. */
export async function findClaimableDemandEvent(
  supplierDigits: string,
  subCity: string
): Promise<DemandEventRow | null> {
  try {
    const me = digitsOnly(supplierDigits)
    const { data } = await getSupabase()
      .from('demand_events')
      .select(
        'id, term, city, result_count, buyer, claimed_by, claimed_at, rq_id'
      )
      .is('claimed_by', null)
      .order('created_at', { ascending: false })
      .limit(50)
    for (const row of (data as DemandEventRow[] | null) || []) {
      if (!row?.id) continue
      if (digitsOnly(row.buyer) === me) continue
      if (!subCoversCity(subCity, row.city)) continue
      return row
    }
    return null
  } catch {
    return null
  }
}

/** Optimistically claim a lead; false if someone else got there first. */
export async function claimDemandEvent(
  eventId: number,
  supplierDigits: string
): Promise<boolean> {
  try {
    const { data } = await getSupabase()
      .from('demand_events')
      .update({
        claimed_by: digitsOnly(supplierDigits),
        claimed_at: new Date().toISOString(),
      })
      .eq('id', eventId)
      .is('claimed_by', null)
      .select('id')
    return !!data && data.length > 0
  } catch {
    return false
  }
}

export async function unclaimDemandEvent(
  eventId: number,
  supplierDigits?: string
): Promise<void> {
  try {
    let q = getSupabase()
      .from('demand_events')
      .update({ claimed_by: null, claimed_at: null })
      .eq('id', eventId)
    if (supplierDigits) q = q.eq('claimed_by', supplierDigits)
    await q
  } catch {
    /* fail open */
  }
}

export async function setDemandEventRq(eventId: number, rqId: string): Promise<void> {
  try {
    await getSupabase().from('demand_events').update({ rq_id: rqId }).eq('id', eventId)
  } catch {
    /* fail open */
  }
}

export async function getDemandEventById(eventId: number): Promise<DemandEventRow | null> {
  try {
    const { data } = await getSupabase()
      .from('demand_events')
      .select('id, term, city, result_count, buyer, claimed_by, claimed_at, rq_id')
      .eq('id', eventId)
      .maybeSingle()
    return (data as DemandEventRow | null) || null
  } catch {
    return null
  }
}

/** Valid claim held by this supplier within the TTL, else null. */
export async function consumeClaim(
  eventId: number,
  supplierDigits: string
): Promise<DemandEventRow | null> {
  const ev = await getDemandEventById(eventId)
  if (!ev) return null
  if (digitsOnly(ev.claimed_by || '') !== digitsOnly(supplierDigits)) return null
  if (!ev.claimed_at || Date.now() - Date.parse(ev.claimed_at) > CLAIM_TTL_MS) return null
  return ev
}

export async function verifiedListingFor(phone: string): Promise<Business | null> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('*')
      .eq('verified', true)
      .eq('phone', digitsOnly(phone))
      .maybeSingle()
    return (data as Business | null) || null
  } catch {
    return null
  }
}

