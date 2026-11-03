import { getSupabase } from '@wa-directory/shared'
import type { ResultCard } from '@wa-directory/shared'

export interface ChatSessionData {
  name?: string
  whatsapp_username?: string
  phone?: string
  country_code?: string
  category?: string
  // Multi-category support (the listing form fills up to 4).
  categories?: string[]
  description?: string
  city?: string
  area?: string
  // Optional listing details carried through registration (mostly empty;
  // the webapp form supports far more fields than the chat flow asks for).
  website?: string
  address?: string
  phone_type?: 'whatsapp' | 'voice'
  price_range?: string
  whole_country?: boolean
  // Living form state for the paragraph intake flow (step 'list_form').
  list?: import('./listing-intake.js').ListingFormState
  // Guided wizard: index of the current question in LIST_WIZARD_STEPS.
  // -1 (or missing) = review/legacy free-text mode on the same form state.
  wizard?: number
  // Personal contact draft (step 'reg_contact'): name + phone + optional
  // city and up to 3 social links.
  contact?: { name: string; phone: string; city: string | null; socials?: string[] }
  rating_pending?: string
  // ── Bot search flow ────────────────────────────────────────────────
  // Term typed by the user while waiting for a town ("Which town?").
  pending_search_term?: string
  // Town captured first, waiting for the search term ("What do you need in X?").
  pending_city?: string
  // Shared location ("Near me" flow): the user's point, used as the origin
  // for km-ranked nearby searches.
  origin_lat?: number
  origin_lng?: number
  // Render-ready numbered results currently on screen (taps + typed picks
  // route through the same order).
  results?: ResultCard[]
  // What the user is currently looking at, for ⬅ Back routing.
  lastScreen?: 'list' | 'detail'
  // Where the search originated, so Back can restore the previous prompt.
  origin?: 'search_loc' | 'search_term' | 'free'
  // Search label of the current results, for Back re-rendering.
  lastTerm?: string
  lastCity?: string | null
  // True when the on-screen list is the nearest-towns tier.
  nearby?: boolean
  // 0-based page of the results list (9 businesses per page).
  page?: number
  // ── Bot pay flow ─────────────────────────────────────────────────────
  // Candidate businesses from a pay search (rows pay1..payN map by index).
  pay_candidates?: { id: string; name: string }[]
  // The business currently being paid (public WA-XXXXXX id + display name).
  pay_business?: { id: string; name: string }
  // Plan chosen at the pay_plan step.
  pay_plan?: '1m' | '6m' | '12m'
  // ── Need intake (S16 matchmaking) ──────────────────────────────────
  // Living need draft: what, how many, budget hint, town.
  need?: { item: string; qty: string; budget: string; city: string }
  // ── Admin commands over WhatsApp ──────────────────────────────────
  // Last `pending` listing: business ids in display order for verify N.
  pendingBiz?: string[]
  // Fuzzy-match suggestions: op + day-grant carried through the pick.
  pendingOp?: 'verify' | 'unverify'
  pendingDays?: number
  // Pending product photo (item_photo flow): uploaded URL awaiting name+price.
  pendingItemImage?: string
  pendingItemBiz?: { id: string; name: string }
  // Broadcast draft (admin_cast step): segment + filter + body + optional
  // release time, waiting on the ✅/⏰ confirm tap.
  castSpec?: import('@wa-directory/shared').CastSpec
  // ── Typed customer order (S18.2) ─────────────────────────────────────
  // Draft of the order being verified: parsed "2 bread 1 cake" matched
  // against shelves, grouped per supplier. Committed on the ✅ tap.
  pendingOrder?: PendingOrder
  // Last business whose detail card was opened — lets a bare `order …` line
  // prefer that shop's shelf first.
  lastBizId?: string
  // ── Direction change (intent pivot) ─────────────────────────────────
  // The flow the user was mid-way through when they said something that
  // opened a different one ("shopping → actually, register my business").
  // Set aside rather than deleted, so *resume* can restore it.
  paused?: PausedDraft
  // ── Goal-word ask (two-way: search vs menu action) ───────────────────
  // A menu word ("pay", "register", "order") that ALSO matched businesses:
  // the prompt waiting on the 🔍 / flow picker tap.
  goal_ask?: { kind: 'register' | 'pay' | 'order'; word: string }
  // ── Cross-business cart (item browsing flow) ────────────────────────
  // Persistent cart across searches, grouped by supplier at checkout.
  cart?: CartItem[]
  // Optional note attached to the whole cart (delivery instructions, etc.).
  cartNote?: string
  // Current item-browsing context: which business + page we're viewing.
  browseBizId?: string
  browsePage?: number
}

// One item in the cross-business chat cart.
export interface CartItem {
  businessId: string
  businessName: string
  itemId: string
  itemName: string
  price: number
  qty: number
  imageUrl?: string
}

// One shelved flow: the step it was on plus the data it had collected.
export interface PausedDraft {
  step: string
  data: ChatSessionData
  at: string
}

// How long a shelved flow stays resumable before it is ignored (and then
// dropped by the next save).
export const PAUSE_TTL_MS = 24 * 60 * 60 * 1000

// One supplier slice of a pending order.
export interface PendingGroup {
  businessId: string
  businessName: string
  supplierDigits: string
  city?: string
  lines: { name: string; qty: number; price: number | null }[]
}

export interface PendingOrder {
  groups: PendingGroup[]
  clearable?: string[]
}

export interface ChatSession {
  phone: string
  step: string
  data: ChatSessionData
}

export async function getSession(phone: string): Promise<ChatSession | null> {
  try {
    const { data } = await getSupabase()
      .from('chat_sessions')
      .select('phone, step, data')
      .eq('phone', phone)
      .maybeSingle()

    if (!data) return null
    return { phone: data.phone, step: data.step, data: data.data || {} }
  } catch {
    return null
  }
}

export async function saveSession(phone: string, step: string, data: ChatSessionData) {
  try {
    const supabase = getSupabase()
    let out = data
    // A flow shelved by an intent pivot survives every later save unless the
    // caller explicitly drops it (`paused: undefined`), so moving to another
    // flow never silently throws the half-finished one away.
    if (!('paused' in data)) {
      const { data: row } = await supabase
        .from('chat_sessions')
        .select('data')
        .eq('phone', phone)
        .maybeSingle()
      const paused = row?.data?.paused as PausedDraft | undefined
      if (paused?.step && Date.now() - Date.parse(paused.at || '') < PAUSE_TTL_MS) {
        out = { ...data, paused }
      }
    }
    await supabase
      .from('chat_sessions')
      .upsert({ phone, step, data: out, updated_at: new Date().toISOString() }, { onConflict: 'phone' })
  } catch (err) {
    console.error('[chat-session] save failed:', err)
  }
}

export async function clearSession(phone: string) {
  try {
    await getSupabase().from('chat_sessions').delete().eq('phone', phone)
  } catch (err) {
    console.error('[chat-session] clear failed:', err)
  }
}

// ─── Cart helpers (cross-business, persisted in chat_sessions.data.cart) ───

/** Get the current cart from a session's data object (safe default). */
export function getCart(data: ChatSessionData): CartItem[] {
  return data.cart || []
}

/** Add an item to the cart; merges qty if same business+item already present. */
export function addToCart(data: ChatSessionData, item: CartItem): ChatSessionData {
  const cart = getCart(data)
  const existingIdx = cart.findIndex(
    c => c.businessId === item.businessId && c.itemId === item.itemId
  )
  let newCart: CartItem[]
  if (existingIdx >= 0) {
    newCart = [...cart]
    newCart[existingIdx] = { ...newCart[existingIdx], qty: newCart[existingIdx].qty + item.qty }
  } else {
    newCart = [...cart, item]
  }
  return { ...data, cart: newCart }
}

/** Update quantity for a specific cart item (by businessId + itemId). Removes if qty <= 0. */
export function updateCartQty(
  data: ChatSessionData,
  businessId: string,
  itemId: string,
  qty: number
): ChatSessionData {
  const cart = getCart(data)
  const newCart = cart
    .map(c => (c.businessId === businessId && c.itemId === itemId ? { ...c, qty } : c))
    .filter(c => c.qty > 0)
  return { ...data, cart: newCart }
}

/** Remove a specific item from cart. */
export function removeFromCart(data: ChatSessionData, businessId: string, itemId: string): ChatSessionData {
  const cart = getCart(data).filter(c => !(c.businessId === businessId && c.itemId === itemId))
  return { ...data, cart }
}

/** Clear the entire cart. */
export function clearCart(data: ChatSessionData): ChatSessionData {
  return { ...data, cart: [] }
}

/** Grouped summary for checkout: per-supplier totals and a grand total. */
export function getCartSummary(data: ChatSessionData): {
  groups: { businessId: string; businessName: string; items: CartItem[]; subtotal: number }[]
  totalItems: number
  grandTotal: number
} {
  const cart = getCart(data)
  const byBiz = new Map<string, CartItem[]>()
  for (const item of cart) {
    const arr = byBiz.get(item.businessId) || []
    arr.push(item)
    byBiz.set(item.businessId, arr)
  }
  const groups = [...byBiz.entries()].map(([businessId, items]) => ({
    businessId,
    businessName: items[0].businessName,
    items,
    subtotal: items.reduce((sum, i) => sum + i.price * i.qty, 0),
  }))
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0)
  const grandTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  return { groups, totalItems, grandTotal }
}