import crypto from 'node:crypto'
import {
  sendWhatsAppMessage as sendWhatsAppText,
  sendInteractiveList as sendInteractiveListRaw,
  sendInteractiveButtons as sendInteractiveButtonsRaw,
  sendInteractiveImageCard,
  sendCtaUrl as sendCtaUrlRaw,
  sendLocationRequest as sendLocationRequestRaw,
  sendReaction as sendReactionRaw,
  sendWhatsAppDocument as sendWhatsAppDocumentRaw,
  sendImageWithFallback,
  sendContactCard,
  markRead,
  sendWhatsAppTemplate,
} from '@wa-directory/shared'
import type { InteractiveRow, InteractiveButton } from '@wa-directory/shared'
import { monoUSD } from '@wa-directory/shared'
import { logBotMessage, logBotSearch } from '@wa-directory/shared'
import { orderSearchResults } from '@wa-directory/shared'
import { expandSearchQuery, classifyIntent } from '@wa-directory/shared'
import type { Business } from '@wa-directory/shared'
import {
  startRegistrationFlow,
  chooseRegistrationPlan,
  handleRegistrationMessage,
  handleRegistrationImage,
  REGISTRATION_BUTTONS,
} from '@wa-directory/shared'
import {
  getConversationState,
  setConversationState,
  updateConversationContext,
  clearConversationState,
  hasActiveOnboardingState,
  ConversationState,
} from '@wa-directory/shared'
import { TRIAL_PLAN_LABEL } from '@wa-directory/shared'
import {
  getSession,
  saveSession,
  clearSession,
  PAUSE_TTL_MS,
  type ChatSession,
  type ChatSessionData,
  type PausedDraft,
  type PendingGroup,
  type PendingOrder,
  getCart,
  addToCart,
  updateCartQty,
  removeFromCart,
  clearCart,
  getCartSummary,
  type CartItem,
} from '../lib/chat-session.js'
import { fetchBusinessItems } from '@wa-directory/shared'
import { compileOrderText } from '@wa-directory/shared'
import { parseOrderLine, matchOrder, type ShelfSupplier, type OrderPair, type MatchResult } from '../lib/order-intake.js'
import {
  DATA_ENTRY_STEPS,
  detectPivot,
  familyOf,
  pivotCandidateForIntent,
  goalKindForWord,
  type GoalAskKind,
} from '../lib/intent-pivot.js'
import {
  createSupplyOrder, recordOrderOpen, claimSupplyOrder, getSupplyOrderById, listOrdersForBusiness,
  listOrdersForBuyer, orderStats, type SupplyOrderRow,
} from '@wa-directory/shared'
import { getSupabase } from '@wa-directory/shared'
import { upsertBotContact, markBotContactOptOut, setBotContactOptIn, hasSeenContact, sweepIdleNudges, getBotContactName } from '../lib/bot-contacts.js'
import { getBotSetting, setBotSetting } from '@wa-directory/shared'
import { createListing } from '@wa-directory/shared'
import { uploadLogoImage } from '@wa-directory/shared'
import { fetchWhatsAppMedia, perceiveMedia, mediaRateOk, type MediaKind, type MediaSense } from '../lib/bot-sense.js'
import {
  parseListingMessage,
  renderListingForm,
  renderMissingRequiredList,
  missingRequired,
  findListingCity,
  applyListingFields,
  isSinglePriceRange,
  needsAIPass,
  LIST_INTRO,
  LIST_WIZARD_STEPS,
  wizardStepAnswered,
  firstUnansweredWizardStep,
  wizardProgress,
  wizardIntro,
  type ListingFormState,
} from '../lib/listing-intake.js'
import { aiPatchListing } from '../lib/listing-ai.js'
import { findBusinessesByName, activateListingForDays, notifyBusinessLive, bestNameSimilarity, type VerifyCandidate } from '@wa-directory/shared'
import { imageLuminanceFromUrl } from '@wa-directory/shared'
import { curatedRelatedTerms } from '@wa-directory/shared'
import { slugify } from '@wa-directory/shared'
import { zimbabweCities } from '@wa-directory/shared'
import { validatePhone } from '@wa-directory/shared'
import { getApprovedCategories, getApprovedAreas, matchCategoryAgainst, matchCategoryLearned, findCityLearned, findAreaLearned } from '@wa-directory/shared'
import { searchPayBusinesses, type PayBusiness } from '@wa-directory/shared'
import { createListingPayment, paymentAmountFor } from '@wa-directory/shared'
import { normalizeEcoCashPhone, initiateEcoCashPayment, logPaymentEvent, type PaymentAdapters } from '@wa-directory/shared'
import { PLAN_CONFIG, PERSONAL_PLAN_CONFIG } from '@wa-directory/shared'
import type { PlanType } from '@wa-directory/shared'
import { SITE_URL } from '@wa-directory/shared'
import { digitsOnly } from '@wa-directory/shared'
import { listEmergencyContacts, addEmergencyContact, deleteEmergencyContact, clearEmergencyContacts, findEmergencyNear, parseEmergencyAdd, emergencyWaLink, categoryIcon, VALID_CATEGORIES } from '../lib/emergency.js'
import {
  CHAT_OPEN_MARKER,
  renderResultsListBody,
  renderNearbyListBody,
  renderNearMeListBody,
  resultRows,
  RESULTS_PER_PAGE,
  renderMainMenuBody,
  renderFirstWelcome,
  renderWelcomeBack,
  renderChannelPitch,
  renderGreetingBody,
  renderDetailCard,
  renderChatPrompt,
  chatCtaUrl,
  renderEmptyResults,
  renderInvalidSelection,
  renderErrorCard,
  FALLBACK_HELP_LINES,
  SUPPLIER_HELP_LINES,
  renderNeedIntro,
  renderNeedConfirm,
  renderNeedPosted,
  renderQuoteCard,
  renderNeedSilence,
  renderNeedClosedByBuyer,
  renderNeedFilled,
  renderDealAsk,
  renderCeremony,
  formatPhone,
  renderOrderVerify,
  renderOrderSent,
  renderMyOrders,
  type ResultCard,
} from '@wa-directory/shared'
import {
  addNeedQuote,
  adminWeeklyStats,
  bumpDigestCursor,
  canonicalRq,
  closeNeedByRqId,
  channelPostFor,
  compileDigest,
  createNeed,
  fmtHarare,
  getDigestCursor,
  getNeedById,
  getNeedByRqId,
  getQuoteById,
  listNeedQuotes,
  listOpenNeeds,
  listNeedsOnDay,
  parseDigestWindow,
  prioritySwitchState,
  reopenNeed,
  setPrioritySwitch,
} from '@wa-directory/shared'
import {
  parseCastSpec,
  resolveCastAudience,
  enqueueCast,
  sendCastChunk,
  renderCastsList,
  cancelCast,
  SYNC_MAX_SENDS,
  MAX_AUDIENCE,
  type CastSpec,
} from '@wa-directory/shared'
// S18.5 Supplier Demand Radar — lib/radar.ts helpers (fail-open by design).
import {
  emitDemandSearch,
  getDemandSub,
  recordDemandSub,
  findClaimableDemandEvent,
  claimDemandEvent,
  unclaimDemandEvent,
  setDemandEventRq,
  getDemandEventById,
  consumeClaim,
  verifiedListingFor,
} from '../lib/radar.js'

const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN
// Verify Meta's X-Hub-Signature-256 over the raw request body. Fail closed:
// if WHATSAPP_APP_SECRET is unset, no inbound payload can be authenticated, so
// forged messages (toll fraud, fake listings, fake ratings) are rejected.
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET
  if (!appSecret) return false
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false
  const provided = Buffer.from(signatureHeader.slice(7), 'hex')
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest()
  if (provided.length !== expected.length) return false
  return crypto.timingSafeEqual(provided, expected)
}
const ADMIN_WHATSAPP = process.env.ADMIN_WHATSAPP
const COUNTRY_CODE = '+263'

const STOPWORDS = new Set([
  'i', 'am', 'im', 'looking', 'for', 'a', 'an', 'the', 'find', 'in', 'at', 'near',
  'me', 'please', 'help', 'need', 'want', 'to', 'and', 'or', 'is', 'are', 'with',
  'some', 'get', 'any', 'have', 'just', 'like', 'of', 'on', 'my', 'your',
])

// ── Admin settings (S16.1) ────────────────────────────────────────────────
// Channel link: bot_settings override, env (CHANNEL_LINK) fallback.
async function channelLinkRaw(): Promise<string> {
  const override = await getBotSetting('channel_link')
  return (override || process.env.CHANNEL_LINK || '').trim()
}

async function channelLine(): Promise<string> {
  const link = await channelLinkRaw()
  return link ? `📲 Live buys & deals: ${link}` : ''
}

async function helpText(from?: string): Promise<string> {
  const ch = await channelLine()

  // Check if user is a supplier (has active business listings)
  let isSupplier = false
  if (from) {
    const activeListings = await findActiveListingsForPhone(from)
    isSupplier = activeListings.length > 0
  }

  const siteUrl = SITE_URL
  const channelUrl = ch.replace('📲 Live buys & deals: ', '')
  const helpLines = isSupplier
    ? SUPPLIER_HELP_LINES(siteUrl, channelUrl)
    : FALLBACK_HELP_LINES(siteUrl, channelUrl)

  return helpLines.join('\n')
}

// Extra admin numbers live in bot_settings.admin_allowlist (JSON array).
// The env ADMIN_WHATSAPP number is always the undeletable owner.
async function adminNumbers(): Promise<string[]> {
  const root = digitsOnly(ADMIN_WHATSAPP || '')
  const raw = await getBotSetting('admin_allowlist')
  let extras: string[] = []
  try {
    const parsed = JSON.parse(raw || '[]')
    if (Array.isArray(parsed)) extras = parsed.map(x => digitsOnly(String(x))).filter(Boolean)
  } catch {
    extras = []
  }
  return [...new Set([root, ...extras].filter(Boolean))]
}

async function isBotAdmin(from: string): Promise<boolean> {
  return (await adminNumbers()).includes(digitsOnly(from))
}

function fmtAdminNumber(n: string): string {
  return `+${n}`
}

interface PendingBusiness {
  id: string
  name: string
  phone: string | null
  city: string | null
  created_at: string
}

async function listUnverifiedBusinesses(limit = 10): Promise<PendingBusiness[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, phone, city, created_at')
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data as PendingBusiness[]) || []
  } catch {
    return []
  }
}

// Newest businesses regardless of state — the "listings" admin view.
type BusinessSummary = {
  id: number
  name: string
  username: string | null
  city: string | null
  verified: boolean
  payment_status: string | null
  created_at: string
}

async function listRecentBusinesses(limit = 10): Promise<BusinessSummary[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, username, city, verified, payment_status, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)
    return (data as BusinessSummary[]) || []
  } catch {
    return []
  }
}

// The whole directory (businesses + personal contacts share the businesses
// table; personal rows carry 'Personal Contact' in their category array).
// Expired listings are excluded — renewals are tracked elsewhere (bot-only
// duplication with the Subscriptions tab is intentional).
type DirectoryRow = {
  id: number
  name: string
  city: string | null
  phone: string
  phone_type: string | null
  category: string[] | null
}

async function listDirectoryRows(limit = 600): Promise<DirectoryRow[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, city, phone, phone_type, category')
      .neq('payment_status', 'expired')
      .order('name', { ascending: true })
      .limit(limit)
    return (data as DirectoryRow[]) || []
  } catch {
    return []
  }
}

// Rows are pre-blocked at ~38 lines so each WhatsApp message stays well
// under the 4KB media limit even after bold + emoji widening.
function contactChunkMessages(
  header: string,
  rows: Array<{ name: string; city: string | null; phone: string; phoneType: string | null }>,
  startIndex = 0
): string[] {
  const lines = rows.map((r, i) => {
    const num = formatPhone(r.phone) || 'no number'
    return `${startIndex + i + 1}. *${r.name}* · ${r.city || '-'} · ${num}${r.phoneType === 'voice' ? ' 📞' : ''}`
  })
  if (lines.length === 0) return []
  const pageSize = 38
  const pages: string[] = []
  for (let i = 0; i < lines.length; i += pageSize) {
    const part = lines.slice(i, i + pageSize)
    pages.push(
      i === 0
        ? [header, `${rows.length} listed`, '', ...part].join('\n')
        : ['…cont.', '', ...part].join('\n')
    )
  }
  return pages
}

// Everyone who has ever messaged the bot — the engagement list.
type ChatCsvRow = {
  phone: string
  name: string | null
  first_seen: string | null
  last_seen: string | null
  message_count: number | null
  last_step: string | null
  opted_out: boolean | null
}

async function listChatCsvRows(limit = 200): Promise<ChatCsvRow[]> {
  try {
    const { data } = await getSupabase()
      .from('bot_contacts')
      .select('phone, name, first_seen, last_seen, message_count, last_step, opted_out')
      .order('message_count', { ascending: false })
      .order('last_seen', { ascending: false })
      .limit(limit)
    return (data as ChatCsvRow[]) || []
  } catch {
    return []
  }
}

// ── CSV exports (admin) ───────────────────────────────────────────────────
function csvEsc(value: unknown): string {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvBody(headers: string[], rows: unknown[][]): string {
  const lines = [headers.join(','), ...rows.map(r => r.map(csvEsc).join(','))]
  return lines.join('\r\n') + '\r\n'
}

type BizCsvRow = {
  name: string
  username: string | null
  city: string | null
  phone: string
  phone_type: string | null
  verified: boolean
  payment_status: string | null
  created_at: string | null
  socials: string[] | null
  category: string[] | null
}

async function listBizCsvRows(): Promise<BizCsvRow[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('name, username, city, phone, phone_type, verified, payment_status, created_at, socials, category')
      .neq('payment_status', 'expired')
      .order('name', { ascending: true })
      .limit(600)
    return (data as BizCsvRow[]) || []
  } catch {
    return []
  }
}

function csvForBusinesses(rows: BizCsvRow[]): string {
  return csvBody(
    ['name', 'username', 'city', 'phone', 'phone_type', 'verified', 'payment_status', 'created_at'],
    rows
      .filter(r => !(r.category || []).includes('Personal Contact'))
      .map(r => [r.name, r.username || '', r.city || '', r.phone, r.phone_type || 'whatsapp', r.verified ? 'true' : 'false', r.payment_status || '', r.created_at || ''])
  )
}

function csvForPeople(rows: BizCsvRow[]): string {
  return csvBody(
    ['name', 'city', 'phone', 'phone_type', 'socials', 'created_at'],
    rows
      .filter(r => (r.category || []).includes('Personal Contact'))
      .map(r => [r.name, r.city || '', r.phone, r.phone_type || 'whatsapp', (r.socials || []).join(' | '), r.created_at || ''])
  )
}

function csvForChats(rows: ChatCsvRow[]): string {
  return csvBody(
    ['name', 'phone', 'first_seen', 'last_seen', 'notes', 'last_step', 'opted_out'],
    rows.map(r => [r.name || '', r.phone, r.first_seen || '', r.last_seen || '', r.message_count ?? 0, r.last_step || '', r.opted_out ? 'true' : 'false'])
  )
}

// ── Transcript-logging send wrappers (S16) ────────────────────────────────
// Every bot send goes through one replay: the raw Cloud API call plus a
// fire-and-forget transcript row in bot_messages. Call sites keep the old
// names, so logging covers every flow without touching them.
function logOut(to: string, kind: string, body: string) {
  logBotMessage(to, 'out', kind, body).catch(() => {})
}

async function sendWhatsAppMessage(to: string, message: string, replyTo?: string) {
  logOut(to, 'text', message)
  return sendWhatsAppText(to, message, replyTo)
}

// Payment adapters so the shared listing-pay engine can fire the real EcoCash
// push and log events from inside the bot. sendWhatsAppMessage here is the
// transcript-logging local wrapper, NOT the shared one.
function buildPaymentAdapters(): PaymentAdapters {
  return {
    initiateEcoCashPayment,
    logPaymentEvent,
    sendWhatsAppMessage: (phone, text) => sendWhatsAppMessage(phone, text),
  }
}

async function sendInteractiveList(
  to: string,
  body: string,
  rows: InteractiveRow[],
  buttonLabel = 'Choose a business',
  replyTo?: string
) {
  logOut(to, 'list', `${body}\n↳ rows: ${rows.map(r => r.title).join(' | ')}`)
  return sendInteractiveListRaw(to, body, rows, buttonLabel, replyTo)
}

async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: InteractiveButton[],
  replyTo?: string
) {
  logOut(to, 'buttons', `${body}\n[${buttons.map(b => b.title).join(' | ')}]`)
  return sendInteractiveButtonsRaw(to, body, buttons, replyTo)
}

async function sendCtaUrl(to: string, body: string, displayText: string, url: string) {
  logOut(to, 'cta', `${body}\n→ ${url}`)
  return sendCtaUrlRaw(to, body, displayText, url)
}

async function sendLocationRequest(to: string, body: string) {
  logOut(to, 'location_req', body)
  return sendLocationRequestRaw(to, body)
}

async function sendReaction(to: string, messageId: string, emoji: string) {
  logOut(to, 'reaction', `[${emoji}] on ${messageId}`)
  return sendReactionRaw(to, messageId, emoji)
}

async function sendWhatsAppDocument(to: string, filename: string, mime: string, content: string) {
  logOut(to, 'document', `${filename} (${mime})`)
  return sendWhatsAppDocumentRaw(to, filename, mime, content)
}

function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50) || 'business'
  )
}

function findCity(text: string): string | null {
  const lower = text.toLowerCase()
  for (const c of zimbabweCities) {
    if (lower.includes(c.name.toLowerCase())) return c.name
  }
  return null
}

function findArea(city: string, text: string): string | null {
  const cityObj = zimbabweCities.find(c => c.name === city)
  if (!cityObj) return null
  const lower = text.toLowerCase()
  for (const a of cityObj.areas) {
    if (lower.includes(a.toLowerCase())) return a
  }
  return null
}

// ── Product / location search helpers ────────────────────────────────────

interface BotBusinessRow {
  id: string
  name: string
  slug: string | null
  category: string[] | null
  city: string | null
  area: string | null
  price_range: string | null
  rating: number
  review_count: number | null
  phone: string | null
  phone_type: string | null
  lat: number | null
  lng: number | null
  socials?: string[] | null
  verified: boolean
  payment_status: string | null
  response_time_minutes: number | null
  orders_fulfilled: number | null
  escrow_eligible: boolean
  website?: string | null
  generate_site?: boolean | null
}

const BOT_BIZ_COLUMNS =
  'id, name, slug, category, city, area, price_range, rating, review_count, phone, phone_type, lat, lng, socials, verified, payment_status, response_time_minutes, orders_fulfilled, escrow_eligible, website, generate_site'

interface ParsedQuery {
  term: string
  city: string | null
  nationwide: boolean
  // Optional "Near me" origin — when set, candidate ordering switches to
  // distance (km) from this point instead of the city ranking.
  origin?: { lat: number; lng: number } | null
}

const NATIONWIDE_RE =
  /(whole country|country ?wide|nation ?wide|everywhere|anywhere|all (of )?(the )?(cities|towns)|across zimbabwe|all over zimbabwe|\bzimbabwe\b)/i

function parseQuery(text: string): ParsedQuery {
  const nationwide = NATIONWIDE_RE.test(text)
  const city = findCity(text)
  let t = text.toLowerCase()
  if (nationwide) t = t.replace(NATIONWIDE_RE, ' ')
  if (city) t = t.replace(new RegExp(city.toLowerCase(), 'g'), ' ')
  const words = t.split(/[^a-z0-9]+/).filter(w => w.length > 1 && !STOPWORDS.has(w))
  return { term: words.join(' '), city, nationwide }
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

async function recordBotEvents(businesses: { id: string }[]) {
  try {
    const rows = businesses.map(b => ({
      business_id: b.id,
      type: 'bot_search' as const,
      category: '',
      city: '',
    }))
    await getSupabase().from('stats_events').insert(rows)
  } catch {
    // fire-and-forget
  }
}

async function appendTranscript(from: string, text: string, fromBot = false) {
  try {
    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('id, business_id, messages')
      .eq('customer_phone', from)
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(5)

    const row = (logs || []).find(l => {
      const arr = Array.isArray(l.messages) ? l.messages : []
      const last = arr.length ? arr[arr.length - 1] : null
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes(CHAT_OPEN_MARKER)
    })

    if (!row) return

    const messages = Array.isArray(row.messages) ? row.messages : []
    messages.push({ from: fromBot ? 'bot' : 'customer', text, at: new Date().toISOString() })
    await supabase
      .from('chat_logs')
      .update({ messages, updated_at: new Date().toISOString() })
      .eq('id', row.id)
  } catch {
    // best-effort transcript
  }
}

async function refreshBusinessRating(businessId: string) {
  try {
    const supabase = getSupabase()
    const { data: ratings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('business_id', businessId)
    const list = ratings || []
    if (list.length === 0) return
    const avg = list.reduce((a, r) => a + Number(r.rating), 0) / list.length
    await supabase
      .from('businesses')
      .update({ rating: Math.round(avg * 10) / 10, review_count: list.length })
      .eq('id', businessId)
  } catch {
    // best-effort
  }
}

async function handleRatingReply(from: string, session: ChatSession | null, text: string): Promise<boolean> {
  const pendingBusinessId = session?.data?.rating_pending
  if (!pendingBusinessId) return false

  const supabase = getSupabase()
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('id', pendingBusinessId)
    .maybeSingle()

  if (!business) return false

  const lower = text.toLowerCase()
  if (/^(skip|no|pass|nope)/.test(lower)) {
    await saveSession(from, 'done', {})
    await sendWhatsAppMessage(from, `No problem! Thanks for trying *${business.name}*. Reply *help* anytime.`)
    return true
  }

  // Search-first everywhere: a mid-rating reply that reads as a search exits
  // the rating step and runs the search instead of nagging.
  const parsed = parseQuery(text)
  if (parsed.term || parsed.city || parsed.nationwide) {
    await clearSession(from)
    await dispatchSearch(from, text)
    return true
  }

  const match = text.trim().match(/^([1-5])\b[\s\S]*/)
  if (!match) {
    await sendWhatsAppMessage(
      from,
      `How was your experience with *${business.name}*? Reply a number 1 to 5 (1 = poor, 5 = excellent), or *skip*.`
    )
    return true
  }

  const rating = Number(match[1])
  const comment = text.trim().slice(match[0].length).trim().replace(/^[\u2014\u2013\-:.]\s*/, '')

  // Portal review display gets richer when we know the customer's name
  // (captured from their WhatsApp profile during conversations).
  const { data: contact } = await supabase
    .from('bot_contacts')
    .select('name')
    .eq('phone', from)
    .maybeSingle()

  await supabase.from('ratings').insert({
    business_id: business.id,
    customer_phone: from,
    name: (contact?.name || '').slice(0, 120),
    rating,
    comment: comment.slice(0, 500),
  })
  await refreshBusinessRating(business.id)
  await saveSession(from, 'done', {})

  await sendWhatsAppMessage(
    from,
    [
      `🙏 *Thank you!* You rated *${business.name}* ${rating}/5.`,
      comment ? `Your comment: "${comment}"` : '',
      '',
      'Your review helps other customers. Reply *help* anytime.',
    ].filter(Boolean).join('\n')
  )
  return true
}

async function promptRatingIfDue(from: string): Promise<ChatSession | null> {
  try {
    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    const { data: logs } = await supabase
      .from('chat_logs')
      .select('business_id, messages')
      .eq('customer_phone', from)
      .gte('updated_at', cutoff)
      .order('updated_at', { ascending: false })
      .limit(3)

    const opened = (logs || []).find(l => {
      const arr = Array.isArray(l.messages) ? l.messages : []
      const last = arr.length ? arr[arr.length - 1] : null
      return last && typeof last === 'object' && (last as any).from === 'bot' && String((last as any).text || '').includes(CHAT_OPEN_MARKER)
    })

    if (!opened?.business_id) return null

    const { data: existingRating } = await supabase
      .from('ratings')
      .select('id')
      .eq('business_id', opened.business_id)
      .eq('customer_phone', from)
      .gte('created_at', cutoff)
      .maybeSingle()

    if (existingRating) return null

    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', opened.business_id)
      .maybeSingle()
    if (!business) return null

    const session = await getSession(from)
    if (session?.step === 'rating') return session

    await saveSession(from, 'rating', { rating_pending: opened.business_id })
    await sendWhatsAppMessage(
      from,
      [
        `Did you just chat with *${business.name}*?`,
        '',
        `Rate your experience 1 to 5 (1 = poor, 5 = excellent), add a short comment if you like, or reply *skip*.`,
      ].join('\n')
    )
    return { phone: from, step: 'rating', data: { rating_pending: opened.business_id } }
  } catch {
    return null
  }
}

async function sendAskTown(from: string, term: string, again = false, withLocation = false) {
  let msg = ''
  if (!again && term) {
    msg = `*${term}* 👍 Which town are you in?\n\n`
  } else {
    msg = `Which town are you in?\n\n`
  }
  const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
  msg += `e.g. ${cities}…\n\nReply *whole country* to search everywhere.`
  if (msg.length <= 1020) {
    await sendInteractiveButtons(from, msg, [
      { id: 'whole_country', title: '🌍 Whole country' },
      { id: 'cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, msg)
  }
  // Fast path: sharing the live location ranks matches by real km.
  if (withLocation) {
    await sendLocationRequest(
      from,
      term
        ? `Better: share your location once and I'll rank *${term}* by how close it is to you. 📍`
        : 'Better: share your location once and I will rank matches by how close they are to you. 📍'
    )
  }
}

async function sendAskTerm(from: string, city: string | null) {
  let msg: string
  if (city) {
    msg = `What do you need in *${city}*?\n\n(e.g. plumber, bread, salon…)`
  } else {
    msg = 'What product or service are you looking for? (e.g. plumber, bread, salon…)'
  }
  if (msg.length <= 1020) {
    await sendInteractiveButtons(from, msg, [
      { id: 'whole_country', title: '🌍 Whole country' },
      { id: 'cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, msg)
  }
}

// ── S19 goal-word ask ────────────────────────────────────────────────
// "pay" can open the pay flow, but verified businesses called Paymore /
// Payless exist too — the word is BOTH a menu goal and a search term. The
// bot shows the two ways instead of guessing: 🔍 runs the search (any open
// flow gets shelved, *resume* brings it back), the flow button opens that
// flow the same way a stated pivot would.
const GOAL_ASK_LINE: Record<GoalAskKind, string> = {
  pay: '💳 Pay for a listing',
  register: '✎ Register a business',
  order: '🧺 Start an order',
}

async function countVerifiedNameMatches(word: string): Promise<number> {
  try {
    const { count } = await getSupabase()
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .ilike('name', `%${word}%`)
    return count || 0
  } catch {
    return 0
  }
}

async function saveGoalAsk(from: string, kind: GoalAskKind, word: string) {
  const cur = await getSession(from)
  await saveSession(from, cur?.step || 'idle', {
    ...(cur?.data || {}),
    goal_ask: { kind, word },
  })
}

async function sendGoalAskButtons(from: string, kind: GoalAskKind, word: string, found: number) {
  await sendInteractiveButtons(
    from,
    [
      `${found} ${found === 1 ? 'business matches' : 'businesses match'} "${word}" here 🤔`,
      'Search them, or did you mean the menu action?',
    ].join('\n'),
    [
      { id: 'bid_search', title: `🔍 Find "${word}"` },
      { id: 'bid_flow', title: GOAL_ASK_LINE[kind] },
      { id: 'cancel', title: '✖ Cancel' },
    ]
  )
}

function bizMatchesQuery(
  b: BotBusinessRow,
  lowerTerm: string,
  category: string
): boolean {
  const catHit = category !== 'Other' && (b.category || []).includes(category)
  const nameHit = lowerTerm.length >= 3 && (b.name || '').toLowerCase().includes(lowerTerm)
  return catHit || nameHit
}

interface BotResult {
  biz: BotBusinessRow
  // id + image_url ride along so the 📸 single-photo quick action can
  // open that exact item without a second query.
  item: { name: string; price: number | null; id?: string; image_url?: string | null } | null
  km?: number
}

// Cheapest matching item per business (the product tier). Priced items win
// ordering; a business that only lists an unpriced match stays visible via
// the "Price not listed" card instead of vanishing from results.
async function fetchMatchingItems(
  bizIds: string[],
  term: string
): Promise<Map<string, { name: string; price: number | null; id?: string; image_url?: string | null }>> {
  const out = new Map<string, { name: string; price: number | null; id?: string; image_url?: string | null }>()
  if (bizIds.length === 0 || term.length < 3) return out
  const tokens = term.split(/[^a-z0-9]+/).filter(w => w.length >= 2)
  let req = getSupabase()
    .from('business_items')
    .select('business_id, name, price, id, image_url')
    .in('business_id', bizIds)
    .eq('is_active', true)
  // Word-tokens ANDed ("zzcart bread" → name must contain both) so the
  // item tier keeps up with the tokenized order matcher; single tokens
  // degrade to the old substring behavior.
  if (tokens.length >= 2) tokens.forEach(t => { req = req.ilike('name', `%${t}%`) })
  else req = req.ilike('name', `%${term}%`)
  const { data } = await req
    .order('price', { ascending: true })
    .limit(200)
  for (const it of (data as { business_id: string; name: string; price: number | null; id: string; image_url: string | null }[]) || []) {
    const cur = out.get(it.business_id)
    if (it.price != null) {
      if (!cur || cur.price == null || it.price < cur.price) {
        out.set(it.business_id, { name: it.name, price: it.price, id: it.id, image_url: it.image_url })
      }
    } else if (!cur) {
      out.set(it.business_id, { name: it.name, price: null, id: it.id, image_url: it.image_url })
    }
  }
  return out
}

// Search-tier result → template card (pruned to what presentation needs).
function toCard(r: BotResult): ResultCard {
  const b = r.biz as any
  return {
    id: b.id,
    name: b.name,
    city: b.city,
    area: b.area,
    km: r.km ?? null,
    item: r.item,
    priceRange: b.price_range,
    verified: b.verified,
    paymentStatus: b.payment_status,
    rating: b.rating,
    reviewCount: b.review_count,
    responseTimeMinutes: b.response_time_minutes,
    ordersFulfilled: b.orders_fulfilled,
    escrowEligible: b.escrow_eligible,
  }
}

// Cheapest matching item across the results that actually has a photo —
// the target of the 📸 "See product photo" quick button under a search.
// Photos only; an imageless item would make the button a sorry-message.
function cheapestSearchPhotoItem(cards: ResultCard[]): { id: string; name: string } | null {
  let best: { id: string; name: string; price: number | null } | null = null
  for (const c of cards) {
    const it = c.item
    if (!it || !it.id || !it.image_url) continue
    if (it.price != null) {
      if (!best || best.price == null || it.price < best.price) {
        best = { id: it.id, name: it.name, price: it.price }
      }
    } else if (!best) {
      best = { id: it.id, name: it.name, price: null }
    }
  }
  return best ? { id: best.id, name: best.name } : null
}

// S20 related-word widening: what else the searcher might mean. The
// curated Zimbabwe word families answer instantly; anything else falls
// back to the Gemini alias sweep — raced against a 1.5s ceiling so an
// odd term can never stall the results screen.
async function expandRelatedTerms(term: string): Promise<string[]> {
  const t = (term || '').trim().toLowerCase()
  if (t.length < 3) return []
  const curated = curatedRelatedTerms(t)
  let terms: string[] = curated
  if (!curated.length) {
    const gem = await Promise.race([
      expandSearchQuery(t),
      new Promise<string[]>(resolve => setTimeout(() => resolve([]), 1500)),
    ])
    terms = (gem || []).map(s => (s || '').trim().toLowerCase()).filter(s => s && s !== t)
  }
  return [...new Set(terms)].filter(s => s.length >= 3).slice(0, 4)
}

/** Up to 3 businesses matching related words that are NOT already in the
 * exact results ("electricity" exact-matches, then finds electricians/ZESA).
 * Name/category tier only — cheap, no extra item queries. */
async function findRelatedBusinesses(
  scope: BotBusinessRow[],
  term: string,
  seen: Set<string>
): Promise<{ cards: ResultCard[]; terms: string[] }> {
  const terms = await expandRelatedTerms(term)
  if (!terms.length) return { cards: [], terms: [] }
  const approved = await getApprovedCategories()
  const cards: ResultCard[] = []
  const matchedTerms: string[] = []
  for (const t of terms) {
    const cat = matchCategoryAgainst(t, approved)
    const hit = scope
      .filter(b => !seen.has(b.id) && bizMatchesQuery(b, t, cat))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))[0]
    if (hit) {
      seen.add(hit.id)
      cards.push(toCard({ biz: hit, item: null }))
      matchedTerms.push(t)
    }
  }
  return { cards: cards.slice(0, 3), terms: matchedTerms }
}

// Search message rendering moved to lib/bot-templates.ts (Stage 2). The
// toCard mapper above adapts tier results to the template's pruned shape.

// ── Interactive routing helpers ───────────────────────────────────────────
// Deterministic ids only: anything unknown falls back to a friendly prompt
// with the session preserved, so a stale or forged payload cannot trap
// users in a dead end.

async function startFreshSearchPrompt(from: string) {
  await clearSession(from)
  await sendWhatsAppMessage(
    from,
    'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.'
  )
}

// Main menu: search is NOT a menu row — typing is searching, so the menu
// only carries account features. Titles cap at 24 chars (WhatsApp limit);
// the pricing hook lives in the row description.
const MENU_ROWS = [
  { id: 'menu_needs', title: '🛒 Post a need', description: 'Suppliers quote you here' },
  { id: 'menu_order', title: '🧺 Order items', description: 'Type items - sent shop by shop' },
  { id: 'menu_register', title: '✎ Register', description: 'Business $2/mo · Personal $1/mo · 90-day free trial' },
  { id: 'menu_pay', title: '$ Pay (EcoCash)', description: 'Pay or top up via EcoCash' },
  { id: 'menu_help', title: '✆ Help', description: 'Tips & support' },
]

async function sendMainMenu(from: string) {
  await clearSession(from)
  const ch = await channelLine()
  await sendInteractiveList(
    from,
    [renderMainMenuBody(), ch].filter(Boolean).join('\n\n'),
    MENU_ROWS,
    'Main menu'
  )
}

async function startRegister(from: string, initialText: string = '') {
  const { state } = parseListingMessage(initialText, from)
  // Guided wizard: one question at a time, starting from the first answer
  // still missing (a pasted paragraph can jump several steps ahead).
  const idx = firstUnansweredWizardStep(state)
  await saveSession(from, 'list_form', { list: state, wizard: idx } as ChatSessionData)
  if (idx < 0) {
    // Nothing to ask — straight to the review card.
    await sendFormUpdate(from, state, LIST_INTRO())
    return
  }
  await sendWhatsAppMessage(from, wizardIntro())
  await sendWizardQuestion(from, state, idx)
}

// The shelved flow, while it is still fresh enough to resume.

/** One question on screen: progress line + prompt + Skip/Cancel buttons. */
async function sendWizardQuestion(
  from: string,
  state: ListingFormState,
  index: number,
  note?: string
) {
  const step = LIST_WIZARD_STEPS[index]
  if (!step) return
  let body = [wizardProgress(index), '', note ? `${note}\n` : '', step.prompt].filter(Boolean).join('\n')
  // Add context note for area step if whole_country was selected
  if (step.key === 'area' && state.whole_country) {
    body += '\n\n_You selected "whole country" - this step is optional and can be skipped._'
  }
  const buttons: InteractiveButton[] = []
  if (step.optional) buttons.push({ id: 'list_skip', title: '⏭ Skip' })
  buttons.push({ id: 'list_cancel', title: '✖ Cancel' })
  await sendInteractiveButtons(from, body, buttons)
}

/** First unanswered question AFTER the current one (skipped optionals are
 * left behind; *back* re-opens them explicitly). -1 → review screen. */
function nextWizardIndex(state: ListingFormState, after: number): number {
  for (let i = after + 1; i < LIST_WIZARD_STEPS.length; i++) {
    const stepKey = LIST_WIZARD_STEPS[i].key
    // Skip area step if whole_country or remote is selected
    if (stepKey === 'area' && (state.whole_country || state.city === 'remote')) {
      continue
    }
    if (!wizardStepAnswered(state, stepKey)) return i
  }
  return -1
}

/** Persist progress and show either the next question or the review card. */
async function wizardAdvance(
  from: string,
  session: ChatSession,
  state: ListingFormState,
  fromIndex: number
) {
  const idx = nextWizardIndex(state, fromIndex)
  await saveSession(from, 'list_form', { ...session.data, list: state, wizard: idx } as ChatSessionData)
  if (idx < 0) {
    await sendFormUpdate(
      from,
      state,
      "That's all the questions ✅ - check your listing above, then tap *↗ Publish* to go live."
    )
    return
  }
  await sendWizardQuestion(from, state, idx)
}

/** One answer per message: *skip* / *back* / free text. The forgiving
 * paragraph parser still runs on every answer, so a pasted line that
 * completes several fields simply pulls those steps along — but THIS
 * question must be answered before the wizard moves on. */
async function handleListWizardTextInternal(from: string, session: ChatSession, text: string) {
  const idx = typeof session.data.wizard === 'number' ? session.data.wizard : -1
  const step = idx >= 0 ? LIST_WIZARD_STEPS[idx] : null
  const before = session.data.list || {}
  if (!step) {
    // Stale index → fall back to the review card.
    await sendFormUpdate(from, before)
    return
  }
  const lower = text.trim().toLowerCase()

  if (lower === 'skip') {
    if (!step.optional) {
      await sendWizardQuestion(
        from,
        before,
        idx,
        `We need the ${step.label.toLowerCase()} to publish - please answer it, or reply *cancel* to stop.`
      )
      return
    }
    // Skip area step if whole_country or remote was selected
    if (step.key === 'area' && (before.whole_country || before.city === 'remote')) {
      const skipState = { ...before, area: '' }
      await wizardAdvance(from, session, skipState, idx)
      return
    }
    await wizardAdvance(from, session, before, idx)
    return
  }

  if (lower === 'back') {
    const prev = Math.max(0, idx - 1)
    await saveSession(from, 'list_form', { ...session.data, wizard: prev } as ChatSessionData)
    await sendWizardQuestion(from, before, prev, "Let's fix that answer.")
    return
  }

  // Free text → the shared parser (fills whatever it recognises), then the
  // wizard-specific meanings for this question win.
  let state = parseListingMessage(text, from, before).state
  if (step.key === 'phone') {
    if (/^me\b/i.test(text.trim())) {
      state = applyListingFields(state, { phone: from, phone_type: 'whatsapp' }, from)
    } else if (/\b(call only|voice|landline)\b/i.test(text) && state.phone) {
      state = applyListingFields(state, { phone_type: 'voice' }, from)
    }
  }
  if (step.key === 'city') {
    if (/whole country/i.test(text)) {
      state = applyListingFields(state, { whole_country: true }, from)
    } else if (/remote/i.test(text)) {
      state = applyListingFields(state, { city: 'remote', whole_country: false }, from)
    } else if (!state.city && !state.whole_country) {
      const typed = text.trim().replace(/\s+/g, ' ')
      if (!text.includes('\n') && typed.length >= 2 && typed.length <= 40 && /[a-z]/i.test(typed)) {
        state = applyListingFields(state, { city: findCity(typed) || typed, whole_country: false }, from)
      }
    }
  }
  if (step.key === 'area') {
    if (!state.area) {
      const typed = text.trim().replace(/\s+/g, ' ')
      if (typed.length >= 2 && typed.length <= 80 && /^[a-z0-9 ,.'\-()/]+$/i.test(typed)) {
        state = applyListingFields(state, { area: typed }, from)
      }
    }
  }

  await saveSession(from, 'list_form', { ...session.data, list: state, wizard: idx } as ChatSessionData)

  if (!wizardStepAnswered(state, step.key)) {
    let note = `Hmm, I couldn't read that as ${step.label.toLowerCase()} - please try again.`
    if (step.key === 'city') {
      note = "That doesn't look like a town name - try again, e.g. *Masvingo*, or reply *whole country* or *remote*."
    } else if (step.key === 'categories') {
      note = "I don't know that category - try a common one, e.g. *Salon*, *Bakery*, *Electrician*, *Hardware*."
    } else if (step.key === 'phone') {
      note = "Hmm, I couldn't read that as a phone number. Only Zimbabwean numbers are accepted (e.g. 077, 078, 071, 073, 075). Send it again, or reply *me* to use this WhatsApp number."
    }
    await sendWizardQuestion(
      from,
      state,
      idx,
      note
    )
    return
  }

  await wizardAdvance(from, { ...session, data: { ...session.data, list: state } }, state, idx)
}

// The shelved flow, while it is still fresh enough to resume.
function pausedDraft(session: ChatSession | null): PausedDraft | null {
  const p = session?.data?.paused
  if (!p?.step) return null
  const at = Date.parse(p.at || '')
  if (!Number.isFinite(at) || Date.now() - at > PAUSE_TTL_MS) return null
  return p
}

// True when the session actually holds something worth shelving.
function hasProgress(data: ChatSessionData): boolean {
  return Object.entries(data).some(
    ([k, v]) =>
      k !== 'paused' &&
      v != null &&
      v !== '' &&
      !(Array.isArray(v) && v.length === 0) &&
      !(typeof v === 'object' && Object.keys(v as object).length === 0)
  )
}

// Park a flow so it survives the one that is opening now. The row may have
// been cleared by the new flow's start, hence the 'idle' placeholder step —
// the dispatch treats it as "no active step".
async function stashPaused(from: string, draft: PausedDraft) {
  const cur = await getSession(from)
  await saveSession(from, cur?.step || 'idle', { ...(cur?.data || {}), paused: draft })
}

/**
 * Follow a stated change of direction mid-flow. Returns true when the message
 * was a pivot and has been handled (the old flow is shelved, the new one is
 * open); false hands the message back to the normal step handling.
 */
async function handleIntentPivot(
  from: string,
  session: ChatSession | null,
  text: string
): Promise<boolean> {
  if (!session?.step || session.step === 'idle') return false
  const step = session.step
  let kind = detectPivot(text, step)
  if (!kind) {
    if (DATA_ENTRY_STEPS.has(step) || !pivotCandidateForIntent(text)) return false
    // A plain town name in the location step is the answer, not a plan change.
    if (
      step === 'search_loc' &&
      zimbabweCities.some(c => c.name.toLowerCase() === text.trim().toLowerCase())
    ) {
      return false
    }
    const hinted = await classifyIntent(text, step)
    if (!hinted || hinted === 'continue' || hinted === familyOf(step)) return false
    kind = hinted
  }

  // S19 goal-word ask: "pay" / "register" / "order" typed mid-flow while
  // those words ALSO name real businesses — offer the two ways instead of
  // pivoting silently. Direct-answer steps keep their normal handling (the
  // word can be the answer they were asked for).
  if (
    (kind === 'pay' || kind === 'register' || kind === 'order') &&
    !DATA_ENTRY_STEPS.has(step)
  ) {
    const word = kind === 'pay' ? 'pay' : kind === 'register' ? 'register' : 'order'
    const named = await countVerifiedNameMatches(word)
    if (named > 0) {
      logOut(from, 'goal_ask', `${word} mid-${step} → ${named} named`)
      await saveGoalAsk(from, kind, word)
      await sendGoalAskButtons(from, kind, word, named)
      return true
    }
  }

  const shelvedFresh = pausedDraft(session)
  const kept: PausedDraft =
    shelvedFresh ??
    ({ step: session.step, data: session.data, at: new Date().toISOString() } as PausedDraft)
  const hadDraft = hasProgress(session.data)
  const ack = hadDraft
    ? "No problem - plans have changed 👍\nI've set what you were doing aside; reply *resume* to pick it up again."
    : ''
  const say = async (line: string) => {
    if (line) await sendWhatsAppMessage(from, line)
  }

  switch (kind) {
    case 'register': {
      // Re-entering a registration that was shelved earlier: offer it back
      // instead of silently starting a second one.
      if (shelvedFresh && familyOf(shelvedFresh.step) === 'register') {
        await sendWhatsAppMessage(
          from,
          'No problem - plans have changed 👍\n\nYou left a registration part-way through. Continue it, or start over?'
        )
        await sendInteractiveButtons(from, '', [
          { id: 'resume_paused', title: '▶ Continue my draft' },
          { id: 'reg_restart', title: '✎ Start over' },
          { id: 'cancel', title: '✖ Cancel' },
        ])
        break
      }
      await say(
        ack
          ? `${ack}\nOpen the list below and select Register business 👇`
          : "Sounds like our plans have changed 👍\nOpen the list below and select Register business 👇"
      )
      await sendRegisterChoice(from)
      break
    }
    case 'pay':
      await say(`${ack}${ack ? '\n' : ''}Let's sort out payment then.`)
      await startPayChoice(from)
      break
    case 'need':
      await say(`${ack}${ack ? '\n' : ''}Let's post your need instead 👇`)
      await startNeedIntake(from)
      break
    case 'order': {
      const tail = text.trim().replace(/^order\b[,;:]?\s*/i, '')
      await say(ack)
      await typedOrderFromText(from, session, tail || 'order')
      break
    }
    case 'search': {
      // Strip the framing words so the search reads as they meant it:
      // "wait, let me find a plumber" → "find a plumber".
      const q = text
        .trim()
        .replace(
          /^(?:(?:actually|wait|hold on(?: a (?:sec|moment))?|scratch that|never ?mind|let me|i (?:want|need|would like) to|i'd like to|can i|could i|how (?:do|can) i|how to|help me(?: out)?|instead|rather|ok(?:ay)?|so)[\s,]+)+/i,
          ''
        )
      await say(ack)
      await clearSession(from)
      await dispatchSearch(from, q || text)
      break
    }
    case 'menu':
      await say(`${ack}${ack ? '\n' : ''}Open the list below and choose what you'd like to do 👇`)
      await sendMainMenu(from)
      break
  }

  await stashPaused(from, kept)
  return true
}

/** Restore the flow an earlier direction change shelved. */
async function resumePaused(from: string, session: ChatSession | null): Promise<boolean> {
  const draft = pausedDraft(session)
  if (!draft) return false
  const { step, data } = draft
  // The stash is live again — drop it from the session.
  await saveSession(from, step, { ...data, paused: undefined })

  const head = '✍️ Picking up where you left off.'
  switch (step) {
    case 'list_form':
      await sendFormUpdate(from, data.list || ({} as ListingFormState), head)
      return true
    case 'reg_contact':
      await sendWhatsAppMessage(
        from,
        [
          head,
          '',
          "Send the contact's name + phone (+ city, socials optional), e.g.",
          '*Tendai Ncube 0771 234 567 Harare*',
        ].join('\n')
      )
      return true
    case 'confirm':
      await sendWhatsAppMessage(from, head)
      await sendConfirmation(from, data)
      return true
    case 'name':
      await sendWhatsAppMessage(from, `${head} What is your business name?`)
      return true
    case 'username':
      await sendWhatsAppMessage(
        from,
        `${head} Your *WhatsApp username* (the one shown on your WhatsApp Business profile).`
      )
      return true
    case 'phone':
      await sendWhatsAppMessage(from, `${head} Your *phone number* (e.g. 712345678).`)
      return true
    case 'category':
      await sendWhatsAppMessage(
        from,
        `${head} What do you sell? e.g. *phones, plumbing, catering, magetsi, salon*…`
      )
      return true
    case 'description':
      await sendWhatsAppMessage(
        from,
        `${head} Describe your business in one or two sentences (what you offer):`
      )
      return true
    case 'city':
      await sendWhatsAppMessage(
        from,
        `${head} Which town or city are you based in? (or type *whole country*)`
      )
      return true
    case 'area':
      await sendWhatsAppMessage(
        from,
        `${head} Which area in *${data.city || 'your town'}*? (or type *skip*)`
      )
      return true
    case 'search_loc':
      await sendAskTown(from, data.pending_search_term || '', false, true)
      return true
    case 'search_term':
      await sendAskTerm(from, data.pending_city || null)
      return true
    case 'browse': {
      const cards = data.results || []
      if (cards.length) {
        await sendWhatsAppMessage(from, head)
        await sendResultsListPage(
          from,
          cards,
          data.page || 0,
          data.lastTerm || 'search',
          data.lastCity ?? null,
          !!data.nearby
        )
      } else {
        await startFreshSearchPrompt(from)
      }
      return true
    }
    case 'need_form':
      if (data.need?.item) {
        await sendWhatsAppMessage(from, head)
        await showNeedConfirm(from, data.need)
      } else {
        await sendWhatsAppMessage(from, head)
        await startNeedIntake(from)
      }
      return true
    case 'order':
      if (data.pendingOrder?.groups?.length) {
        await sendWhatsAppMessage(
          from,
          [head, renderOrderVerify(data.pendingOrder.groups), '', 'Reply *yes* to send, *no* to edit, or *back* to pause.'].join(
            '\n'
          )
        )
        await sendInteractiveButtons(from, '', [
          { id: 'osend', title: '✅ Send order' },
          { id: 'oedit', title: '✎ Re-type' },
        ])
      } else {
        await sendWhatsAppMessage(from, `${head} Send your order again - e.g. *order 2 bread, 1 cake*.`)
      }
      return true
    case 'rating':
      await sendWhatsAppMessage(
        from,
        `${head} Rate your experience *1* to *5* (1 = poor, 5 = excellent), add a short comment if you like, or reply *skip*.`
      )
      return true
    case 'pay_plan':
      await sendWhatsAppMessage(from, `${head} Reply *1*, *6* or *12* to pick your plan.`)
      return true
    case 'pay_ecocash':
      await sendWhatsAppMessage(from, `${head} Enter your EcoCash number (e.g. 0771234567):`)
      return true
    case 'pay_search':
      await sendWhatsAppMessage(from, `${head} Which business do you want to pay for? Type its name:`)
      return true
    case 'pay_pick':
      await sendWhatsAppMessage(from, `${head} Reply a number to pick the listing to pay.`)
      return true
    case 'item_photo':
      await sendWhatsAppMessage(from, `${head} Send the product photo, then *name $price* (e.g. *bread $2*).`)
      return true
    case 'item_pick':
      await sendWhatsAppMessage(from, `${head} Tap the shop button to pick, or send the product photo again.`)
      return true
    default:
      await sendWhatsAppMessage(from, `${head} Send your reply.`)
      return true
  }
}

// ✎ Register opens with the choice of what to add: a business listing
// (90-day free trial or $2/month paid) or a paid personal contact.
async function sendRegisterChoice(from: string) {
  await clearSession(from)
  await clearConversationState(from)
  await sendInteractiveButtons(
    from,
    [
      '✎ *Registering on WA Directory*',
      '',
      'Which are you adding?',
    ].join('\n'),
    [
      { id: 'reg_personal', title: 'Personal contact' },
      { id: 'reg_business', title: 'Business listing' },
      { id: 'cancel', title: '✖ Cancel' },
    ]
  )
}

// Personal contact intake: the whole draft is ONE message —
// "Tendai Ncube 0771 234 567 Harare IG @tendai tiktok.com/@tendai". Deliberately
// simpler than the business form: name, phone, optional city, up to 3 socials.
const CONTACT_PHONE_RE = /(?:\+?263|0)\s?7[\d\s.\-]{8,11}(?!\d)/
// Social links: instagram/facebook/tiktok/linkedin/twitter URLs and bare
// @handles ("@tendai" / "ig @tendai" / "instagram.com/tendai").
const SOCIAL_HINT_RE = /(?:^|\s)(?:ig|insta(?:gram)?|facebook|fb|tiktok|tt|linked(?:in)?|in|twitter|x|snap(?:chat)?|whatsapp|wa|socials?)(?:\s*[:@\/])?\s*/gi

interface ContactDraft {
  name: string
  phone: string
  city: string | null
  socials?: string[]
}

function extractSocials(text: string): { socials: string[]; stripped: string } {
  const socials: string[] = []
  // Pull explicit platform-prefixed tokens first: "IG @tendai", "fb tendai.ncube",
  // "tiktok: @t.n" — separator can be @ : / or just a space.
  let working = text
  const prefixTokens = /(?:ig|insta(?:gram)?|instagram\.com|facebook|fb(?:\.com|\.me)?|tiktok|linkedin(?:\.com)?|twitter|x\.com|snap(?:chat)?)\s*(?:[:@/]\s*|(?=[a-zA-Z0-9._]))\s*(@?[a-zA-Z][a-zA-Z0-9._]{2,39})/gi
  let pm: RegExpExecArray | null
  while ((pm = prefixTokens.exec(text)) !== null && socials.length < 3) {
    const handle = pm[1]
    if (handle && !socials.includes(handle)) socials.push(handle)
  }
  working = text.replace(prefixTokens, ' ')
  working = working.replace(SOCIAL_HINT_RE, (s) => (s.trim() ? ' ' : ' '))
  // Bare @handles (min 3 chars, no spaces) anywhere left in the text.
  const atHandles = working.match(/@[a-zA-Z][a-zA-Z0-9._]{2,39}/g) || []
  for (const h of atHandles) {
    if (socials.length >= 3) break
    if (!socials.includes(h)) socials.push(h)
    working = working.replace(h, ' ')
  }
  // Bare URLs (any domain) — someone pasting insta.me/x/... links.
  const urls = working.match(/(?:https?:\/\/|www\.)[^\s]+/gi) || []
  for (const u of urls) {
    if (socials.length >= 3) break
    if (!socials.includes(u)) socials.push(u)
    working = working.replace(u, ' ')
  }
  return { socials, stripped: working.replace(/\s{2,}/g, ' ').trim() }
}

function parseContactLine(text: string): ContactDraft | null {
  const m = text.trim().match(CONTACT_PHONE_RE)
  if (!m || m.index == null) return null
  const phoneDigits = m[0].replace(/[^0-9]/g, '')
  const before = text.slice(0, m.index).trim()
  const after = text.slice(m.index + m[0].length).trim()

  // Socials may appear before or after the phone; lint them out of both
  // halves before deciding what the name should be.
  const pre = extractSocials(before)
  const post = extractSocials(after)
  const socials = [...pre.socials, ...post.socials].filter(Boolean).slice(0, 3)
  const nameSource = post.stripped.length >= 2 ? post.stripped : pre.stripped
  const otherSide = nameSource === pre.stripped ? post.stripped : pre.stripped

  const cityRaw = findListingCity(nameSource) || findListingCity(otherSide)
  let name = nameSource
  if (cityRaw) name = name.replace(new RegExp(cityRaw, 'i'), '').replace(/\s{2,}/g, ' ').trim()
  if (!name || name.length < 2) name = otherSide
  name = name.replace(/^(?:the\s+)?(?:contact\s+)?(?:name\s+)?(?:is\s+:?\s*)?/i, '').replace(/[,:;]+$/, '').trim()
  if (!name || name.length < 2 || /\d/.test(name)) return null
  return {
    name: name.slice(0, 80),
    phone: phoneDigits,
    city: cityRaw,
    socials: socials.length ? socials : undefined,
  }
}

// Publish the personal contact: shared listing engine (verified:false +
// pending) and the payment engine with the personal pricing override. The
// EcoCash PIN confirmation path flips verified + active with no admin step.
async function tryPublishContact(
  from: string,
  session: ChatSession,
  msgId?: string,
  plan: PlanType = '1m',
  amount?: number
) {
  // Personal packages mirror the web app (types PERSONAL_PLAN_CONFIG):
  // $1/month, $5/6 months, $10/year. The amount override rides through to
  // createListingPayment so the subscription + EcoCash request use it directly.
  const payAmount = amount ?? PERSONAL_PLAN_CONFIG[plan].price
  const c = session.data.contact!
  const rawName = c.name
  const rawPhone = c.phone.replace(/[^0-9]/g, '')
  const phone = rawPhone.startsWith('263') ? rawPhone.slice(3) : rawPhone
  const fullListedPhone = `+263${phone}`
  // payer_phone exists in two stored formats (263… from the bot flow, 0…
  // from web /api/pay) — match either.
  const payerDigits = digitsOnly(from)
  const payerZero = payerDigits.replace(/^263/, '0')

  // Guard 1 — cap: max 3 ACTIVE personal contacts per payer phone, so a
  // business can't dodge the USD 2 rate by batch-buying USD 1 personal rows.
  const { data: payerSubs } = await getSupabase()
    .from('listing_subscriptions')
    .select('business_id, businesses!inner(category)')
    .or(`payer_phone.eq.${payerDigits},payer_phone.eq.${payerZero}`)
    .eq('status', 'active')
  const personalIds = (payerSubs || [])
    .map((s: unknown) => s as { business_id?: string; businesses?: { category?: unknown } | null })
    .filter((s): s is { business_id: string; businesses?: { category?: unknown } } =>
      Array.isArray(s.businesses?.category) && (s.businesses!.category as string[]).includes('Personal Contact'))
    .map((s) => s.business_id)
  if (personalIds.length >= 3) {
    await sendWhatsAppMessage(
      from,
      [
        'You already have 3 active personal contacts 📱',
        '',
        'That is the limit per person. If you are registering a business,',
        'tap ✎ Register and choose *Business* - USD 2 per month, no cap.',
      ].join('\n')
    )
    await clearSession(from)
    return
  }

  // Guard 2 — existing business: the listed phone belonging to a business
  // listing means personal is the wrong (discounted) product. phones are
  // stored both as 263… and +263… depending on the route in.
  const listedDigits = rawPhone.replace(/^263/, '').replace(/^0/, '')
  const { data: bizRows } = await getSupabase()
    .from('businesses')
    .select('id, name, category')
    .in('phone', [`+263${listedDigits}`, `263${listedDigits}`])
    .neq('payment_status', 'expired')
  const bizBlock = (bizRows || ([]) as { name?: string; category?: unknown }[]).find(
    (b) => Array.isArray(b.category) && !b.category.includes('Personal Contact')
  )
  if (
    bizBlock &&
    bizBlock.name
  ) {
    await sendWhatsAppMessage(
      from,
      [
        `*+263${listedDigits}* is already registered as a business listing`,
        `(*${bizBlock.name}*) - personal contacts are for people, not companies.`,
        '',
        'If that is you: renew it for USD 2/month (send *pay*), or register a',
        'different number for the personal contact.',
      ].join('\n')
    )
    await clearSession(from)
    return
  }

  const result = await createListing({
    name: rawName,
    countryCode: COUNTRY_CODE,
    phone,
    categories: ['Personal Contact'],
    city: c.city || undefined,
    phoneType: 'whatsapp',
    socials: c.socials,
    generateSite: false,
    notify: false,
  })
  if ('error' in result) {
    console.error('[webhook] personal contact insert failed:', result.error)
    await sendWhatsAppMessage(from, 'Sorry, something went wrong saving that contact. Please send the name + phone again.')
    await saveSession(from, 'reg_contact', { contact: c })
    return
  }

  // Ask which EcoCash number gets the PIN prompt BEFORE pushing the payment —
  // the payer may be a different number than this chat (reply *me* bills the
  // chat's own number). The pay_ecocash flow carries the edit token + personal
  // amount override and hands back the edit link with the bill confirmation.
  if (msgId) await sendReaction(from, msgId, '✅').catch(() => {})
  await askEcoCashNumber(
    from,
    { id: result.businessId, name: result.name },
    plan,
    { pay_token: result.editToken },
    payAmount
  )
}

// The living form: renders the current fill state; the interactive row below
// it carries Publish / Cancel (Publish's gating lives in the tap handler).
async function sendFormUpdate(from: string, state: ListingFormState, tailNote?: string) {
  const body = [renderListingForm(state, from)]
  if (tailNote) body.push('', tailNote)
  const text = body.filter(Boolean).join('\n')
  if (text.length <= 1020) {
    await sendInteractiveButtons(from, text, [
      { id: 'list_publish', title: '↗ Publish' },
      { id: 'list_edit', title: '✏️ Edit' },
      { id: 'list_cancel', title: '✖ Cancel' },
    ])
  } else {
    await sendWhatsAppMessage(from, text)
  }
}

// Tap on ↗ Publish: the webapp's mandatory set (name + approved category +
// valid phone) gates submission; anything missing is listed for the user.
async function tryPublishForm(from: string, session: ChatSession, msgId?: string) {
  const state = session.data.list || {}
  const missing = missingRequired(state)
  if (missing.length > 0) {
    await sendWhatsAppMessage(from, renderMissingRequiredList(state))
    await sendFormUpdate(from, state)
    return
  }
  // Lift the flat form state into the registration shape publishBusiness
  // already consumes (written through the shared listing engine).
  const merged: ChatSessionData = {
    ...session.data,
    name: state.name,
    categories: state.categories,
    category: state.categories?.[0],
    city: state.whole_country ? '' : state.city,
    whole_country: state.whole_country === true,
    area: state.area,
    phone: state.phone,
    phone_type: state.phone_type,
    price_range: state.price_range,
    website: state.website,
    address: state.address,
    whatsapp_username: state.username,
    description: state.description,
  }
  await publishBusiness(from, { phone: from, step: 'confirm', data: merged }, msgId)
  await clearSession(from)
}

async function handleListFormText(from: string, session: ChatSession, text: string) {
  // Guided wizard mode: one question at a time; anything else stays in
  // review-mode free text (the familiar paragraph flow).
  if (typeof session.data.wizard === 'number' && session.data.wizard >= 0) {
    await handleListWizardTextInternal(from, session, text)
    return
  }
  const before = session.data.list || {}
  const beforeMissing = missingRequired(before).length
  const parsed = parseListingMessage(text, from, before)
  let state = parsed.state
  // Rules first (free); the AI pass only fires when the parser stalled or
  // left a label word inside a value.
  if (needsAIPass(text, before, state)) {
    state = await aiPatchListing(text, state, from)
  }
  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  const missing = missingRequired(state)
  const filledAny =
    missing.length < beforeMissing ||
    ['name', 'categories', 'city', 'area', 'phone', 'price_range', 'website', 'catalog', 'address', 'description', 'username']
      .some(k => JSON.stringify((state as Record<string, unknown>)[k]) !== JSON.stringify((before as Record<string, unknown>)[k]))
  const tail = !filledAny
    ? "I couldn't match that to a field yet - send e.g. *name …*, *city …*, *phone …*, or a description."
    : missing.length === 0
      ? 'All mandatory fields are set - tap ↗ Publish to submit.'
      : `${missing.length} mandatory field${missing.length > 1 ? 's' : ''} still missing: ${missing.join(', ')}.`
  const priceNudge =
    filledAny && isSinglePriceRange(state.price_range)
      ? `💵 Is ${state.price_range} your cheapest or priciest item? Send the other end to complete the range, e.g. *prices ${state.price_range} - $500*.`
      : ''
  await sendFormUpdate(from, state, [tail, priceNudge].filter(Boolean).join('\n'))
}

// ── Bot perception: voice notes and photos ────────────────────────────────
// Media becomes intent: a search outside registration, or form fields/logo
// while the user is mid-registration. Every failure answers with a text
// fallback so nothing silently dies.

// Live, active listings linked to a sender number (post-activation shelf).
interface ShelfBiz { id: string; name: string; slug: string | null }

async function findActiveListingsForPhone(phone: string): Promise<ShelfBiz[]> {
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, slug, category')
      .eq('phone', phone)
      .eq('payment_status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)
    const rows = (data as Array<{ id: string; name: string; slug: string | null; category: string[] | null }>) || []
    return rows.filter(r => !(r.category || []).includes('Personal Contact'))
  } catch {
    return []
  }
}

// "bread $2", "bread 2.50", "2kg cement 7" → product spec. Pure numbers and
// orders ("order 2 bread") don't parse. Also extracts optional description after price.
interface ItemSpec { name: string; price: number; description?: string }
function parseItemSpec(text: string): ItemSpec | null {
  const t = text.trim()
  if (!t || t.length > 300) return null
  // Match: "name $price optional description here"
  const m = t.match(/^(.+?)\s*(?:usd\s*)?\$?\s*(\d+(?:[.,]\d+)?)(?:\s+(.*))?$/i)
  if (!m) return null
  const name = m[1].replace(/[-–:,\s]+$/, '').trim()
  const price = Number(m[2].replace(',', '.'))
  if (name.length < 2 || !Number.isFinite(price) || price <= 0) return null
  return { name, price, description: m[3]?.trim() || undefined }
}

async function insertShelfItem(
  bizId: string,
  spec: { name: string; price: number },
  imageUrl: string
): Promise<boolean> {
  const image_luminance = imageUrl ? await imageLuminanceFromUrl(imageUrl) : null
  const { error } = await getSupabase()
    .from('business_items')
    .insert({
      business_id: bizId,
      name: spec.name,
      slug: slugify(spec.name) || `item-${Date.now()}`,
      price: spec.price,
      image_url: imageUrl,
      image_luminance: image_luminance,
      is_active: true,
    })
  return !error
}

// One live shop → save the photo and ask for name+price (caption may carry
// both, then it stocks directly). Several shops → pick list first.
// Caption can be: "bread $2" or "bread $2 i make deliveries"
async function startShelfItem(
  from: string,
  bizList: ShelfBiz[],
  mediaId: string,
  caption: string,
  mediaMsgId: string
) {
  void markRead(mediaMsgId, true).catch(() => {})
  const media = await fetchWhatsAppMedia(mediaId)
  const imageUrl = media ? (await uploadLogoImage(new Uint8Array(media.buffer))) || '' : ''

  // Parse caption using the shared parser
  const spec = caption ? parseItemSpec(caption) : null
  const extraDescription = spec?.description || ''

  if (spec && bizList.length === 1) {
    const biz = bizList[0]
    const ok = await insertShelfItem(biz.id, spec, imageUrl)
    await clearSession(from)
    if (!ok) {
      await sendWhatsAppMessage(from, '❌ Could not save that item - try again.', mediaMsgId)
      return
    }
    let response = `🧺 **${spec.name}** at \`$${spec.price}\` stocked on ${biz.name}'s shelf${imageUrl ? ' with the photo' : ''} - it shows in the shop section of the website.`
    if (extraDescription) {
      response += `\n\n📝 *Details:*\n> ${extraDescription}`
    }
    await sendWhatsAppMessage(from, response, mediaMsgId)
    return
  }

  if (bizList.length > 1 && imageUrl) {
    await saveSession(from, 'item_pick', { pendingItemImage: imageUrl } as ChatSessionData)
    await sendInteractiveButtons(
      from,
      '🧺 Which shop is this product for?',
      bizList.slice(0, 3).map(b => ({ id: `itembiz_${b.id}`, title: b.name }))
    )
    return
  }

  await saveSession(from, 'item_photo', {
    pendingItemImage: imageUrl || undefined,
    pendingItemBiz: { id: bizList[0].id, name: bizList[0].name },
  } as ChatSessionData)
  await sendWhatsAppMessage(
    from,
    (imageUrl ? '📷 Photo saved. ' : '') +
      'Reply with the product name and price to stock it on your shop shelf, e.g. *bread $2*. You can also add extra details in your message like *\"i make home deliveries and customize cakes to your liking\"*. Reply *skip* to not add it.\n\n📸 *Photo tips:* While optional, we strongly recommend uploading original photos of your actual products - this builds customer trust. Please avoid internet-sourced or AI-generated images. If we detect non-original images, they may be removed.',
    mediaMsgId
  )
}

// Text for the item_photo step: "bread $2" → business_items row.
// Also accepts: "bread $2 i make home deliveries and customize cakes"
async function handleItemSpecText(from: string, session: ChatSession, text: string) {
  const lower = text.trim().toLowerCase()
  if (lower === 'skip' || lower === 'cancel') {
    await clearSession(from)
    await sendWhatsAppMessage(from, 'Skipped - the photo was not added to the shelf.')
    return
  }

  // Use the shared parser
  const spec = parseItemSpec(text)
  if (!spec) {
    await sendWhatsAppMessage(
      from,
      'Reply with the product name and price, e.g. *bread $2*. You can add extra details after. - or *skip* to not add it.'
    )
    return
  }

  const biz = session.data.pendingItemBiz
  if (!biz) {
    await sendWhatsAppMessage(
      from,
      'Reply with the product name and price, e.g. *bread $2*. You can add extra details after. - or *skip* to not add it.'
    )
    return
  }
  const imageUrl = session.data.pendingItemImage || ''
  const ok = await insertShelfItem(biz.id, spec, imageUrl)
  await clearSession(from)
  if (!ok) {
    await sendWhatsAppMessage(from, '❌ Could not save that item - try again, e.g. *bread $2*.')
    return
  }

  // Format the response: bold name, inline-code price, quote extra description
  let response = `🧺 **${spec.name}** at \`$${spec.price}\` stocked on ${biz.name}'s shelf${imageUrl ? ' with the photo' : ''} - it shows in the shop section of the website.`
  if (spec.description) {
    response += `\n\n📝 *Details:*\n> ${spec.description}`
  }
  await sendWhatsAppMessage(from, response)
}

async function handleBotMedia(
  from: string,
  session: ChatSession | null,
  message: Record<string, unknown>,
  mediaMsgId: string
) {
  const kind: MediaKind = message.type === 'audio' ? 'audio' : 'image'
  const blob = message[kind] as { id?: string; caption?: string } | undefined
  const mediaId = blob?.id || ''
  const caption = typeof blob?.caption === 'string' ? blob.caption : ''

  // Post-activation shelf: a live business owner sending a photo with no flow
  // in progress is most likely stocking their website shop shelf — no AI pass
  // needed, just storage.
  if (kind === 'image' && !session) {
    const bizList = await findActiveListingsForPhone(from)
    if (bizList.length > 0) {
      await startShelfItem(from, bizList, mediaId, caption, mediaMsgId)
      return
    }
  }

  if (!mediaRateOk(from)) {
    await sendWhatsAppMessage(
      from,
      'You can send at most 3 voice or photo tries per hour to keep things quick. Send it as text and I keep working.',
      mediaMsgId
    )
    return
  }

  // Slow segment ahead (download + AI): light the composing indicator.
  void markRead(mediaMsgId, true).catch(() => {})
  const media = await fetchWhatsAppMedia(mediaId)
  const sense = media ? await perceiveMedia(kind, media.buffer, media.mime, caption) : null

  if (!sense || !sense.term) {
    if (session?.step === 'list_form' && kind === 'image') {
      await sendWhatsAppMessage(
        from,
        "I couldn't read that photo. Keep typing - *name …*, *category …*, *description …* - or tap ↗ Publish when ready.",
        mediaMsgId
      )
      return
    }
    await sendWhatsAppMessage(
      from,
      kind === 'audio'
        ? "I couldn't hear that clearly. Send it as text and I'll search instantly."
        : "I couldn't recognise that photo. Describe it in text and I'll search instantly.",
      mediaMsgId
    )
    return
  }

  if (session?.step === 'list_form') {
    // Mid-wizard media: voice answers the question on screen; a photo
    // queues as the logo and the question repeats (or completes the flow
    // when the logo step itself is on screen).
    const wz = session.data.wizard
    const wstep = typeof wz === 'number' && wz >= 0 ? LIST_WIZARD_STEPS[wz] : null
    if (wstep) {
      if (kind === 'audio') {
        await handleListFormText(
          from,
          session,
          sense.transcript || [sense.term, sense.city].filter(Boolean).join(' ')
        )
        return
      }
      if (wstep.key === 'logo' && kind === 'image') {
        const advanced = { ...session, data: { ...session.data, wizard: -1 } }
        await saveSession(from, 'list_form', advanced.data as ChatSessionData)
        await handleListFormMedia(from, advanced, kind, sense, media!.buffer)
        return
      }
      const logoUrl = kind === 'image' ? await uploadLogoImage(new Uint8Array(media!.buffer)) : ''
      const state = logoUrl
        ? { ...(session.data.list || {}), logo: logoUrl }
        : session.data.list || {}
      if (logoUrl) {
        await saveSession(from, 'list_form', { ...session.data, list: state } as ChatSessionData)
      }
      await sendWizardQuestion(
        from,
        state,
        wz!,
        logoUrl ? "📷 Photo saved - I'll use it as your logo." : "I couldn't read that photo - no problem, let's continue."
      )
      return
    }
    await handleListFormMedia(from, session, kind, sense, media!.buffer)
    return
  }

  // Voice note while drafting a need: the transcript fills the draft.
  if (session?.step === 'need_form' && kind === 'audio') {
    await handleNeedFormText(from, session, sense.transcript || sense.term || '')
    return
  }

  // Search-first: voice notes transcribed, photos recognised, then a search.
  const query = [sense.term, sense.city].filter(Boolean).join(' ')
  const echo =
    kind === 'audio'
      ? `You said: *${query}* - searching…`
      : `That photo looks like: *${query}* - searching…`
  await sendWhatsAppMessage(from, echo, mediaMsgId)
  await dispatchSearch(from, query, { replyTo: mediaMsgId })
}

// Shared location ("📍 Near me" prompt or the phone's location picker).
// With a pending search term the nearby search runs immediately; otherwise
// the point is stashed on the session and the bot asks what they need.
async function handleBotLocation(
  from: string,
  session: ChatSession | null,
  origin: { lat: number; lng: number },
  mediaMsgId: string
) {
  if (session?.step === 'search_loc' && session.data.pending_search_term) {
    const term = session.data.pending_search_term
    await clearSession(from)
    await sendWhatsAppMessage(from, `📍 Got it - searching *${term}* near you…`, mediaMsgId)
    await runSearchAndReply(
      from,
      { term, city: null, nationwide: false, origin },
      { replyTo: mediaMsgId }
    )
    return
  }

  await saveSession(from, 'search_term', {
    pending_city: '',
    origin_lat: origin.lat,
    origin_lng: origin.lng,
  })
  await sendWhatsAppMessage(
    from,
    '📍 Got it. What are you looking for nearby? Send e.g. *plumber* or *bread*.',
    mediaMsgId
  )
}

// Media while filling the listing form: voice notes flow through the same
// paragraph parser as text; photos contribute category + description and
// queue themselves as the listing logo (uploads at publish).
async function handleListFormMedia(
  from: string,
  session: ChatSession,
  kind: MediaKind,
  sense: MediaSense,
  buffer: Buffer
) {
  const before = session.data.list || {}

  if (kind === 'audio') {
    const transcript = sense.transcript || [sense.term, sense.city].filter(Boolean).join(' ')
    await handleListFormText(from, session, transcript)
    return
  }

  // Photo: legible registration details fill the form (validated exactly like
  // typed text); the bytes queue themselves as the listing logo.
  let state = applyListingFields(before, {
    name: sense.business_name,
    phone: sense.phone,
    price_range: sense.price_range,
    website: sense.website,
    catalog: sense.catalog,
    description: sense.description ? sense.description.slice(0, 400) : undefined,
  }, from)

  const changed: string[] = []
  for (const k of ['name', 'phone', 'price_range', 'website', 'catalog'] as const) {
    if (JSON.stringify((state as Record<string, unknown>)[k] ?? null) !== JSON.stringify(before[k] ?? null)) {
      changed.push(k)
    }
  }
  if (state.description !== before.description) changed.push('description')

  if (sense.category) {
    const cats = state.categories?.length ? [...state.categories] : []
    const approved = await getApprovedCategories()
    // matchCategoryAgainst falls back to 'Other' — don't trust garbage here.
    const matchedRaw = matchCategoryAgainst(sense.category, approved)
    const matched = matchedRaw === 'Other' ? null : matchedRaw
    if (matched && !cats.includes(matched) && cats.length < 4) {
      cats.push(matched)
      state.categories = cats
      changed.push(`category: ${matched}`)
    }
  }
  const beforeLogo = typeof before.logo === 'string' ? before.logo : ''
  const logoUrl = await uploadLogoImage(new Uint8Array(buffer))
  if (logoUrl) {
    state.logo = logoUrl
    changed.push('photo queued as logo')
  }

  await saveSession(from, 'list_form', { list: state } as ChatSessionData)
  const missing = missingRequired(state)
  const tail = `Photo read${changed.length ? `: ${changed.join(', ')}` : ' - nothing usable, keep typing'}.` +
    (!logoUrl && !beforeLogo ? ' (Logo not saved - try a clearer shot.)' : '') +
    (missing.length === 0
      ? ' All mandatory fields set - tap ↗ Publish.'
      : ` Still missing: ${missing.join(', ')}.`)
  await sendFormUpdate(from, state, tail)
}

// ── Bot pay flow (shared with /api/pay via lib/pay-lookup + lib/listing-pay) ──

function payStatusLabel(status: string): string {
  if (status === 'active') return 'live'
  if (status === 'pending') return 'awaiting payment'
  return 'not yet paid'
}

function canonicalPlan(text: string): PlanType | null {
  const t = text.toLowerCase().trim()
  if (/^(1|1m|1 ?month)$/.test(t)) return '1m'
  if (/^(6|6m|6 ?months)$/.test(t)) return '6m'
  if (/^(12|12m|1 ?year|12 ?months)$/.test(t)) return '12m'
  return null
}

// Open the pay conversation: ask whether the payer wants to pay for an
// existing business or register a new one. If this WhatsApp number has
// exactly one unpaid listing, confirm it directly (three-tap quick path).
async function startPayChoice(from: string) {
  await clearSession(from)
  const own = await ownPayableListings(from)
  if (own.length === 1) {
    const o = own[0]
    await saveSession(from, 'pay_pick', { pay_candidates: [{ id: o.id, name: o.name }] } as ChatSessionData)
    await sendInteractiveButtons(
      from,
      `You have an unpaid listing: *${o.name}* \`${o.id}\`. Pay it now?`,
      [
        { id: 'payown1', title: '$ Pay it' },
        { id: 'pay_search', title: 'Another business' },
        { id: 'pay_new', title: 'New listing' },
      ]
    )
    return
  }
  if (own.length > 1) {
    const candidates = own.map(b => ({ id: b.id, name: b.name }))
    await saveSession(from, 'pay_pick', { pay_candidates: candidates } as ChatSessionData)
    await sendInteractiveList(
      from,
      `You have ${candidates.length} unpaid listings. Tap which one to pay:`,
      candidates.map((b, i) => ({ id: `payown${i + 1}`, title: b.name, description: b.id })),
      'Your listings'
    )
    return
  }
  await sendInteractiveButtons(
    from,
    'What do you want to pay for - a business already in the directory, or a new listing you still need to register?',
    [
      { id: 'pay_existing', title: 'Existing business' },
      { id: 'pay_new', title: 'Register new' },
    ]
  )
}

// Unpaid, non-Yellow-Pages listings whose phone matches the sender.
async function ownPayableListings(from: string): Promise<{ id: string; name: string; business_id: string }[]> {
  try {
    const supabase = getSupabase()
    const [{ data: raw }, { data: specialCats }] = await Promise.all([
      supabase.from('businesses').select('name, business_id, payment_status, category').eq('phone', digitsOnly(from)),
      supabase.from('categories').select('name').eq('special', true),
    ])
    const specialNames = new Set((specialCats || []).map(sc => sc.name))
    return (raw || [])
      .filter(b => b.payment_status !== 'active' && !b.category?.some((c: string) => specialNames.has(c)))
      .map(b => ({ id: b.business_id, name: b.name, business_id: b.business_id }))
      .slice(0, 9)
  } catch {
    return []
  }
}

// Fresh DB read before every payment step: guards missing / already-live /
// Yellow-Pages-free businesses (conditions can change mid-conversation).

// ── My subscriptions: /contact & /paid ───────────────────────────────
// A payer's own listing subscriptions. /contact lists their personal contacts
// (registered by them, or listed on their number) and /paid lists everything
// they pay for — both with expiry countdowns, so renewal is one *pay* away.
 // Matched by payer_phone (both stored formats) OR the listed number.

interface MyListingRow {
  id: string
  plan: string | null
  amount: number | null
  status: string
  expiresAt: string | null
  isPersonal: boolean
  name: string
  publicId: string
}

function myListingPackageLabel(row: MyListingRow): string {
  const config = row.isPersonal && row.plan ? PERSONAL_PLAN_CONFIG[row.plan as PlanType] : row.plan ? PLAN_CONFIG[row.plan as PlanType] : undefined
  const price = row.amount != null ? `USD ${row.amount.toFixed(2)}` : config ? `USD ${config.price.toFixed(2)}` : ''
  return config ? `${price} · ${config.label.toLowerCase()}` : price
}

function myListingCountdown(row: MyListingRow): string {
  if (row.status === 'pending') return 'awaiting payment'
  if (!row.expiresAt) return ''
  const diff = Math.ceil((new Date(row.expiresAt).getTime() - Date.now()) / 86400000)
  if (row.status === 'expired' || diff < 0) return `expired ${Math.abs(diff) || 1}d ago`
  if (diff === 0) return 'expires today'
  if (diff === 1) return 'expires tomorrow'
  return `${diff}d left`
}

async function fetchMyListings(from: string): Promise<MyListingRow[]> {
  const payerDigits = digitsOnly(from)
  const payerZero = payerDigits.replace(/^263/, '0')
  const localDigits = payerZero
  const supabase = getSupabase()

  const subSelect = 'id, plan, amount, status, expires_at, payer_phone, businesses(name, business_id, phone, category, payment_status)'
  const [payerSubs, listedBiz] = await Promise.all([
    // Subscriptions the sender paid for (payer_phone carries 263… or 0…).
    supabase
      .from('listing_subscriptions')
      .select(subSelect)
      .or(`payer_phone.eq.${payerDigits},payer_phone.eq.${payerZero}`)
      .order('expires_at', { ascending: false }),
    // Listings registered on the sender's own number
    supabase
      .from('businesses')
      .select('id')
      .in('phone', [`263${localDigits}`, `+263${localDigits}`]),
  ])

  const rows: MyListingRow[] = []
  const seen = new Set<string>()
  const addRow = (s: { id: string; plan?: string | null; amount?: number | null; status?: string | null; expires_at?: string | null; businesses?: unknown }) => {
    if (!s.id || seen.has(s.id)) return
    seen.add(s.id)
    const biz = (s.businesses || {}) as { name?: string | null; business_id?: string | null; category?: unknown }
    rows.push({
      id: s.id,
      plan: s.plan ?? null,
      amount: s.amount ?? null,
      status: s.status || 'pending',
      expiresAt: s.expires_at ?? null,
      isPersonal: Array.isArray(biz.category) && (biz.category as string[]).includes('Personal Contact'),
      name: biz.name || 'Listing',
      publicId: biz.business_id || '',
    })
  }
  for (const s of payerSubs?.data || []) addRow(s as Parameters<typeof addRow>[0])

  // Subscriptions attached to real estate listings registered on the sender's phone.
  if (listedBiz?.data?.length) {
    const { data: phoneSubs } = await supabase
      .from('listing_subscriptions')
      .select(subSelect)
      .in('business_id', (listedBiz.data as { id: string }[]).map(b => b.id))
    for (const s of phoneSubs || []) addRow(s as Parameters<typeof addRow>[0])
  }

  // Live rows first (soonest expiry at top), then pending, then expired.
  const rank = (r: MyListingRow) => (r.status === 'active' ? 0 : r.status === 'pending' ? 1 : 2)
  return rows.sort((a, b) => rank(a) - rank(b) || (a.expiresAt || '').localeCompare(b.expiresAt || ''))
}

function renderMyListings(rows: MyListingRow[], onlyPersonal: boolean): string {
  const scope = onlyPersonal ? rows.filter(r => r.isPersonal) : rows
  const title = onlyPersonal ? '📇 *Your personal contacts*' : '💳 *Your paid listings*'
  if (!scope.length) {
    return onlyPersonal
      ? 'No personal contacts yet.\n\nAdd one in seconds - send the name + phone, e.g.\n*Tendai Ncube 0771 234 567 Harare*'  // bot personal-contact intake
      : 'Nothing paid for yet on your number.\n\n• Add a personal contact: send *register* and choose *Personal contact  $1/mo*\n• Check what is live: send *contact*'
  }
  const statusIcon = (r: MyListingRow) =>
    r.status === 'active' ? '🟢' : r.status === 'pending' ? '🟡' : '🔴'
  const lines = [`${title} - ${scope.length}`, '']
  scope.forEach((r, i) => {
    const bits = [
      statusIcon(r),
      `*${r.name}*${r.publicId ? ` (${r.publicId})` : ''}`,
      myListingCountdown(r),
      myListingPackageLabel(r),
    ].filter(Boolean)
    lines.push(`${i + 1}. ${bits.join(' · ')}`)
  })
  const expiringSoon = scope.filter(r => {
    if (!r.expiresAt || r.status !== 'active') return false
    return Math.ceil((new Date(r.expiresAt).getTime() - Date.now()) / 86400000) <= 3
  })
  lines.push('')
  if (scope.some(r => r.status === 'pending')) {
    lines.push('🟡 awaiting payment? Send *pay* and pick the listing to enter your EcoCash PIN.')
  } else {
    lines.push(expiringSoon.length ? `⏰ ${expiringSoon.length} winding down soon - renew with *pay*.` : 'Renew any: send *pay*.')
  }
  return lines.join('\n')
}

async function sendMyListings(from: string, onlyPersonal: boolean) {
  try {
    const rows = await fetchMyListings(from)
    await sendWhatsAppMessage(from, renderMyListings(rows, onlyPersonal))
  } catch (err) {
    console.error('[webhook] my listings query failed:', err)
    await sendWhatsAppMessage(from, 'Could not load your listings right now - please try again in a moment.')
  }
}

async function assertPayableBusiness(
  businessId: string
): Promise<{ ok: true; name: string; waId: string } | { ok: false; reply: string }> {
  const supabase = getSupabase()
  const [{ data: biz }, { data: specialCats }] = await Promise.all([
    supabase
      .from('businesses')
      .select('name, business_id, payment_status, category')
      .eq('business_id', businessId)
      .maybeSingle(),
    supabase.from('categories').select('name').eq('special', true),
  ])
  if (!biz) return { ok: false, reply: "That business isn't in the directory anymore." }
  if (biz.payment_status === 'active') {
    return { ok: false, reply: `*${biz.name}* is already live - no payment needed.` }
  }
  if (
    Array.isArray(biz.category) &&
    biz.category.some((c: string) => (specialCats || []).some(sc => sc.name === c))
  ) {
    return { ok: false, reply: `*${biz.name}* is a Yellow Pages listing - free forever, nothing to pay.` }
  }
  return { ok: true, name: biz.name, waId: businessId }
}

async function beginPayPlan(from: string, cand: { id: string; name: string }) {
  const guard = await assertPayableBusiness(cand.id)
  if (!guard.ok) {
    await clearSession(from)
    await sendWhatsAppMessage(from, guard.reply)
    return
  }
  await saveSession(from, 'pay_plan', { pay_business: { id: guard.waId, name: guard.name } } as ChatSessionData)
  await sendInteractiveButtons(
    from,
    `*${guard.name}* (${guard.waId}) - which plan covers the listing?`,
    [
      { id: 'pay_1m', title: `1 Month · $${PLAN_CONFIG['1m'].price.toFixed(0)}` },
      { id: 'pay_6m', title: `6 Months · $${PLAN_CONFIG['6m'].price.toFixed(0)}` },
      { id: 'pay_12m', title: `12 Months · $${PLAN_CONFIG['12m'].price.toFixed(0)}` },
    ]
  )
}

async function askEcoCashNumber(
  from: string,
  biz: { id: string; name: string } | undefined,
  plan: PlanType,
  base: ChatSessionData = {},
  amount?: number
) {
  if (!biz) {
    await startPayChoice(from)
    return
  }
  // Personal contacts bill the override (PERSONAL_PLAN_CONFIG) rate; plain
  // listings use the plan's business price.
  const amountOverride = amount ?? base.pay_amount
  await saveSession(from, 'pay_ecocash', {
    ...base,
    pay_business: biz,
    pay_plan: plan,
    pay_amount: amountOverride,
  } as ChatSessionData)
  const total = amountOverride ?? paymentAmountFor(plan)
  await sendWhatsAppMessage(from, [
    `${PLAN_CONFIG[plan].label} · $${total.toFixed(2)} for *${biz.name}* (${biz.id})`,
    '',
    "Which EcoCash number should get the PIN prompt? e.g. *0771 234 567* - or reply *me* (this chat's number).",
  ].join('\n'))
}

async function handleEcoCashText(from: string, session: ChatSession, text: string) {
  const biz = session.data.pay_business
  const plan = session.data.pay_plan || '1m'
  if (!biz) {
    await startPayChoice(from)
    return
  }
  const raw = text.trim()
  // *me* = bill this chat's own WhatsApp number.
  const eco = normalizeEcoCashPhone(/^me$/i.test(raw) ? from : raw)
  if (!/^0(71|77|78)\d{7}$/.test(eco)) {
    await sendWhatsAppMessage(
      from,
      `"${raw.slice(0, 30)}" doesn't look like an Econet EcoCash number (071… / 077… / 078…).\n\nSend the number again, reply *me*, or *cancel*.`
    )
    return
  }

  // Personal contacts pay the override rate; plain listings the plan price.
  const amount = session.data.pay_amount ?? paymentAmountFor(plan)
  const result = await createListingPayment(
    { businessId: biz.id, payerPhone: eco, plan, amountOverride: session.data.pay_amount },
    buildPaymentAdapters()
  )
  if (!result.ok) {
    if (result.error === 'Invalid payer phone number') {
      await sendWhatsAppMessage(from, "That number didn't look right - try again (071… / 077… / 078…) or reply *me*.")
      return
    }
    // Business-state errors terminate the flow cleanly.
    await clearSession(from)
    await sendWhatsAppMessage(from, result.error)
    return
  }
  await clearSession(from)
  if (result.autoEcoCash) {
    if (session.data.pay_token) {
      // Personal contact: hand over the edit link with the bill confirmation.
      await sendWhatsAppMessage(
        from,
        [
          `✅ *${biz.name}* - Personal contact`,
          '',
          `💸 USD ${amount.toFixed(2)} · ${PERSONAL_PLAN_CONFIG[plan].label} · EcoCash prompt sent to ${eco}.`,
          'Enter your PIN and it goes live automatically - I\'ll message you here the moment it does.',
          '',
          'Save your edit link:',
          `${SITE_URL}/edit?token=${session.data.pay_token}`,
          '',
          'Reply *help* anytime.',
        ].join('\n')
      )
    } else {
      await sendWhatsAppMessage(
        from,
        [
          '💸 *EcoCash prompt sent!*',
          '',
          `Check your phone for the $${amount.toFixed(2)} PIN request (${PLAN_CONFIG[plan].label} plan for *${biz.name}*).`,
          'Enter your PIN and the listing goes live automatically -',
          "I'll message you here the moment it does.",
        ].join('\n')
      )
    }
  } else {
    console.log(`[ecocash-diag] autoEcoCash=false biz=${biz.id} paynowId=${!!process.env.PAYNOW_INTEGRATION_ID} paynowKey=${!!process.env.PAYNOW_INTEGRATION_KEY}`)
    await sendWhatsAppMessage(
      from,
      [
        '📝 *Payment request logged* - nothing charged yet.',
        '',
        `${session.data.pay_token ? PERSONAL_PLAN_CONFIG[plan].label : PLAN_CONFIG[plan].label} · $${amount.toFixed(2)} for *${biz.name}*.`,
        session.data.pay_token
          ? 'Our team verifies the EcoCash transaction and your contact goes live right after.'
          : 'Our team verifies the EcoCash transaction and the listing goes live right after.',
        `Prefer paying right now? ${SITE_URL}/pay`,
      ].join('\n')
    )
  }
}

async function startPaySearch(from: string) {
  await clearSession(from)
  await saveSession(from, 'pay_search', {} as ChatSessionData)
  await sendWhatsAppMessage(
    from,
    [
      'Which business should the payment go to?',
      'Send a name, phone, *WA-* ID or @username - or *cancel*.',
    ].join('\n')
  )
}

async function handlePaySearchText(from: string, session: ChatSession, text: string) {
  const lower = text.toLowerCase().trim()
  const mReg = text
    .trim()
    .match(/^(register|list me|list my|list on|list|get listed|add my business|sign me up)\b(.*)$/i)
  if (mReg) {
    const trailing = mReg[2].trim()
    if (!trailing || /^(?:me|my business|my company|my shop|myself|us)$/i.test(trailing)) {
      await sendRegisterChoice(from)
    } else {
      // User typed something like "register my bakery" - start with the new flow
      await startRegistrationFlow(from)
    }
    return
  }
  if (lower === 'menu' || lower === 'hi' || lower === 'hello') {
    await sendMainMenu(from)
    return
  }

  let results: PayBusiness[] = []
  try {
    results = await searchPayBusinesses(getSupabase(), text)
  } catch {
    results = []
  }

  if (results.length === 1) {
    const b = results[0]
    const guard = await assertPayableBusiness(b.business_id)
    if (!guard.ok) {
      await clearSession(from)
      await sendWhatsAppMessage(from, guard.reply)
      return
    }
    await beginPayPlan(from, { id: b.business_id, name: b.name })
    return
  }

  if (results.length === 0) {
    await sendWhatsAppMessage(
      from,
      `No business matches "*${text.trim().slice(0, 40)}*".\n\nSend a name, phone, *WA-* ID or @username - or *cancel*.`
    )
    return
  }

  const shown = results.slice(0, 9)
  await saveSession(
    from,
    'pay_pick',
    { pay_candidates: shown.map(b => ({ id: b.business_id, name: b.name })) } as ChatSessionData
  )
  await sendInteractiveList(
    from,
    `${results.length} businesses match. Tap the one to pay (live and Yellow Pages ones are refused automatically):`,
    shown.map((b, i) => ({
      id: `pay${i + 1}`,
      title: b.name,
      description: `${b.business_id} · ${payStatusLabel(b.payment_status)}`,
    })),
    'Matching businesses'
  )
}

// A tap or typed digit picked one candidate from the on-screen pay list.
async function selectPayCandidate(from: string, session: ChatSession | null, n: number) {
  const cand = (session?.data.pay_candidates || [])[n - 1]
  if (!cand) {
    await sendWhatsAppMessage(from, 'That option expired - send *pay* to restart, or a new search.')
    return
  }
  await beginPayPlan(from, cand)
}

// pay_existing: list the sender's own unpaid listings (their default target).
async function sendOwnPayList(from: string) {
  const own = await ownPayableListings(from)
  if (own.length === 1) {
    await beginPayPlan(from, { id: own[0].id, name: own[0].name })
    return
  }
  if (own.length === 0) {
    await sendWhatsAppMessage(
      from,
      'No unpaid listings linked to your number yet.\n\n• Pay for another business: send *pay* and search.\n• New listing: send *register*.'
    )
    return
  }
  const candidates = own.map(b => ({ id: b.id, name: b.name }))
  await saveSession(from, 'pay_pick', { pay_candidates: candidates } as ChatSessionData)
  await sendInteractiveList(
    from,
    `You have ${candidates.length} unpaid listings. Tap which one to pay:`,
    candidates.map((b, i) => ({ id: `payown${i + 1}`, title: b.name, description: b.id })),
    'Your listings'
  )
}

// Where the search came from — makes ⬅ Back able to restore the last prompt.
function originOf(prev: ChatSession | null): NonNullable<ChatSessionData['origin']> {
  if (prev?.step === 'search_loc') return 'search_loc'
  if (prev?.step === 'search_term') return 'search_term'
  return 'free'
}

function pendingFields(prev: ChatSession | null): ChatSessionData {
  return {
    origin: originOf(prev),
    pending_search_term: prev?.step === 'search_loc' ? prev.data.pending_search_term : undefined,
    pending_city: prev?.step === 'search_term' ? prev.data.pending_city : undefined,
  }
}

/**
 * ⬅ Back handler. detail → list; list → the prompting question that preceded
 * the search; prompt screens → the generic search prompt.
 */
async function goBack(from: string, session: ChatSession | null) {
  const data = session?.data || {}
  if (session?.step === 'browse') {
    const cards = data.results || []
    if (data.lastScreen === 'detail' && cards.length > 0) {
      await saveSession(from, 'browse', { ...data, lastScreen: 'list' })
      await sendResultsListPage(
        from, cards, data.page || 0, data.lastTerm || 'search', data.lastCity ?? null, !!data.nearby
      )
      return
    }
    // On page 2+, Back walks one page back before leaving the list.
    const page = data.page || 0
    if (page > 0 && cards.length > 0) {
      await saveSession(from, 'browse', { ...data, page: page - 1 })
      await sendResultsListPage(
        from, cards, page - 1, data.lastTerm || 'search', data.lastCity ?? null, !!data.nearby
      )
      return
    }
    if (data.origin === 'search_term') {
      await saveSession(from, 'search_term', { pending_city: data.pending_city || '' })
      await sendAskTerm(from, data.pending_city || null)
      return
    }
    if (data.origin === 'search_loc') {
      await saveSession(from, 'search_loc', { pending_search_term: data.pending_search_term || '' })
      await sendAskTown(from, data.pending_search_term || '', false)
      return
    }
  }
  await startFreshSearchPrompt(from)
}

/** Single router for every interactive id the bot can send. */
// ── S16: needs & quotes ────────────────────────────────────────────────
// Buyers post a need, quotes carry "RQ-xxxx …", buyer relays stay capped at
// 5 with an explicit stop. No numbers are shared until the buyer deals.

function parseNeedLine(text: string): { item: string; qty: string; budget: string; city: string } {
  const work = text.replace(/[*_`]/g, ' ').replace(/\s+/g, ' ').trim()
  let rest = work
  const city = findCity(rest)
  if (city) rest = rest.replace(new RegExp(city.replace(/[-/\\^$*+.?()|[\]{}]/g, '\\$&'), 'ig'), ' ')
  let budget = ''
  const bm = rest.match(/(?:\$|usd)\s*([\d,]+(?:\.\d{1,2})?(?:\s*[-–-]\s*[\d,]+(?:\.\d{1,2})?)?)/i)
  if (bm) {
    budget = `$${bm[1].replace(/\s+/g, '')}`
    rest = rest.replace(bm[0], ' ')
  }
  let qty = ''
  const qm = rest.match(/^\s*([\d,]+(?:\.\d+)?\s*(?:x\s*)?[a-zA-Z]{0,6})\s+(.{2,})$/)
  if (qm) {
    qty = qm[1].trim()
    rest = qm[2]
  }
  return { item: rest.trim(), qty, budget, city: city || '' }
}

async function showNeedConfirm(from: string, d: ChatSessionData['need']) {
  const draft = d || { item: '', qty: '', budget: '', city: '' }
  await saveSession(from, 'need_form', { need: draft })
  await sendInteractiveButtons(
    from,
    renderNeedConfirm(draft),
    [
      { id: 'need_post', title: '✅ Post it' },
      { id: 'need_edit', title: '✎ Edit details' },
      { id: 'need_cancel', title: '✖ Cancel' },
    ]
  )
}

async function startNeedIntake(from: string, prefill?: { item: string; city: string }) {
  if (prefill && prefill.item) {
    await showNeedConfirm(from, { item: prefill.item, qty: '', budget: '', city: prefill.city || '' })
    return
  }
  await saveSession(from, 'need_form', {})
  await sendWhatsAppMessage(from, renderNeedIntro())
}

async function handleNeedFormText(from: string, session: ChatSession, text: string) {
  const parsed = parseNeedLine(text)
  if (!parsed.item && !parsed.qty) {
    await sendWhatsAppMessage(
      from,
      "Send what you need as one line, e.g. *50 bags cement harare*. I need at least an item."
    )
    return
  }
  const prev = session.data.need || { item: '', qty: '', budget: '', city: '' }
  const draft = {
    item: parsed.item || prev.item,
    qty: parsed.qty || prev.qty,
    budget: parsed.budget || prev.budget,
    city: parsed.city || prev.city,
  }
  await showNeedConfirm(from, draft)
}

async function postBuyerNeed(from: string, session: ChatSession | null) {
  const d = session?.data.need
  if (!d || !d.item) {
    await startNeedIntake(from)
    return
  }
  const need = await createNeed({ buyer_phone: from, item: d.item, qty: d.qty, budget: d.budget, city: d.city })
  if (!need) {
    await sendWhatsAppMessage(from, renderErrorCard())
    return
  }
  await sendWhatsAppMessage(from, renderNeedPosted(need.rq_id, d))
  // Instant copy to every admin: need summary + a channel-ready post to
  // copy-paste, plus the one-word commands for this need.
  const admins = await adminNumbers()
  const ch = await channelLine()
  const adminBody = [
    `🛒 NEW NEED ${need.rq_id}`,
    [d.qty, d.item].filter(Boolean).join(' '),
    `${d.budget || 'no budget'} · ${(d.city || 'countrywide').toUpperCase()}`,
    `Buyer: +${from}`,
    '',
    '- channel post (copy below) -',
    channelPostFor(need),
    ...(ch ? ['', ch] : []),
    '',
    `Quick replies: quotes ${need.rq_id} · close ${need.rq_id} · post ${need.rq_id}`,
  ].join('\n')
  for (const admin of admins) {
    if (!admin || admin === digitsOnly(from)) continue
    await sendWhatsAppText(admin, adminBody)
    logOut(admin, 'text', adminBody)
  }
  await clearSession(from)
}

async function pingAdminsSearch(term: string, city: string | null, from: string) {
  const adminBody = [
    `🔎 *Buyer searching*`,
    `• "${term}"${city ? ` · ${city.toUpperCase()}` : ''}`,
    `👤 From: +${digitsOnly(from)}`,
  ].join('\n')
  for (const admin of await adminNumbers()) {
    if (!admin || admin === digitsOnly(from)) continue
    await sendWhatsAppText(admin, adminBody)
    logOut(admin, 'text', adminBody)
  }
}

// ── S18.5 Supplier Demand Radar ─────────────────────────────────────────────
// Verified suppliers subscribe (radar on / radar all / radar off), get
// anonymized pings of real buyer searches, and can `claim` the newest
// matching lead. Consent gates everything buyer-facing: the buyer taps ✅
// before a need is opened, and numbers still only move via quote acceptance.

async function handleRadarCommand(from: string, lower: string): Promise<void> {
  const arg = lower.replace(/^radar\b/, '').trim()

  if (arg === 'claim') {
    const biz = await verifiedListingFor(from)
    if (!biz) {
      await sendWhatsAppMessage(
        from,
        'Radar leads are for *verified* suppliers - reply `verify` to get the green tick first.'
      )
      return
    }
    const subCity = await getDemandSub(from)
    if (!subCity) {
      await sendWhatsAppMessage(
        from,
        'Your radar is off, so there\'s nothing to claim - reply `radar on` first.'
      )
      return
    }
    const ev = await findClaimableDemandEvent(from, subCity)
    if (!ev) {
      await sendWhatsAppMessage(
        from,
        'No open leads on the radar right now - I\'ll ping you the moment a matching search lands.'
      )
      return
    }
    if (!(await claimDemandEvent(ev.id, from))) {
      await sendWhatsAppMessage(
        from,
        'Someone just grabbed that lead - try `claim` again in a minute.'
      )
      return
    }
    await sendWhatsAppMessage(
      from,
      `🎯 Lead taken - "${ev.term}"${ev.city ? ` in ${ev.city}` : ''} (${ev.result_count} result${ev.result_count === 1 ? '' : 's'}).`
    )
    const buyerDigits = digitsOnly(ev.buyer)
    await sendInteractiveButtons(
      buyerDigits,
      `👋 A supplier on wa.directory is offering help with "${ev.term}"${ev.city ? ` in ${ev.city}` : ''}. Share your number with them?`,
      [
        { id: `claim_yes_${ev.id}`, title: '✅ Yes, share it' },
        { id: `claim_no_${ev.id}`, title: '🚫 No thanks' },
      ]
    )
    return
  }

  if (arg === 'on' || arg === 'all') {
    const biz = await verifiedListingFor(from)
    if (!biz) {
      await sendWhatsAppMessage(
        from,
        'Radar is for *verified* suppliers - reply `verify` to get the green tick first.'
      )
      return
    }
    const city = arg === 'all' ? 'all' : biz.city || 'all'
    await recordDemandSub(from, city)
    await sendWhatsAppMessage(
      from,
      city === 'all'
        ? '📡 Radar on - nationwide. I\'ll ping you for matching searches anywhere in Zimbabwe. Reply `radar off` anytime.'
        : `📡 Radar on - I'll ping you when buyers search for what you sell in ${biz.city}. Reply \`radar off\` anytime.`
    )
    return
  }

  if (arg === 'off') {
    await recordDemandSub(from, '')
    await sendWhatsAppMessage(
      from,
      '📡 Radar off - no more pings. Your quotes and listings keep working as usual.'
    )
    return
  }

  const subCity = await getDemandSub(from)
  await sendWhatsAppMessage(
    from,
    subCity
      ? `📡 Your radar is ${subCity === 'all' ? 'on, nationwide' : `on for ${subCity}`} - I ping you when matching buyer searches land. \`claim\` takes the newest lead, \`radar off\` stops pings.`
      : '📡 *Supplier Radar*\nI ping you when buyers search for what you sell. Verified suppliers only - reply `verify` first, then `radar on` (your city) or `radar all` (nationwide).'
  )
}

async function handleClaimConsent(
  from: string,
  yes: boolean,
  eventId: number
): Promise<void> {
  const ev = await getDemandEventById(eventId)
  if (!ev || digitsOnly(ev.buyer) !== digitsOnly(from)) return

  const supplierDigits = digitsOnly(ev.claimed_by || '')
  if (!supplierDigits) {
    await unclaimDemandEvent(ev.id)
    await sendWhatsAppMessage(
      from,
      'That offer is no longer active - nothing was shared.'
    )
    return
  }

  if (!yes) {
    await unclaimDemandEvent(ev.id, supplierDigits)
    await sendWhatsAppMessage(from, 'No problem - nothing was shared.')
    await sendWhatsAppMessage(
      supplierDigits,
      `The buyer for "${ev.term}"${ev.city ? ` in ${ev.city}` : ''} declined to share their number. Lead closed.`
    )
    return
  }

  const evFresh = await consumeClaim(ev.id, supplierDigits)
  if (!evFresh) {
    await unclaimDemandEvent(ev.id, supplierDigits)
    await sendWhatsAppMessage(
      from,
      'That offer expired before you replied - nothing was shared.'
    )
    await sendWhatsAppMessage(
      supplierDigits,
      `The "${ev.term}" lead expired before the buyer replied. Reply \`claim\` to try the next one.`
    )
    return
  }

  const need = await createNeed({
    buyer_phone: from,
    item: evFresh.term,
    qty: '',
    budget: '',
    city: evFresh.city || '',
  })
  if (!need) {
    await unclaimDemandEvent(evFresh.id, supplierDigits)
    await sendWhatsAppMessage(
      from,
      'Couldn\'t open the need right now - nothing was shared.'
    )
    await sendWhatsAppMessage(
      supplierDigits,
      `Couldn't open the "${evFresh.term}" lead right now. Reply \`claim\` to try again later.`
    )
    return
  }

  await sendWhatsAppMessage(
    from,
    renderNeedPosted(need.rq_id, {
      item: evFresh.term,
      qty: '',
      budget: '',
      city: evFresh.city || '',
    })
  )
  await setDemandEventRq(evFresh.id, need.rq_id)
  await sendWhatsAppMessage(
    supplierDigits,
    `✅ Buyer approved for "${evFresh.term}" - the need is live as *${need.rq_id}*.\nReply \`quotes ${need.rq_id} <price>\` and they'll see your quote right here.`
  )
}

/** Buyer taps ✅ on a quote card: close the need with that winner and
 * hand both sides a bare WhatsApp number each — one tap to save. */
async function pickQuoteForBuyer(buyerPhone: string, quoteId: number) {
  const quote = await getQuoteById(quoteId)
  if (!quote) return
  const need = await getNeedById(quote.need_id)
  if (!need) return
  if (digitsOnly(need.buyer_phone) !== digitsOnly(buyerPhone)) return
  if (need.status !== 'open') {
    await sendWhatsAppMessage(buyerPhone, renderNeedFilled(need.rq_id, '', 'another supplier'))
    return
  }
  await closeNeedByRqId(need.rq_id, 'buyer', quote.id)
  const quotes = await listNeedQuotes(need.id)
  const other = quotes.filter(q => q.id !== quote.id && q.price).slice(0, 4)
  await sendWhatsAppMessage(
    buyerPhone,
    [
      `🎉 Deal noted on *${need.rq_id}* - thread quiet now.`,
      quote.supplier_name ? `Winner: *${quote.supplier_name}* - their contact card is on its way, one tap to save.` : '',
      other.length > 0 ? `Other quotes for reference: ${other.map(q => q.price).join(', ')}.` : '',
      '',
      'Send a new search or 🛒 *menu* → Post a need anytime.',
    ].filter(Boolean).join('\n')
  )
  await sendContactCard(buyerPhone, quote.supplier_name || 'Supplier', quote.supplier_phone)
  await sendWhatsAppMessage(
    quote.supplier_phone,
    [
      `🎉 You won *${need.rq_id}* (${[need.qty, need.item].filter(Boolean).join(' ')}${need.city ? `, ${need.city}` : ''})!`,
      'The buyer\'s contact card is on its way - one tap to save, then chat directly.',
    ].join('\n')
  )
  await sendContactCard(quote.supplier_phone, 'Buyer', need.buyer_phone)
}

/** Any "RQ-…" text: quote capture, buyer stop/reopen, closed-need notices.
 * Returns true when the message was handled as a need interaction. */
// String-built regexes: the bundler strips backslashes inside string
// literals, so every escape here is assembled from a runtime backslash —
// never a literal one in source.
const RQS = String.fromCharCode(92)
const RQ_DETECT = new RegExp('(?:^|[^a-z0-9])rq[-' + RQS + 's]?(' + RQS + 'd{3,8})(?:[^a-z0-9]|$)', 'i')
const RQ_STOP = new RegExp('(?:' + RQS + 'b)(stop|quiet)(?:' + RQS + 'b)', 'i')
const RQ_OPEN = new RegExp('(?:' + RQS + 'b)(open|reopen|more quotes)(?:' + RQS + 'b)', 'i')
const STOP_ALL = new RegExp('^stop quotes?$', 'i')
const RQ_PRICE = new RegExp('(?:' + RQS + '$|usd)' + RQS + 's*([0-9,]+(?:' + RQS + '.' + RQS + 'd{1,2})?)', 'i')

async function handleRqText(from: string, waName: string, text: string): Promise<boolean> {
  const clean = text.replace(/[*_`]/g, '').replace(/\s+/g, " ").trim()
  // Buyer's wholesale quiet: stops the most recent open need.
  if (!RQ_DETECT.test(clean) && STOP_ALL.test(clean)) {
    const open = (await listOpenNeeds(20)).find(n => digitsOnly(n.buyer_phone) === digitsOnly(from))
    if (open) {
      await closeNeedByRqId(open.rq_id, 'buyer')
      await sendWhatsAppMessage(from, renderNeedClosedByBuyer(open.rq_id))
      return true
    }
  }

  if (!RQ_DETECT.test(clean)) return false
  const rqId = canonicalRq(clean)
  if (!rqId) return false

  const need = await getNeedByRqId(rqId)
  if (!need) {
    await sendWhatsAppMessage(from, `${rqId} is not a need on our board. Check the id - it looks like *RQ-1234*.`)
    return true
  }
  const isBuyer = digitsOnly(need.buyer_phone) === digitsOnly(from)

  if (RQ_STOP.test(clean)) {
    if (isBuyer) {
      await closeNeedByRqId(rqId, 'buyer')
      await sendWhatsAppMessage(from, renderNeedClosedByBuyer(rqId))
    } else {
      await sendWhatsAppMessage(from, 'Only the person who posted this need can quiet it.')
    }
    return true
  }
  if (isBuyer && RQ_OPEN.test(clean) && !/[$0-9]{2}/.test(clean.replace(/rq[-\s]?[0-9]+/i, " "))) {
    const reopened = need.status !== "open"
    if (reopened) await reopenNeed(need.id)
    await sendWhatsAppMessage(
      from,
      reopened
        ? `🔄 ${rqId} is live again - matching suppliers will pick it up on their next quote.`
        : `${rqId} is already live and waiting for quotes.`
    )
    return true
  }

  if (need.status !== 'open') {
    let winner = 'another supplier'
    if (need.winner_quote_id) {
      const q = await getQuoteById(need.winner_quote_id)
      if (q?.supplier_name) winner = q.supplier_name
    }
    await sendWhatsAppMessage(from, renderNeedFilled(rqId, need.updated_at ? `on ${fmtHarare(need.updated_at, true)}` : "", winner))
    return true
  }

  // Price: prefer anything after $/USD; else the first number on the line.
  let price = ''
  let bodyText = clean.replace(/rq[-\s]?[0-9]+/i, " ")
  const pm = bodyText.match(RQ_PRICE)
  if (pm) {
    price = `$${pm[1].replace(/,/g, "")}`
    bodyText = bodyText.replace(pm[0], " ")
  } else {
    const nm = bodyText.match(/[0-9][0-9,]*(?:.\d{1,2})?/)
    if (nm) {
      price = `$${nm[0].replace(/,/g, "")}`
      bodyText = bodyText.replace(nm[0], " ")
    }
  }
  bodyText = bodyText.replace(/\s+/g, " ").trim().slice(0, 200)

  const result = await addNeedQuote(need.id, from, waName, price, bodyText)
  if (result.atCap) {
    await sendWhatsAppMessage(from, `${rqId} is closed to new quotes (5 already relayed). The buyer may reopen it with *${rqId} open* - meanwhile reply *menu* for other work.`)
    return true
  }
  if (!result.ok || !result.quote) {
    await sendWhatsAppMessage(from, 'Your quote could not be saved just now - send it again in a moment.')
    return true
  }

  // Relay straight into the buyer's chat (never the buyer's number out).
  const quotes = await listNeedQuotes(need.id)
  const supabase = getSupabase()
  const { data: supRow } = await supabase
    .from('businesses')
    .select('website')
    .eq('phone', digitsOnly(from))
    .maybeSingle()
  const supplierWebsite = ((supRow as { website?: string | null } | null)?.website || '').trim() || null
  await sendInteractiveButtons(
    need.buyer_phone,
    renderQuoteCard(rqId, waName || "A supplier", price, bodyText, quotes.length, Math.max(quotes.length, (need.quotes_forwarded || 0) + 1), supplierWebsite),
    [
      { id: `q_pick_${result.quote.id}`, title: "✅ Deal with this" },
      { id: `q_stop_${rqId}`, title: "✋ Stop quotes" },
    ]
  )
  await sendWhatsAppMessage(
    from,
    [
      `✔ Quote sent to the buyer of ${rqId}.`,
      "If they pick you, you get their contact card here - deal directly after that.",
    ].join("\n")
  )
  return true
}

// ── Human takeover (chat handoff over WhatsApp) ─────────────────────────
// A held session relays every inbound message to the admins instead of
// running the bot. holdChat/releaseChat drive the same `held` flag inside
// chat_sessions.data that the dashboard hold button writes, so both sides
// stay in sync with no extra tables.

async function relayHeldMessage(
  from: string,
  text: string,
  action: string,
  mediaKind: MediaKind | null,
  location: { lat: number; lng: number } | null
): Promise<void> {
  const cur = await getSession(from)
  if (!cur?.data?.held) return
  const shown = text
    || (action ? `[tap: ${action}]` : '')
    || (mediaKind === 'audio' ? '[voice note]' : '')
    || (mediaKind === 'image' ? '[photo]' : '')
    || (location ? `[location ${location.lat.toFixed(5)},${location.lng.toFixed(5)}]` : '')
    || '[unknown message]'
  const payer = digitsOnly(from)
  for (const admin of await adminNumbers()) {
    if (admin === payer) continue
    await sendWhatsAppMessage(admin, `🤝 *+${payer}* (${cur.step})\n${shown}`)
  }
  // One-time ack: dashboard-only holds stay silent until the user speaks.
  if (!cur.data.held.notified) {
    await sendWhatsAppMessage(
      from,
      '🤝 Your chat is with our team now — they can see what you sent. Please allow a short moment.'
    )
    await saveSession(from, cur.step, { ...cur.data, held: { ...cur.data.held, notified: true } })
  }
}

async function holdChat(adminFrom: string, num: string): Promise<void> {
  if (!num || num.length < 9 || num.startsWith('0')) {
    await sendWhatsAppMessage(adminFrom, 'Send the full number: *hold 263771234567*.')
    return
  }
  const cur = await getSession(num)
  await saveSession(num, cur?.step || 'idle', {
    ...(cur?.data || {}),
    held: { at: new Date().toISOString(), notified: true },
  })
  await sendWhatsAppMessage(
    num,
    '🤝 Your chat is with our team now — they can see what you sent. Please allow a short moment.'
  )
  await sendWhatsAppMessage(
    adminFrom,
    `✋ Chat for +${num} is on hold. Their messages now come to you and other admins. Reply *release ${num}* to hand them back to the bot.`
  )
}

async function releaseChat(adminFrom: string, num: string): Promise<void> {
  if (!num || num.length < 9) {
    await sendWhatsAppMessage(adminFrom, 'Send the full number: *release 263771234567*.')
    return
  }
  const cur = await getSession(num)
  if (!cur?.data?.held) {
    await sendWhatsAppMessage(adminFrom, `ℹ️ +${num} is not on hold.`)
    return
  }
  await saveSession(num, cur.step, { ...cur.data, held: undefined })
  await sendWhatsAppMessage(num, '🙌 You are back on! Reply *menu* to see everything I can do.')
  await sendWhatsAppMessage(adminFrom, `✅ +${num} handed back to the bot.`)
}

async function handleAdminCommand(from: string, text: string): Promise<boolean> {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  if (lower === 'digest' || lower.startsWith('digest ')) {
    const args = clean.slice(6).trim().split(/\s+/).filter(Boolean)
    // Day view: "digest 21-10-2026" (or today / yesterday) compiles that
    // calendar day's full report without touching the cursor. Times
    // ("digest 10:30 13:00") keep their existing window behavior.
    const first = args[0]?.toLowerCase() || ''
    const dayMatch = args.length === 1 ? first.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/) : null
    if (args.length === 1 && (dayMatch || first === 'today' || first === 'yesterday')) {
      let dayIso = new Date().toISOString().slice(0, 10)
      if (first === 'yesterday') {
        dayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      } else if (dayMatch) {
        const dd = Number(dayMatch[1]); const mm = Number(dayMatch[2]); const yy = Number(dayMatch[3])
        const probe = new Date(Date.UTC(yy, mm - 1, dd))
        if (mm < 1 || mm > 12 || probe.getUTCMonth() !== mm - 1 || probe.getUTCDate() !== dd) {
          await sendWhatsAppMessage(from, 'That date looks off. Use *digest 21-10-2026*.')
          return true
        }
        dayIso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
      }
      const dayDigest = await compileDigest(`${dayIso}T00:00:00Z`, new Date(new Date(`${dayIso}T00:00:00Z`).getTime() + 86400000).toISOString())
      await sendWhatsAppMessage(from, dayDigest)
      await sendWhatsAppMessage(from, '- view only; your cursor is untouched.')
      return true
    }
    const cursor = await getDigestCursor()
    const win = parseDigestWindow(args, cursor)
    if (win.error) {
      await sendWhatsAppMessage(
        from,
        [
          "Didn't catch that time. Formats: *digest*, *digest 10:30*, *digest 10:30 13:00*, *digest 21-10-2026*.",
          '*digest* reports everything since your last check-in and moves the window.',
        ].join('\n')
      )
      return true
    }
    const digest = await compileDigest(win.fromIso, win.toIso)
    await sendWhatsAppMessage(from, digest)
    if (args.length === 0) {
      await bumpDigestCursor(win.toIso)
      await sendWhatsAppMessage(from, `- cursor moved to ${fmtHarare(win.toIso)} (Harare). Next plain *digest* starts from here.`)
    }
    return true
  }

  if (lower === 'needs' || lower.startsWith('needs ')) {
    const arg = lower === 'needs' ? '' : clean.slice(6).trim().toLowerCase()
    if (arg && arg !== 'today' && arg !== 'yesterday' && !/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/.test(arg)) {
      await sendWhatsAppMessage(from, 'Try: *needs* (open board) · *needs today* · *needs yesterday* · *needs 22-10-2026*.')
      return true
    }
    if (arg) {
      // Day view: everything created on that day, open and closed.
      let dayIso = new Date().toISOString().slice(0, 10)
      if (arg === 'yesterday') {
        dayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      } else if (arg !== 'today') {
        const m = arg.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/) || [null, '', '', '']
        const dd = Number(m[1]); const mm = Number(m[2]); const yy = Number(m[3])
        const probe = new Date(Date.UTC(yy, mm - 1, dd))
        if (mm < 1 || mm > 12 || probe.getUTCMonth() !== mm - 1 || probe.getUTCDate() !== dd) {
          await sendWhatsAppMessage(from, 'That date looks off. Use *needs 22-10-2026*.')
          return true
        }
        dayIso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
      }
      const needs = await listNeedsOnDay(dayIso, 15)
      if (needs.length === 0) {
        await sendWhatsAppMessage(from, `No needs on ${dayIso.split('-').reverse().join('-')}.`)
        return true
      }
      const lines = [`📋 *Needs - ${dayIso.split('-').reverse().join('-')}*`, '']
      for (const n of needs) {
        lines.push(
          `${n.rq_id} · ${[n.qty, n.item].filter(Boolean).join(' ')} · ${(n.city || 'countrywide').toUpperCase()}` +
          (n.budget ? ` · ${n.budget}` : '') + ` · ${n.status} · ${n.quotes_forwarded || 0}q`
        )
      }
      const openCount = needs.filter(n => n.status === 'open').length
      lines.push('', `${needs.length} need${needs.length === 1 ? '' : 's'} · ${openCount} open`,
        'Reply *quotes RQ-xxxx* or *close RQ-xxxx*.')
      await sendWhatsAppMessage(from, lines.join('\n'))
      return true
    }
    // Bare needs: the open board (unchanged muscle memory).
    const needs = await listOpenNeeds(20)
    if (needs.length === 0) {
      await sendWhatsAppMessage(from, 'No open needs on the board right now.')
      return true
    }
    const lines = ['🛒 *Open needs*', '']
    for (const n of needs) {
      lines.push(`${n.rq_id} · ${[n.qty, n.item].filter(Boolean).join(' ')} · ${(n.city || 'countrywide').toUpperCase()} · ${n.quotes_forwarded || 0} quote${n.quotes_forwarded === 1 ? '' : 's'}`)
    }
    lines.push('', 'Reply *close RQ-xxxx* to quiet one, or *digest* for the full report.',
      'Needs from a day? *needs 22-10-2026* (or today / yesterday).')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  if (lower === 'hold' || lower.startsWith('hold ')) {
    if (!(await isBotAdmin(from))) {
      await sendWhatsAppMessage(from, '🔒 This command is for administrators only.')
      return true
    }
    const num = digitsOnly(clean.slice(5).trim())
    await holdChat(from, num)
    return true
  }

  if (lower === 'release' || lower.startsWith('release ')) {
    if (!(await isBotAdmin(from))) {
      await sendWhatsAppMessage(from, '🔒 This command is for administrators only.')
      return true
    }
    const num = digitsOnly(clean.slice(8).trim())
    await releaseChat(from, num)
    return true
  }

  if (lower === 'emergency' || lower.startsWith('emergency ')) {
    const admin = await isBotAdmin(from)
    if (!admin) {
      await sendWhatsAppMessage(from, '🔒 This command is for administrators only.')
      return true
    }
    const adminClean = clean.slice(9).trim()
    const adminLower = adminClean.toLowerCase()

        // near <city>
    const nearMatch = adminClean.match(/^near\\s+(.+)$/i)
    if (nearMatch) {
      const city = nearMatch[1].trim()
      const results = await findEmergencyNear(city)
      if (results.length === 0) {
        await sendWhatsAppMessage(from, `No emergency contacts found near "${city}".`)
      } else {
        await sendWhatsAppMessage(from, `🆘 Nearest emergency contacts near "${city}":`)
        for (const c of results) {
          const wa = emergencyWaLink(c.phone)
          const where = [c.suburb, c.city].filter(Boolean).join(', ')
          await sendWhatsAppMessage(from, `${categoryIcon(c.category)} ${c.category.toUpperCase()} · ${where || '-'} · 📞 ${c.phone}${wa ? ` · ${wa}` : ''}`)
        }
      }
      return true
    }

    // add <phone> [category] <suburb…> <city> — owner spec: contact, suburb,
    // city (multi-word suburbs ok; category optional, defaults to police).
    if (adminLower.startsWith('add ')) {
      const parsed = parseEmergencyAdd(adminClean.slice(4).trim())
      if (!parsed.ok || !parsed.contact) {
        await sendWhatsAppMessage(from, parsed.error || 'Could not read that - try the *emergency* help.')
        return true
      }
      const c = parsed.contact
      const ok = await addEmergencyContact(c)
      if (!ok) {
        await sendWhatsAppMessage(from, '⚠️ Already saved: same number + category in that city.')
        return true
      }
      const wa = emergencyWaLink(c.phone)
      await sendWhatsAppMessage(
        from,
        [
          '✅ Emergency contact saved.',
          '',
          `${categoryIcon(c.category)} ${c.category.toUpperCase()}`,
          `📞 ${c.phone}` + (wa ? `\n💬 ${wa}` : ''),
          `📍 ${c.suburb}, ${c.city.toUpperCase()}`,
          '',
          `Test it: reply *emergency near ${c.city}*.`,
        ].join('\n')
      )
      return true
    }

    // del <phone> — narrow by optional city word when two cities share a line.
    if (adminLower.startsWith('del ')) {
      const delParts = adminClean.slice(4).trim().split(/\s+/)
      const removed = await deleteEmergencyContact(delParts[0] || '', delParts[1])
      await sendWhatsAppMessage(
        from,
        removed > 0 ? `🗑️ Removed ${removed} contact${removed === 1 ? '' : 's'}.` : 'No match - check the number: *emergency list*.'
      )
      return true
    }

    // list
    if (adminLower === 'list') {
      const contacts = await listEmergencyContacts()
      if (contacts.length === 0) {
        await sendWhatsAppMessage(from, '📭 No emergency contacts seeded yet. Add one: *add 263771234567 police CBD Harare*.')
      } else {
        await sendWhatsAppMessage(from, `📋 Emergency contacts (${contacts.length}):`)
        for (const c of contacts) {
          const wa = emergencyWaLink(c.phone)
          const where = [c.suburb, c.city].filter(Boolean).join(', ')
          await sendWhatsAppMessage(
            from,
            [
              `${categoryIcon(c.category)} ${c.category.toUpperCase()} · ${where || '-'}`,
              `📞 ${c.phone}${wa ? ` · ${wa}` : ''}` + (c.name ? `\n${c.name}` : ''),
            ].join('\n')
          )
        }
      }
      return true
    }

    // clear
    if (adminLower === 'clear') {
      const ok = await clearEmergencyContacts()
      await sendWhatsAppMessage(from, ok ? '✅ Emergency contacts cleared.' : '❌ Failed to clear contacts')
      return true
    }

    // fallback help
    await sendWhatsAppMessage(from, [
      'Emergency contact tools:',
      '*emergency add <phone> [category] <suburb> <city>* - save one (e.g. *add 263771234567 ambulance Waterford Bulawayo*)',
      '*emergency del <phone> [city-word]* - remove one',
      '*emergency list* - everything saved',
      '*emergency near <city>* - what buyers would get there',
      '*emergency clear* - wipe the whole list',
      '',
      `Categories: ${[...VALID_CATEGORIES].join(' | ')} (default: police).`,
    ].join('\n'))
    return true
  }

  if (lower.startsWith('close ')) {
    const rqId = canonicalRq(clean.slice(6))
    if (!rqId) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *close RQ-7181*.')
      return true
    }
    const ok = await closeNeedByRqId(rqId, 'admin')
    await sendWhatsAppMessage(from, ok ? `✅ ${rqId} closed - no more quotes relay.` : `${rqId} was not open (might already be closed).`)
    return true
  }

  if (lower === 'stats') {
    await sendWhatsAppMessage(from, await adminWeeklyStats())
    return true
  }

  if (lower === 'listings') {
    const recent = await listRecentBusinesses(10)
    if (recent.length === 0) {
      await sendWhatsAppMessage(from, 'No businesses yet.')
      return true
    }
    const lines = ['🏪 *Newest listings* (10 max)', '']
    for (let i = 0; i < recent.length; i++) {
      const b = recent[i]
      const state = [
        b.verified ? '✅ verified' : '○ unverified',
        b.payment_status === 'active' ? 'paid' : (b.payment_status || 'pending'),
      ].join(' · ')
      lines.push(
        `${i + 1}. *${b.name}*` +
        (b.username ? ` · @${b.username}` : '') +
        (b.city ? ` · ${b.city}` : '') +
        ` · ${state} · ${b.created_at.slice(0, 10)}`
      )
    }
    lines.push('', 'Unverified ones: reply *pending* to verify.')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  // Admin: subscribers with expiry dates
  if (lower === 'subscribers' || lower.startsWith('subscribers ')) {
    const arg = lower === 'subscribers' ? '' : clean.slice(11).trim().toLowerCase()
    const supabase = getSupabase()
    let query = supabase
      .from('subscriptions')
      .select('id, business_id, status, amount, started_at, expires_at, businesses(name, phone, city, payment_status, username)')
      .order('expires_at', { ascending: true })

    if (arg === 'active') {
      query = query.eq('status', 'active')
    } else if (arg === 'expired') {
      query = query.eq('status', 'expired')
    } else if (arg === 'pending') {
      query = query.eq('status', 'pending')
    } else if (arg === 'expiring') {
      query = query.eq('status', 'active').lte('expires_at', new Date(Date.now() + 7 * 86400000).toISOString())
    }

    const { data: subs } = await query.limit(50)
    if (!subs?.length) {
      await sendWhatsAppMessage(from, arg ? `No ${arg} subscriptions found.` : 'No subscriptions found.')
      return true
    }

    const now = Date.now()
    const lines = [`📋 *Subscriptions${arg ? ` - ${arg}` : ''}* (${subs.length})`, '']
    for (let i = 0; i < subs.length; i++) {
      const s = subs[i]
      const biz = s.businesses as any
      const exp = s.expires_at ? new Date(s.expires_at).getTime() : 0
      const diff = exp ? Math.ceil((exp - now) / 86400000) : null
      let expLine = ''
      if (!s.expires_at) expLine = ' · no expiry'
      else if (diff === null || diff < 0) expLine = ` · expired ${Math.abs(diff || 1)}d ago`
      else if (diff === 0) expLine = ' · expires today'
      else if (diff === 1) expLine = ' · expires tomorrow'
      else expLine = ` · ${diff}d left`
      const statusBadge = s.status === 'active' ? '✅' : s.status === 'pending' ? '⏳' : s.status === 'expired' ? '❌' : '⚠️'
      lines.push(
        `${i + 1}. ${statusBadge} *${biz?.name || 'Unknown'}*${expLine}` +
        (biz?.username ? ` · @${biz.username}` : '') +
        (biz?.city ? ` · ${biz.city}` : '') +
        ` · $${s.amount || 0} · ${s.started_at?.slice(0, 10) || '?'}`
      )
    }
    lines.push('', 'Filter: *subscribers active* · *subscribers expired* · *subscribers pending* · *subscribers expiring*')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  if (lower === 'contacts' || lower.startsWith('contacts ')) {
    const arg = lower === 'contacts' ? 'all' : clean.slice(9).trim().toLowerCase()
    if (!['all', 'biz', 'businesses', 'people', 'personal', 'chats'].includes(arg)) {
      await sendWhatsAppMessage(from, 'Try: *contacts* (all) · *contacts biz* · *contacts people* · *contacts chats*.')
      return true
    }

    if (arg === 'chats') {
      const chats = await listChatCsvRows(50)
      if (!chats.length) {
        await sendWhatsAppMessage(from, 'No bot participants yet.')
        return true
      }
      const lines = ['📇 *Bot participants* (most engaged first)', '']
      let opted = 0
      chats.forEach((c, i) => {
        if (c.opted_out) opted++
        lines.push(
          `${i + 1}. *${c.name || 'Unknown'}* · ${formatPhone(c.phone)} · ${c.message_count ?? 0} msgs` +
          (c.opted_out ? ' · opted out' : '')
        )
      })
      lines.push('', `${chats.length} shown · ${opted} opted out${arg === 'chats' ? '' : ''}`,
        'Full file: reply *csv chats*.')
      await sendWhatsAppMessage(from, lines.join('\n'))
      return true
    }

    const rows = await listDirectoryRows()
    const isPersonal = (r: DirectoryRow) => (r.category || []).includes('Personal Contact')
    const businesses = rows.filter(r => !isPersonal(r))
    const personal = rows.filter(isPersonal)

    const wantBiz = arg === 'all' || arg === 'biz' || arg === 'businesses'
    const wantPeople = arg === 'all' || arg === 'people' || arg === 'personal'
    if (!businesses.length && wantBiz && !wantPeople) {
      await sendWhatsAppMessage(from, 'No businesses in the directory yet.')
      return true
    }
    if (!personal.length && wantPeople && !wantBiz) {
      await sendWhatsAppMessage(from, 'No personal contacts listed yet.')
      return true
    }

    const messages: string[] = []
    if (arg === 'all') {
      messages.push(`📇 *WA Directory contacts*\n🏪 ${businesses.length} businesses · 👤 ${personal.length} personal`)
    }
    if (wantBiz) {
      messages.push(
        ...contactChunkMessages('🏪 *Businesses*', businesses.map(r => ({ name: r.name, city: r.city, phone: r.phone, phoneType: r.phone_type })))
      )
    }
    if (wantPeople) {
      messages.push(
        ...contactChunkMessages('👤 *Personal contacts*', personal.map(r => ({ name: r.name, city: r.city, phone: r.phone, phoneType: r.phone_type })))
      )
    }
    for (const m of messages) {
      await sendWhatsAppMessage(from, m)
      await new Promise(r => setTimeout(r, 350))
    }
    return true
  }

  if (lower === 'csv' || lower.startsWith('csv ')) {
    const arg = lower === 'csv' ? '' : clean.slice(4).trim().toLowerCase()
    if (!['businesses', 'people', 'chats'].includes(arg)) {
      await sendWhatsAppMessage(from, 'Try: *csv businesses* · *csv people* · *csv chats*.')
      return true
    }
    const today = new Date().toISOString().slice(0, 10)
    let filename = ''
    let mime = 'text/csv'
    let content = ''
    if (arg === 'businesses' || arg === 'people') {
      const dirRows = await listBizCsvRows()
      if (arg === 'businesses') {
        content = csvForBusinesses(dirRows)
        filename = `wa-businesses-${today}.csv`
      } else {
        content = csvForPeople(dirRows)
        filename = `wa-people-${today}.csv`
      }
    } else {
      const chats = await listChatCsvRows()
      content = csvForChats(chats)
      filename = `wa-chats-${today}.csv`
    }
    await sendWhatsAppDocument(from, filename, mime, content)
    return true
  }

  if (lower === 'admins') {
    const list = await adminNumbers()
    const root = digitsOnly(ADMIN_WHATSAPP || '')
    const lines = ['👥 *Bot admins*', '']
    for (const n of list) lines.push(`${fmtAdminNumber(n)}${n === root ? ' · owner' : ''}`)
    lines.push('', 'Owner can add/remove: *admin add 263…* / *admin del 263…*')
    lines.push('Broadcast: *cast owners/buyers/all <msg> [today 15:30]* · *casts*')
    lines.push('Needs by day: *needs 22-10-2026* (or today / yesterday) · Listings: *listings*')
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const adminAdd = clean.match(/^admin\s+(add|del)\s+(\+?[\d\s-]{6,20})$/i)
  if (adminAdd) {
    const root = digitsOnly(ADMIN_WHATSAPP || '')
    if (digitsOnly(from) !== root) {
      await sendWhatsAppMessage(from, 'Only the owner number can change admins.')
      return true
    }
    const num = digitsOnly(adminAdd[2])
    if (num.length < 9 || num === root) {
      await sendWhatsAppMessage(from, 'Send a full number like *admin add 263771234567*.')
      return true
    }
    const raw = await getBotSetting('admin_allowlist')
    let extras: string[] = []
    try {
      const parsed = JSON.parse(raw || '[]')
      if (Array.isArray(parsed)) extras = parsed.map(x => digitsOnly(String(x))).filter(Boolean)
    } catch {
      extras = []
    }
    if (adminAdd[1].toLowerCase() === 'add') {
      if (extras.includes(num)) {
        await sendWhatsAppMessage(from, `${fmtAdminNumber(num)} is already an admin.`)
        return true
      }
      extras.push(num)
      await setBotSetting('admin_allowlist', JSON.stringify(extras))
      await sendWhatsAppMessage(from, `✅ Added ${fmtAdminNumber(num)}. They can now run *digest*, *needs*, *stats* and get need copies.`)
    } else {
      if (!extras.includes(num)) {
        await sendWhatsAppMessage(from, `${fmtAdminNumber(num)} is not on the admin list.`)
        return true
      }
      extras = extras.filter(n => n !== num)
      await setBotSetting('admin_allowlist', JSON.stringify(extras))
      await sendWhatsAppMessage(from, `✅ Removed ${fmtAdminNumber(num)}.`)
    }
    return true
  }

  const quotesCmd = clean.match(/^quotes\s+(.+)$/i)
  if (quotesCmd) {
    const rqId = canonicalRq(quotesCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *quotes RQ-7181*.')
      return true
    }
    const qs = await listNeedQuotes(need.id, 10)
    const lines = [
      `💬 *${need.rq_id}* · ${[need.qty, need.item].filter(Boolean).join(' ')} · ${(need.city || 'countrywide').toUpperCase()}`,
      `Status: ${need.status} · ${qs.length} quote${qs.length === 1 ? '' : 's'} stored`,
      '',
    ]
    qs.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.supplier_name || 'supplier'} · ${q.price || '(no price)'}${q.body ? ` · ${q.body}` : ''}`)
    })
    if (!qs.length) lines.push('No quotes yet.')
    lines.push('', `Reply *close ${need.rq_id}* to quiet it, *reopen ${need.rq_id}* to restart.`)
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const reopenCmd = clean.match(/^reopen\s+(.+)$/i)
  if (reopenCmd) {
    const rqId = canonicalRq(reopenCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *reopen RQ-7181*.')
      return true
    }
    if (need.status === 'open') {
      await sendWhatsAppMessage(from, `${need.rq_id} is already open.`)
      return true
    }
    await reopenNeed(need.id)
    await sendWhatsAppMessage(from, `🔄 ${need.rq_id} reopened - quotes relay again.`)
    return true
  }

  const postCmd = clean.match(/^post\s+(.+)$/i)
  if (postCmd) {
    const rqId = canonicalRq(postCmd[1])
    const need = rqId ? await getNeedByRqId(rqId) : null
    if (!need) {
      await sendWhatsAppMessage(from, 'Which need? e.g. *post RQ-7181*.')
      return true
    }
    await sendWhatsAppMessage(from, `📋 Channel post for ${need.rq_id}:\n\n${channelPostFor(need)}`)
    return true
  }

  const peopleCmd = clean.match(/^(optin|optout)\s+(\+?[\d\s-]{6,20})$/i)
  if (peopleCmd) {
    const num = digitsOnly(peopleCmd[2])
    if (num.length < 9) {
      await sendWhatsAppMessage(from, 'Send a full number like *optout 263771234567*.')
      return true
    }
    const off = peopleCmd[1].toLowerCase() === 'optout'
    if (off) await markBotContactOptOut(num)
    else await setBotContactOptIn(num)
    await sendWhatsAppMessage(from, `✅ ${fmtAdminNumber(num)} ${off ? 'will not get follow-ups' : 'can get follow-ups again'}.`)
    return true
  }

  if (lower === 'switch' || lower.startsWith('switch ')) {
    const state = await prioritySwitchState()
    if (lower === 'switch') {
      await sendWhatsAppMessage(from, `🔀 Priority-supplier switch: *${state.enabled ? 'ON' : 'OFF'}* · price ${state.price}\n\nReply *switch on*, *switch off* or *switch price $5*.`)
      return true
    }
    if (lower === 'switch on' || lower === 'switch off') {
      await setPrioritySwitch(lower === 'switch on', state.price)
      await sendWhatsAppMessage(from, `🔀 Priority-supplier switch is now *${lower === 'switch on' ? 'ON' : 'OFF'}*.`)
      return true
    }
    const priceMatch = clean.match(/^switch\s+price\s+(\S{1,24})$/i)
    if (priceMatch) {
      await setPrioritySwitch(state.enabled, priceMatch[1])
      await sendWhatsAppMessage(from, `💵 Priority-supplier price set to *${priceMatch[1]}*.`)
      return true
    }
    await sendWhatsAppMessage(from, 'Use *switch on*, *switch off*, or *switch price $5*.')
    return true
  }

  if (lower === 'channel' || lower.startsWith('channel ')) {
    const stored = await getBotSetting('channel_link')
    const cur = (stored || process.env.CHANNEL_LINK || '').trim()
    if (lower === 'channel' || lower === 'channel status') {
      await sendWhatsAppMessage(from, cur ? `📣 Channel: ${cur}\n\nReply *channel set <link>* to update or *channel clear* to remove.` : 'No channel link set. Reply *channel set <link>*.')
      return true
    }
    const setMatch = clean.match(/^channel\s+set\s+(https?:\/\/\S+)$/i)
    if (setMatch) {
      await setBotSetting('channel_link', setMatch[1])
      await sendWhatsAppMessage(from, `✅ Channel link saved.\n${setMatch[1]}`)
      return true
    }
    if (lower === 'channel clear') {
      await setBotSetting('channel_link', '')
      await sendWhatsAppMessage(from, 'Channel link cleared.')
      return true
    }
    await sendWhatsAppMessage(from, 'Use *channel set https://…* or *channel clear*.')
    return true
  }

  if (lower === 'pending') {
    const bus = await listUnverifiedBusinesses(10)
    if (!bus.length) {
      await sendWhatsAppMessage(from, 'No unverified businesses right now. ✅')
      return true
    }
    await saveSession(from, 'admin_pending', { pendingBiz: bus.map(b => b.id) } as ChatSessionData)
    const lines = ['🕵️ *Unverified businesses*', '']
    bus.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.name} · ${(b.city || '-').toUpperCase()} · ${fmtHarare(b.created_at, true)}${b.phone ? ` · +${digitsOnly(b.phone)}` : ''}`)
    })
    lines.push(
      '',
      'Reply *verify 1* to approve 30 days, *verify 1 90* for custom days, or *unverify 1*.',
      'Or skip the list: *verify Diamond tradings 30* matches by name (typo-friendly).'
    )
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  // verify/unverify — a number picks from the pending list; anything else is
  // a fuzzy business-name match with an optional day-grant in the same line:
  //   verify Diamond tradings 30   ·   verify 1   ·   unverify 2
  const verifyCmd = clean.match(/^(verify|unverify)(?:\s+([\s\S]+))?$/i)
  if (verifyCmd) {
    let op: 'verify' | 'unverify' = verifyCmd[1].toLowerCase() === 'verify' ? 'verify' : 'unverify'
    const arg = (verifyCmd[2] || '').trim()
    if (!arg) {
      await sendWhatsAppMessage(
        from,
        `Use *${op} <number>* after *pending*, or match by name: *${op} <business name> [days]* - e.g. *${op} Diamond tradings 30*.`
      )
      return true
    }

    // Trailing day-count on the same line: "… 30" or "… 30 days" (max 360).
    // Numbers 1-29 are more often part of a name ("Shop 24") than a grant;
    // 30+, or an explicit "days" suffix, means duration.
    let days = 0
    let rest = arg
    const trailing = arg.match(/\s+(\d{1,3})(?:\s*(days?))?\s*$/i)
    if (trailing) {
      const n = Number(trailing[1])
      const namePart = arg.slice(0, trailing.index).trim()
      if (n >= 30 || trailing[2] || namePart.split(/\s+/).length >= 2) {
        days = n
        rest = namePart
      }
    }

    let biz: VerifyCandidate | null = null

    if (/^\d{1,2}$/.test(rest)) {
      // Numbered pick from the pending list (or a previous suggestion list).
      const sess = await getSession(from)
      const ids = sess?.data.pendingBiz || []
      const idx = Number(rest) - 1
      if (idx < 0 || idx >= ids.length) {
        await sendWhatsAppMessage(from, 'Run *pending* first, then reply *verify 1* with the list number.')
        return true
      }
      // A suggestion pick may carry its own op/days from the previous message.
      if (sess?.data.pendingOp) op = sess.data.pendingOp
      if (!days && sess?.data.pendingDays) days = sess.data.pendingDays
      const { data: row } = await getSupabase()
        .from('businesses')
        .select('id, name, phone, slug, username, city, verified, payment_status, created_at')
        .eq('id', ids[idx])
        .maybeSingle()
      biz = (row as VerifyCandidate) || null
    } else {
      const matches = await findBusinessesByName(rest)
      if (!matches.length) {
        await sendWhatsAppMessage(
          from,
          `No business close to *${rest}*. Reply *pending* for the unverified list, or check the spelling.`
        )
        return true
      }
      // One strong match acts immediately; anything fuzzier shows options.
      const clear = matches.length === 1 && bestNameSimilarity(rest, matches[0].name) >= 0.82
      if (!clear) {
        await saveSession(from, 'admin_pending', {
          pendingBiz: matches.map(b => b.id),
          pendingOp: op,
          ...(days ? { pendingDays: days } : {}),
        } as ChatSessionData)
        const lines = [`🤔 Closest matches to *${rest}* - reply *${op} 1* to pick:`, '']
        matches.forEach((b, i) => {
          lines.push(
            `${i + 1}. *${b.name}*${b.city ? ` · ${b.city}` : ''} · ${b.verified ? 'verified' : 'unverified'}`
          )
        })
        await sendWhatsAppMessage(from, lines.join('\n'))
        return true
      }
      biz = matches[0]
    }

    if (!biz) {
      await sendWhatsAppMessage(from, 'That business was not found - run *pending* again.')
      return true
    }

    if (op === 'verify') {
      // Mirror the dashboard approve (app/api/admin/verify): approving a
      // listing activates it with a day-grant (default 30) so it shows in
      // search; the cron reminder + expiry machinery takes over from here.
      // An already-active (paid) listing is just verified — never extended
      // for free unless the admin explicitly typed days.
      const alreadyActive = biz.payment_status === 'active'
      if (days || !alreadyActive) {
        const grant = await activateListingForDays(biz.id, days || 30)
        if (!grant.ok) {
          await sendWhatsAppMessage(from, `❌ Could not activate *${biz.name}*: ${grant.error || 'unknown error'}`)
          return true
        }
        const until = grant.expiresAt ? grant.expiresAt.slice(0, 10) : ''
        await sendWhatsAppMessage(
          from,
          `✅ *${biz.name}* approved - live in search for ${days || 30} days${until ? ` (until ${until})` : ''}.`
        )
        if (biz.phone && digitsOnly(biz.phone) !== digitsOnly(from)) {
          await notifyBusinessLive(biz)
        }
      } else {
        await getSupabase().from('businesses').update({ verified: true }).eq('id', biz.id)
        await sendWhatsAppMessage(from, `✅ *${biz.name}* is now verified (already live).`)
      }
    } else {
      await getSupabase().from('businesses').update({ verified: false }).eq('id', biz.id)
      await sendWhatsAppMessage(from, `↩️ *${biz.name}* is now unverified.`)
    }
    return true
  }

  const castCmd = clean.match(/^cast(?:\s+([\s\S]+))?$/i)
  if (castCmd) {
    const arg = (castCmd[1] || '').trim()
    if (!arg) {
      await sendWhatsAppMessage(
        from,
        [
          '📣 *Broadcast* - reaches contacts active in the last 24h (opted-out skipped).',
          '`cast <message>` - everyone',
          '`cast owners <message>` · `cast buyers <message>`',
          '`cast owners harare <message>` - city or category filter',
          '`cast owners today 15:30 <message>` - schedule (Harare time)',
          '`casts` - recent casts · `cast cancel <id>`',
        ].join('\n')
      )
      return true
    }
    // Cancel is parsed first so it can never read as a segment/filter/message.
    const cancelM = arg.match(/^cancel\s+(\d{1,6})$/i)
    if (cancelM) {
      const okC = await cancelCast(Number(cancelM[1]))
      await sendWhatsAppMessage(
        from,
        okC
          ? `✖️ Cast #${cancelM[1]} cancelled.`
          : `Cast #${cancelM[1]} could not be cancelled - unknown id or already sent.`
      )
      return true
    }
    const parsed = parseCastSpec(arg)
    if (!parsed.spec) {
      await sendWhatsAppMessage(from, parsed.error || 'Could not read that cast.')
      return true
    }
    const spec = parsed.spec
    const estimate = await resolveCastAudience(spec)
    await saveSession(from, 'admin_cast', { castSpec: spec } as ChatSessionData)
    const segLabel =
      spec.segment === 'all' ? 'everyone' : `${spec.segment}${spec.filter ? ` (${spec.filter})` : ''}`
    const previewLines = [
      '📣 *Broadcast preview*',
      '',
      spec.body,
      '',
      `👥 Segment: ${segLabel}`,
      `Estimate: ~${estimate.length} contact${estimate.length === 1 ? '' : 's'} in the last-24h window (capped at ${MAX_AUDIENCE}; final count at send).`,
    ]
    if (spec.scheduledFor) previewLines.push(`⏰ Release: ${fmtHarare(spec.scheduledFor, true)} Harare time.`)
    const buttons = spec.scheduledFor
      ? [
          { id: 'cast_sched', title: '⏰ At that time' },
          { id: 'cast_send', title: '✅ Send now' },
          { id: 'cast_cancel', title: '✖ Cancel' },
        ]
      : [
          { id: 'cast_send', title: '✅ Send now' },
          { id: 'cast_cancel', title: '✖ Cancel' },
        ]
    await sendInteractiveButtons(from, previewLines.join('\n'), buttons)
    return true
  }

  const castsCmd = /^casts$/i.test(clean)
  if (castsCmd) {
    await sendWhatsAppMessage(from, await renderCastsList())
    return true
  }

  return false
}

async function handleAction(from: string, session: ChatSession | null, action: string, msgId?: string) {
  // Broadcast confirm/schedule/cancel (admins only). Casting is queued in
  // bot_casts: the first ≤SYNC_MAX_SENDS go out right here, anything larger
  // continues automatically via the hourly cron.
  if (action === 'cast_send' || action === 'cast_sched' || action === 'cast_cancel') {
    if (!(await isBotAdmin(from))) {
      await sendWhatsAppMessage(from, 'That button belongs to a broadcast preview.')
      return
    }
    const spec: CastSpec | undefined = session?.data.castSpec
    if (action === 'cast_cancel') {
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Broadcast cancelled.')
      return
    }
    if (!spec || !spec.body) {
      await sendWhatsAppMessage(from, 'Nothing to send - start with *cast your message*.')
      return
    }
    const audience = await resolveCastAudience(spec)
    if (!audience.length) {
      await clearSession(from)
      await sendWhatsAppMessage(from, 'No contacts in the last-24h window for that segment right now.')
      return
    }
    if (action === 'cast_sched') {
      if (!spec.scheduledFor) {
        await clearSession(from)
        await sendWhatsAppMessage(from, 'No time was set - add one: *cast owners today 15:30 <message>*.')
        return
      }
      const castId = await enqueueCast(spec, from, spec.scheduledFor, audience)
      await clearSession(from)
      if (!castId) {
        await sendWhatsAppMessage(from, 'Could not queue the cast - try again shortly.')
        return
      }
      await sendWhatsAppMessage(
        from,
        [
          `⏰ Cast #${castId} scheduled for ${fmtHarare(spec.scheduledFor, true)} Harare time.`,
          `👥 ~${audience.length} contacts (${spec.segment}${spec.filter ? ` ${spec.filter}` : ''}).`,
          `Cancel with *cast cancel ${castId}*.`,
        ].join('\n')
      )
      return
    }
    // cast_send
    const castId = await enqueueCast(spec, from, null, audience)
    if (!castId) {
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Could not queue the cast - try again shortly.')
      return
    }
    const chunk = await sendCastChunk(castId, SYNC_MAX_SENDS)
    if (chunk.done) {
      await clearSession(from)
      return
    }
    await clearSession(from)
    await sendWhatsAppMessage(
      from,
      [
        `📣 Cast #${castId} started - first ${SYNC_MAX_SENDS} recipients sent.`,
        `⏳ The remaining ${audience.length - SYNC_MAX_SENDS} continue automatically (100 per hour).`,
        'Final counts arrive when the cast completes.',
      ].join('\n')
    )
    return
  }

  // ── S18.2 typed-order actions ─────────────────────────────────────────
  // One verify screen owns the flow: ✅ commits (and pushes to every shop),
  // ✎ re-opens the keyboard. Supplier-side taps claim the sale.
  if (action === 'osend') {
    await commitPendingOrder(from, session)
    return
  }
  if (action === 'oedit') {
    await saveSession(from, 'order', { ...session?.data, pendingOrder: undefined })
    await sendWhatsAppMessage(
      from,
      'Say it again and I will type along - e.g. *order 2 bread, 1 cake*, or *order 1 bread 2 scones*.'
    )
    return
  }
  const oclaim = action.match(/^oclaim_(\d+)$/)
  if (oclaim) {
    await handleClaimTap(from, session, Number(oclaim[1]))
    return
  }

  // ── Post-activation shelf: product photos → business_items ───────────
  // The photo was uploaded up-front; the owner tapped which shop it belongs
  // to, now it needs a name + price.
  const itemBiz = action.match(/^itembiz_(.+)$/)
  if (itemBiz) {
    const img = session?.data.pendingItemImage || ''
    if (!img) {
      await sendWhatsAppMessage(from, 'That pick expired - send the product photo again.')
      return
    }
    const { data: row } = await getSupabase()
      .from('businesses')
      .select('id, name')
      .eq('id', itemBiz[1])
      .maybeSingle()
    await saveSession(from, 'item_photo', {
      pendingItemImage: img,
      pendingItemBiz: { id: itemBiz[1], name: row?.name || 'your shop' },
    } as ChatSessionData)
    await sendWhatsAppMessage(
      from,
      'Reply with the product name and price, e.g. *bread $2*. Reply *skip* to not add it.'
    )
    return
  }

  // Need-quote actions carry data ids (pick / stop / deal-ask answers).
  const pick = action.match(/^q_pick_(\d+)$/)
  if (pick) {
    await pickQuoteForBuyer(from, Number(pick[1]))
    return
  }
  const stop = action.match(/^q_stop_(RQ-\d+)$/)
  if (stop) {
    await closeNeedByRqId(stop[1], 'buyer')
    await sendWhatsAppMessage(from, renderNeedClosedByBuyer(stop[1]))
    return
  }
  const deal = action.match(/^nd_(yes|no)_(RQ-\d+)$/)
  if (deal) {
    const need = await getNeedByRqId(deal[2])
    if (need) {
      if (deal[1] === 'yes') {
        await closeNeedByRqId(deal[2], 'buyer')
        await sendWhatsAppMessage(
          from,
          `🎉 Sorted - congrats on the deal. That's exactly what this space is for. Send a new search anytime.`
        )
      } else {
        await reopenNeed(need.id)
        await sendWhatsAppMessage(
          from,
          `🔄 ${deal[2]} reopened - suppliers see it again and can quote. Tap ✋ on any quote card if it gets noisy.`
        )
      }
    }
    return
  }

  const claim = action.match(/^claim_(yes|no)_(\d+)$/)
  if (claim) {
    await handleClaimConsent(from, claim[1] === 'yes', Number(claim[2]))
    return
  }

  const sel = action.match(/^sel_([1-9][0-9]?)$/)
  if (sel) {
    if (session?.step === 'browse') {
      const cards = session.data.results || []
      const pick = Number(sel[1])
      if (pick > 0 && pick <= cards.length) {
        await sendResultDetail(from, session, pick)
      } else if (cards.length > 0) {
        await sendWhatsAppMessage(from, renderInvalidSelection(cards.length))
      } else {
        await startFreshSearchPrompt(from)
      }
      return
    }
    await startFreshSearchPrompt(from)
    return
  }

  // ── Browse items (shop shelf) ──────────────────────────────────────────
  // S20 "Did you mean…" → fresh search for that related word in the same town.
  const relSearch = action.match(/^relsearch_(.+)$/)
  if (relSearch) {
    const relTerm = decodeURIComponent(relSearch[1])
    const relCity = session?.data.lastCity && session.data.lastCity !== 'Near you' ? session.data.lastCity : ''
    await clearSession(from)
    await dispatchSearch(from, [relTerm, relCity].filter(Boolean).join(' '))
    return
  }

  // ── 📸 Single-photo + chat handoff actions ──────────────────────
  const seePhoto = action.match(/^see_photo_(.+)$/)
  if (seePhoto) {
    await handleItemPhoto(from, seePhoto[1])
    return
  }
  const photoPick = action.match(/^photo_pick_(.+)$/)
  if (photoPick) {
    await handlePhotoPick(from, photoPick[1])
    return
  }
  // Chat handoff — opens the same tracked /go link the web app uses.
  const ctaChat = action.match(/^cta_chat_(.+)$/)
  if (ctaChat) {
    await handleCtaChat(from, ctaChat[1])
    return
  }

  // ── Browse items (shop shelf) ───────────────────────────────────
  const browseItems = action.match(/^browse_items_(.+)_(\d+)$/)
  if (browseItems) {
    const businessId = browseItems[1]
    const page = Number(browseItems[2])
    await handleBrowseItems(from, session, businessId, page)
    return
  }

  // Add item to cross-business cart
  const addToCartMatch = action.match(/^add_to_cart_(.+)$/)
  if (addToCartMatch) {
    const itemId = addToCartMatch[1]
    await handleAddToCart(from, session, itemId, msgId)
    return
  }

  // View cart
  if (action === 'view_cart') {
    await handleViewCart(from, session)
    return
  }

  // Checkout cart (send orders to suppliers)
  if (action === 'checkout_cart') {
    await handleCheckoutCart(from, session)
    return
  }

  // Clear cart
  if (action === 'clear_cart') {
    await handleClearCart(from, session)
    return
  }

  // Browse items from detail card (browse_items_detail_<businessId>)
  const browseDetail = action.match(/^browse_items_detail_(.+)$/)
  if (browseDetail) {
    const businessId = browseDetail[1]
    await handleBrowseItems(from, session, businessId, 0)
    return
  }

  switch (action) {
    case 'back':
      await goBack(from, session)
      return
    case 'more':
    case 'next': {
      if (session?.step === 'browse') {
        const cards = session.data.results || []
        const page = session.data.page || 0
        if (cards.length > (page + 1) * RESULTS_PER_PAGE) {
          await saveSession(from, 'browse', { ...session.data, lastScreen: 'list', page: page + 1 })
          await sendResultsListPage(
            from, cards, page + 1, session.data.lastTerm || 'search',
            session.data.lastCity ?? null, !!session.data.nearby
          )
        } else {
          await sendWhatsAppMessage(
            from,
            `That's all ${cards.length} match${cards.length === 1 ? '' : 'es'} - reply a number or tap a business.`
          )
        }
        return
      }
      await startFreshSearchPrompt(from)
      return
    }
    case 'end_list': {
      if (session?.step === 'browse') {
        const cards = session.data.results || []
        await sendWhatsAppMessage(
          from,
          `That's all ${cards.length} match${cards.length === 1 ? '' : 'es'} for *${session.data.lastTerm || 'your search'}* - reply a number or send a new search.`
        )
        return
      }
      await startFreshSearchPrompt(from)
      return
    }
    case 'new_search':
      await startFreshSearchPrompt(from)
      return
    case 'end_search': {
      await clearSession(from)
      await sendWhatsAppMessage(from, 'No problem! Just send a new search anytime you need something.')
      return
    }
    case 'menu_needs':
      await startNeedIntake(from)
      return
    case 'menu_order':
      await typedOrderFromText(from, session, 'order')
      return
    // ── S19 goal-word ask taps ────────────────────────────────────────
    // The two-way prompt showed "N businesses match \"{word}\" — search
    // them, or did you mean the menu action?" Either tap behaves like the
    // pivot engine: an open step is set aside and *resume* brings it back.
    case 'bid_search': {
      const ask = session?.data.goal_ask
      if (!ask?.word) {
        await startFreshSearchPrompt(from)
        return
      }
      const keptPaused: PausedDraft | null =
        session && session.step !== 'idle' && hasProgress(session.data)
          ? { step: session.step, data: session.data, at: new Date().toISOString() }
          : null
      if (keptPaused) {
        await sendWhatsAppMessage(
          from,
          "No problem - plans have changed 👍\nI've set what you were doing aside; reply *resume* to pick it up again."
        )
      }
      await clearSession(from)
      await dispatchSearch(from, ask.word, { goalAskDone: true })
      if (keptPaused) await stashPaused(from, keptPaused)
      return
    }
    case 'bid_flow': {
      const ask = session?.data.goal_ask
      if (!ask || !ask.kind) {
        await sendWhatsAppMessage(from, await helpText(from))
        return
      }
      const keptPaused: PausedDraft | null =
        session && session.step !== 'idle' && hasProgress(session.data)
          ? { step: session.step, data: session.data, at: new Date().toISOString() }
          : null
      if (keptPaused) {
        await sendWhatsAppMessage(
          from,
          "No problem - plans have changed 👍\nI've set what you were doing aside; reply *resume* to pick it up again."
        )
      }
      if (ask.kind === 'pay') await startPayChoice(from)
      else if (ask.kind === 'register') await sendRegisterChoice(from)
      else await typedOrderFromText(from, session, 'order')
      if (keptPaused) await stashPaused(from, keptPaused)
      return
    }
    case 'need_post':
      await postBuyerNeed(from, session)
      return
    case 'need_edit':
      await saveSession(from, 'need_form', {})
      await sendWhatsAppMessage(
        from,
        [
          'Send the corrected line - what + how many (+ town, budget).',
          'e.g. *50 bags cement harare $40-60*',
        ].join('\n')
      )
      return
    case 'need_cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Need dropped. Send *help* anytime.')
      return
    case 'need_more': {
      const lastCity = session?.data.lastCity || ''
      const city = lastCity && lastCity !== 'Near you' ? lastCity : ''
      const term = session?.data.lastTerm || ''
      if (term) {
        await showNeedConfirm(from, { item: term, qty: '', budget: '', city })
      } else {
        await startNeedIntake(from)
      }
      return
    }
    case 'menu_register': {
      // The new flow handles resume via Supabase state automatically.
      // Just start the registration flow - it will detect and resume any in-progress registration.
      await startRegistrationFlow(from)
      return
    }
    case 'resume_paused': {
      if (!(await resumePaused(from, session || (await getSession(from))))) {
        await sendWhatsAppMessage(from, "That draft has expired - send *register* to start again.")
      }
      return
    }
    case 'reg_restart':
      await sendRegisterChoice(from)
      return
    case 'reg_business':
      await startRegistrationFlow(from)
      return
    case 'reg_personal': {
      await saveSession(from, 'reg_contact', {})
      await sendWhatsAppMessage(
        from,
        [
          'Add a personal contact to the directory 📱',
          '',
          "Send the contact's name + phone (+ city, socials optional), e.g.",
          '*Tendai Ncube 0771 234 567 Harare IG @tendai*',
          '',
          '$1 per month · $5 for 6 months · $10 for the full year.',
          'Paid via EcoCash.'
        ].join('\n')
      )
      return
    }
    case 'reg_contact_pay_monthly':
    case 'reg_contact_publish': {
      if (session?.step === 'reg_contact' && session.data.contact) {
        await tryPublishContact(from, session, msgId, '1m')
      } else {
        await sendRegisterChoice(from)
      }
      return
    }
    case 'reg_contact_pay_6m': {
      if (session?.step === 'reg_contact' && session.data.contact) {
        await tryPublishContact(from, session, msgId, '6m')
      } else {
        await sendRegisterChoice(from)
      }
      return
    }
    case 'reg_contact_pay_year': {
      if (session?.step === 'reg_contact' && session.data.contact) {
        await tryPublishContact(from, session, msgId, '12m')
      } else {
        await sendRegisterChoice(from)
      }
      return
    }
    case 'reg_contact_fix': {
      await saveSession(from, 'reg_contact', {})
      await sendWhatsAppMessage(
        from,
        [
          'Add a personal contact to the directory 📱',
          '',
          "Send the contact's name + phone (+ city, socials optional), e.g.",
          '*Tendai Ncube 0771 234 567 Harare IG @tendai*',
        ].join('\n')
      )
      return
    }
    case 'list_publish': {
      if (session?.step === 'list_form') {
        await tryPublishForm(from, session, msgId)
      } else {
        await startRegistrationFlow(from)
      }
      return
    }
    case 'list_edit': {
      if (session?.step === 'list_form') {
        const before = session.data.list || {}
        await saveSession(from, 'list_form', { ...session.data, list: before, wizard: 0 } as ChatSessionData)
        await sendWizardQuestion(from, before, 0, "Let's go through your answers again - *Skip* anything you want to keep.")
      } else {
        await startRegistrationFlow(from)
      }
      return
    }
    case 'list_skip':
      // ⏭ Skip on an optional wizard question.
      if (session?.step === 'list_form' && typeof session.data.wizard === 'number' && session.data.wizard >= 0) {
        await handleListWizardTextInternal(from, session, 'skip')
      }
      return
    case 'list_cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Registration cancelled. Send *help* anytime.')
      return
    case 'menu_help':
      await sendWhatsAppMessage(from, await helpText(from))
      return
    case 'menu_pay':
    case 'pay':
      await startPayChoice(from)
      return
    case 'pay_existing':
      await sendOwnPayList(from)
      return
    case 'pay_search':
      await startPaySearch(from)
      return
    case 'pay_new':
      await clearSession(from)
      await startRegistrationFlow(from)
      return
    case 'pay_1m':
    case 'pay_6m':
    case 'pay_12m': {
      const plan: PlanType = action === 'pay_1m' ? '1m' : action === 'pay_6m' ? '6m' : '12m'
      await askEcoCashNumber(from, session?.data.pay_business, plan, session?.data || {})
      return
    }
    case 'cancel':
      await clearSession(from)
      await sendWhatsAppMessage(from, await helpText(from))
      return
    // New registration flow buttons
    case 'reg_plan_trial':
    case 'reg_plan_paid':
    case 'reg_upload':
    case 'reg_skip':
    case 'reg_proceed':
    case 'reg_edit': {
      const convState = await getConversationState(from)
      if (convState && convState.state.startsWith('REGISTRATION_')) {
        await handleRegistrationMessage(from, action, convState.context)
        return
      }
      // Fallback: no registration state, just show plan choice
      await startRegistrationFlow(from)
      return
    }
    case 'whole_country':
      if (session?.step === 'search_loc' && session.data.pending_search_term) {
        await clearSession(from)
        await runSearchAndReply(from, {
          term: session.data.pending_search_term,
          city: null,
          nationwide: true,
        })
        return
      }
      if (session?.step === 'search_term') {
        await sendAskTerm(from, null)
        return
      }
      await startFreshSearchPrompt(from)
      return
    default:
      break
  }

  // Pay-flow row taps: payown<N> (own listings) and pay<N> (search results)
  // share the same candidate-picker.
  const payRow = action.match(/^(?:payown|pay)([1-9])$/)
  if (payRow) {
    await selectPayCandidate(from, session, Number(payRow[1]))
    return
  }

  await sendWhatsAppMessage(
    from,
    "That option isn't available. Reply *menu* for the main menu, or send a search."
  )
}

// Bot retrieval cap: performance guard requested by the owner — page through
// the stored candidates instead of re-querying for every scroll.
const MAX_RESULTS = 20

// Shared sender for any list page (page 0 = first screen). Keeps row ids,
// numbering and copy consistent between search results, nearby results,
// "More results" pages and ⬅ Back re-renders.
async function sendResultsListPage(
  from: string,
  cards: ResultCard[],
  page: number,
  termDisplay: string,
  cityLabel: string | null,
  nearby: boolean,
  replyTo?: string,
  relatedTerms?: string[]
) {
  if (cards.length === 0) return
  const body = nearby && cityLabel === 'Near you'
    ? renderNearMeListBody(termDisplay, cards.length, page)
    : nearby
      ? renderNearbyListBody(termDisplay, cityLabel || 'Zimbabwe', cards.length, page)
      : renderResultsListBody(termDisplay, cityLabel, cards.length, page)
  await sendInteractiveList(from, body, resultRows(cards, page), 'Choose a business', replyTo)

  // 📸 One-tap product photo: the cheapest matching item that has a photo.
  // Only when the search actually matched products — service-only results
  // (plumbers, builders…) get no photo button.
  const photoItem = cheapestSearchPhotoItem(cards)
  if (photoItem) {
    await sendInteractiveButtons(
      from,
      `Want a peek at *${photoItem.name}*? I can show its photo right here - no need to open the shop.`,
      [{ id: `see_photo_${photoItem.id}`, title: '📸 See product photo' }],
      replyTo
    )
  }

  // S20 "Did you mean…?": the related trades/brands already have shops in
  // the list above (labelled by term); these buttons search the rest.
  if (page === 0 && relatedTerms?.length) {
    await sendInteractiveButtons(
      from,
      `Also showing shops related to *${termDisplay}* in the list above - or tap to search:`,
      relatedTerms.slice(0, 3).map(t => ({
        id: `relsearch_${encodeURIComponent(t)}`,
        title: t.charAt(0).toUpperCase() + t.slice(1),
      })),
      replyTo
    )
  }
}

async function runSearchAndReply(
  from: string,
  p: ParsedQuery,
  opts?: { replyTo?: string; aliased?: boolean; nationwideTried?: boolean; goalAskDone?: boolean }
) {
  const supabase = getSupabase()
  const term = p.term.toLowerCase()
  const city = p.nationwide ? null : p.city

  // - Tier A: in-town category/name matches, ordered by the webapp's ranking
  //   (paid rank_spots when active, rarely-seen shuffle otherwise)
  // - Tier B (when A misses): in-town named products with exact prices
  // - Tier C (when the town has nothing): nearest towns, ranked by km
  const scopeReq = supabase.from('businesses').select(BOT_BIZ_COLUMNS).eq('verified', true)
  const { data: scopeRows } = city ? await scopeReq.eq('city', city) : await scopeReq
  const scope = (scopeRows as BotBusinessRow[]) || []

  const category = p.term ? matchCategoryAgainst(p.term, await getApprovedCategories()) : 'Other'

  if (scope.length === 0 && city) {
    // Requested town has no verified businesses at all — fall straight
    // through to the nationwide experience so the user never dead-ends.
    await runSearchAndReply(from, { ...p, city: null, nationwide: true }, {
      ...opts,
      nationwideTried: true,
    })
    return
  }

  let results: BotResult[] = []
  const candidates = scope.filter(b => bizMatchesQuery(b, term, category))
  if (candidates.length > 0) {
    if (p.origin) {
      // "Near me" ranking: plain distance sort from the shared point — no
      // city rank_spots in this mode (the user's position is the context).
      const origin = p.origin
      const ranked = candidates
        .map(b => ({
          biz: b,
          km: b.lat != null && b.lng != null
            ? haversineKm(origin.lat, origin.lng, b.lat, b.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
      const itemMap = await fetchMatchingItems(ranked.map(r => r.biz.id), term)
      results = ranked.slice(0, MAX_RESULTS).map(r => ({
        biz: r.biz,
        item: itemMap.get(r.biz.id) || null,
        km: r.km,
      }))
    } else {
      const seedText = p.term || category.toLowerCase()
      // Respect the bidding feature: orderSearchResults places active rank_spots
      // for (category, city) first — nationwide spots as fallback — and applies
      // the webapp's default weighted shuffle when no bids are active.
      const ordered = (await orderSearchResults(
        candidates as unknown as Business[],
        category,
        city || '',
        seedText
      )) as unknown as BotBusinessRow[]
      const itemMap = await fetchMatchingItems(ordered.map(b => b.id), term)
      results = ordered.map(b => ({ biz: b, item: itemMap.get(b.id) || null }))
    }
  } else if (term.length >= 3) {
    const itemMap = await fetchMatchingItems(scope.map(b => b.id), term)
    const ownerIds = new Set(itemMap.keys())
    let tmp = scope.filter(b => ownerIds.has(b.id)).map(b => ({ biz: b, item: itemMap.get(b.id)! }))
    if (p.origin) {
      const origin = p.origin
      tmp = tmp
        .map(r => ({
          ...r,
          km: r.biz.lat != null && r.biz.lng != null
            ? haversineKm(origin.lat, origin.lng, r.biz.lat, r.biz.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
    }
    results = tmp
  }

  results = results.slice(0, MAX_RESULTS)
  const termDisplay = p.term || category.toLowerCase()

  // S19 goal-word ask: the search term IS a menu word (pay / register /
  // order) AND businesses matched it — offer the two ways instead of
  // assuming a search. Skipped on the 🔍 replay (goalAskDone).
  const goalKind = goalKindForWord(termDisplay)
  if (goalKind && results.length > 0 && !opts?.goalAskDone) {
    await saveGoalAsk(from, goalKind, termDisplay)
    logOut(from, 'goal_ask', `${termDisplay} → ${results.length} found`)
    await sendGoalAskButtons(from, goalKind, termDisplay, results.length)
    return
  }

  // Name direct hit: a query that names exactly one business shows contact
  // details right away without the intermediate list.
  if (
    results.length === 1 &&
    term.length >= 3 &&
    (results[0].biz.name || '').toLowerCase().includes(term)
  ) {
    const cards = results.map(toCard)
    const prev = await getSession(from)
    const data = {
      ...pendingFields(prev),
      results: cards,
      lastScreen: 'list' as const,
      lastTerm: termDisplay,
      lastCity: city,
      page: 0,
    }
    await saveSession(from, 'browse', data)
    await sendResultDetail(from, { phone: from, step: 'browse', data }, 1)
    return
  }

  if (results.length === 0 && city) {
    // Nearby tier: same matching in other towns, ranked by distance
    const { data: allRows } = await supabase
      .from('businesses')
      .select(BOT_BIZ_COLUMNS)
      .eq('verified', true)
    const all = (allRows as BotBusinessRow[]) || []
    const nearCandidates = all
      .filter(b => b.city !== city && bizMatchesQuery(b, term, category))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    if (nearCandidates.length > 0) {
      const originRows = all.filter(b => b.city === city && b.lat != null && b.lng != null)
      let origin: { lat: number; lng: number } | null = null
      if (originRows.length > 0) {
        origin = {
          lat: originRows.reduce((s, b) => s + (b.lat || 0), 0) / originRows.length,
          lng: originRows.reduce((s, b) => s + (b.lng || 0), 0) / originRows.length,
        }
      }
      const itemMap = await fetchMatchingItems(nearCandidates.map(b => b.id), term)
      results = nearCandidates
        .map(b => ({
          biz: b,
          item: itemMap.get(b.id) || null,
          km: origin && b.lat != null && b.lng != null
            ? haversineKm(origin.lat, origin.lng, b.lat, b.lng)
            : undefined,
        }))
        .sort((x, y) => (x.km ?? 999999) - (y.km ?? 999999))
        .slice(0, MAX_RESULTS)
      const nearbyDisplay = p.term || category.toLowerCase()
      const cards = results.map(toCard)
      const prev = await getSession(from)
      await saveSession(from, 'browse', {
        ...pendingFields(prev),
        results: cards,
        lastScreen: 'list',
        lastTerm: nearbyDisplay,
        lastCity: city,
        nearby: true,
        page: 0,
      })
      await sendResultsListPage(from, cards, 0, nearbyDisplay, city, true)
      recordBotEvents(results.map(r => r.biz)).catch(() => {})
      return
    }
  }

  if (results.length === 0) {
    const missTerm = p.term || category.toLowerCase()
    if (missTerm.length >= 3) {
      // Slow path ahead (AI expansion / fallback search) — flip the typing
      // indicator on the original message first.
      if (opts?.replyTo) await markRead(opts.replyTo, true).catch(() => {})
      // Rescue 1 — AI alias sweep: Gemini suggests synonym/category terms;
      // the first alias that matches renders the real search screen.
      if (!opts?.aliased) {
        const aliases = (await expandSearchQuery(missTerm))
          .map(s => s.trim().toLowerCase())
          .filter(s => s && s !== missTerm.toLowerCase())
        for (const alias of aliases.slice(0, 3)) {
          const aliasResults = scope.filter(b =>
            bizMatchesQuery(b, alias, category)
          )
          if (aliasResults.length > 0) {
            await runSearchAndReply(from, {
              term: alias,
              city: p.city,
              nationwide: p.nationwide,
              origin: p.origin,
            }, { ...opts, aliased: true })
            return
          }
        }
      }
      // Rescue 2 — no matches in the user's town (or near-them point):
      // repeat the sweep countrywide so they never dead-end.
      if ((p.city || p.origin) && !opts?.nationwideTried) {
        await runSearchAndReply(from, {
          term: p.term,
          city: null,
          nationwide: true,
          origin: null,
        }, { replyTo: opts?.replyTo, aliased: opts?.aliased, nationwideTried: true })
        return
      }
    }
    // S18.5 demand radar: this failed search is a live lead for subscribed
    // suppliers (masked/sensitive terms never reach demand_events).
    emitDemandSearch({ term: missTerm, city: city || '', resultCount: 0, buyer: from }).catch(() => {})
    await sendInteractiveButtons(
      from,
      `${renderEmptyResults(missTerm)}\n\n🛒 Or let suppliers find it: I post this exact need and they quote you right here.`,
      [{ id: 'need_more', title: '🛒 Post as a need' }],
      opts?.replyTo
    )
    return
  }

  const fromOrigin = !!p.origin
  const cards = results.map(toCard)
  // S20: widen with related trades/brands — "electricity" also surfaces
  // electrician/ZESA shops, labelled at the end of the list message. Runs
  // AFTER the exact tier is computed so ranking never changes; related
  // cards append at the end of the same numbered list (taps keep working).
  const related = await findRelatedBusinesses(scope, term, new Set(results.map(r => r.biz.id)))
  const allCards = [...cards, ...related.cards]
  const prev = await getSession(from)
  await saveSession(from, 'browse', {
    ...pendingFields(prev),
    results: allCards,
    lastScreen: 'list',
    lastTerm: termDisplay,
    lastCity: fromOrigin ? 'Near you' : city,
    nearby: fromOrigin,
    page: 0,
  })
  await sendResultsListPage(from, allCards, 0, termDisplay, fromOrigin ? 'Near you' : city, fromOrigin, opts?.replyTo, related.terms)
  // S18.5 demand radar: this search found supply (buyer stored digits-only;
  // consent is required before anything buyer-identifying moves).
  emitDemandSearch({ term: termDisplay, city: fromOrigin ? '' : city || '', resultCount: results.length, buyer: from }).catch(() => {})
  recordBotEvents(results.map(r => r.biz)).catch(() => {})
}

async function dispatchSearch(
  from: string,
  text: string,
  opts?: { origin?: { lat: number; lng: number } | null; replyTo?: string; goalAskDone?: boolean }
) {    const p: ParsedQuery = { ...parseQuery(text), origin: opts?.origin ?? null }
    // Demand radar: every user query lands in bot_searches, even the ones
    // that never find supply — that's the admin digest's radar section.
    logBotSearch(from, p.term || (p.city ? '(town only)' : '(blank)'), p.city).catch(() => {})
    pingAdminsSearch(p.term || (p.city ? '(town only)' : '(blank)'), p.city, from).catch(() => {})

  // Bare name search with no town: when exactly one verified business is
  // named by the query, show its contact details right away (nationwide)
  // instead of the intermediate "Which town?" step. Multiple matches keep
  // the existing town-first flow.
  if (p.term && !p.city && !p.nationwide) {
    const { data: nameProbe } = await getSupabase()
      .from('businesses')
      .select('id')
      .eq('verified', true)
      .ilike('name', `%${p.term}%`)
    if (nameProbe && nameProbe.length === 1) {
      await runSearchAndReply(from, { term: p.term, city: null, nationwide: true }, { replyTo: opts?.replyTo })
      return
    }
  }

  if (!p.term && !p.nationwide && p.city) {
    // Town only — ask what they need in that town
    await saveSession(from, 'search_term', { pending_city: p.city })
    await sendAskTerm(from, p.city)
    return
  }

  if (!p.term) {
    if (p.nationwide) {
      await saveSession(from, 'search_term', { pending_city: '' })
      await sendAskTerm(from, null)
    } else {
      await sendWhatsAppMessage(
        from,
        'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.',
        opts?.replyTo
      )
    }
    return
  }

  if (!p.nationwide && !p.city) {
    // Product/service only — ask for the town first (plus the share-location
    // fast path that ranks matches by real distance).
    // S19: unless the word is ALSO a menu goal and real businesses answer to
    // it — then the two-way ask fires first (replays carry goalAskDone).
    const goalKind = !opts?.goalAskDone ? goalKindForWord(p.term || '') : null
    if (goalKind) {
      const found = await countVerifiedNameMatches(p.term)
      if (found > 0) {
        logOut(from, 'goal_ask', `${p.term} → ${found} named nationwide`)
        await saveGoalAsk(from, goalKind, p.term)
        await sendGoalAskButtons(from, goalKind, p.term, found)
        return
      }
    }
    await saveSession(from, 'search_loc', { pending_search_term: p.term })
    await sendAskTown(from, p.term, false, true)
    return
  }

  await runSearchAndReply(from, p, { replyTo: opts?.replyTo, goalAskDone: opts?.goalAskDone })
}

// ── S18.2 typed customer orders: the buyer writes "2 bread, 1 cake", the
// bot matches it against supplier shelves (the business on screen first,
// then the whole directory), shows a one-tap verify screen, and hands the
// compiled order to each supplier via the CUSTOMER's own WhatsApp — no 24h
// window, no template review. Every order is one row per supplier
// (supply_orders), so the same record powers the short checkout link, the
// supplier push, and the sale tracker.

/** Digits usable for a wa.me handoff: voice listings fall back to an
 * owner-entered custom WhatsApp link; non-voice use the phone digits. */
async function cartWaDigits(phoneType: string | null, phone: string, whatsappLink: string | null): Promise<string> {
  const linkDigits = /wa\.me\/(\d+)/.exec(whatsappLink || '')?.[1] || null
  if (phoneType === 'voice') return linkDigits || ''
  return (phone || '').replace(/[^0-9]/g, '') || linkDigits || ''
}

/** Item shelf for one supplier: active, priced, cheapest first. */
async function shelfForBusiness(businessId: string, cap = 50) {
  const { data } = await getSupabase()
    .from('business_items')
    .select('id, name, price')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .not('price', 'is', null)
    .order('price', { ascending: true })
    .limit(cap)
  return ((data || []) as { id: string; name: string; price: number | null }[])
}

/** Cross-directory catalogue: every go-live supplier and their priced items,
 * grouped into ShelfSupplier records ready for order matching. */
async function catalogueSuppliers(): Promise<ShelfSupplier[]> {
  const { data } = await getSupabase()
    .from('business_items')
    .select(
      'id, name, price, business_id, businesses!inner ( id, name, phone, phone_type, whatsapp_link, city, payment_status )'
    )
    .eq('is_active', true)
    .not('price', 'is', null)
    .eq('businesses.payment_status', 'active')
    .limit(600)
  const rows = ((data || []) as unknown as {
    id: string
    name: string
    price: number | null
    business_id: string
    businesses:
      | {
          id: string
          name: string | null
          phone: string | null
          phone_type: string | null
          whatsapp_link: string | null
          city: string | null
        }
      | null
  }[]) || []
  const byBiz = new Map<string, ShelfSupplier>()
  for (const row of rows) {
    // The PostgREST FK embed is an object for many-to-one, but the generated
    // TS types widen it to an array — accept both shapes.
    const biz = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses
    if (!biz || !biz.name) continue
    let sup = byBiz.get(biz.id)
    if (!sup) {
      sup = {
        businessId: biz.id,
        businessName: biz.name,
        supplierDigits: await cartWaDigits(biz.phone_type, biz.phone || '', biz.whatsapp_link),
        city: biz.city || null,
        items: [],
      }
      byBiz.set(biz.id, sup)
    }
    sup.items.push({ id: row.id, name: row.name, price: row.price })
  }
  return [...byBiz.values()]
}

/** Entry of the typed order flow: parse the buyer's line, match against the
 * shop on screen first (when there is one), then against the whole
 * directory. Anything left over is surfaced as a skip, never invented. */
async function typedOrderFromText(from: string, session: ChatSession | null, tail: string, taughtShop?: string) {
  const { pairs, junk } = parseOrderLine(tail)
  if (!pairs.length) {
    const ctx = taughtShop || (session?.data.lastBizId ? await bizNameById(session.data.lastBizId) : '')
    await sendWhatsAppMessage(
      from,
      [
        '🧺 Tell me what to order - quantities first, then names.',
        'e.g. *order 2 bread, 1 cake* or *order 1 bread 2 scones*',
        ctx ? `Your words go straight to *${ctx}*'s shelf - other shops supply anything they don't stock.` : 'I find the shops that stock those items and package the order per shop.',
        '',
        'Or reply a number to keep browsing. Send *menu* anytime.',
      ].join('\n')
    )
    return
  }

  const lastBizId = session?.data.lastBizId
  let unmatched: OrderPair[] = []
  let explicit: ShelfSupplier | null = null

  if (lastBizId) {
    const [{ data: biz }, shelf] = await Promise.all([
      getSupabase()
        .from('businesses')
        .select('id, name, phone, phone_type, whatsapp_link, city')
        .eq('id', lastBizId)
        .maybeSingle(),
      shelfForBusiness(lastBizId),
    ])
    const b = biz as {
      id: string
      name: string | null
      phone: string | null
      phone_type: string | null
      whatsapp_link: string | null
      city: string | null
    } | null
    if (b && shelf.length) {
      explicit = {
        businessId: b.id,
        businessName: b.name || 'the shop',
        supplierDigits: await cartWaDigits(b.phone_type, b.phone || '', b.whatsapp_link),
        city: b.city || null,
        items: shelf,
      }
    }
  }

  const matched = matchOrder(pairs, explicit ? [explicit] : [], explicit?.businessId)
  const leftover = matched.unmatched

  if (leftover.length) {
    const catalogue = await catalogueSuppliers()
    const spread = catalogue.filter(s => s.businessId !== explicit?.businessId)
    if (spread.length) {
      const more = matchOrder(leftover, spread)
      unmatched = more.unmatched
      const all = explicit ? [...matched.groups, ...more.groups] : more.groups
      return await renderPendingVerify(from, session, all, unmatched, junk)
    }
    unmatched = leftover
    return await renderPendingVerify(from, session, matched.groups, unmatched, junk)
  }
  return await renderPendingVerify(from, session, matched.groups, [], junk)
}

/** Render the verify screen for a parsed-and-matched order. */
async function renderPendingVerify(
  from: string,
  session: ChatSession | null,
  groups: MatchResult['groups'],
  unmatched: OrderPair[],
  junk: string[]
) {
  if (!groups.length) {
    const missed = unmatched.map(u => `• ${u.term}`)
    await sendWhatsAppMessage(
      from,
      [
        '🔍 Nothing on any shelf matches:',
        ...missed,
        '',
        'Try another name - or *menu* to browse shops.',
      ].join('\n')
    )
    return
  }
  const pendingOrder: PendingOrder = {
    groups: groups.map(g => ({
      businessId: g.supplier.businessId,
      businessName: g.supplier.businessName,
      supplierDigits: g.supplier.supplierDigits,
      city: g.supplier.city || undefined,
      lines: g.lines.map(l => ({ name: l.item.name, qty: l.qty, price: l.item.price })),
    })),
  }
  await saveSession(from, 'order', { ...(session?.data || {}), pendingOrder })
  const note =
    unmatched.length || junk.length
      ? [
          '',
          `⚠️ Waiting for corrected items: ${[...unmatched.map(u => u.term), ...junk].join(', ')}`,
          'These are skipped for now - type the order again to fix them BEFORE sending.',
        ].join('\n')
      : ''
  await sendWhatsAppMessage(from, `${renderOrderVerify(pendingOrder.groups)}\n${note}`)
  await sendInteractiveButtons(from, '', [
    { id: 'osend', title: '✅ Send order' },
    { id: 'oedit', title: '✎ Re-type' },
  ])
}

/** Commit the pending order: one supply_orders row per shop, short
 * /go/o/<token> checkout links back to the buyer, and a push to every
 * supplier who talks to the bot (active in DM, template if silent). */
async function commitPendingOrder(from: string, session: ChatSession | null) {
  const pending = session?.data.pendingOrder
  if (!pending || !pending.groups.length) {
    await sendWhatsAppMessage(from, 'Nothing queued yet - type *order 2 bread* to start one.')
    return
  }
  const groupId = `G${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`
  const rows: SupplyOrderRow[] = []
  for (const g of pending.groups) {
    const row = await createSupplyOrder({
      group_id: groupId,
      biz_id: g.businessId,
      biz_name: g.businessName,
      buyer_phone: digitsOnly(from),
      lines: g.lines,
      city: g.city,
    })
    if (row) rows.push(row)
  }
  if (!rows.length) {
    await sendWhatsAppMessage(from, '⚠️ Could not file the order - try again in a minute.')
    return
  }
  for (const row of rows) {
    const ok = await pushOrderToSupplier(row, from)
    if (ok != null) {
      await getSupabase()
        .from('supply_orders')
        .update({ pushed_via: ok ? 'dm' : 'silent' })
        .eq('id', row.id)
    }
  }
  await saveSession(from, 'browse', { ...session.data, pendingOrder: undefined, lastScreen: 'list' })
  await sendWhatsAppMessage(
    from,
    renderOrderSent(
      rows.map(r => {
        const g = pending.groups.find(gr => gr.businessName === r.biz_name)
        return { businessName: r.biz_name, status: r.status, token: r.token, dmOk: g?.supplierDigits ? true : null }
      })
    )
  )
  // The short links double as checkout: one cta per shop (3-button cap).
  for (const r of rows.slice(0, 3)) {
    const g = pending.groups.find(gr => gr.businessName === r.biz_name)
    await sendCtaUrl(
      from,
      `Send your order to *${r.biz_name}* - one tap opens their chat with it typed in.`,
      '📤 Send now ▸',
      `${SITE_URL}/go/o/${r.token}`
    )
    if (g && !g.supplierDigits) {
      // Voice-only shop: no wa.me — remind to call.
      await sendWhatsAppMessage(from, `📞 *${r.biz_name}* is voice-only too - the link dials them with your order ready to read.`)
    }
  }
}

/** Push one committed slice to the supplier. true = DMd or templated,
 * false = they have WhatsApp but haven't spoken to the bot lately,
 * null = no wa.me target at all (they get the sold-out list + digest). */
async function pushOrderToSupplier(row: SupplyOrderRow, buyerPhone: string): Promise<boolean | null> {
  const { data: biz } = await getSupabase()
    .from('businesses')
    .select('phone, phone_type, whatsapp_link')
    .eq('id', row.biz_id)
    .maybeSingle()
  const b = biz as { phone: string | null; phone_type: string | null; whatsapp_link: string | null } | null
  const digits = b ? await cartWaDigits(b.phone_type, b.phone || '', b.whatsapp_link) : ''
  const shortUrl = `${SITE_URL}/go/o/${row.token}`
  const body = [
    '🧾 *New order on WA Directory*',
    '',
    ...((row.lines || []) as { name: string; qty: number; price: number | null }[]).map(
      l => `• ${l.qty} × ${l.name}${l.price != null ? ` - $${l.price}` : ''}`
    ),
    '',
    `Buyer: +${digitsOnly(buyerPhone)}`,
    `Checkout: ${shortUrl}`,
    '',
    'Tap ✅ when you can supply - the buyer is notified instantly.',
  ].join('\n')

  if (!digits) {
    await bumpOrderTrace(row.id, { event: 'push-skip', reason: 'voice-only' })
    return null
  }
  const active = await supplierRecentlyActive(digits)
  if (active) {
    try {
      await sendWhatsAppMessage(digits, body)
      await sendInteractiveButtons(digits, '', [{ id: `oclaim_${row.id}`, title: '✅ I can supply' }])
      await bumpOrderTrace(row.id, { event: 'push-dm', at: new Date().toISOString() })
      return true
    } catch {
      // window/escalation failure — fall through to the silent path below
    }
  }
  const tpl = process.env.WHATSAPP_TEMPLATE_ORDER
  if (tpl && !active) {
    try {
      await sendWhatsAppTemplate(digits, tpl, [row.biz_name, buyerPhone, shortUrl])
      await bumpOrderTrace(row.id, { event: 'push-template', at: new Date().toISOString() })
      return true
    } catch {
      // template missing/unapproved — category still listed below
    }
  }
  await bumpOrderTrace(row.id, { event: 'push-skip', reason: 'inactive' })
  return false
}

async function bumpOrderTrace(id: number, event: Record<string, unknown>) {
  try {
    await getSupabase()
      .from('supply_orders')
      .update({ trace: [event] })
      .eq('id', id)
  } catch {
    // tracer is cosmetic — ignore failures
  }
}

/** Supplier considered poppable when they messaged the bot within 24h. */
async function supplierRecentlyActive(digits: string): Promise<boolean> {
  if (!digits) return false
  try {
    const { data } = await getSupabase()
      .from('bot_contacts')
      .select('last_seen')
      .eq('phone', `+${digits}`)
      .maybeSingle()
    if (!data?.last_seen) {
      // Try the bare-digit storage some older flows wrote.
      const alt = await getSupabase().from('bot_contacts').select('last_seen').eq('phone', digits).maybeSingle()
      if (!alt.data?.last_seen) return false
      return Date.now() - new Date(alt.data.last_seen).getTime() < 86_400_000
    }
    return Date.now() - new Date(data.last_seen).getTime() < 86_400_000
  } catch {
    return false
  }
}

/** Supplier taps ✅ I can supply: claim the sale and arm the buyer. */
async function handleClaimTap(from: string, session: ChatSession | null, orderId: number) {
  const row = await getSupplyOrderById(orderId)
  if (!row) {
    await sendWhatsAppMessage(from, 'That order is gone from the board already.')
    return
  }
  const { data: biz } = await getSupabase()
    .from('businesses')
    .select('phone, phone_type, whatsapp_link')
    .eq('id', row.biz_id)
    .maybeSingle()
  const b = biz as { phone: string | null; phone_type: string | null; whatsapp_link: string | null } | null
  const digits = b ? await cartWaDigits(b.phone_type, b.phone || '', b.whatsapp_link) : ''
  if (digits && digitsOnly(from) !== digits) {
    await sendWhatsAppMessage(from, 'Only the shop WhatsApp can confirm its orders.')
    return
  }
  const claimed = await claimSupplyOrder(orderId)
  if (!claimed) {
    await sendWhatsAppMessage(from, 'Already confirmed - the buyer knows.')
    return
  }
  const buyer = digitsOnly(row.buyer_phone)
  const summary = ((row.lines || []) as { name: string; qty: number }[])
    .map(l => `${l.qty} × ${l.name}`)
    .join(', ')
  const plain = `${row.biz_name} confirmed your order (${summary}). Their number: ${digits ? '+' + digits : 'on the listing web page'}.`
  await sendWhatsAppMessage(buyer, plain)
  if (digits) {
    await sendCtaUrl(
      buyer,
      `*${row.biz_name}* confirmed your order - say hi and lock in pickup/delivery 🛒`,
      '💬 Chat shop ▸',
      `https://wa.me/${digits}?text=${encodeURIComponent(
        `Hello! I placed order wa.directory/go/o/${row.token} - my number was shared.`
      )}`
    )
  }
  await sendWhatsAppMessage(from, `✅ Noted - your buyer has been pinged with this chat.`)
  void session
}

/** Typed `orders` for the shops: open slices waiting on them. */
async function sendSupplierOrders(from: string, session: ChatSession | null) {
  void session
  const digits = digitsOnly(from)
  const { data: bizRows } = await getSupabase()
    .from('businesses')
    .select('id, name')
    .or(`phone.ilike.${digits},phone.ilike.+${digits},phone.ilike.%${digits}`)
    .limit(3)
  if (!bizRows || !bizRows.length) {
    await sendWhatsAppMessage(from, 'No shop synced to this WhatsApp number yet. List yours first - *menu*.')
    return
  }
  const allRows: SupplyOrderRow[] = []
  for (const biz of bizRows.slice(0, 3)) {
    allRows.push(...(await listOrdersForBusiness(biz.id, 3)))
  }
  if (!allRows.length) {
    await sendWhatsAppMessage(from, '🧾 No open orders on your shelves right now.')
    return
  }
  const lines: string[] = ['🧾 *Open orders waiting on you*', '']
  for (const r of allRows.slice(0, 3)) {
    const summary = ((r.lines || []) as { name: string; qty: number }[])
      .map(l => `${l.qty} × ${l.name}`)
      .join(', ')
    lines.push(`*${r.token}* · ${r.buyer_phone ? '+' + digitsOnly(r.buyer_phone) : ''}`)
    lines.push(`↳ ${summary}`)
    lines.push('')
  }
  await sendWhatsAppMessage(from, lines.join('\n'))
  await sendInteractiveButtons(
    from,
    'Tap to confirm an order - the buyer is notified instantly.',
    allRows.slice(0, 3).map(r => ({ id: `oclaim_${r.id}`, title: `✅ ${r.token}` }))
  )
}

/** Buyer-side tracker: status of their open rows + drop-in stats fodder. */
async function sendMyOrders(from: string, session: ChatSession | null) {
  void session
  const rows = await listOrdersForBuyer(digitsOnly(from), 5)
  if (!rows.length) {
    await sendWhatsAppMessage(from, '🧾 No orders yet - type *order 2 bread* to see how it works.')
    return
  }
  await sendWhatsAppMessage(
    from,
    renderMyOrders(rows.map(r => ({ biz_name: r.biz_name, status: r.status, token: r.token })))
  )
}

/** Small lookup strip used by the typed-order teach message. */
async function bizNameById(id: string): Promise<string> {
  const { data } = await getSupabase()
    .from('businesses')
    .select('name')
    .eq('id', id)
    .maybeSingle()
  return (data as { name: string | null } | null)?.name || 'the shop'
}

/** How the bot describes itself on stats day (admin digest riff). */
async function adminOrderStatsLine(): Promise<string> {
  const stats = await orderStats(168)
  return `🧾 Orders this week: ${stats.orders} · confirmed: ${stats.claimed} · value: $${stats.usd}`
}

async function sendResultDetail(
  from: string,
  session: ChatSession,
  pick: number
) {
  const results = session.data.results || []
  const stub = results[pick - 1]
  const supabase = getSupabase()
  const { data: row } = await supabase
    .from('businesses')
    .select(BOT_BIZ_COLUMNS)
    .eq('id', stub.id)
    .maybeSingle()
  const b = row as BotBusinessRow | null

  if (!b) {
    await sendWhatsAppMessage(from, 'That listing is not available anymore. Type your search again.')
    await clearSession(from)
    return
  }

  const { data: itemRows } = await supabase
    .from('business_items')
    .select('id, name, price')
    .eq('business_id', b.id)
    .eq('is_active', true)
    .not('price', 'is', null)
    .order('price', { ascending: true })
    .limit(3)

  // The typed-order flow latches onto the shop the customer is looking at:
  // a bare `order` line prefers this shelf over the whole directory.
  await saveSession(from, 'browse', { ...session.data, lastScreen: 'detail', lastBizId: b.id })

  // One interactive item only: the Chat on WhatsApp button (the old
  // Back/New-search row is gone — typed replies cover those actions).
  const msg = renderDetailCard({
    name: b.name,
    slug: b.slug,
    city: b.city,
    area: b.area,
    rating: b.rating,
    reviewCount: b.review_count,
    items: ((itemRows as { name: string; price: number | null }[]) || []).slice(),
    phone: b.phone,
    phoneType: b.phone_type,
    socials: Array.isArray(b.socials) ? b.socials : [],
    verified: b.verified,
    paymentStatus: b.payment_status || undefined,
    responseTimeMinutes: b.response_time_minutes || undefined,
    ordersFulfilled: b.orders_fulfilled || undefined,
    escrowEligible: b.escrow_eligible,
    website: b.website,
    generateSite: !!b.generate_site || undefined,
  })
  await sendWhatsAppMessage(from, msg)

  // Native "Chat on WhatsApp" button (cta_url) — plus the 📸 single-photo
  // pick-list so customers can see one item without the full catalog walk.
  // Voice-only listings have nothing to chat with, so they skip chat.
  const digits = (b.phone || '').replace(/[^0-9]/g, '')
  if (digits && b.phone_type !== 'voice') {
    await sendInteractiveButtons(from, renderChatPrompt(b.name), [
      { id: `browse_items_detail_${b.id}`, title: '🧺 Browse all items' },
      { id: `cta_chat_${b.id}`, title: '💬 Chat on WhatsApp' },
      { id: `photo_pick_${b.id}`, title: '📸 See a photo' },
    ])
  } else {
    // Fallback: just browsing if no chat
    await sendInteractiveButtons(from, 'Options', [
      { id: `browse_items_detail_${b.id}`, title: '🧺 Browse all items' },
      { id: `photo_pick_${b.id}`, title: '📸 See a photo' },
    ])
  }

  // 🧭 Directions — coords give a one-tap Google Maps route, otherwise a
  // place search from name + area + city. Skipped when there is not enough
  // to point at anything useful.
  const hasCoords = b.lat != null && b.lng != null
  const placeBits = [b.name, b.area, b.city, 'Zimbabwe'].filter(Boolean)
  if (hasCoords || (b.name && (b.area || b.city))) {
    const directionsUrl = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeBits.join(', '))}`
    await sendCtaUrl(
      from,
      `Not sure where *${b.name}* is? One tap opens Google Maps with directions.`,
      '🧭 Get directions ▸',
      directionsUrl
    )
  }

  // Selection analytics — 'bot_select' requires migration 023 to be applied;
  // the insert is best-effort so nothing breaks before then.
  try {
    await supabase
      .from('stats_events')
      .insert({ business_id: b.id, type: 'bot_select', category: '', city: b.city || '' })
  } catch {}
}

// ... existing code ...

async function handleBrowseItems(
  from: string,
  session: ChatSession | null,
  businessId: string,
  page: number
) {
  const supabase = getSupabase()
  const { items, total } = await fetchBusinessItems(supabase, businessId, 5, page * 5)

  if (items.length === 0) {
    await sendWhatsAppMessage(from, 'No items available at this shop right now.')
    return
  }

  // One atomic card per item: image header + body + Add to cart button.
  for (const item of items) {
    const body = `*${item.name}*${item.price != null ? `\n${monoUSD(item.price)}` : ''}`
    await sendInteractiveImageCard(from, body, item.image_url || null, [
      { id: `add_to_cart_${item.id}`, title: '🧺 Add to cart' },
    ])
  }

  // Pagination / end navigation
  if ((page + 1) * 5 < total) {
    await sendInteractiveButtons(from, 'More items?', [
      { id: `browse_items_${businessId}_${page + 1}`, title: '→ Next page' },
    ])
  } else {
    await sendWhatsAppMessage(from, '✔ End of catalog.')
  }
}

// ── 📸 Single-item photo views ──────────────────────────────────────────
// One product photo without the full catalog walk. Entry points:
//   see_photo_<itemId>  — quick button under a search's results list and
//                         rows of the detail-card pick-list
//   photo_pick_<bizId>  — “📸 See a photo” on the detail card: a small
//                         pick-list that still ends with the full browse
//   cta_chat_<bizId>    — 💬 chat handoff (also fixes the previously
//                         unhandled chat button on the detail card)

/** Send ONE item's photo card: image + name/price/shop caption + the
 * actions under it. Imageless items get a polite text reply, never a
 * dead end. */
async function handleItemPhoto(from: string, itemId: string) {
  const { data: row } = await getSupabase()
    .from('business_items')
    .select('id, name, price, image_url, businesses(id, name, phone, phone_type)')
    .eq('id', itemId)
    .maybeSingle()

  if (!row) {
    await sendWhatsAppMessage(from, 'That item is not available anymore. Send a new search anytime.')
    return
  }

  const bizUntyped = Array.isArray(row.businesses) ? (row.businesses as unknown[])[0] : row.businesses
  const b = bizUntyped as { id: string; name: string | null; phone: string | null; phone_type: string | null } | null

  if (!row.image_url) {
    await sendWhatsAppMessage(
      from,
      `Sorry, no photo has been uploaded for *${row.name}* yet${b?.name ? ` at ${b.name}` : ''}. Tap 🧺 *Browse all items* to see what else they stock.`
    )
    return
  }

  const digits = (b?.phone || '').replace(/[^0-9]/g, '')
  const chatable = !!digits && b?.phone_type !== 'voice'
  const buttons: InteractiveButton[] = [{ id: `add_to_cart_${row.id}`, title: '🧺 Add to cart' }]
  if (chatable) buttons.push({ id: `cta_chat_${b!.id}`, title: '💬 Chat on WhatsApp' })

  await sendInteractiveImageCard(
    from,
    `*${row.name}*${row.price != null ? `\n${monoUSD(row.price)}` : ''}\n🏪 ${b?.name || 'A shop on the directory'}`,
    row.image_url,
    buttons
  )
}

/** 📸 See a photo (detail card): a small WhatsApp pick-list of the shop's
 * items, cheapest first. Rows keep the catalog open — the final row jumps
 * into the existing full browse flow. */
async function handlePhotoPick(from: string, businessId: string) {
  const { data: items } = await getSupabase()
    .from('business_items')
    .select('id, name, price, image_url')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('price', { ascending: true, nullsFirst: false })
    .limit(9)

  if (!items || items.length === 0) {
    await sendWhatsAppMessage(from, 'No items are listed at this shop yet.')
    return
  }

  const rows: InteractiveRow[] = items.map(it => ({
    id: `see_photo_${it.id}`,
    title: it.name,
    description: `${it.price != null ? monoUSD(it.price).replace(/`/g, '') : 'Price not listed'}${it.image_url ? ' · 📸' : ''}`,
  }))
  // WhatsApp caps a list at 10 rows; the last is reserved for the full
  // catalog so the pick-list never blocks the deeper browse.
  rows.push({ id: `browse_items_detail_${businessId}`, title: '🧺 Browse catalog', description: 'See every item they stock' })
  await sendInteractiveList(from, '📸 Which item would you like to see?', rows, '📸 Pick an item')
}

/** 💬 Chat on WhatsApp: the tracked /go handoff (records attribution +
 * transcript), same link the web app opens. */
async function handleCtaChat(from: string, businessId: string) {
  const { data: b } = await getSupabase()
    .from('businesses')
    .select('id, name')
    .eq('id', businessId)
    .maybeSingle()
  if (!b) {
    await sendWhatsAppMessage(from, 'That listing is not available anymore. Type your search again.')
    return
  }
  await sendCtaUrl(from, renderChatPrompt(b.name || 'this shop'), '💬 Chat on WhatsApp', chatCtaUrl(businessId, from))
}

async function handleAddToCart(from: string, session: ChatSession | null, itemId: string, msgId?: string) {
  if (!session) return
  // Find item details
  const { data: item } = await getSupabase()
    .from('business_items')
    .select('id, name, price, image_url, business_id, businesses(name)')
    .eq('id', itemId)
    .single()

  if (!item) {
    await sendWhatsAppMessage(from, 'Item not found.')
    return
  }

  const updatedData = addToCart(session.data, {
    businessId: item.business_id,
    businessName: (item.businesses as any)?.name || 'Shop',
    itemId: item.id,
    itemName: item.name,
    price: item.price || 0,
    qty: 1,
    imageUrl: item.image_url || undefined,
  })

  await saveSession(from, session.step, updatedData)
  await sendInteractiveButtonsRaw(
    from,
    `✅ Added *${item.name}* to your cart.`,
    [
      { id: 'view_cart', title: '🛒 View cart' },
      { id: 'new_search', title: '🔍 Search more' },
    ]
  )
}

async function handleViewCart(from: string, session: ChatSession | null) {
  if (!session) return
  const summary = getCartSummary(session.data)
  if (summary.totalItems === 0) {
    await sendWhatsAppMessage(from, '🛒 Your cart is empty.')
    return
  }

  let body = `🛒 *Your Cart* (${summary.totalItems} items)\n\n`
  for (const group of summary.groups) {
    body += `🏪 *${group.businessName}* - ${monoUSD(group.subtotal).replace(/`/g, '')}\n`
    for (const item of group.items) {
      body += `  • ${item.itemName} ×${item.qty} - ${monoUSD(item.price * item.qty).replace(/`/g, '')}\n`
    }
    body += '\n'
  }
  body += `*Grand Total: ${monoUSD(summary.grandTotal).replace(/`/g, '')}*`

  await sendInteractiveButtons(from, body, [
    { id: 'checkout_cart', title: '✅ Send all orders' },
    { id: 'clear_cart', title: '🗑️ Clear cart' },
    { id: 'new_search', title: '🔍 Search more' },
  ])
}

async function handleCheckoutCart(from: string, session: ChatSession | null) {
  if (!session) return
  const summary = getCartSummary(session.data)

  // For each business group, create supply orders (or link existing ones)
  for (const group of summary.groups) {
    // Create an order for this business
    await createSupplyOrder({
      biz_id: group.businessId,
      biz_name: group.businessName,
      buyer_phone: from,
      lines: group.items.map(i => ({
        name: i.itemName,
        qty: i.qty,
        price: i.price
      }))
    })
  }

  await clearSession(from)
  await sendWhatsAppMessage(from, `✅ Orders sent to ${summary.groups.length} supplier(s). I will notify you when they confirm.`)
}

async function handleClearCart(from: string, session: ChatSession | null) {
  if (!session) return
  const data = clearCart(session.data)
  await saveSession(from, session.step, data)
  await sendWhatsAppMessage(from, '🛒 Cart cleared.')
}

async function publishBusiness(from: string, session: ChatSession, msgId?: string) {
  const data = session.data
  const name = data.name?.trim() || ''
  const description = data.description?.trim() || ''
  const city = data.city || ''
  const area = data.area || ''
  const wholeCountry = data.whole_country === true
  const countryCode = data.country_code || COUNTRY_CODE
  // Both flows store phones here — the guided flow collects national digits,
  // the form flow stores full '263…' numbers. Normalize to national.
  const rawPhone = (data.phone || '').replace(/[^0-9]/g, '')
  const phone = rawPhone.startsWith('263') ? rawPhone.slice(3) : rawPhone

  // One code path for listings, webapp and WhatsApp: the shared engine owns
  // validation, business-id/username/slug generation, payment_status rules
  // (pending unless Yellow Pages), auto-website copy and admin alerts.
  const result = await createListing({
    name,
    countryCode,
    phone,
    categories: data.categories && data.categories.length ? data.categories : [data.category || 'Other'],
    city: wholeCountry ? '*' : city || undefined,
    pendingCity: !wholeCountry && !!city && !zimbabweCities.some(c => c.name === city),
    areas: city ? [area].filter(Boolean) : [],
    description,
    whatsappUsername: data.whatsapp_username || '',
    requestedUsername: data.whatsapp_username || '',
    priceRange: typeof data.price_range === 'string' ? data.price_range : undefined,
    website: typeof data.website === 'string' ? data.website : undefined,
    catalogLink: typeof data.list?.catalog === 'string' ? data.list.catalog : undefined,
    address: typeof data.address === 'string' ? data.address : undefined,
    phoneType: data.phone_type === 'voice' ? 'voice' : 'whatsapp',
    logoUrl: typeof data.list?.logo === 'string' ? data.list.logo : undefined,
    generateSite: true,
    notify: false,
  })

  if ('error' in result) {
    console.error('[webhook] register insert failed:', result.error)
    await sendWhatsAppMessage(from, 'Sorry, something went wrong saving your listing. Please try again later.')
    return
  }

  const businessId = result.id
  const token = result.editToken
  const slug = result.slug

  // Auto-request unapproved category / area so admins can review them
  if (businessId) {
    const { data: bizRow } = await getSupabase()
      .from('businesses')
      .select('category, city, location, phone')
      .eq('id', businessId)
      .maybeSingle()
    const approvedCats = await getApprovedCategories()
    const cats = Array.isArray(bizRow?.category) ? (bizRow!.category as string[]) : []
    for (const category of cats) {
      if (!approvedCats.some(c => c.name === category)) {
        try {
          await getSupabase().from('feature_requests').insert({
            type: 'category', name: category, city: '', business_id: businessId, status: 'pending',
          })
        } catch {}
      }
    }
    const approvedAreas = await getApprovedAreas()
    if (city && area) {
      const approvedAreaNames = new Set(approvedAreas.filter(a => a.city === city).map(a => a.name))
      if (!approvedAreaNames.has(area)) {
        try {
          await getSupabase().from('feature_requests').insert({
            type: 'area', name: area, city, business_id: businessId, status: 'pending',
          })
        } catch {}
      }
    }
  }

  // ✅ React to the tap the user sent — a lightweight thumbs-up confirmation
  // that the form truly landed before the long status message arrives.
  if (msgId) await sendReaction(from, msgId, '✅').catch(() => {})

  if (result.pendingPayment) {
    // Paid row: no links or pitch yet — the go-live bundle arrives with the
    // payment-confirmed activation message (lib/listing-activation.ts) once
    // /api/paynow/result verifies the EcoCash payment.
    await askEcoCashNumber(from, { id: result.businessId, name }, '1m')
  } else {
    await sendWhatsAppMessage(
      from,
      [
        '🎉 *Submitted for Approval!*',
        '',
        `Your business "${name}" is now pending review.`,
        'Once an admin approves it you will get a confirmation here.',
        '',
        '⭐ Public-service listing: our team verifies it fast.',
        '',
        '📸 *After go-live:* send a product photo with a caption that includes the product name and price (e.g. *bread $2*), and you can add extra details like *"i make home deliveries and customize cakes to your liking"*.',
        'The bot will format it beautifully: it will quote your description, **bold the name**, and `inline-code` the price.',
        '',
        '📸 *Photo tips:* While optional, we strongly recommend uploading original photos of your actual products - this builds customer trust. Please avoid internet-sourced or AI-generated images. If we detect non-original images, they may be removed.',
        '',
        `✏️ Save this link to edit your listing later:`,
        `${SITE_URL}/edit?token=${token}`,
        '',
        `🔐 Create your portal account (stats, conversations, ranking):`,
        `${SITE_URL}/account-setup?token=${token}`,
        '',
        `📱 Your QR codes (chat + portal): print them for customers:`,
        `${SITE_URL}/my-qr/${slug}`,
        '',
        'Reply *help* anytime.',
      ].join('\n')
    )
  }

  // One-time channel pitch while the registration window is open: this is
  // where live buyer needs surface, and quoting is one reply. Paid rows
  // already get this with the activation message.
  if (!result.pendingPayment) {
    const chLink = await channelLinkRaw()
    if (chLink) {
      await sendWhatsAppMessage(from, renderChannelPitch(chLink)).catch(() => {})
    }
  }

  // One-time channel pitch while the registration window is open: this is
  // where live buyer needs surface, and quoting is one reply.
  const chLink = await channelLinkRaw()
  if (chLink) {
    await sendWhatsAppMessage(from, renderChannelPitch(chLink)).catch(() => {})
  }

  if (ADMIN_WHATSAPP) {
    sendWhatsAppMessage(
      ADMIN_WHATSAPP,
      [
        result.pendingPayment ? '🆕 NEW BUSINESS PENDING VERIFICATION' : '🚨 YELLOW PAGES SUBMISSION: VERIFY FAST',
        '',
        `Name: ${name}`,
        `Category: ${result.categories.join(', ')}`,
        `Location: ${result.city || 'Zimbabwe (whole country)'}`,
        `Phone: ${phone}`,
        `Approve: ${SITE_URL}/admin`,
        result.isYellowPages ? 'Public-service listing: verify ASAP for the Emergency & Essential strip.' : '',
      ].filter(Boolean).join('\n')
    ).catch(() => {})
  }
}

async function continueRegistration(from: string, session: ChatSession, text: string, msgId?: string) {
  const data = session.data
  const t = text.trim()

  switch (session.step) {
    case 'name':
      await saveSession(from, 'username', { ...data, name: t })
      await sendWhatsAppMessage(
        from,
        'Nice! Now your *WhatsApp username* (the one shown on your WhatsApp Business profile).'
      )
      break

    case 'username':
      if (!/^[a-zA-Z0-9_]{3,}$/.test(t)) {
        await sendWhatsAppMessage(from, 'Username must be letters, numbers or underscores (min 3). Try again:')
        break
      }
      await saveSession(from, 'phone', { ...data, whatsapp_username: t })
      await sendWhatsAppMessage(
        from,
        `Got it *@${t}*. Now your *phone number* (e.g. 712345678). Customers will use it to WhatsApp you.`
      )
      break

    case 'phone': {
      const digits = t.replace(/[^0-9]/g, '')
      const err = validatePhone(COUNTRY_CODE, digits)
      if (err) {
        await sendWhatsAppMessage(from, `${err}. Try again (e.g. 712345678):`)
        break
      }
      await saveSession(from, 'category', { ...data, phone: digits, country_code: COUNTRY_CODE })
      await sendWhatsAppMessage(
        from,
        'What do you sell? e.g. *phones, plumbing, catering, magetsi, salon*...'
      )
      break
    }

    case 'category': {
      const approved = await getApprovedCategories()
      const category = await matchCategoryLearned(t, approved)
      if (category === 'Other') {
        const list = approved
          .filter(c => c.name !== 'Other')
          .slice(0, 12)
          .map(c => `${c.icon} ${c.name}`)
          .join('\n')
        await sendWhatsAppMessage(from, `I couldn't place that category. Choose one:\n\n${list}\n\nType the category name:`)
        break
      }
      await saveSession(from, 'description', { ...data, category })
      await sendWhatsAppMessage(from, `*${category}*! Great, now describe your business in one or two sentences (what you offer):`)
      break
    }

    case 'description':
      if (t.length < 10) {
        await sendWhatsAppMessage(from, 'Please give a slightly longer description of what you offer:')
        break
      }
      await saveSession(from, 'city', { ...data, description: t })
      {
        const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
        await sendWhatsAppMessage(
          from,
          `Which town or city are you based in?\n\n${cities}...\n\nOr type *whole country*`
        )
      }
      break

    case 'city': {
      if (/(whole country|anywhere|zimbabwe|everywhere)/.test(t.toLowerCase()) || t === '*') {
        const merged: ChatSessionData = { ...data, city: '', area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
        break
      }
      const city = await findCityLearned(t)
      if (!city) {
        const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
        await sendWhatsAppMessage(from, `I couldn't find that town. Pick one:\n\n${cities}...\n\nOr type *whole country*`)
        break
      }
      const cityObj = zimbabweCities.find(c => c.name === city)
      if (cityObj && cityObj.areas.length > 0) {
        await saveSession(from, 'area', { ...data, city })
        const areas = cityObj.areas.slice(0, 12).join(', ')
        await sendWhatsAppMessage(
          from,
          `*${city}*: which area?\n\n${areas}...\n\nOr type *skip* for the whole city.`
        )
      } else {
        const merged: ChatSessionData = { ...data, city, area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
      }
      break
    }

    case 'area': {
      const city = data.city || ''
      if (/(skip|none|whole country|anywhere)/.test(t.toLowerCase())) {
        const merged: ChatSessionData = { ...data, area: '' }
        await saveSession(from, 'confirm', merged)
        await sendConfirmation(from, merged)
        break
      }
      const area = await findAreaLearned(city, t)
      if (!area) {
        await sendWhatsAppMessage(from, `I couldn't match that area in *${city}*. Type one of the areas listed, or *skip*.`)
        break
      }
      const merged: ChatSessionData = { ...data, area }
      await saveSession(from, 'confirm', merged)
      await sendConfirmation(from, merged)
      break
    }

    case 'confirm': {
      if (/^(yes|y|publish|confirm|go)/i.test(t)) {
        await publishBusiness(from, session, msgId)
        await clearSession(from)
      } else if (/^(no|n|cancel)/i.test(t)) {
        await clearSession(from)
        await sendWhatsAppMessage(from, 'Registration cancelled. Send *register* to start again, or *help*.')
      } else {
        await sendConfirmation(from, data)
      }
      break
    }

    default:
      await clearSession(from)
      await sendWhatsAppMessage(from, await helpText(from))
  }
}

async function sendConfirmation(from: string, data: ChatSessionData) {
  const location = data.city ? [data.area, data.city, 'Zimbabwe'].filter(Boolean).join(', ') : 'Zimbabwe'
  const lines = [
    '*Please confirm your details:*',
    '',
    `🏢 *${data.name}*`,
    `📱 @${data.whatsapp_username}`,
    `☎️ ${data.country_code || COUNTRY_CODE} ${data.phone}`,
    `🏷️ ${data.category}`,
    `📍 ${location}`,
    `📝 ${data.description}`,
    '',
    'Reply *YES* to publish (pending approval), or *CANCEL* to start over.',
  ]
  await sendWhatsAppMessage(from, lines.join('\n'))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && WEBHOOK_VERIFY_TOKEN && token === WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully')
    return new Response(challenge, { status: 200 })
  }

  console.warn('Webhook verification failed', { mode, token })
  return new Response('Verification failed', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (!verifyMetaSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
      console.warn('[webhook] rejected: invalid or missing X-Hub-Signature-256')
      return new Response(JSON.stringify({ status: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
    }
    const body = JSON.parse(rawBody)

    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages) {
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }

    // Piggyback the idle-nudge sweep on inbound traffic (serverless can't
    // self-wake). Best-effort, never blocks message handling.
    if (value.messages.some((m: { id?: string }) => typeof m.id === 'string' && m.id)) {
      sweepIdleNudges(async (phone, body) => {
        await sendWhatsAppMessage(phone, body)
      })
    }

    for (const message of value.messages) {
      // Meta redelivers webhooks it has not acknowledged in time; record each
      // message id and skip duplicates. Fail-open on DB trouble: a rare
      // duplicate beats a lost customer reply.
      const msgId = typeof message.id === 'string' ? message.id : ''
      if (msgId) {
        const { error: receiptErr } = await getSupabase()
          .from('webhook_receipts')
          .insert({ message_id: msgId })
        if (receiptErr) {
          if (receiptErr.code === '23505') {
            continue
          }
          console.warn('[webhook] receipt insert failed (fail-open):', receiptErr.message)
        }
      }

      const from = typeof message.from === 'string' ? message.from : ''
      // Blue tick straight away, before any processing latency builds up.
      if (msgId) markRead(msgId).catch(() => {})
      try {
        const text = (message.text?.body || '').trim()
        const lower = text.toLowerCase()
        // Native taps arrive as interactive replies carrying a deterministic id
        // (set by our own list/button payloads). They route beside plain text.
        const action =
          message.interactive?.button_reply?.id ||
          message.interactive?.list_reply?.id ||
          ''
        // Voice notes and photos become intent (search or registration input).
        const mediaKind: MediaKind | null =
          message.type === 'audio' ? 'audio' : message.type === 'image' ? 'image' : null
        // Shared location (from the 📍 Near me prompt or the phone's
        // location picker) drives distance-ranked searches.
        const location: { lat: number; lng: number } | null =
          message.type === 'location' &&
          Number.isFinite(Number(message.location?.latitude)) &&
          Number.isFinite(Number(message.location?.longitude))
            ? { lat: Number(message.location.latitude), lng: Number(message.location.longitude) }
            : null

        if (!text && !action && !mediaKind && !location) continue

        console.log(
          `WhatsApp message from ${from}: ${text || `[${action || (mediaKind === 'audio' ? 'voice note' : mediaKind === 'image' ? 'photo' : 'location')}]`}`
        )

        // Word-for-word inbound record (fail-open) for the admin transcript view.
        logBotMessage(
          from,
          'in',
          text ? 'text' : mediaKind === 'audio' ? 'voice' : mediaKind === 'image' ? 'image' : location ? 'location' : action ? 'tap' : 'other',
          text || action || `[${mediaKind === 'audio' ? 'voice note' : mediaKind === 'image' ? 'photo' : 'location'}]`
        ).catch(() => {})

        // Customer base: one row per number, profile name when Meta send it.
        const waName = value.contacts?.find((c: { wa_id?: string }) => c.wa_id === from)?.profile?.name || ''
        let contactSession = await getSession(from)
        // Known contact must be captured BEFORE the upsert below, or every
        // message looks like a first hello.
        const wasKnown = await hasSeenContact(from)
        if (lower === 'stop') {
          await markBotContactOptOut(from)
          await clearSession(from)
          await sendWhatsAppMessage(from, 'Okay 👌 You will not hear from us again. Reply *help* if you ever want to browse again.')
          continue
        } else {
          await upsertBotContact(from, waName, contactSession && contactSession.step !== 'idle' ? contactSession.step : '')
        }
        let session = contactSession
        // 'idle' is the placeholder row a shelved draft sits on when no flow is
        // open: treat it as no active step — the draft itself is read from the
        // DB by resumePaused / stashPaused.
        if (session?.step === 'idle') session = null

        // ── Admin command suite (owner + allowlisted numbers) ───────────
        if (await isBotAdmin(from)) {
          if (await handleAdminCommand(from, text)) {
            continue
          }
          // Admins fall through: their phone works as a normal user too.
        }

        // ── Human takeover gate ─────────────────────────────────────────
        // Held sessions relay inbound messages to the admins instead of
        // driving bot flows. stop-opt-out was handled before this point,
        // so an admin hold never blocks opt-out. contactSession (not
        // session) is used because idle-step rows are nulled further down.
        if (contactSession?.data?.held) {
          await relayHeldMessage(from, text, action, mediaKind, location)
          continue
        }

        if (action) {
          await handleAction(from, session, action, msgId)
          continue
        }

        // Greeting-only messages ("hi", "hie", "mangwanani"…): brand-new
        // contacts get the full welcome; returning ones get a short named
        // hello. Both end with the interactive menu list. Real searches never
        // reach this branch, so request handling stays instant.
        let greetBody = renderGreetingBody(text, waName)
        if (greetBody && !waName) {
          const contactName = await getBotContactName(from)
          if (contactName) greetBody = renderGreetingBody(text, contactName) || greetBody
        }
        if (greetBody) {
          await clearSession(from)
          let greetName = waName
          if (!greetName) {
            const contactName = await getBotContactName(from)
            if (contactName) greetName = contactName
          }
          const body = wasKnown
            ? renderWelcomeBack(greetName)
            : renderFirstWelcome(await channelLinkRaw())
          await sendWhatsAppMessage(from, body)
          await sendInteractiveList(from, 'Need something else? Choose 👇', MENU_ROWS, 'Main menu')
          continue
        }

        // Shared location drives distance-ranked near-me searches.
        if (location) {
          await handleBotLocation(from, session, location, msgId)
          continue
        }

        // Voice note / photo: search intent outside registration, form input
        // + logo while filling the listing form.
        if (mediaKind) {
          await handleBotMedia(from, session, message, msgId)
          continue
        }

        // Pick up a flow that an earlier direction change shelved (the draft
        // lives in the session row, which may be the 'idle' placeholder).
        if (
          /^(?:resume|continue|pick ?up|carry on)\b/.test(lower) &&
          (await resumePaused(from, session || (await getSession(from))))
        ) {
          continue
        }

        // Direction change mid-flow: follow the person, not the script.
        // Structured RQ relays are never a direction change — they always
        // belong to the quote flow below.
        if (!/^rq-/i.test(lower) && (await handleIntentPivot(from, session, text))) {
          continue
        }

        // 🛒 Need intake (S16): buyers type one line, confirm card follows.
        if (session?.step === 'need_form') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          await handleNeedFormText(from, session, text)
          continue
        }

        // 📡 Radar: verified suppliers manage pings or claim the newest lead.
        if (/^radar\b/.test(lower) || /^claim\s*$/.test(lower)) {
          await handleRadarCommand(from, lower)
          continue
        }

        // Any "RQ-…" message: supplier quoting, buyer stop/reopen, filled
        // notices. Checked before other flows so wa.me deep links always win.
        const rqHandled = await handleRqText(from, waName, text)
        if (rqHandled) {
          continue
        }

        if (session?.step === 'rating') {
          if (lower === 'cancel' || lower === 'help' || lower === 'back') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          await handleRatingReply(from, session, text)
          continue
        }

        // ── S18.2 typed orders: global entry ─────────────────────────────
        // Fires before search steps so `order …` always means ordering — but
        // only when the buyer is not mid-registration or mid-listing-form.
        const orderM = lower.match(/^order\b[,;:]?\s*([\s\S]*)$/)
        if (
          orderM &&
          (!session || !['need_form', 'reg_contact', 'list_form', 'pay', 'confirm', 'rating', 'order'].includes(session.step))
        ) {
          const tail = orderM[1].trim() || 'order'
          const { pairs, junk } = parseOrderLine(tail)
          if (!pairs.length || !junk.length) {
            // Bare `order` (or a cleanly parseable line) → order flow.
            await typedOrderFromText(from, session, tail)
            continue
          }
          // Junk-laden ("order a logo for outside") → keep acting like search.
        }
        if (lower === 'myorders' || lower === 'my orders') {
          await sendMyOrders(from, session)
          continue
        }
        if (lower === 'orders' || lower.startsWith('orders ')) {
          await sendSupplierOrders(from, session)
          continue
        }

        // ── My listings: /contact & /paid ────────────────────────────────
        // /contact lists a payer's personal contacts, /paid everything their
        // number has paid for — both with expiry countdowns. Slash forms are
        // unambiguous and fire even mid-flow; the bare words only fire when
        // no data-entry step could be expecting them as an answer.
        const dataEntryLocked = !!session && ['need_form', 'reg_contact', 'list_form', 'pay', 'pay_search', 'pay_plan', 'pay_ecocash', 'order'].includes(session.step)
        if (
          lower === '/contact' ||
          lower === '/contacts' ||
          lower === 'mycontacts' ||
          lower === 'my contacts' ||
          ((lower === 'contact' || lower === 'contacts') && !dataEntryLocked)
        ) {
          await sendMyListings(from, true)
          await clearSession(from)
          continue
        }
        if (
          lower === '/paid' ||
          lower === 'mypaid' ||
          lower === 'my paid' ||
          lower === '/mypaid' ||
          (lower === 'paid' && !dataEntryLocked)
        ) {
          await sendMyListings(from, false)
          await clearSession(from)
          continue
        }

        // ── Bot search conversation steps ───────────────────────────────
        if (session?.step === 'search_loc') {
          // Waiting for the user's town (term already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          if (lower === 'back' || lower === '0') {
            await startFreshSearchPrompt(from)
            continue
          }
          const p = parseQuery(text)
          if (p.nationwide || p.city) {
            const pendingTerm = session.data.pending_search_term || ''
            if (p.term) {
              // The reply was a full query — honor the latest intent
              await runSearchAndReply(from, { term: p.term, city: p.city ?? null, nationwide: p.nationwide })
            } else if (pendingTerm) {
              await runSearchAndReply(from, {
                term: pendingTerm,
                city: p.city ?? null,
                nationwide: p.nationwide,
              })
            } else {
              await saveSession(from, 'search_term', { pending_city: p.city || '' })
              await sendAskTerm(from, p.city)
            }
            continue
          }
          // Not a town — re-ask. If the reply itself carries a fresh term,
          // rebind it: "cancel" steps or "plumber" retypes should never leave
          // an older pending term latched on.
          if (p.term && !p.city && !p.nationwide) {
            await saveSession(from, 'search_loc', { pending_search_term: p.term })
          }
          await sendAskTown(from, p.term || session.data.pending_search_term || '', true, true)
          continue
        }

        if (session?.step === 'search_term') {
          // Waiting for the search term (town already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          if (lower === 'back' || lower === '0') {
            await startFreshSearchPrompt(from)
            continue
          }
          const p = parseQuery(text)
          const pendingCity = session.data.pending_city || ''
          if (p.term) {
            const city = p.nationwide ? null : p.city ?? (pendingCity || null)
            // A stashed shared-location point makes this term a near-me
            // search when the user didn't specify their own town instead.
            const hasOrigin =
              session.data.origin_lat != null &&
              session.data.origin_lng != null &&
              !pendingCity &&
              !p.nationwide &&
              !p.city
            await runSearchAndReply(from, {
              term: p.term,
              city,
              nationwide: (p.nationwide || (!city && !pendingCity)) && !hasOrigin,
              origin: hasOrigin
                ? { lat: session.data.origin_lat!, lng: session.data.origin_lng! }
                : null,
            })
            continue
          }
          if (p.nationwide) {
            await saveSession(from, 'search_term', { pending_city: '' })
            await sendAskTerm(from, null)
            continue
          }
          if (p.city) {
            // They typed another town — update and keep asking for the term
            await saveSession(from, 'search_term', { pending_city: p.city })
            await sendAskTerm(from, p.city)
            continue
          }
          await sendAskTerm(from, pendingCity || null)
          continue
        }

        if (session?.step === 'order') {
          // Verify screen up: finish, fix, or speak a brand-new order line.
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          if (lower === 'back') {
            // Back = pause ordering (search results stay alive).
            await saveSession(from, 'browse', { ...session.data, pendingOrder: undefined, lastScreen: 'list' })
            await sendWhatsAppMessage(from, 'Ordering paused. Reply a numbered business, or send a new search.')
            continue
          }
          if (lower === 'yes' || lower === 'send' || lower === 'checkout' || lower === 'done') {
            await commitPendingOrder(from, session)
            continue
          }
          if (lower === 'no' || lower === 'edit' || lower === 'retype') {
            await sendWhatsAppMessage(
              from,
              'Say it again and I will type along - e.g. *order 2 bread, 1 cake*.'
            )
            await sendInteractiveButtons(from, '', [{ id: 'osend', title: '✅ Send as-is' }])
            continue
          }
          // A fresh order line re-types ("order …" or leading quantity);
          // anything else is a plain search — the draft dies with it.
          const trimmed = text.trim()
          const orderish = /^order\b/.test(lower) || (/^\d/.test(trimmed) && parseOrderLine(trimmed).pairs.length > 0)
          if (orderish) {
            await typedOrderFromText(from, session, trimmed.replace(/^order\b[,;:]?\s*/i, ''), )
            continue
          }
          await clearSession(from)
          session = null
          await dispatchSearch(from, text)
          continue
        }

        if (session?.step === 'browse') {
          // Numbered results are on screen; taps and typed numbers open cards,
          // more/next pages through the stored candidates.
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          if (lower === 'back' || lower === '0') {
            await goBack(from, session)
            continue
          }
          const results = session.data.results || []
          const page = session.data.page || 0
          if (lower === 'more' || lower === 'next') {
            if (results.length > (page + 1) * RESULTS_PER_PAGE) {
              await saveSession(from, 'browse', { ...session.data, lastScreen: 'list', page: page + 1 })
              await sendResultsListPage(
                from, results, page + 1, session.data.lastTerm || 'search',
                session.data.lastCity ?? null, !!session.data.nearby
              )
            } else {
              await sendWhatsAppMessage(
                from,
                `That's all ${results.length} match${results.length === 1 ? '' : 'es'} - reply a number or tap a business.`
              )
            }
            continue
          }
          const m = text.trim().match(/^([1-9][0-9]?)(?![0-9])/)
          if (m && results.length > 0) {
            const n = Number(m[1])
            // Typed 1-9 = position on the current page; 10-20 = absolute rank.
            const pick = n <= RESULTS_PER_PAGE ? page * RESULTS_PER_PAGE + n : n
            if (pick >= 1 && pick <= results.length) {
              await sendResultDetail(from, session, pick)
              continue
            }
            await sendWhatsAppMessage(from, renderInvalidSelection(results.length))
            continue
          }
          // Anything else is a fresh search — drop the list and re-dispatch
          await clearSession(from)
          session = null
          await dispatchSearch(from, text)
          continue
        }

        // ── Personal contact intake: name + phone (+ city, socials) ─────
        if (session?.step === 'reg_contact') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          const c = parseContactLine(text)
          if (!c) {
            await sendWhatsAppMessage(
              from,
              [
                "I need the contact's name and phone. e.g.",
                '*Tendai Ncube 0771 234 567 Harare*',
                '',
                'Add socials too if you like: *IG @tendai* or *fb tendai*.',
              ].join('\n')
            )
            continue
          }
          await saveSession(from, 'reg_contact', { contact: c })
          const socialLines = (c.socials || []).slice(0, 3).map(s => `🔗 ${s}`)
          // Package picker as a list row menu — three personal packages plus
          // "fix details" would not fit WhatsApp's three-button cap.
          await sendInteractiveList(
            from,
            [
              `*${c.name}* ${c.city ? `📍 ${c.city}` : '📍 Zimbabwe'}`,
              `📱 +${c.phone.startsWith('263') ? c.phone : '263' + c.phone.replace(/^0/, '')}`,
              ...socialLines,
              '',
              'Personal contact pricing - pick a package:',
              '• USD 1 · 1 month',
              '• USD 5 · 6 months',
              '• USD 10 · 12 months',
              'Paid via EcoCash - you enter the PIN after you choose.',
            ].join('\n'),
            [
              { id: 'reg_contact_pay_monthly', title: 'Pay $1 · 1 month' },
              { id: 'reg_contact_pay_6m', title: 'Pay $5 · 6 months' },
              { id: 'reg_contact_pay_year', title: 'Pay $10 · 12 months' },
              { id: 'reg_contact_fix', title: '✎ Fix details' },
            ],
            'Choose a package'
          )
          continue
        }

        // ── New registration flow (REGISTRATION_* states from Supabase) ───────
        const convState = await getConversationState(from)
        if (convState && convState.state.startsWith('REGISTRATION_')) {
          // Handle image messages
          if (mediaKind === 'image') {
            const media = await fetchWhatsAppMedia(message.id)
            if (media) {
              const imageBytes = new Uint8Array(media.buffer)
              await handleRegistrationImage(from, imageBytes, '')
              continue
            }
          }
          // Handle text messages
          await handleRegistrationMessage(from, text, convState.context)
          continue
        }

        // ── Living list-form: parse + re-render after every reply ──────
        if (session?.step === 'list_form') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          if (/^(publish|submit|yes|y|go live)\b/.test(lower)) {
            await tryPublishForm(from, session)
            continue
          }
          await handleListFormText(from, session, text)
          continue
        }

        // ── Shelf item: photo queued, waiting for "name $price" ────────
        if (session?.step === 'item_photo') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          await handleItemSpecText(from, session, text)
          continue
        }
        if (session?.step === 'item_pick') {
          await clearSession(from)
          await sendWhatsAppMessage(from, 'Tap the shop button to pick, or send the product photo again.')
          continue
        }

        // ── Pay flow: typed answers mirror the tap handlers ─────────────
        if (session?.step === 'pay_search') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          await handlePaySearchText(from, session, text)
          continue
        }
        if (session?.step === 'pay_pick') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          const mPick = lower.match(/^([1-9])$/)
          if (mPick) {
            await selectPayCandidate(from, session, Number(mPick[1]))
          } else {
            // Not a pick — treat as a brand-new search query
            await clearSession(from)
            session = null
            await dispatchSearch(from, text)
          }
          continue
        }
        if (session?.step === 'pay_plan') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          const plan = canonicalPlan(text)
          if (plan) {
            await askEcoCashNumber(from, session.data.pay_business, plan, session.data)
          } else {
            await sendWhatsAppMessage(from, 'Tap a plan above, or reply *1*, *6* or *12*.')
          }
          continue
        }
        if (session?.step === 'pay_ecocash') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, await helpText(from))
            continue
          }
          await handleEcoCashText(from, session, text)
          continue
        }

        if (session?.step && lower !== 'cancel' && lower !== 'help') {
          await continueRegistration(from, session, text, msgId)
          continue
        }

        if (session?.step && (lower === 'cancel' || lower === 'help')) {
          await clearSession(from)
          await sendWhatsAppMessage(from, await helpText(from))
          continue
        }

        // Pay intent before everything else free-text: "I want to pay", renew,
        // subscription… all open the same two-way question.
        if (/\b(?:pay|payment|paynow|pay now|subscription|subscribe|renew|ecocash|top ?up)\b/.test(lower)) {
          appendTranscript(from, text)
          await startPayChoice(from)
          continue
        }

        const mReg = text
          .trim()
          .match(/^(register|list me|list my|list on|list|get listed|add my business|sign me up|advertise\b|sell\b.*\b(list|advertise|get listed)\b|i want to (list|sell|advertise)|join\b)\b(.*)$/i)
        if (mReg) {
          const trailing = mReg[3].trim()
          if (!trailing || /^(?:me|my business|my company|my shop|myself|us)$/i.test(trailing)) {
            await sendRegisterChoice(from)
          } else {
            // User typed something like "register my bakery" - start with the new flow
            await startRegistrationFlow(from)
          }
          continue
        }

        if (lower === 'menu' || lower === 'hi' || lower === 'hello') {
          await sendMainMenu(from)
          continue
        }

        if (lower === 'help') {
          await sendWhatsAppMessage(from, await helpText(from))
          continue
        }

        // Search-first: any text that parses as a search runs the search, even
        // when a rating prompt is due; only clearly non-search text may prompt
        // a pending rating (which otherwise never blocks).
        const parsedTail = parseQuery(text)
        if (parsedTail.term || parsedTail.city || parsedTail.nationwide) {
          appendTranscript(from, text)
          await dispatchSearch(from, text)
          continue
        }
        appendTranscript(from, text)
        const ratingSession = await promptRatingIfDue(from)
        if (ratingSession?.step === 'rating') {
          continue
        }

        await dispatchSearch(from, text)
      } catch (err) {
        console.error('[webhook] message error:', err)
        try {
          if (from) await sendWhatsAppMessage(from, renderErrorCard())
        } catch {}
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
}

