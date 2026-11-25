import '../lib/gemini-default.js'
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
  sendWhatsAppImage,
  sendImageWithFallback,
  sendContactCard,
  markRead,
  sendWhatsAppTemplate,
  setOutboundLogger,
} from '@wa-directory/shared'
import type { InteractiveRow, InteractiveButton } from '@wa-directory/shared'
import { monoUSD } from '@wa-directory/shared'
import { logBotMessage, logBotSearch } from '@wa-directory/shared'
import { orderSearchResults } from '@wa-directory/shared'
import { expandSearchQuery, classifyIntent } from '@wa-directory/shared'
import type { Business } from '@wa-directory/shared'
import {
  getConversationState,
  setConversationState,
  updateConversationContext,
  clearConversationState,
  handleRegistrationMessage,
} from '@wa-directory/shared'
import { TRIAL_PLAN_LABEL, TRIAL_DAYS } from '@wa-directory/shared'
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
  type ShelfBatchItem,
  type ItemBatch,
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
import { parseCounterPrices, sumLines } from '../lib/counter-price.js'
import {
  DATA_ENTRY_STEPS,
  detectPivot,
  familyOf,
  pivotCandidateForIntent,
  goalKindForWord,
  registrationCommand,
  type GoalAskKind,
} from '../lib/intent-pivot.js'
import {
  createSupplyOrder, recordOrderOpen, getOrderByToken, getSupplyOrderById, listOrdersForBusiness,
  listOrdersForBuyer, orderStats, type SupplyOrderRow, type SupplyOrderLine,
} from '@wa-directory/shared'
import { getSupabase } from '@wa-directory/shared'
import { upsertBotContact, markBotContactOptOut, setBotContactOptIn, hasSeenContact, sweepIdleNudges, getBotContactName } from '../lib/bot-contacts.js'
import { getBotSetting, setBotSetting } from '@wa-directory/shared'
import { getAiLimitStatus, renderAiLimitNotice } from '@wa-directory/shared'
import { createListing } from '@wa-directory/shared'
import { uploadLogoImage } from '@wa-directory/shared'
import { fetchWhatsAppMedia, perceiveMedia, mediaRateOk, recognizeShelfItems, priceFromCaption, stripPriceFromCaption, parseMoney, type MediaKind, type MediaSense } from '../lib/bot-sense.js'
import { renderSocialReply } from '../lib/social-intent.js'
import { isSupportRequest } from '../lib/support-intent.js'
import { withPhoneLock } from '../lib/phone-lock.js'
import { semanticPhotoHint, type SemanticHint } from '../lib/semantic-search.js'
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
import { findBusinessesByName, activateListingForDays, notifyBusinessLive, bestNameSimilarity, startTrialForBusiness, type VerifyCandidate } from '@wa-directory/shared'
import { imageLuminanceFromUrl } from '@wa-directory/shared'
import { curatedRelatedTerms } from '@wa-directory/shared'
import { slugify } from '@wa-directory/shared'
import { zimbabweCities } from '@wa-directory/shared'
import { validatePhone } from '@wa-directory/shared'
import { getApprovedCategories, getApprovedAreas, getApprovedAreaNames, matchCategoryAgainst, matchCategoryLearned, findCityLearned, findAreaLearned } from '@wa-directory/shared'
import { autoRequestUnapprovedFeatures, adminRequestNotice } from '@wa-directory/shared'
import {
  sendAdminNotice,
  pendingVerificationButtons,
  reviewRequestButtons,
  submissionNoticeBody,
} from '@wa-directory/shared'
import {
  listPendingFeatureRequests,
  countPendingFeatureRequests,
  renderFeatureRequestList,
  approveFeatureRequestById,
  rejectFeatureRequestById,
  connectFeatureRequestToCategory,
} from '@wa-directory/shared'
import { searchPayBusinesses, type PayBusiness } from '@wa-directory/shared'
import { createListingPayment, paymentAmountFor } from '@wa-directory/shared'
import { normalizeEcoCashPhone, initiateEcoCashPayment, logPaymentEvent, type PaymentAdapters } from '@wa-directory/shared'
import { PLAN_CONFIG, PERSONAL_PLAN_CONFIG } from '@wa-directory/shared'
import type { PlanType } from '@wa-directory/shared'
import { SITE_URL } from '@wa-directory/shared'
import { digitsOnly } from '@wa-directory/shared'
import { searchVariants, matchesSearchTerm } from '@wa-directory/shared'
import { connectedCategoryNames, listingHasCategory, clearCategoryLinkCache, linkCategories, listCategoryConnections, unlinkCategory } from '../lib/category-links.js'
import {
  agentNumbers,
  isAgent,
  addAgent,
  removeAgent,
  findBusinessesByPhone,
  duplicateBusinessLines,
  normalizeOwnerPhone,
  type ListedBusiness,
} from '../lib/agents.js'
import {
  ADMIN_MENU_BUTTON,
  ADMIN_MENU_ROWS,
  adminMenuBody,
  adminMenuCommand,
} from '../lib/admin-menu.js'
import {
  createAdminCategoryTree,
  pickApprovedCategory,
} from '../lib/admin-category-tree.js'
import {
  buildRegistrationListing,
  parseRegistrationReviewEdit,
  registrationField,
  type RegistrationReviewEdit,
} from '../lib/registration-review.js'
import {
  createRegistrationIntake,
  registrationOwnerContext,
} from './registration-intake.js'
import {
  listUnverifiedBusinesses,
  listRecentBusinesses,
  listDirectoryRows,
  contactChunkMessages,
  listChatCsvRows,
  listBizCsvRows,
  csvForBusinesses,
  csvForPeople,
  csvForChats,
  type DirectoryRow,
} from '../lib/directory-reports.js'
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
// #1 bidding engine (fair-bidding rules; the webapp's portal API mirrors them).
import {
  handleBidCommand,
  handleBidBusinessSelection,
  handleBidCategorySelection,
  handleBidCitySelection,
  handleBidNationwideSelection,
  handleBidAmount,
  handleBidConfirm,
  handleMyBidsCommand,
  handleOutbidCommand,
  parseBidAmountId,
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

/**
 * WhatsApp webhook router: verify Meta, read each inbound message, then route.
 * Feature logic is split into focused modules:
 *  - src/registration-intake.ts: card/sign reading, missing fields, review card
 *  - lib/registration-review.ts: listing build + "City: X" corrections
 *  - lib/agents.ts: field-agent allowlist + duplicate lookups
 *  - lib/admin-menu.ts: admin list + tap-to-command mapping
 *  - lib/admin-category-tree.ts: interactive category tree
 *  - lib/directory-reports.ts: listings, directory and CSV exports
 *  - lib/category-links.ts: connected categories and search expansion
 */
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

  // We only list businesses now and payments are paused, so the shared help
  // copy's personal-contact and EcoCash lines are hidden from the bot.
  const rendered = helpLines
    .filter(
      line =>
        !/personal contacts?/i.test(line) &&
        !/\*Pay your subscription/i.test(line) &&
        !/\*View payments/i.test(line) &&
        !/MANAGE YOUR SUBSCRIPTION/i.test(line) &&
        !/`pay`\s*-/i.test(line)
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
  if (from && (await isBotAdmin(from))) {
    return `${rendered}\n\n🛠️ *Admin:* send *admin* for the button menu.`
  }
  if (from) {
    return `${rendered}\n\n💬 *Need a person?* Send *I need help* and an admin will join this chat.`
  }
  return rendered
}

// Cancelling used to answer with the full help guide — for a number that owns
// listings that is the long supplier pitch, which reads as if the bot ignored
// the "cancel". A cancel now gets a one-line acknowledgement.
const CANCEL_TEXT =
  '✖ Cancelled. Send *menu* to see what I can do, or just tell me what you need.'

// Extra admin numbers live in bot_settings.admin_allowlist (JSON array).
// The env ADMIN_WHATSAPP number is always the undeletable owner.
export async function adminNumbers(): Promise<string[]> {
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

// ── Transcript logging ────────────────────────────────────────────────────
// One hook on the shared WhatsApp module mirrors EVERY outbound message into
// bot_messages: this bot's own replies AND the ones the shared flows send
// directly (registration questions, verification notices). Before this, the
// admin transcript showed the customer's answers during registration with no
// bot questions in between.
function logOut(to: string, kind: string, body: string) {
  logBotMessage(to, 'out', kind, body).catch(() => {})
}

setOutboundLogger((to: string, kind: string, body: string) => {
  logBotMessage(to, 'out', kind, body).catch(() => {})
})

async function sendWhatsAppMessage(to: string, message: string, replyTo?: string) {
  return sendWhatsAppText(to, message, replyTo)
}

// Payment adapters so the shared listing-pay engine can fire the real EcoCash
// push and log events from inside the bot. sendWhatsAppMessage here is the
// transcript-logging local wrapper, NOT the shared one.
function buildPaymentAdapters(): PaymentAdapters {
  return {
    initiateEcoCashPayment,
    logPaymentEvent,
    sendWhatsAppMessage: async (phone, text) => {
      await sendWhatsAppMessage(phone, text)
    },
  }
}

async function sendInteractiveList(
  to: string,
  body: string,
  rows: InteractiveRow[],
  buttonLabel = 'Choose a business',
  replyTo?: string
) {
  return sendInteractiveListRaw(to, body, rows, buttonLabel, replyTo)
}

async function sendInteractiveButtons(
  to: string,
  body: string,
  buttons: InteractiveButton[],
  replyTo?: string
) {
  return sendInteractiveButtonsRaw(to, body, buttons, replyTo)
}

async function sendCtaUrl(to: string, body: string, displayText: string, url: string) {
  return sendCtaUrlRaw(to, body, displayText, url)
}

async function sendLocationRequest(to: string, body: string) {
  return sendLocationRequestRaw(to, body)
}

async function sendReaction(to: string, messageId: string, emoji: string) {
  return sendReactionRaw(to, messageId, emoji)
}

async function sendWhatsAppDocument(to: string, filename: string, mime: string, content: string) {
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
  categories: string | string[]
): boolean {
  const names = Array.isArray(categories) ? categories : [categories]
  // Connected categories answer to every name they are filed under, so
  // "tree cutting" and "landscaping" find the same shops.
  const catHit = listingHasCategory(b.category, names)
  // British/American variants: "fertilizer" must still find "Fertiliser".
  const nameHit = lowerTerm.length >= 3 && matchesSearchTerm(b.name, lowerTerm)
  return catHit || nameHit
}

interface BotResult {
  biz: BotBusinessRow
  // id + image_url ride along so the 📸 single-photo quick action can
  // open that exact item without a second query.
  item: { name: string; price: number | null; id?: string; image_url?: string | null } | null
  km?: number
}

interface ItemRow {
  business_id: string
  name: string
  price: number | null
  id: string
  image_url: string | null
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
  const variants = searchVariants(term)

  // Name match (existing behaviour): word-tokens ANDed so the item tier keeps
  // up with the tokenized order matcher; single tokens degrade to substring.
  let nameReq = getSupabase()
    .from('business_items')
    .select('business_id, name, price, id, image_url')
    .in('business_id', bizIds)
    .eq('is_active', true)
  if (tokens.length >= 2) tokens.forEach(t => { nameReq = nameReq.ilike('name', `%${t}%`) })
  else if (variants.length > 0) {
    nameReq = nameReq.or([term, ...variants].map(v => `name.ilike.%${v}%`).join(','))
  } else {
    nameReq = nameReq.ilike('name', `%${term}%`)
  }

  // Description match: sellers describe items in the caption ("black, 4
  // plate"), so those words must find the product even when its name is
  // generic. Projects without the description column simply return an error
  // and we keep the name-only result.
  let descReq = getSupabase()
    .from('business_items')
    .select('business_id, name, price, id, image_url')
    .in('business_id', bizIds)
    .eq('is_active', true)
  if (tokens.length >= 2) tokens.forEach(t => { descReq = descReq.ilike('description', `%${t}%`) })
  else if (variants.length > 0) {
    descReq = descReq.or([term, ...variants].map(v => `description.ilike.%${v}%`).join(','))
  } else {
    descReq = descReq.ilike('description', `%${term}%`)
  }

  const [nameRes, descRes] = await Promise.all([
    nameReq.order('price', { ascending: true }).limit(200),
    descReq.limit(200),
  ])
  if (descRes.error) {
    console.warn(`[items] description search unavailable: ${descRes.error.message}`)
  }
  const rows = [
    ...((nameRes.data as ItemRow[] | null) || []),
    ...(descRes.error ? [] : ((descRes.data as ItemRow[] | null) || [])),
  ]
  const seen = new Set<string>()
  for (const it of rows) {
    if (!it?.id || seen.has(String(it.id))) continue
    seen.add(String(it.id))
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
    const names = await connectedCategoryNames(t, cat)
    const hit = scope
      .filter(b => !seen.has(b.id) && bizMatchesQuery(b, t, names))
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

/** User-typed city/area names: strip WhatsApp markers, collapse spaces, cap
 * length, and title-case (leaving all-caps input like "CBD" alone). */
function sanitizeLocationInput(raw: string): string {
  const t = raw.replace(/[`*_~]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
  if (!t) return ''
  if (t === t.toUpperCase() && t.length > 3) return t
  return t.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

/** Drop the open step but keep the cart — changing what you are shopping for
 * must never empty what you already picked. */
async function resetForNewSearch(from: string, session: ChatSession | null) {
  const cart = session?.data.cart
  if (cart && cart.length) {
    await saveSession(from, 'idle', { cart })
    return
  }
  await clearSession(from)
}

async function startFreshSearchPrompt(from: string) {
  await resetForNewSearch(from, await getSession(from))
  await sendWhatsAppMessage(
    from,
    'Tell me what you need + your town, e.g. *"bread chinhoyi"* or *"plumber harare"*.'
  )
}

// Main menu: search is NOT a menu row — typing is searching, so the menu
// only carries account features. Titles cap at 24 chars, descriptions at 72
// (WhatsApp limits); each row explains what it does.
const MENU_ROWS = [
  { id: 'menu_needs', title: '🛒 Post a need', description: 'Write what you need — suppliers find you' },
  { id: 'menu_order', title: '🧺 Order items', description: 'Type your shopping list — sent shop by shop' },
  { id: 'menu_register', title: '✎ Register business', description: 'List your business — quick questions, no plan choice' },
  { id: 'menu_bid', title: '🏆 Bid for #1', description: 'Own the top search spot for your category' },
  { id: 'menu_help', title: '✆ Help', description: 'Search tips, account help & support' },
]

// First hello: one question, two buttons. Buyers get the short buying guide;
// sellers go straight into the business questions.
function renderBuyerIntro(name?: string): string {
  return [
    `🛒 *Welcome${name ? ` ${name}` : ''} - buying on WA Directory*`,
    '',
    'Type what you need and your town, e.g. *bread harare* or *plumber masvingo*.',
    '• Tap a shop to see items, photos and prices',
    '• 🧺 *Order items* - send your shopping list, shop by shop',
    '• 🛒 *Post a need* - suppliers send you quotes',
    '',
    'What are you looking for?',
  ].join('\n')
}

async function sendMainMenu(from: string) {
  await clearSession(from)
  const ch = await channelLine()
  const menuBody = renderMainMenuBody().replace(
    'Registering a business or personal contact? Tap ✎ Register below.',
    'Register your business: tap ✎ Register below.'
  )
  await sendInteractiveList(from, [menuBody, ch].filter(Boolean).join('\n\n'), MENU_ROWS, 'Main menu')
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
  // A typed order is shopping continuing, not a change of plans — the verify
  // card and *back* already keep the earlier search alive, so "plans have
  // changed" there only contradicts the message that follows it.
  const ack =
    hadDraft && kind !== 'order'
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
        await sendInteractiveButtons(from, 'Continue that draft, or start again?', [
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
        `${head} Which area of *${data.city || 'your town'}* is your business in? (We'll use this for your location and the area you serve — your street address is asked separately. Type *skip* if unsure.)`
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
        await sendInteractiveButtons(from, 'Send this order, or type it again?', [
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

// Zimbabwe phone entry from an admin: 0771234567 and +263771234567 both
// normalize to 263771234567, which is the number the listing - and therefore
// the portal account - will belong to.
// Kept as a local alias: every registration call site already uses this name.
const normalizeRegistrationOwner = normalizeOwnerPhone

// The image intake + review card live in src/registration-intake.ts.
const registrationIntake = createRegistrationIntake({
  sendText: (to, body) => sendWhatsAppMessage(to, body),
  sendButtons: (to, body, buttons) => sendInteractiveButtons(to, body, buttons),
})
const handleRegistrationImageResilient = registrationIntake.handleImage
const sendRegistrationReview = registrationIntake.sendRegistrationReview

// Admins can list a business they do not own. The same registration flow runs
// on their chat, but the listing phone (and so the portal account) is the
// owner's number and the success message comes to the admin to forward.
async function showAdminRegistrationChoice(from: string) {
  await sendInteractiveButtons(
    from,
    [
      '🏪 *Register a business*',
      '',
      'Is this your own business, or are you adding one for someone else?',
      '',
      'Adding another business keeps their number as the owner - the portal, website and every cart/order reply go to them, and the success message comes to you to forward.',
    ].join('\n'),
    [
      { id: 'reg_for_self', title: '🏪 My business' },
      { id: 'reg_for_other', title: '🏬 Another business' },
    ]
  )
}

// ✎ Register goes straight to the image-first step: send a business card or
// enter the details manually. The plan/trial choice and the personal-contact
// option are deliberately skipped.
async function startImageFirstRegister(
  from: string,
  opts: { onBehalfOf?: string; asSelf?: boolean } = {}
) {
  const existing = await getConversationState(from)
  const prior = existing?.state?.startsWith('REGISTRATION_') ? existing.context : undefined
  const owner = opts.asSelf
    ? ''
    : normalizeRegistrationOwner(opts.onBehalfOf || '') ||
      (typeof prior?.onBehalfOf === 'string' ? normalizeRegistrationOwner(prior.onBehalfOf) : '')
  const asSelf = opts.asSelf === true || (!owner && prior?.regForSelf === true)
  const fromAgent = await isAgent(from)

  // An admin starting a registration chooses whose business it is first.
  if (!owner && !asSelf && (await isBotAdmin(from))) {
    await showAdminRegistrationChoice(from)
    return
  }
  // Agents only ever register someone else's business, so they go straight to
  // the owner-number step instead of the self/other choice.
  if (!owner && !asSelf && fromAgent) {
    await promptOwnerNumber(from, true)
    return
  }

  await clearSession(from)
  await clearConversationState(from)
  const saved = await setConversationState(from, 'REGISTRATION_AWAITING_IMAGE', {
    step: 'choose_material',
    approvedPlan: 'trial',
    trialRequested: true,
    ...(owner
      ? {
          onBehalfOf: owner,
          fields: { phone: { value: owner, confidence: 1, status: 'suggested' } },
        }
      : {}),
    ...(asSelf ? { regForSelf: true } : {}),
  })
  if (!saved) {
    await sendWhatsAppMessage(
      from,
      '⚠️ Something went wrong starting registration. Please send *register* again.'
    )
    return
  }
  await sendInteractiveButtons(
    from,
    owner
      ? `🏬 *Adding a business for +${owner}*\n\n` +
          'Send its business card, flyer, banner or advert and our AI will read the details, or enter them manually.\n\n' +
          `The listing and portal will belong to +${owner} - not to you. ` +
          (fromAgent
            ? 'The hand-over card goes to our admins to forward; you get a short confirmation only.'
            : 'You will get the success card, portal link and website to forward to them.')
      : "🏪 *Let's get your business listed!*\n\n" +
          'Have a business card, flyer, banner or advert? Send us a picture and our AI ' +
          'will extract the business information it can identify, saving you time.\n\n' +
          'You can also skip this step and enter your details manually.',
    [
      { id: 'reg_upload', title: '📷 Send a picture' },
      { id: 'reg_skip', title: 'Skip and enter manually' },
    ]
  )
}

async function sendRegisterChoice(from: string) {
  await startImageFirstRegister(from)
}
async function applyRegistrationReviewEdit(from: string, context: any, edit: RegistrationReviewEdit) {
  const fields = { ...(context.fields || {}) }
  fields[edit.key] = { value: edit.value, confidence: 1, status: 'suggested' }
  if (edit.key === 'category') fields.requested_category = fields[edit.key]
  const listing = buildRegistrationListing(fields, context.onBehalfOf)
  await updateConversationContext(from, { fields, listing })
  return { fields, listing }
}

async function publishRegistrationReview(from: string, state: any) {
  const context = state?.context || {}
  if (context.step !== 'review_extracted') return
  const fields = context.fields || {}
  const listing = buildRegistrationListing(fields, context.onBehalfOf)
  const finalContext = { ...context, step: 'final_review', fields, listing }
  const saved = await setConversationState(from, 'REGISTRATION_FINAL_REVIEW', finalContext)
  if (!saved) {
    await sendWhatsAppMessage(from, '⚠️ Something went wrong saving your listing. Send *register* to start again.')
    return
  }
  await runRegistrationAction(from, 'publish', finalContext)
}

// After an on-behalf registration is published, build one polite card the
// business can receive. Admins forward it themselves; for an agent it goes to
// the admins with the agent named, and the agent only gets a confirmation.
async function sendAdminRegistrationSummary(from: string, ownerPhone: string) {
  const state = await getConversationState(from)
  const context = state?.context || {}
  if (state?.state !== 'AWAITING_ADMIN_REVIEW' || !context.businessId) return

  const { data: biz } = await getSupabase()
    .from('businesses')
    .select('name, slug, business_id, username, website, edit_token')
    .eq('id', context.businessId)
    .maybeSingle()
  if (!biz) return

  const profile = biz.slug ? `${SITE_URL}/business/${biz.slug}` : ''
  const setup = biz.edit_token
    ? `${SITE_URL}/account-setup?token=${biz.edit_token}`
    : ''
  const card = [
    `🏪 *${biz.name}* is now on WA Directory`,
    '',
    `Hello! A WA Directory field agent registered *${biz.name}* for you today.` +
      ' Submitting a listing is free and nothing has been charged.',
    '',
    `Business ID: ${biz.business_id}`,
    ...(biz.username ? [`Username: @${biz.username}`] : []),
    ...(profile ? [`Your listing: ${profile}`] : []),
    ...(biz.website ? [`Your website: ${biz.website}`] : []),
    `Portal: ${SITE_URL}/login`,
    ...(setup ? [`First time? Set your password here: ${setup}`] : []),
    '',
    `Your number +${ownerPhone} owns this listing - customer replies, orders and edits all come to you.`,
    '',
    'Keep this message for your login details. Reply *help* here any time.',
  ].join('\n')

  if (await isAgent(from)) {
    await notifyAdminsText(
      [
        '📤 *Agent registration - forward to the business*',
        `Agent: +${normalizeRegistrationOwner(from)}`,
        `Owner: +${ownerPhone}`,
        '',
        'Forward the card below to the owner. Nothing was charged.',
        '',
        card,
      ].join('\n')
    )
    await sendWhatsAppMessage(
      from,
      [
        `✅ *${biz.name}* is listed under +${ownerPhone}.`,
        '',
        'The hand-over card has gone to the admins to forward. You do not need to send anything to the owner.',
      ].join('\n')
    )
    return
  }

  await sendWhatsAppMessage(
    from,
    ['📤 *Forward this card to the business*', '', card].join('\n')
  )
}

/** Show the admins every listing on one owner's number. */
async function notifyDuplicateRows(rows: ListedBusiness[]): Promise<void> {
  if (rows.length < 2) return
  const listingPhone = normalizeRegistrationOwner(rows[0]?.phone || '')
  await notifyAdminsText(
    [
      '🏪 *Owner added a second listing*',
      `+${listingPhone} now has ${rows.length} listings:`,
      '',
      ...rows.map(
        (row, index) =>
          `${index + 1}. *${row.name}* · ${row.business_id}` +
          (row.created_at ? ` · ${String(row.created_at).slice(0, 10)}` : '')
      ),
      '',
      'This is allowed only because the owner registered it themselves. Check both if it looks like the same business.'
    ].join('\n')
  )
}

/** After an owner publishes a second listing on the same number, show the
 * admins both records - the repeat is allowed, but it should be visible. */
async function notifyOwnerDuplicateListing(
  from: string,
  listingPhone: string,
  existing: ListedBusiness[]
): Promise<void> {
  const state = await getConversationState(from)
  const newId = state?.context?.businessId
  if (state?.state !== 'AWAITING_ADMIN_REVIEW' || !newId) return
  const { data: created } = await getSupabase()
    .from('businesses')
    .select('id, name, business_id, phone, category, created_at')
    .eq('id', newId)
    .maybeSingle()
  if (!created) return
  await notifyDuplicateRows([...existing, created as ListedBusiness])
}

/** Registration turn wrapper: keeps the on-behalf owner attached, blocks a
 * second listing on a number the sender does not own, sends the admin
 * hand-over card once publishing succeeded, and reports an owner's repeat
 * listing to the admins. */
async function runRegistrationAction(from: string, action: string, context: any) {
  const owner =
    typeof context?.onBehalfOf === 'string' ? normalizeRegistrationOwner(context.onBehalfOf) : ''
  const publishing = /^(?:publish|reg_publish)$/i.test(action.trim())
  const listingPhone = normalizeRegistrationOwner(
    registrationField(context?.fields, 'phone') || owner
  )
  const existing = publishing && listingPhone ? await findBusinessesByPhone(listingPhone) : []

  // Only the owner may hold two listings on one number. An agent (or an admin)
  // adding for someone is refused, and so is a person keying in a number that
  // is not their own.
  if (publishing && existing.length) {
    const senderOwnsNumber = normalizeRegistrationOwner(from) === listingPhone
    if (owner || !senderOwnsNumber) {
      await sendInteractiveButtons(
        from,
        [
          '⚠️ *That number is already listed*',
          '',
          ...duplicateBusinessLines(existing),
          '',
          owner
            ? 'Only the owner can add a second listing on the same number. Ask them to register it themselves, or retake the photo if the number was read wrong.'
            : 'You can only add another listing on a number you own. Retake the photo if the number was read wrong.',
          '',
          'Nothing was published.',
        ].join('\n'),
        [
          { id: 'reg_duplicate_photo', title: '📷 Another photo' },
          { id: 'reg_cancel', title: '✖ Cancel' },
        ]
      )
      return
    }
  }

  await handleRegistrationMessage(from, action, context)
  if (owner && publishing) {
    await sendAdminRegistrationSummary(from, owner)
  } else if (!owner && publishing && existing.length && listingPhone) {
    await notifyOwnerDuplicateListing(from, listingPhone, existing)
  }
}

async function handleRegistrationReviewText(from: string, text: string, state: any): Promise<boolean> {
  const context = state?.context || {}
  const step = context.step
  if (step !== 'review_extracted' && step !== 'final_review') return false
  const lower = text.trim().toLowerCase()
  if (lower === 'edit' || lower === 'reg_edit') {
    await sendRegistrationReview(from, context, {
      hint: '✏️ Type the detail you want to change, e.g. `City: Bulawayo`.',
    })
    return true
  }
  // The shared flow owns password validation; let it keep that path.
  if (step === 'final_review' && /^(?:edit\s+)?password\s*:/i.test(text)) return false
  const edit = parseRegistrationReviewEdit(text)
  if (!edit) return false
  const { fields, listing } = await applyRegistrationReviewEdit(from, context, edit)
  await sendRegistrationReview(
    from,
    { ...context, fields, listing },
    { updated: `✅ Updated *${edit.label}* to: ${edit.value}` }
  )
  return true
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

  // Same duplicate rule as the photo flow: only the owner may hold two
  // listings on one number, and the admins should see both when they do.
  const listingPhone = normalizeRegistrationOwner(state.phone || from)
  const before = listingPhone ? await findBusinessesByPhone(listingPhone) : []
  if (before.length && listingPhone !== normalizeRegistrationOwner(from)) {
    await sendWhatsAppMessage(
      from,
      [
        '⚠️ *That number is already listed*',
        '',
        ...duplicateBusinessLines(before),
        '',
        'You can only add another listing on a number you own. Ask the owner to register it themselves.',
        '',
        'Nothing was published.',
      ].join('\n')
    )
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
  if (before.length && listingPhone) {
    const after = await findBusinessesByPhone(listingPhone)
    // A failed publish leaves the count unchanged, so only report a real add.
    if (after.length > before.length) await notifyDuplicateRows(after)
  }
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
  spec: { name: string; price: number | null; description?: string },
  imageUrl: string
): Promise<boolean> {
  const image_luminance = imageUrl ? await imageLuminanceFromUrl(imageUrl) : null
  const base = {
    business_id: bizId,
    name: spec.name,
    slug: slugify(spec.name) || `item-${Date.now()}`,
    price: spec.price,
    image_url: imageUrl,
    image_luminance: image_luminance,
    is_active: true,
  }
  const description = (spec.description || '').trim()
  if (!description) {
    const { error } = await getSupabase().from('business_items').insert(base)
    return !error
  }
  // Description exists on newer schemas; older projects reject the column.
  // Try with it, then fall back to the base row so a photo is never lost.
  const { error } = await getSupabase()
    .from('business_items')
    .insert({ ...base, description })
  if (!error) return true
  // Only a missing description column justifies the retry; any other error is
  // a real save failure and must not be retried blindly.
  if (!/description/i.test(error.message || '')) return false
  const { error: retry } = await getSupabase().from('business_items').insert(base)
  if (!retry) console.warn(`[shelf] description column unavailable; saved ${spec.name} without it`)
  return !retry
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

// ── Seller shelf batch: up to 5 photos, recognised, then priced one by one ──
// A seller stocking a live shop can send images faster than the old
// one-photo-per-item flow allowed. Photos are recognised as they arrive; once
// the seller is done (or 5 are in), the bot asks "how much is the bed?" for
// every item that did not already carry a $ price. Numeric answers are prices
// even without a $ ("50", "10 usd", "$50", "50$"); any other answer is kept
// as the item's description.

const SHELF_BATCH_MAX = 5
// Keep the upload window open this long after the last photo so photos sent
// back-to-back land in one batch before the vision model runs.
const SHELF_SETTLE_MS = 5_000

function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

function normaliseMoney(raw: string): number | null {
  return parseMoney(raw.replace(/\s/g, ''))
}

/** Prices are always shown as a US dollar amount in WhatsApp inline-code so a
 * buyer can never mistake a description number for the price. */
function moneyLabel(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `US$${Number.isInteger(rounded) ? rounded : rounded.toFixed(2)}`
}

function priceCode(value: number): string {
  return `\`${moneyLabel(value)}\``
}

// Words that only frame a price ("the price is 50", "selling for 50") and
// should not leak into a description.
const PRICE_FILLER =
  /\b(?:the\s+)?(?:price|cost|charge|selling|sell|sale|is|for|at|only|just|about|around|its|it'?s|each|per|usd|us\$|dollars?|bucks?|please)\b/gi

function cleanDescription(raw: string): string {
  const text = raw
    .replace(/\$\s*\d[\d.,]*|\d[\d.,]*\s*\$/g, ' ')
    .replace(/\b(?:usd|us\$)\s*([\d.,]+)/gi, ' ')
    .replace(/\b([\d.,]+)\s*(?:usd|dollars?|bucks?)\b/gi, ' ')
    .replace(PRICE_FILLER, ' ')
    .replace(/[\s,;:.-]{2,}/g, ' ')
    .replace(/^[\s,;:.-]+|[\s,;:.-]+$/g, '')
    .trim()
    .slice(0, 300)
  // "the price is 50" leaves only a filler word - it is not a description.
  return /^(?:the|a|an|it|its|it'?s|price)$/i.test(text) ? '' : text
}

/** Parse a seller's answer to "what is the price of the stove?".
 * Only a marked amount ($50, 50$, 50 usd, price 50) or a reply that is just
 * the number ("50") is a price. A number inside descriptive text ("black 50",
 * "500 ml") is ambiguous - it may be a size or model - so it is kept as the
 * description and the bot asks for the price again. Pure text is a
 * description and leaves the price unset. */
function parsePriceReply(text: string):
  | { kind: 'price'; value: number; description?: string }
  | { kind: 'skip' }
  | { kind: 'description'; text: string }
  | { kind: 'ambiguous'; text: string } {
  const t = text.trim()
  if (!t) return { kind: 'description', text: '' }
  if (/^(?:skip|no|none|no price|n\/?a|free|not selling|can'?t say)$/i.test(t)) return { kind: 'skip' }

  const money = String.raw`\d[\d.,]*`
  const marked = t.match(
    new RegExp(
      String.raw`\$\s*(${money})|(${money})\s*\$|\b(?:usd|us\$)\s*(${money})|(${money})\s*(?:usd|dollars?|bucks?|each)\b|\bprice(?:\s*is|\s*:)?\s*\$?\s*(${money})`,
      'i'
    )
  )
  const markedValue = marked ? normaliseMoney(marked.slice(1).find(Boolean) || '') : null
  if (marked) {
    if (markedValue == null) return { kind: 'description', text: t }
    const description = cleanDescription(t.replace(marked[0], ' '))
    return { kind: 'price', value: markedValue, description: description || undefined }
  }

  // A bare amount answers the question directly. Anything else that contains a
  // number is not safe to read as a price - "black 50" could be a 500ml size.
  if (/^\d[\d.,]*$/.test(t)) {
    const value = normaliseMoney(t)
    if (value != null) return { kind: 'price', value }
  }
  if (/\d/.test(t)) return { kind: 'ambiguous', text: t }
  return { kind: 'description', text: t }
}

function batchSummaryLines(items: ShelfBatchItem[]): string[] {
  const lines: string[] = []
  for (const item of items) {
    const price = item.price != null ? priceCode(item.price) : '_price not listed_'
    lines.push(`• *${item.name}* — ${price}`)
    if (item.description) lines.push(`> ${item.description}`)
  }
  return lines
}

/** Ask which live shop a batch belongs to when the seller owns several. */
async function askBatchShop(from: string, batch: ItemBatch, msgId?: string) {
  const bizList = await findActiveListingsForPhone(from)
  const rows = bizList.slice(0, 3).map(b => ({ id: `itembatchbiz_${b.id}`, title: b.name }))
  if (!rows.length) {
    await clearSession(from)
    await sendWhatsAppMessage(from, 'I could not find a live shop for this number. Send *register* to list your business first.', msgId)
    return
  }
  await saveSession(from, 'item_batch', { itemBatch: batch })
  await sendInteractiveButtons(from, '🧺 Which shop are these items for?', rows, msgId)
}

/** How many shelf photos for this number are still being read. Meta sends a
 * fast run as separate concurrent webhooks; the count lets the last one close
 * the batch only after the slower ones have merged their items. A stale count
 * (crashed invocation) expires so it cannot block the next batch forever. */
async function shelfPhotoFlight(from: string, delta: 1 | -1 | 0): Promise<number> {
  const key = `shelf:flight:${digitsOnly(from)}`
  return withPhoneLock('shelf-count', from, async () => {
    let count = 0
    try {
      const parsed = JSON.parse((await getBotSetting(key)) || '{}')
      if (Date.now() - Number(parsed.at || 0) < 90_000) count = Number(parsed.count) || 0
    } catch {
      count = 0
    }
    count = Math.max(0, count + delta)
    if (delta !== 0) await setBotSetting(key, JSON.stringify({ count, at: Date.now() }))
    return count
  })
}

/** Add one photo to the shelf batch. Recognition starts on arrival, but the
 * bot stays quiet for 5 seconds after the last photo so a fast 2-5 photo run
 * is analysed as one batch instead of interrupting after each image. */
async function handleShelfBatchImage(
  from: string,
  session: ChatSession | null,
  mediaId: string,
  caption: string,
  mediaMsgId: string,
  bizList: ShelfBiz[]
) {
  const initial = session?.data.itemBatch
  if (initial?.phase === 'pricing' || initial?.asking != null) {
    await sendWhatsAppMessage(
      from,
      `Finish the prices first - what is the price of the *${initial.items[initial.asking ?? 0]?.name || 'item'}*? Reply a price, or *skip*.`,
      mediaMsgId
    )
    return
  }
  if (!initial && bizList.length === 0) {
    await sendWhatsAppMessage(from, 'I could not find a live shop for this number. Send *register* to list your business first.', mediaMsgId)
    return
  }
  if ((initial?.imageCount || 0) >= SHELF_BATCH_MAX) {
    await finalizeShelfBatch(
      from,
      session || { phone: from, step: 'item_batch', data: { itemBatch: initial! } },
      mediaMsgId
    )
    return
  }

  // Count this photo before the slow part (media download + vision), so the
  // last request to finish knows no other photo from this burst is in flight.
  await shelfPhotoFlight(from, 1)
  let counted = true

  // Give up this photo's slot in the burst. When it was the last one in
  // flight, optionally close the batch after the quiet window.
  const closeBurst = async (finalizeIfLast: boolean): Promise<void> => {
    if (!counted) return
    counted = false
    const left = await shelfPhotoFlight(from, -1)
    if (left > 0 || !finalizeIfLast) return
    const snap = await getSession(from).catch(() => null)
    const current = snap?.data.itemBatch
    if (!current || current.phase !== 'collecting' || !current.businessId) return
    const token = current.batchToken
    await sleep(SHELF_SETTLE_MS)
    // A photo arriving during the quiet window takes over the batch.
    if ((await shelfPhotoFlight(from, 0)) > 0) return
    const after = await getSession(from).catch(() => null)
    const now = after?.data.itemBatch
    if (!now || now.phase !== 'collecting' || now.batchToken !== token) return
    await finalizeShelfBatch(from, after!, mediaMsgId)
  }

  try {
    // Typing indicator stays on while the photo is saved, analysed and while
    // the 5-second "more photos?" window is open.
    void markRead(mediaMsgId, true).catch(() => {})
    const media = await fetchWhatsAppMedia(mediaId)
    const imageUrl = media ? (await uploadLogoImage(new Uint8Array(media.buffer))) || '' : ''
    if (!imageUrl) {
      await sendWhatsAppMessage(from, "I couldn't save that photo. Send a JPG or PNG under 2MB, or reply *done* to continue.", mediaMsgId)
      await closeBurst(true)
      return
    }

    // Vision runs now, while the seller's next photos are still arriving.
    const recognised = media ? await recognizeShelfItems(media.buffer, media.mime, caption) : null

    // Another photo may have landed during analysis. Merge under a per-number
    // lock: four photos arriving together each used to read the same old batch
    // and overwrite one another, so only the last 1-2 survived.
    const outcome = await withPhoneLock('shelf-batch', from, async () => {
      const latest = await getSession(from).catch(() => null)
      const latestBatch = latest?.data.itemBatch
      if (latestBatch?.phase === 'pricing' || latestBatch?.asking != null) {
        return { kind: 'pricing' as const }
      }
      const base =
        (latestBatch?.imageCount || 0) >= (initial?.imageCount || 0) ? latestBatch : initial
      if ((base?.imageCount || 0) >= SHELF_BATCH_MAX) {
        return {
          kind: 'max' as const,
          session:
            latest || ({ phone: from, step: 'item_batch', data: { itemBatch: base! } } as ChatSession),
        }
      }

      const index = (base?.items.length || 0) + 1
      const captionName = stripPriceFromCaption(caption)
      const fallbackItem: ShelfBatchItem = {
        name: (captionName || `Item ${index}`).slice(0, 60),
        price: priceFromCaption(caption),
        imageUrl,
        nameUnknown: !captionName,
      }
      const found = recognised && recognised.length ? recognised : [fallbackItem]
      const items: ShelfBatchItem[] = [
        ...(base?.items || []),
        ...found.map(f => ({
          name: f.name || 'Unnamed item',
          price: f.price ?? null,
          description: f.description || undefined,
          imageUrl,
          nameUnknown: f.nameUnknown,
        })),
      ]
      const imageCount = (base?.imageCount || 0) + 1

      const business = base?.businessId
        ? { id: base.businessId, name: base.businessName }
        : bizList.length === 1
          ? { id: bizList[0].id, name: bizList[0].name }
          : { id: '', name: '' }

      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const batch: ItemBatch = {
        businessId: business.id,
        businessName: business.name,
        items,
        imageCount,
        phase: 'collecting',
        lastPhotoAt: Date.now(),
        batchToken: token,
      }
      await saveSession(from, 'item_batch', { itemBatch: batch })
      console.log(
        `[shelf-batch] ${from} kept photo ${imageCount}/${SHELF_BATCH_MAX} (${found.length} item${found.length === 1 ? '' : 's'})`
      )
      return { kind: 'saved' as const, batch, token }
    })

    if (outcome.kind === 'pricing') {
      await sendWhatsAppMessage(from, 'I am already pricing the last batch - finish those prices, then send this photo again.', mediaMsgId)
      await closeBurst(false)
      return
    }
    if (outcome.kind === 'max') {
      await closeBurst(false)
      await finalizeShelfBatch(from, outcome.session, mediaMsgId)
      return
    }
    const batch = outcome.batch

    if (!batch.businessId) {
      await askBatchShop(from, batch, mediaMsgId)
      await closeBurst(false)
      return
    }

    if ((batch.imageCount || 0) >= SHELF_BATCH_MAX) {
      await closeBurst(false)
      await finalizeShelfBatch(from, { phone: from, step: 'item_batch', data: { itemBatch: batch } }, mediaMsgId)
      return
    }

    // Only the last photo left in the burst closes the batch, after the quiet
    // window. A slower photo still in vision finishes its merge first.
    await closeBurst(true)
  } finally {
    // Any error path still gives up the slot, or the next batch would wait.
    if (counted) await shelfPhotoFlight(from, -1).catch(() => {})
  }
}

/** Recognised items: list them once, then ask each unpriced item in turn. */
async function finalizeShelfBatch(from: string, session: ChatSession, msgId?: string) {
  const batch = session.data.itemBatch
  if (!batch) {
    await sendWhatsAppMessage(from, 'No photos saved. Send a product photo to start again.', msgId)
    return
  }
  if (!batch.businessId) {
    await askBatchShop(from, batch, msgId)
    return
  }
  if (!batch.items.length) {
    await clearSession(from)
    await sendWhatsAppMessage(from, 'No items saved. Send your product photos again.', msgId)
    return
  }

  const announce = batch.phase !== 'pricing'
  const settled: ItemBatch = {
    ...batch,
    phase: 'pricing',
    asking: undefined,
    lastPhotoAt: undefined,
    batchToken: undefined,
  }

  if (announce) {
    const photos = batch.imageCount || batch.items.length
    console.log(
      `[shelf-batch] ${from} finalised ${photos} photo${photos === 1 ? '' : 's'} -> ${batch.items.length} item${batch.items.length === 1 ? '' : 's'}`
    )
    await sendWhatsAppMessage(
      from,
      [
        `✅ *Got ${photos} photo${photos === 1 ? '' : 's'} - ${batch.items.length} item${batch.items.length === 1 ? '' : 's'} recognised.*`,
        '',
        ...batchSummaryLines(batch.items),
        '',
        'Now let us set the prices.',
      ].join('\n'),
      msgId
    )
  }

  await askNextShelfPrice(from, settled, msgId)
}

/** Ask the next unpriced item, or save everything once prices are settled. */
async function askNextShelfPrice(from: string, batch: ItemBatch, msgId?: string) {
  const idx = batch.items.findIndex(i => i.price == null && !i.priceSkipped)
  if (idx >= 0) {
    const item = batch.items[idx]
    if (item.nameUnknown || !item.name.trim()) {
      const next: ItemBatch = { ...batch, phase: 'pricing', asking: idx, askingName: true }
      await saveSession(from, 'item_batch', { itemBatch: next })
      await sendWhatsAppMessage(
        from,
        [
          `📝 *What is this item called?*`,
          ...(item.description ? [`> ${item.description}`] : []),
          '',
          'The photo did not give me a clear product name. Reply the name, or *skip* to keep "Unnamed item".',
        ].join('\n'),
        msgId
      )
      return
    }
    const next: ItemBatch = { ...batch, phase: 'pricing', asking: idx, askingName: false }
    await saveSession(from, 'item_batch', { itemBatch: next })
    await sendInteractiveButtons(
      from,
      [
        `💰 *What is the price of the ${item.name}?*`,
        ...(item.description ? ['', `> ${item.description}`] : []),
        '',
        'Reply the amount on its own like *50*, or mark it as *$50* or *10 usd*.',
        'A number inside a sentence is kept as description, not taken as the price.',
      ].join('\n'),
      [
        { id: 'itembatch_skip', title: '⏭ Skip price' },
        { id: 'itembatch_cancel', title: '✖ Cancel' },
      ],
      msgId
    )
    return
  }

  let saved = 0
  for (const item of batch.items) {
    const ok = await insertShelfItem(
      batch.businessId,
      { name: item.name, price: item.price, description: item.description },
      item.imageUrl
    )
    if (ok) saved += 1
  }
  await clearSession(from)
  await sendWhatsAppMessage(
    from,
    [
      `✅ *${saved} item${saved === 1 ? '' : 's'} added to ${batch.businessName}.*`,
      '',
      ...batchSummaryLines(batch.items),
      '',
      'Customers can now see and search these in your shop. Send more photos anytime.',
    ].join('\n'),
    msgId
  )
}

function mergeDescription(old: string | undefined, add: string | undefined): string | undefined {
  const extra = (add || '').trim()
  if (!extra) return old
  const base = (old || '').trim()
  if (!base) return extra.slice(0, 300)
  if (base.toLowerCase().includes(extra.toLowerCase())) return base
  return `${base}, ${extra}`.slice(0, 300)
}

/** A typed answer while a batch price is being asked. */
async function handleBatchPriceReply(from: string, session: ChatSession, text: string) {
  const batch = session.data.itemBatch
  if (!batch || batch.asking == null) return false
  const idx = batch.asking
  const item = batch.items[idx]
  if (!item) return false

  const items = batch.items.map((row, i) => (i === idx ? { ...row } : row))
  const target = items[idx]

  if (batch.askingName) {
    const trimmed = text.trim()
    if (/^skip$/i.test(trimmed)) {
      target.name = target.name || 'Unnamed item'
      target.nameUnknown = false
    } else if (/^(?:done|finish(?:ed)?|that'?s all|no more|ready|continue|submit)$/i.test(trimmed)) {
      target.name = target.name && target.name !== 'Unnamed item' ? target.name : `Item ${idx + 1}`
      target.nameUnknown = false
    } else if (trimmed) {
      target.name = trimmed.slice(0, 80)
      target.nameUnknown = false
    } else {
      await sendWhatsAppMessage(from, `Please reply the product name, or *skip*.`)
      const retry: ItemBatch = { ...batch, items, asking: idx, askingName: true }
      await saveSession(from, 'item_batch', { itemBatch: retry })
      return true
    }
    const next: ItemBatch = { ...batch, items, asking: idx, askingName: false }
    await saveSession(from, 'item_batch', { itemBatch: next })
    await askNextShelfPrice(from, next)
    return true
  }

  const parsed = parsePriceReply(text)

  if (parsed.kind === 'price') {
    target.price = parsed.value
    target.priceSkipped = false
    target.description = mergeDescription(target.description, parsed.description)
    await sendWhatsAppMessage(
      from,
      [
        `✅ *${target.name}* — ${priceCode(parsed.value)}`,
        ...(target.description ? [`> ${target.description}`] : []),
      ].join('\n')
    )
  } else if (parsed.kind === 'ambiguous') {
    // Keep the words (and the number) as description, but do not treat the
    // number as a price. Ask the same item again.
    target.description = mergeDescription(target.description, parsed.text)
    await sendWhatsAppMessage(
      from,
      [
        `📝 Saved as a description for *${target.name}*:`,
        `> ${target.description}`,
        '',
        'I still need the price. Reply the amount on its own (e.g. *50*), or tap *Skip*.',
      ].join('\n')
    )
    const retry: ItemBatch = { ...batch, items, asking: idx }
    await saveSession(from, 'item_batch', { itemBatch: retry })
    await askNextShelfPrice(from, retry)
    return true
  } else if (parsed.kind === 'skip') {
    target.priceSkipped = true
    await sendWhatsAppMessage(from, `⏭ *${target.name}* - price skipped.`)
  } else {
    target.description = mergeDescription(target.description, parsed.text)
    target.priceSkipped = true
    await sendWhatsAppMessage(
      from,
      [
        `📝 *${target.name}*`,
        `> ${target.description || parsed.text}`,
        '',
        '_Saved as a description. Price not listed._',
      ].join('\n')
    )
  }

  const next: ItemBatch = { ...batch, items, asking: undefined }
  await saveSession(from, 'item_batch', { itemBatch: next })
  await askNextShelfPrice(from, next)
  return true
}
// A photo sent while the order verify screen is up is part of the order, not a
// search. Store it on the pending order and repeat the send button.
async function attachOrderPhoto(
  from: string,
  session: ChatSession,
  mediaId: string,
  mediaMsgId: string
) {
  const pending = session.data.pendingOrder
  if (!pending?.groups?.length) return
  const photos = [...(pending.photos || [])]
  if (photos.length >= 3) {
    await sendWhatsAppMessage(from, '📸 That is all 3 photos for this order. Tap ✅ Send order when ready.', mediaMsgId)
    return
  }
  if (!mediaRateOk(from)) {
    await sendWhatsAppMessage(
      from,
      'You can send at most 3 photos per hour. Tap ✅ Send order to continue.',
      mediaMsgId
    )
    return
  }
  void markRead(mediaMsgId, true).catch(() => {})
  const media = await fetchWhatsAppMedia(mediaId)
  const url = media ? await uploadLogoImage(new Uint8Array(media.buffer)) : null
  if (!url) {
    await sendWhatsAppMessage(
      from,
      "I couldn't save that photo. Send a JPG or PNG under 2MB, or tap ✅ Send order without it.",
      mediaMsgId
    )
    return
  }
  photos.push(url)
  await saveSession(from, 'order', { ...session.data, pendingOrder: { ...pending, photos } })
  await sendWhatsAppMessage(
    from,
    `📸 Photo attached (${photos.length}/3). Send another, or tap ✅ Send order.`,
    mediaMsgId
  )
  await sendInteractiveButtons(from, 'Ready when you are.', [
    { id: 'osend', title: '✅ Send order' },
    { id: 'oedit', title: '✎ Re-type' },
  ])
}

// The buyer's photo in answer to a shop's "Ask for photo" request.
async function handleOrderPhotoReply(
  from: string,
  session: ChatSession,
  mediaId: string,
  mediaMsgId: string,
  orderId: number,
  caption: string
) {
  const row = await getSupplyOrderById(orderId)
  if (!row || row.status === 'closed' || digitsOnly(row.buyer_phone) !== digitsOnly(from)) {
    await saveSession(from, session.step, { ...session.data, order_photo_request_id: undefined })
    await sendWhatsAppMessage(from, 'That photo request has expired. Send *menu* to keep going.', mediaMsgId)
    return
  }
  if (!mediaRateOk(from)) {
    await sendWhatsAppMessage(from, 'You can send at most 5 photos per hour. Try again a little later.', mediaMsgId)
    return
  }
  void markRead(mediaMsgId, true).catch(() => {})
  const media = await fetchWhatsAppMedia(mediaId)
  const url = media ? await uploadLogoImage(new Uint8Array(media.buffer)) : null
  if (!url) {
    await sendWhatsAppMessage(from, "I couldn't save that photo. Send a JPG or PNG under 2MB.", mediaMsgId)
    return
  }
  const shop = await businessWhatsAppDigits(row.biz_id)
  const sent = shop
    ? await sendWhatsAppImage(
        shop,
        url,
        caption
          ? `📸 ${caption.slice(0, 300)}\nOrder: ${orderReference(row.token)}`
          : `📸 Product photo for order *${orderReference(row.token)}* from the buyer.`
      )
    : false
  if (!sent) {
    await sendWhatsAppMessage(
      from,
      "I couldn't pass that photo to the shop right now. Try sending it again in a moment.",
      mediaMsgId
    )
    return
  }
  await bumpOrderTrace(row.id, { event: 'photo-sent', at: new Date().toISOString() })
  await saveSession(from, session.step, { ...session.data, order_photo_request_id: undefined })
  await sendWhatsAppMessage(from, `✅ Photo sent to *${row.biz_name}*.`, mediaMsgId)
}

// Vector recall for photos: when the vision description lands near shelf items,
// answer from the index instead of asking "Which town?" — the picture already
// said what they want, and products are matched nationwide on the webapp too.
// Returns false when nothing clears the similarity floor so the caller keeps
// the ordinary keyword flow.
async function sendSemanticPhotoResults(
  from: string,
  hint: SemanticHint,
  label: string,
  replyTo?: string
): Promise<boolean> {
  if (hint.businessIds.length === 0) return false
  const { data } = await getSupabase()
    .from('businesses')
    .select(BOT_BIZ_COLUMNS)
    .in('id', hint.businessIds.slice(0, MAX_RESULTS))
    .eq('verified', true)
  const byId = new Map(((data as BotBusinessRow[]) || []).map(b => [String(b.id), b]))
  // Index order is similarity order; a database round-trip is not.
  const results: BotResult[] = hint.businessIds
    .map(id => byId.get(String(id)))
    .filter((b): b is BotBusinessRow => !!b)
    .map(biz => ({ biz, item: hint.items.get(String(biz.id)) || null }))
  if (results.length === 0) return false

  const cards = results.map(toCard)
  const prev = await getSession(from)
  await saveSession(from, 'browse', {
    ...pendingFields(prev),
    results: cards,
    lastScreen: 'list',
    lastTerm: label,
    lastCity: null,
    nearby: false,
    page: 0,
  })
  await sendWhatsAppMessage(
    from,
    `🔍 Closest matches to your photo — *${label}*. Nationwide, matched by what the picture shows:`,
    replyTo
  )
  await sendResultsListPage(from, cards, 0, label, null, false, replyTo)
  emitDemandSearch({ term: label, city: '', resultCount: results.length, buyer: from }).catch(() => {})
  recordBotEvents(results.map(r => r.biz)).catch(() => {})
  return true
}

async function handleBotMedia(
  from: string,
  session: ChatSession | null,
  message: Record<string, unknown>,
  mediaMsgId: string,
  opts: { forceSearch?: boolean } = {}
) {
  const kind: MediaKind = message.type === 'audio' ? 'audio' : 'image'
  const blob = message[kind] as { id?: string; caption?: string } | undefined
  const mediaId = blob?.id || ''
  const caption = typeof blob?.caption === 'string' ? blob.caption : ''

  // An agent who picked 🔍 Search item must search, even when their own number
  // owns a live shop (which would otherwise start a shelf upload).
  const forceSearch = opts.forceSearch === true

  // A supplier asked for a product photo: the next photo from this buyer goes
  // straight back to that shop, not into search.
  const photoRequestId = Number(session?.data.order_photo_request_id)
  if (!forceSearch && kind === 'image' && Number.isFinite(photoRequestId) && photoRequestId > 0) {
    await handleOrderPhotoReply(from, session!, mediaId, mediaMsgId, photoRequestId, caption)
    return
  }

  if (!forceSearch && kind === 'image' && session?.step === 'order' && session.data.pendingOrder?.groups?.length) {
    await attachOrderPhoto(from, session, mediaId, mediaMsgId)
    return
  }

  // Seller shelf batch: keep collecting (or finish) the 5-photo upload.
  if (!forceSearch && kind === 'image' && session?.step === 'item_batch') {
    await handleShelfBatchImage(from, session, mediaId, caption, mediaMsgId, [])
    return
  }

  const convState = forceSearch ? null : await getConversationState(from)
  if (convState && convState.state.startsWith('REGISTRATION_') && kind === 'image') {
    // A leftover plan-choice state must not stop the photo from being read.
    if (convState.state === 'REGISTRATION_STARTED' || convState.context?.step === 'choose_plan') {
      await setConversationState(from, 'REGISTRATION_AWAITING_IMAGE', {
        step: 'choose_material',
        approvedPlan: 'trial',
        trialRequested: true,
        ...registrationOwnerContext(convState.context),
      })
    }
    const media = await fetchWhatsAppMedia(mediaId)
    if (media) {
      console.log(`[bot-media] registration photo routed to extraction (${from})`)
      await handleRegistrationImageResilient(from, new Uint8Array(media.buffer), caption)
    } else {
      console.warn(`[bot-media] registration photo download failed (${from}, ${mediaId})`)
      await sendWhatsAppMessage(
        from,
        "I couldn't download that picture. Send it again as a photo, or reply *skip* to continue without one.",
        mediaMsgId
      )
    }
    return
  }

  // Post-activation shelf: a live business owner sending a photo with no flow
  // in progress is most likely stocking their website shop shelf. Photos are
  // batched (up to 5), recognised, then priced one item at a time.
  if (!forceSearch && kind === 'image' && !session) {
    const bizList = await findActiveListingsForPhone(from)
    if (bizList.length > 0) {
      await handleShelfBatchImage(from, null, mediaId, caption, mediaMsgId, bizList)
      return
    }
  }

  if (!mediaRateOk(from)) {
    await sendWhatsAppMessage(
      from,
      'You can send at most 5 voice or photo tries per hour to keep things quick. Send it as text and I keep working.',
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

  if (!forceSearch && session?.step === 'list_form') {
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

  // Photos get one vector pass over what the model actually saw, so a picture
  // of a handbag finds a listing called "Ladies tote" with no shared keyword.
  // Only when that finds something is the town question skipped.
  if (kind === 'image') {
    const semanticText = [sense.term, sense.category, sense.description].filter(Boolean).join('. ')
    const hint = await semanticPhotoHint(semanticText)
    if (hint && (await sendSemanticPhotoResults(from, hint, sense.term || 'your photo', mediaMsgId))) return
  }

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
  // Payments are paused for now. The payment code stays for when they resume,
  // but no path should ask a new or existing owner for EcoCash today.
  await sendWhatsAppMessage(
    from,
    'Payments are paused for now. New listings are submitted free and go live when an admin approves them. Send *register* to list your business.'
  )
  return
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
// A payer's own listing subscriptions. /contact lists their business listings
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
  // We only take business listings now; legacy personal rows stay in the
  // database but are never surfaced in the bot.
  const scope = onlyPersonal ? [] : rows.filter(r => !r.isPersonal)
  if (!scope.length) {
    return 'No business listings on this number yet.\n\nSend *register* to list your business - it goes live after admin approval.'
  }
  const statusIcon = (r: MyListingRow) =>
    r.status === 'active' ? '🟢' : r.status === 'pending' ? '🟡' : '🔴'
  const lines = [`🏪 *Your business listings* - ${scope.length}`, '']
  scope.forEach((r, i) => {
    const bits = [
      statusIcon(r),
      `*${r.name}*${r.publicId ? ` (${r.publicId})` : ''}`,
      myListingCountdown(r),
      myListingPackageLabel(r),
    ].filter(Boolean)
    lines.push(`${i + 1}. ${bits.join(' · ')}`)
  })
  lines.push('')
  if (scope.some(r => r.status === 'pending')) {
    lines.push('🟡 Pending listings go live after admin approval. No payment is needed.')
  } else {
    lines.push('Send *register* to add another business.')
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
      // User typed something like "register my bakery" - open the
      // photo/manual step and collect the details from there.
      await startImageFirstRegister(from)
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

/** Plain notice to every admin number (deal closed, order stranded, etc). */
export async function notifyAdminsText(body: string) {
  for (const admin of await adminNumbers()) {
    if (!admin) continue
    await sendWhatsAppText(admin, body)
    logOut(admin, 'text', body)
  }
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

  // Everyone else who quoted stops chasing: this need is settled.
  const others = quotes
    .filter(q => q.id !== quote.id && q.supplier_phone)
    .slice(0, 5)
  for (const q of others) {
    await sendWhatsAppMessage(
      q.supplier_phone,
      [
        `✅ *${need.rq_id}* has been settled - the buyer chose another offer.`,
        'Nothing more to do on this one, thanks for quoting.',
        'Send *claim* for the next lead, or *menu* to post your own shelf.',
      ].join('\n')
    )
  }

  // Admins see the closed deal (and who won) so they never chase it either.
  await notifyAdminsText(
    [
      '🤝 *Deal closed*',
      `• ${need.rq_id}${[need.qty, need.item].filter(Boolean).length ? ` · ${[need.qty, need.item].filter(Boolean).join(' ')}` : ''}${need.city ? ` · ${need.city}` : ''}`,
      `• Buyer: +${digitsOnly(need.buyer_phone)}`,
      `• Chosen: ${quote.supplier_name || 'supplier'}${quote.price ? ` · ${quote.price}` : ''} (+${digitsOnly(quote.supplier_phone)})`,
      others.length ? `• Told ${others.length} other quote${others.length === 1 ? '' : 's'} it is settled.` : '',
    ]
      .filter(Boolean)
      .join('\n')
  )
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
    await sendWhatsAppMessage(
      admin,
      `🤝 *+${payer}* (${cur.step})\n${shown}\n\nReply: *reply ${payer} your message*`
    )
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
    `✋ Chat for +${num} is on hold. Their messages now come to you and other admins.\nReply *reply ${num} your message* to answer them, or *release ${num}* to hand them back to the bot.`
  )
}

/** A held customer asked for a person: keep the flow, tell them, and hand the
 * transcript to every admin with the commands needed to answer. */
async function startSupportHandoff(
  from: string,
  text: string,
  session: ChatSession | null,
  waName: string
): Promise<void> {
  const payer = digitsOnly(from)
  const step = session?.step || 'idle'
  console.log(`[support] handoff +${payer} from step '${step}'`)

  await saveSession(from, step, {
    ...(session?.data || {}),
    held: { at: new Date().toISOString(), notified: true },
  })

  const admins = (await adminNumbers()).filter(admin => admin !== payer)
  await sendWhatsAppMessage(
    from,
    [
      '🤝 *Connecting you to our team*',
      '',
      admins.length
        ? 'I have held this chat and sent it to an admin. A person will reply here shortly.'
        : 'This chat is on hold, but no other admin is configured on this bot. Send *release* to hand it back to the bot.',
      admins.length ? 'You can keep typing - your messages go straight to them.' : '',
    ].filter(Boolean).join('\n')
  )

  for (const admin of admins) {
    await sendWhatsAppMessage(
      admin,
      [
        '🙋 *Help requested - human needed*',
        `From: +${payer}${waName ? ` (${waName})` : ''}`,
        `Stage: ${step}`,
        `Message: "${(text || '').slice(0, 500)}"`,
        '',
        'They are on hold. Their next messages also come here.',
        `Answer them: *reply ${payer} your message*`,
        `Return them to the bot: *release ${payer}*`,
      ].join('\n')
    )
  }
}

/** Admin → held customer. The only way to answer without leaving WhatsApp. */
async function replyAsSupport(adminFrom: string, num: string, message: string): Promise<void> {
  if (!num || num.length < 9 || num.length > 15) {
    await sendWhatsAppMessage(adminFrom, 'Send the full number: *reply 263771234567 your message*.')
    return
  }
  const cur = await getSession(num)
  if (!cur?.data?.held) {
    await sendWhatsAppMessage(
      adminFrom,
      `ℹ️ +${num} is not on hold. Use *hold ${num}* first if you want to take over their chat.`
    )
    return
  }
  const body = (message || '').trim().slice(0, 3000)
  if (!body) {
    await sendWhatsAppMessage(adminFrom, 'Add the message to send: *reply 263771234567 Hello, how can I help?*')
    return
  }
  await sendWhatsAppMessage(num, `💬 *WA Directory support*\n\n${body}`)
  console.log(`[support] admin reply +${digitsOnly(adminFrom)} -> +${num}`)
  await sendWhatsAppMessage(adminFrom, `✅ Sent to +${num}.`)
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

// ── Admin rewrites (category/location requests) ──────────────────────────
// A request often arrives with a typo, a duplicate category, or a business
// name that needs correcting before approval. Admins can rewrite those fields
// in one line, e.g.
//   rewrite req 1 name: Hardware & Tools business: Joe's Hardware
//   approve req 1 name: Hardware city: Harare
//   connect req 1 category: Hardware
// `category:` means "file it under this existing category" (the same job as
// connect). The rest edit the request or the business attached to it.
type AdminRewriteFields = {
  name?: string
  category?: string
  business?: string
  city?: string
  description?: string
}

function parseAdminRewrite(text: string): {
  fields: AdminRewriteFields
  bare: string
  used: boolean
} {
  const fields: AdminRewriteFields = {}
  const matches = [...text.matchAll(/\b(name|category|business|city|description)\s*[:=]\s*/gi)]
  if (!matches.length) {
    // Keep the old one-value shorthand: `approve req 1 Hardware` and
    // `connect req 1 to Hardware` still mean exactly what they did.
    return { fields, bare: text.replace(/^(?:to|as)\s+/i, '').trim(), used: false }
  }
  const bare = text.slice(0, matches[0].index).trim()
  matches.forEach((m, i) => {
    const start = (m.index || 0) + m[0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index || text.length) : text.length
    const value = text
      .slice(start, end)
      .trim()
      .replace(/^["']|["']$/g, '')
      .replace(/[,;]\s*$/, '')
      .trim()
    if (value) fields[m[1].toLowerCase() as keyof AdminRewriteFields] = value
  })
  return { fields, bare, used: true }
}

// The interactive category tree lives in lib/admin-category-tree.ts; the
// webhook only wires its senders and session store.
const adminTree = createAdminCategoryTree({
  sendText: (to, body) => sendWhatsAppMessage(to, body),
  sendButtons: (to, body, buttons) => sendInteractiveButtons(to, body, buttons),
  getSession,
  saveSession: (phone, step, data) => saveSession(phone, step, data),
  clearSession,
})
const showAdminCategoryTree = adminTree.show
const finishTreeConnect = adminTree.finishConnect
const finishTreeDisconnect = adminTree.finishDisconnect

function rewriteSummary(changed: string[]): string {
  return changed.length ? changed.join(' · ') : 'nothing changed'
}

function rewritePrefix(changed: string[]): string {
  return changed.length ? `✏️ ${changed.join(' · ')}\n\n` : ''
}

/** Apply `name:` / `business:` / `city:` / `description:` edits to a request. */
async function rewriteFeatureRequest(
  id: string,
  fields: AdminRewriteFields
): Promise<{ ok: boolean; error?: string; changed: string[]; name?: string; categoryTarget?: string }> {
  const supabase = getSupabase()
  const { data: req } = await supabase
    .from('feature_requests')
    .select('id, type, name, city, business_id, status')
    .eq('id', id)
    .maybeSingle()
  if (!req) return { ok: false, error: 'Request not found.', changed: [] }
  if (req.status !== 'pending') return { ok: false, error: `Already ${req.status}.`, changed: [] }

  const type = String(req.type)
  const oldName = String(req.name)
  const businessId = req.business_id as string | null
  let requestName = oldName
  const changed: string[] = []
  const patchRequest: Record<string, unknown> = {}
  const patchBiz: Record<string, unknown> = {}

  let biz: {
    name?: string
    category?: string[]
    areas?: string[]
    city?: string
    requested_category?: string
    bio?: string
  } | null = null
  if (businessId) {
    const { data } = await supabase
      .from('businesses')
      .select('name, category, areas, city, requested_category, bio')
      .eq('id', businessId)
      .maybeSingle()
    biz = data || null
  }

  if (fields.name) {
    const name = fields.name.trim()
    if (name.length < 2 || name.length > 60) {
      return { ok: false, error: 'The requested name needs 2–60 characters.', changed }
    }
    requestName = name
    patchRequest.name = name
    changed.push(`name → *${name}*`)
    if (biz) {
      if (type === 'category') {
        const cats = (biz.category || []).map(n => (n === oldName ? name : n))
        if (JSON.stringify(cats) !== JSON.stringify(biz.category || [])) patchBiz.category = cats
        const provisional = (biz.requested_category || '').trim().toLowerCase()
        if (provisional && provisional === oldName.toLowerCase()) patchBiz.requested_category = name
      } else if (type === 'area') {
        const areas = (biz.areas || []).map(n => (n === oldName ? name : n))
        if (JSON.stringify(areas) !== JSON.stringify(biz.areas || [])) patchBiz.areas = areas
      } else if (type === 'city' && (biz.city || '').toLowerCase() === oldName.toLowerCase()) {
        patchBiz.city = ''
      }
    }
  }

  if (fields.business) {
    const name = fields.business.trim()
    if (name.length < 2 || name.length > 80) {
      return { ok: false, error: 'The business name needs 2–80 characters.', changed }
    }
    if (!businessId) return { ok: false, error: 'This request is not attached to a business.', changed }
    patchBiz.name = name
    changed.push(`business → *${name}*`)
  }

  if (fields.city) {
    const city = fields.city.trim()
    if (city.length < 2 || city.length > 60) {
      return { ok: false, error: 'The city needs 2–60 characters.', changed }
    }
    if (type === 'city') {
      // For a city request, `city:` is the requested city itself.
      requestName = city
      patchRequest.name = city
      changed.push(`city → *${city}*`)
    } else {
      if (type === 'category' && !businessId) {
        return { ok: false, error: 'This request is not attached to a business.', changed }
      }
      if (type === 'area') {
        patchRequest.city = city
      }
      if (businessId) patchBiz.city = city
      changed.push(`city → *${city}*`)
    }
  }

  if (fields.description) {
    const description = fields.description.trim()
    if (description.length < 2 || description.length > 600) {
      return { ok: false, error: 'The description needs 2–600 characters.', changed }
    }
    if (!businessId) return { ok: false, error: 'This request is not attached to a business.', changed }
    patchBiz.bio = description
    changed.push('description updated')
  }

  if (Object.keys(patchRequest).length) {
    await supabase.from('feature_requests').update(patchRequest).eq('id', id)
  }
  if (Object.keys(patchBiz).length && businessId) {
    await supabase.from('businesses').update(patchBiz).eq('id', businessId)
  }

  return { ok: true, changed, name: requestName, categoryTarget: fields.category }
}

// ── Field agents ────────────────────────────────────────────────────────
// Agents add businesses for other people and nothing else. They are not
// admins, so they never receive submission/approval notices.

async function promptOwnerNumber(
  from: string,
  agent: boolean,
  pending?: ChatSessionData['pendingAgentMedia']
): Promise<void> {
  await clearConversationState(from)
  await saveSession(from, 'admin_add_business', {
    addingBusiness: true,
    ...(pending?.id ? { pendingAgentMedia: pending } : {}),
  } as ChatSessionData)
  await sendWhatsAppMessage(
    from,
    [
      agent ? '👥 *Add a business for an owner*' : '🏬 *Add another business*',
      '',
      pending?.id
        ? 'Photo received 👍 Send the WhatsApp number that will *own* this listing and I will read the sign straight away.'
        : 'Send the WhatsApp number that will *own* this listing (e.g. 0771234567).',
      agent
        ? 'Their number owns the portal and receives every cart/order reply. The hand-over card goes to our admins to forward - you get a short confirmation.'
        : 'Their number owns the portal and receives cart/order replies; the success card comes back to you to forward.',
      '',
      'Type *cancel* to stop.',
    ].join('\n')
  )
}

const AGENT_HELP = [
  '👥 *Agent mode*',
  '',
  'You can add businesses for other people. They keep their own number, portal and customer replies.',
  '',
  'Send *register* to start. Photographing the business sign is fastest - the AI reads the name, category, phone, town and description.',
  'You can also send any photo and choose whether to register it as a business or search the directory for it.',
].join('\n')

/** A photo from an agent could be a sign to register or an item to find. Ask
 * once and keep the photo, so neither reading happens by accident. */
async function promptAgentPhotoChoice(
  from: string,
  media: NonNullable<ChatSessionData['pendingAgentMedia']>
): Promise<void> {
  await clearConversationState(from)
  await saveSession(from, 'agent_photo_choice', {
    pendingAgentMedia: media,
  } as ChatSessionData)
  await sendInteractiveButtons(
    from,
    [
      '📷 *Photo received - what should I do with it?*',
      '',
      'Register the business shown in the photo, or search the directory for what it shows?',
    ].join('\n'),
    [
      { id: 'agent_photo_register', title: '🏪 Register business' },
      { id: 'agent_photo_search', title: '🔍 Search item' },
    ]
  )
}

/** The owner-number step shared by admins and agents. */
async function handleOwnerNumberEntry(
  from: string,
  text: string,
  session: ChatSession | null
): Promise<boolean> {
  if (session?.step !== 'admin_add_business') return false
  const clean = text.trim()
  if (!clean) return false

  if (/^cancel$/i.test(clean)) {
    await resetForNewSearch(from, session)
    await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was added.')
    return true
  }

  const owner = normalizeRegistrationOwner(clean)
  if (owner.length < 10 || owner.length > 15) {
    await sendWhatsAppMessage(
      from,
      'Send the owner\'s WhatsApp number in international or local form (e.g. 0771234567 or 263771234567), or type *cancel*.'
    )
    return true
  }

  // A second listing on an existing number is the owner's decision only. This
  // is the check that stops agents photographing the same sign twice.
  const existing = await findBusinessesByPhone(owner)
  if (existing.length) {
    await sendInteractiveButtons(
      from,
      [
        '⚠️ *That number is already listed*',
        '',
        ...duplicateBusinessLines(existing),
        '',
        'Only the owner can add a second listing on the same number. Ask them to register it themselves from their own WhatsApp.',
        '',
        'If the sign shows a different number, send that number instead.',
        '',
        'Nothing was added.',
      ].join('\n'),
      [
        { id: 'reg_owner_retry', title: '☎️ Another number' },
        { id: 'reg_cancel', title: '✖ Cancel' },
      ]
    )
    return true
  }

  const pending = session?.data.pendingAgentMedia
  await resetForNewSearch(from, session)
  await startImageFirstRegister(from, { onBehalfOf: owner })
  if (pending?.id) {
    const media = await fetchWhatsAppMedia(pending.id)
    if (media) {
      await handleRegistrationImageResilient(
        from,
        new Uint8Array(media.buffer),
        pending.caption || ''
      )
    } else {
      await sendWhatsAppMessage(
        from,
        "I couldn't open that photo again. Send it once more as a photo, or reply *skip* to enter the details by hand."
      )
    }
  }
  return true
}

/** Agent-only gate: outside an open registration, every message is redirected
 * to "add a business for someone". */
async function handleAgentTurn(
  from: string,
  session: ChatSession | null,
  text: string,
  action: string,
  media?: { id: string; caption: string; messageId: string } | null
): Promise<boolean> {
  if (session?.step === 'admin_add_business') {
    if (media?.id) {
      // A new photo replaces the one waiting for the owner number.
      await promptOwnerNumber(from, true, media)
      return true
    }
    if (!text) {
      await sendWhatsAppMessage(from, "Send the owner's WhatsApp number first, e.g. *0771234567*.")
      return true
    }
    return handleOwnerNumberEntry(from, text, session)
  }

  const conv = await getConversationState(from)
  const inRegistration =
    !!conv?.state?.startsWith('REGISTRATION_') || session?.step === 'list_form'
  if (inRegistration) return false

  if (action) {
    if (action === 'agent_photo_register') {
      await promptOwnerNumber(from, true, session?.data.pendingAgentMedia)
      return true
    }
    if (action === 'agent_photo_search') {
      const pending = session?.data.pendingAgentMedia
      await clearSession(from)
      await clearConversationState(from)
      if (!pending?.id) {
        await sendWhatsAppMessage(from, 'That photo is no longer waiting. Send it again and I will search for it.')
        return true
      }
      await handleBotMedia(
        from,
        null,
        { type: 'image', image: { id: pending.id, caption: pending.caption || '' } },
        pending.messageId || '',
        { forceSearch: true }
      )
      return true
    }
    if (
      action === 'menu_register' ||
      action === 'reg_business' ||
      action === 'reg_for_other' ||
      action === 'reg_restart' ||
      action === 'reg_upload' ||
      action === 'reg_skip' ||
      action === 'reg_plan_trial' ||
      action === 'reg_plan_paid'
    ) {
      await promptOwnerNumber(from, true)
      return true
    }
    if (action === 'reg_duplicate_photo') {
      const owner =
        typeof conv?.context?.onBehalfOf === 'string'
          ? normalizeRegistrationOwner(conv.context.onBehalfOf)
          : ''
      if (owner) await startImageFirstRegister(from, { onBehalfOf: owner })
      else await promptOwnerNumber(from, true)
      return true
    }
    if (action === 'reg_owner_retry') {
      await promptOwnerNumber(from, true)
      return true
    }
    if (action === 'reg_cancel' || action === 'cancel') {
      await clearSession(from)
      await clearConversationState(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Send *register* to add a business for an owner.')
      return true
    }
    await sendWhatsAppMessage(from, AGENT_HELP)
    return true
  }

  // A photo with no clear command could be a sign to register or an item to
  // search. Never guess: keep it and ask with two buttons.
  if (media?.id) {
    await promptAgentPhotoChoice(from, media)
    return true
  }

  if (text && registrationCommand(text)) {
    await promptOwnerNumber(from, true)
    return true
  }
  if (text && /^(?:add|list)\s+(?:a\s+)?(?:new\s+)?business$/i.test(text.trim())) {
    await promptOwnerNumber(from, true)
    return true
  }
  if (text && /^(?:cancel|stop)$/i.test(text.trim())) {
    await clearSession(from)
    await clearConversationState(from)
    await sendWhatsAppMessage(from, '✖ Cancelled. Send *register* to add a business for an owner.')
    return true
  }

  if (text) await sendWhatsAppMessage(from, AGENT_HELP)
  return true
}

async function handleAdminCommand(from: string, text: string): Promise<boolean> {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  // One menu for the whole admin suite: taps become the typed command below.
  if (lower === 'admin' || lower === 'admin menu' || lower === 'admin help') {
    const agents = await agentNumbers()
    await sendInteractiveList(from, adminMenuBody(agents.length), ADMIN_MENU_ROWS, ADMIN_MENU_BUTTON)
    return true
  }

  // ── Field agents (admin-only) ────────────────────────────────────────
  if (lower === 'agents' || lower === 'agent list') {
    const agents = await agentNumbers()
    if (!agents.length) {
      await sendWhatsAppMessage(
        from,
        [
          '👥 *Field agents*',
          '',
          'No agents yet. An agent can only add businesses for other people, and never gets approval notices.',
          '',
          'Add one: *add agent 0771234567*',
        ].join('\n')
      )
      return true
    }
    await sendWhatsAppMessage(
      from,
      [
        `👥 *Field agents* (${agents.length})`,
        '',
        ...agents.map((number, index) => `${index + 1}. +${number}`),
        '',
        'Agents only add businesses for owners; they receive no approval notices.',
        'Add: *add agent 0771234567* · Remove: *remove agent 0771234567*',
      ].join('\n')
    )
    return true
  }

  const addAgentMatch = clean.match(/^(?:add|new)\s+(?:an?\s+)?agent\s+(.+)$/i)
  if (addAgentMatch) {
    const result = await addAgent(addAgentMatch[1])
    await sendWhatsAppMessage(
      from,
      result.ok
        ? [
            `✅ *Agent added* · +${result.number}`,
            '',
            'They can now send *register* to add a business for an owner. Their number is on the agent list only - they do not receive approval or verification notices.',
          ].join('\n')
        : `⚠️ ${result.error}`
    )
    return true
  }

  const removeAgentMatch = clean.match(/^(?:remove|del(?:ete)?)\s+(?:an?\s+)?agent\s+(.+)$/i)
  if (removeAgentMatch) {
    const result = await removeAgent(removeAgentMatch[1])
    await sendWhatsAppMessage(
      from,
      result.ok
        ? `🗑️ Agent removed · +${result.number}. They can no longer add businesses for owners.`
        : `⚠️ ${result.error}`
    )
    return true
  }

  if (/^(?:add|new)\s+(?:an?\s+)?agent\b/i.test(clean)) {
    await sendWhatsAppMessage(from, 'Usage: *add agent 0771234567*')
    return true
  }
  if (/^(?:remove|del(?:ete)?)\s+(?:an?\s+)?agent\b/i.test(clean)) {
    await sendWhatsAppMessage(from, 'Usage: *remove agent 0771234567* (see *agents* for the list)')
    return true
  }

  const adminSession = await getSession(from)

  // Guided connect from the interactive category tree. Only typed answers are
  // handled here: a button tap arrives as an empty message and must fall
  // through to handleAction, or the tap would be swallowed by a re-prompt.
  if (clean && adminSession?.step === 'admin_tree_connect_child') {
    if (lower === 'cancel') {
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was connected.')
      return true
    }
    const child = pickApprovedCategory(await getApprovedCategories(), clean)
    if (!child.name) {
      await sendWhatsAppMessage(from, `⚠️ ${child.error}\n\nType *cancel* to stop.`)
      return true
    }
    await saveSession(from, 'admin_tree_connect_parent', {
      ...(adminSession.data || {}),
      treeConnectChild: child.name,
    })
    await sendWhatsAppMessage(
      from,
      `Child: *${child.name}*.\n\nNow send the *parent* category it should sit under (e.g. Landscaping).\n\nType *cancel* to stop.`
    )
    return true
  }

  if (clean && adminSession?.step === 'admin_tree_connect_parent') {
    if (lower === 'cancel') {
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was connected.')
      return true
    }
    const parent = pickApprovedCategory(await getApprovedCategories(), clean)
    if (!parent.name) {
      await sendWhatsAppMessage(from, `⚠️ ${parent.error}\n\nType *cancel* to stop.`)
      return true
    }
    const child = adminSession.data?.treeConnectChild
    if (!child) {
      await saveSession(from, 'admin_tree_connect_child', { ...(adminSession.data || {}) })
      await sendWhatsAppMessage(
        from,
        'Which *child* category should sit under another? Send its name (e.g. Tree Cutting).'
      )
      return true
    }
    if (child.toLowerCase() === parent.name.toLowerCase()) {
      await sendWhatsAppMessage(from, '⚠️ A category cannot be connected to itself. Send a different parent category.')
      return true
    }
    await saveSession(from, 'admin_tree_connect_confirm', {
      ...(adminSession.data || {}),
      treeConnectParent: parent.name,
    })
    await sendInteractiveButtons(
      from,
      `Connect *${child}* under *${parent.name}*?\n\nBuyers searching either name will see both.`,
      [
        { id: 'tree_connect_yes', title: '🔗 Connect' },
        { id: 'tree_connect_no', title: '✖ Cancel' },
      ]
    )
    return true
  }

  if (clean && adminSession?.step === 'admin_tree_connect_confirm') {
    if (/^(?:yes|y|connect|ok|confirm)$/i.test(lower)) {
      await finishTreeConnect(from, adminSession)
      return true
    }
    if (lower === 'cancel' || lower === 'no') {
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was connected.')
      return true
    }
    await sendWhatsAppMessage(
      from,
      `Tap *🔗 Connect* to file *${adminSession.data?.treeConnectChild || 'it'}* under *${adminSession.data?.treeConnectParent || 'that category'}*, or *✖ Cancel* to stop.`
    )
    return true
  }

  if (clean && adminSession?.step === 'admin_tree_disconnect') {
    if (lower === 'cancel') {
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was disconnected.')
      return true
    }
    await sendWhatsAppMessage(from, 'Tap a connection from the list above to remove it, or type *cancel*.')
    return true
  }

  if (clean && adminSession?.step === 'admin_tree_disconnect_confirm') {
    if (/^(?:yes|y|disconnect|remove|ok|confirm)$/i.test(lower)) {
      await finishTreeDisconnect(from, adminSession)
      return true
    }
    if (/^(?:no|keep|cancel)$/i.test(lower)) {
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Kept as it is.')
      await showAdminCategoryTree(from)
      return true
    }
    await sendWhatsAppMessage(
      from,
      `Tap *✂️ Disconnect* to unlink *${adminSession.data?.treeLink?.child || 'it'}*, or *✖ Keep* to leave it.`
    )
    return true
  }

  // Waiting for the category name after *connect req* listed a single request:
  // a plain reply is the target category, not a new command. The reply can
  // also carry rewrites, e.g. `category: Hardware name: Hardware & Tools`.
  const connectPending = adminSession?.data?.connectReqId as string | undefined
  const looksLikeAdminCommand = /^(?:approve|reject|connect|rewrite|edit|requests?|reqs|pending|menu|help|cancel)\b/i.test(lower)
  if (connectPending && !looksLikeAdminCommand) {
    const parsed = parseAdminRewrite(clean)
    if (parsed.used || /^[a-z][a-z &,'/-]{1,40}$/i.test(clean)) {
      let prefix = ''
      if (parsed.used) {
        const rewritten = await rewriteFeatureRequest(connectPending, parsed.fields)
        if (!rewritten.ok) {
          await sendWhatsAppMessage(from, `⚠️ ${rewritten.error || 'Could not rewrite that request.'}`)
          return true
        }
        prefix = rewritePrefix(rewritten.changed)
      }
      const target = parsed.fields.category || parsed.bare
      if (!target) {
        await sendWhatsAppMessage(
          from,
          'Which existing category should it connect to? Add it as *category: <existing category>*.'
        )
        return true
      }
      const result = await connectFeatureRequestToCategory(connectPending, target)
      if (result.ok) {
        clearCategoryLinkCache()
        const next: ChatSessionData = { ...(adminSession?.data || {}) }
        delete next.connectReqId
        await saveSession(from, 'admin_requests', next)
        await sendWhatsAppMessage(
          from,
          `${prefix}🔗 *${result.alias}* → *${result.name}*. Filed under the existing category and remembered for future listings.\n\nType *requests* for the rest.`
        )
      } else {
        await sendWhatsAppMessage(from, `${prefix}⚠️ ${result.error || 'Could not connect that request.'}`)
      }
      return true
    }
  }

  if (/^(?:add|list)\s+(?:a\s+)?(?:new\s+)?business$/.test(lower)) {
    await saveSession(from, 'admin_add_business', { ...(adminSession?.data || {}), addingBusiness: true })
    await sendWhatsAppMessage(
      from,
      [
        '🏪 *Add a business for someone else*',
        '',
        'Send the WhatsApp number that will *own* this listing (e.g. 0771234567).',
        'You will register the business here - same questions and business-card photo reading. The listing, its portal and every cart/order reply will belong to that number, and the success message comes to you to forward.',
        '',
        'Type *cancel* to stop.',
      ].join('\n')
    )
    return true
  }

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
          (n.budget ? ` · ${n.budget}` : '') +
          ` · ${n.status} · ${n.quotes_forwarded || 0}q · 👤 +${digitsOnly(n.buyer_phone)}`
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
      lines.push(
        `${n.rq_id} · ${[n.qty, n.item].filter(Boolean).join(' ')} · ${(n.city || 'countrywide').toUpperCase()}` +
        ` · ${n.quotes_forwarded || 0} quote${n.quotes_forwarded === 1 ? '' : 's'} · 👤 +${digitsOnly(n.buyer_phone)}`
      )
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
    let num = digitsOnly(clean.slice(8).trim())
    // An admin on a held chat can type just `release` to free their own chat.
    if (!num) {
      const own = await getSession(from)
      if (own?.data?.held) num = digitsOnly(from)
    }
    await releaseChat(from, num)
    return true
  }

  // Answer a held customer without leaving WhatsApp.
  const supportReply = clean.match(/^(?:reply|respond|say)\s+(\+?\d{9,15})\s+([\s\S]+)$/i)
  if (supportReply) {
    if (!(await isBotAdmin(from))) {
      await sendWhatsAppMessage(from, '🔒 This command is for administrators only.')
      return true
    }
    await replyAsSupport(from, digitsOnly(supportReply[1]), supportReply[2])
    return true
  }

  // Wipe a number's bot-side history so the next message is a first hello.
  // Listings, orders, needs and payments are business records - never touched.
  if (lower === 'reset' || lower.startsWith('reset ')) {
    if (!(await isBotAdmin(from))) {
      await sendWhatsAppMessage(from, '🔒 This command is for administrators only.')
      return true
    }
    const parts = clean.slice(5).trim().split(/\s+/).filter(Boolean)
    const num = digitsOnly(parts[0] || '')
    const confirmed = (parts[1] || '').toLowerCase() === 'confirm'
    if (num.length < 8) {
      await sendWhatsAppMessage(from, 'Usage: *reset 263771234567* (then confirm)')
      return true
    }
    const variants = [num, `+${num}`]
    const tables = ['bot_contacts', 'chat_sessions', 'conversation_state', 'bot_messages', 'bot_searches']
    if (!confirmed) {
      const counts: string[] = []
      for (const table of tables) {
        const { count } = await getSupabase()
          .from(table)
          .select('phone', { count: 'exact', head: true })
          .in('phone', variants)
        counts.push(`${table}: ${count ?? 0}`)
      }
      await sendWhatsAppMessage(
        from,
        [
          `⚠️ *Reset +${num}?*`,
          '',
          'This deletes their bot contact, chat session, transcript, search history and onboarding state.',
          'Listings, orders, needs, quotes and payments are left alone.',
          '',
          counts.join(' · '),
          '',
          `Reply *reset ${num} confirm* to do it.`,
        ].join('\n')
      )
      return true
    }
    const removed: string[] = []
    for (const table of tables) {
      const { count, error } = await getSupabase()
        .from(table)
        .delete({ count: 'exact' })
        .in('phone', variants)
      removed.push(`${table}: ${error ? 'failed' : count ?? 0}`)
    }
    await sendWhatsAppMessage(
      from,
      `🧹 *+${num} reset*\n${removed.join(' · ')}\nThey will be treated as a first-time user on their next message.`
    )
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
    const nearMatch = adminClean.match(/^near\s+(.+)$/i)
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

  // Category / location requests. The admin is often on the road with only
  // WhatsApp, so approving or rejecting must not require the web panel.
  if (/^(requests?|reqs|feature requests?)$/.test(lower)) {
    const rows = await listPendingFeatureRequests(10)
    const total = await countPendingFeatureRequests()
    if (!rows.length) {
      await sendWhatsAppMessage(from, '🗂 No pending category or location requests. ✅')
      return true
    }
    await saveSession(from, 'admin_requests', { pendingReqs: rows.map(r => r.id) } as ChatSessionData)
    await sendWhatsAppMessage(
      from,
      renderFeatureRequestList(rows, total) +
        '\n\n✏️ Fix a typo or business detail first: *rewrite req 1 name: … business: … city: …*' +
        '\nOr approve and rewrite in one line: *approve req 1 name: … category: …*' +
        '\nExisting categories: *connect category Tree Cutting to Landscaping*'
    )
    return true
  }

  // Review the category tree: every parent with the categories connected under
  // it, so an admin can see at a glance what search is treating as one shelf.
  if (/^(?:categories|category\s+(?:tree|links|connections))$/.test(lower)) {
    await showAdminCategoryTree(from)
    return true
  }

  // Connect one approved category under another: `connect category Tree
  // Cutting to Landscaping` (the keyword is optional: `connect Tree Cutting to
  // Landscaping` works too). The connection is stored as the same learned
  // category link the request flow writes, so search treats both names as one
  // shelf - and it works even when no pending request is involved.
  const catConnect = clean.match(
    /^connect\s+(?:cat(?:egory)?\s+)?(.+?)\s+(?:to|under|as|into|>)\s+(.+)$/i
  )
  if (catConnect && !/^req(?:uest)?\b/i.test(catConnect[1])) {
    const approved = await getApprovedCategories()
    const child = pickApprovedCategory(approved, catConnect[1])
    if (!child.name) {
      await sendWhatsAppMessage(from, `⚠️ ${child.error}`)
      return true
    }
    const parent = pickApprovedCategory(approved, catConnect[2])
    if (!parent.name) {
      await sendWhatsAppMessage(from, `⚠️ ${parent.error}`)
      return true
    }

    const linked = await linkCategories(child.name, parent.name)
    if (!linked.ok) {
      await sendWhatsAppMessage(from, `⚠️ ${linked.error || 'Could not connect those categories.'}`)
      return true
    }
    await sendWhatsAppMessage(
      from,
      [
        `🔗 *${child.name}* is now an element of *${parent.name}*.`,
        '',
        'Buyers searching either name will see businesses listed under both.',
      ].join('\n')
    )
    return true
  }

  // "Connect to": the requested wording is the same thing as a category we
  // already have. Files the listing there, learns the alias for every future
  // request, and closes the request without adding a near-duplicate category.
  const reqConnect = clean.match(/^connect\s+(?:req(?:uest)?\s+)?(\d{1,2})(?:\s+(?:to|as)\s+|\s+)([\s\S]+)$/i)
  if (reqConnect) {
    const idx = Number(reqConnect[1]) - 1
    const rest = (reqConnect[2] || '').trim()
    const sess = await getSession(from)
    const ids = sess?.data.pendingCategoryReqs || sess?.data.pendingReqs || []
    if (idx < 0 || idx >= ids.length) {
      await sendWhatsAppMessage(from, 'Run *requests* first, then reply *connect req 1 <existing category>* with a list number.')
      return true
    }
    const parsed = parseAdminRewrite(rest)
    let prefix = ''
    if (parsed.used) {
      const rewritten = await rewriteFeatureRequest(ids[idx], parsed.fields)
      if (!rewritten.ok) {
        await sendWhatsAppMessage(from, `⚠️ ${rewritten.error || 'Could not rewrite that request.'}`)
        return true
      }
      prefix = `✏️ ${rewriteSummary(rewritten.changed)}\n\n`
    }
    const target = parsed.fields.category || parsed.bare
    if (!target) {
      await sendWhatsAppMessage(
        from,
        'Which existing category should it connect to? Add it as *category: <existing category>*.'
      )
      return true
    }
    const result = await connectFeatureRequestToCategory(ids[idx], target)
    if (!result.ok) {
      await sendWhatsAppMessage(from, `${prefix}⚠️ ${result.error || 'Could not connect that request.'}`)
      return true
    }
    clearCategoryLinkCache()
    const remaining = ids.filter((id: string) => id !== ids[idx])
    await saveSession(from, 'admin_requests', { pendingReqs: remaining, pendingCategoryReqs: remaining } as ChatSessionData)
    await sendWhatsAppMessage(
      from,
      `${prefix}🔗 *${result.alias}* → *${result.name}*. Filed under the existing category and remembered for future listings. ${remaining.length} left in this list.`
    )
    return true
  }

  // Edit a pending request (or the business behind it) without deciding yet.
  // `category:` is the one field that also decides: it connects the request to
  // that existing category, exactly like *connect req*.
  const rewriteCmd = clean.match(/^(?:rewrite|edit)\s+req(?:uest)?\s+(\d{1,2})(?:\s+([\s\S]+))?$/i)
  if (rewriteCmd) {
    const idx = Number(rewriteCmd[1]) - 1
    const rest = (rewriteCmd[2] || '').trim()
    const sess = await getSession(from)
    const ids = sess?.data.pendingReqs || []
    if (idx < 0 || idx >= ids.length) {
      await sendWhatsAppMessage(from, 'Run *requests* first, then reply *rewrite req 1 name: …* with a list number.')
      return true
    }
    const parsed = parseAdminRewrite(rest)
    if (!parsed.used) {
      await sendWhatsAppMessage(
        from,
        [
          '✏️ *Rewrite a request*',
          '',
          `Reply with one or more fields, e.g.`,
          `*rewrite req ${idx + 1} name: Hardware & Tools business: Joe's Hardware city: Harare*`,
          '',
          'Fields: *name:* the requested category/area/city, *business:* the listing name,',
          '*city:* the listing city, *description:* the listing bio, *category:* an existing category to connect to.',
        ].join('\n')
      )
      return true
    }
    const rewritten = await rewriteFeatureRequest(ids[idx], parsed.fields)
    if (!rewritten.ok) {
      await sendWhatsAppMessage(from, `⚠️ ${rewritten.error || 'Could not rewrite that request.'}`)
      return true
    }
    const prefix = rewritePrefix(rewritten.changed)
    if (parsed.fields.category) {
      const result = await connectFeatureRequestToCategory(ids[idx], parsed.fields.category)
      if (!result.ok) {
        await sendWhatsAppMessage(from, `${prefix}⚠️ ${result.error || 'Could not connect that request.'}`)
        return true
      }
      clearCategoryLinkCache()
      const remaining = ids.filter((id: string) => id !== ids[idx])
      await saveSession(from, 'admin_requests', { pendingReqs: remaining } as ChatSessionData)
      await sendWhatsAppMessage(
        from,
        `${prefix}🔗 *${result.alias}* → *${result.name}*. Filed under the existing category and remembered for future listings. ${remaining.length} left in this list.`
      )
      return true
    }
    await sendWhatsAppMessage(
      from,
      `${prefix || `✏️ ${rewriteSummary(rewritten.changed)}.\n\n`}Still pending. Reply *approve req ${idx + 1}* to create it, or *connect req ${idx + 1} <existing category>* to file it under one.`
    )
    return true
  }

  // "Connect to" tapped with no category yet: show only the category requests
  // and spell out the one-line form, instead of guessing which category.
  if (/^connect(?:\s+req(?:uest)?)?$/.test(lower)) {
    const rows = (await listPendingFeatureRequests(20)).filter(r => r.type === 'category')
    if (!rows.length) {
      await sendWhatsAppMessage(from, '🗂 No pending *category* requests to connect. Revenue city/area requests are on *requests*.')
      return true
    }
    await saveSession(from, 'admin_requests', {
      pendingReqs: rows.map(r => r.id),
      pendingCategoryReqs: rows.map(r => r.id),
      // One request only: the next plain reply is the category to connect it
      // to, so the admin does not have to retype the number.
      ...(rows.length === 1 ? { connectReqId: rows[0].id } : {}),
    } as ChatSessionData)
    const lines = ['🔗 *Connect a requested category*', '']
    rows.forEach((r, i) => {
      lines.push(`${i + 1}. *${r.name}* · requested by ${r.business_name}`)
    })
    lines.push(
      '',
      rows.length === 1
        ? 'Reply with the existing category, e.g. *Hardware* - or *connect req 1 Hardware*.'
        : 'Reply *connect req 1 <existing category>*, e.g. *connect req 1 Hardware*.',
      'Fix the wording at the same time: *connect req 1 category: Hardware name: Hardware & Tools*.',
      'Connect two existing categories: *connect category Tree Cutting to Landscaping*.',
      'See the whole tree: *category tree*.',
      'Type *requests* to see the full list, or *approve req 1* if it really is a new category.'
    )
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  const reqAction = clean.match(/^(approve|reject)\s+req(?:uest)?\s+(\d{1,2})(?:\s+([\s\S]+))?$/i)
  if (reqAction) {
    const op = reqAction[1].toLowerCase()
    const idx = Number(reqAction[2]) - 1
    const corrected = (reqAction[3] || '').trim()
    const sess = await getSession(from)
    const ids = sess?.data.pendingReqs || []
    if (idx < 0 || idx >= ids.length) {
      await sendWhatsAppMessage(from, 'Run *requests* first, then reply *approve req 1* with a list number.')
      return true
    }

    // `approve req 1 name: … business: …` rewrites the request/business first.
    // `category:` turns the approval into a connect to that existing category.
    const parsed = corrected ? parseAdminRewrite(corrected) : { fields: {}, bare: '', used: false }
    let prefix = ''
    if (op === 'approve' && parsed.used) {
      const rewritten = await rewriteFeatureRequest(ids[idx], parsed.fields)
      if (!rewritten.ok) {
        await sendWhatsAppMessage(from, `⚠️ ${rewritten.error || 'Could not rewrite that request.'}`)
        return true
      }
      prefix = `✏️ ${rewriteSummary(rewritten.changed)}\n\n`

      if (parsed.fields.category) {
        const connected = await connectFeatureRequestToCategory(ids[idx], parsed.fields.category)
        if (!connected.ok) {
          await sendWhatsAppMessage(from, `${prefix}⚠️ ${connected.error || 'Could not connect that request.'}`)
          return true
        }
        clearCategoryLinkCache()
        const remaining = ids.filter((id: string) => id !== ids[idx])
        await saveSession(from, 'admin_requests', { pendingReqs: remaining } as ChatSessionData)
        await sendWhatsAppMessage(
          from,
          `${prefix}🔗 *${connected.alias}* → *${connected.name}*. Filed under the existing category and remembered for future listings. ${remaining.length} left in this list.`
        )
        return true
      }
    }

    const result = op === 'approve'
      ? await approveFeatureRequestById(ids[idx], parsed.used ? undefined : (parsed.bare || corrected))
      : await rejectFeatureRequestById(ids[idx])
    if (!result.ok) {
      await sendWhatsAppMessage(from, `${prefix}⚠️ ${result.error || 'Could not update that request.'}`)
      return true
    }
    const remaining = ids.filter((id: string) => id !== ids[idx])
    await saveSession(from, 'admin_requests', { pendingReqs: remaining } as ChatSessionData)
    const verb = op === 'approve' ? 'approved' : 'rejected'
    await sendWhatsAppMessage(
      from,
      `${prefix}${op === 'approve' ? '✅' : '✖'} *${result.name}* (${result.type}) ${verb}. ${remaining.length} left in this list.\nSend *requests* for the next page.`
    )
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
      'Reply *1* to approve (90-day trial if the owner asked for one, else 30 days), *trial 1* to start the free trial, *verify 1 90* for custom days, or *unverify 1*.',
      'Or skip the list: *verify Diamond tradings* / *trial Diamond tradings* matches by name (typo-friendly).'
    )
    await sendWhatsAppMessage(from, lines.join('\n'))
    return true
  }

  // verify/unverify — a number picks from the pending list; anything else is
  // a fuzzy business-name match with an optional day-grant in the same line:
  //   verify Diamond tradings 30   ·   verify 1   ·   unverify 2
  //   trial Diamond tradings   ·   unverify 2
  const verifyCmd = clean.match(/^(verify|unverify|trial)(?:\s+([\s\S]+))?$/i)
  if (verifyCmd) {
    const opArg = verifyCmd[1].toLowerCase()
    let op: 'verify' | 'unverify' | 'trial' =
      opArg === 'verify' ? 'verify' : opArg === 'trial' ? 'trial' : 'unverify'
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
      // An exact name (any capitalisation) acts immediately - asking "which
      // one?" for a name the admin typed in full reads as a refusal. Otherwise
      // one strong match acts, and anything fuzzier shows options.
      const exact = matches.find(b => bestNameSimilarity(rest, b.name) === 1) || null
      const clear = !!exact || (matches.length === 1 && bestNameSimilarity(rest, matches[0].name) >= 0.82)
      if (!clear) {
        await saveSession(from, 'admin_pending', {
          pendingBiz: matches.map(b => b.id),
          pendingOp: op,
          ...(days ? { pendingDays: days } : {}),
        } as ChatSessionData)
        const lines = [`🤔 Closest matches to *${rest}* - reply *1* to pick (or *${op} 1*):`, '']
        matches.forEach((b, i) => {
          lines.push(
            `${i + 1}. *${b.name}*${b.city ? ` · ${b.city}` : ''} · ${b.verified ? 'verified' : 'unverified'}`
          )
        })
        await sendWhatsAppMessage(from, lines.join('\n'))
        return true
      }
      biz = exact || matches[0]
    }

    if (!biz) {
      await sendWhatsAppMessage(from, 'That business was not found - run *pending* again.')
      return true
    }

    if (op === 'trial') {
      // Start the full 90-day free trial now, whether or not the owner asked
      // for it. The trial clock is written here (trial_expires_at), so the
      // 7-day/3-day reminders and the expiry cron take over.
      const trial = await startTrialForBusiness(biz.id, { adminOverride: true })
      if (!trial.ok || !trial.trialExpiresAt) {
        await sendWhatsAppMessage(
          from,
          `❌ Could not start the free trial for *${biz.name}*: ${trial.error || 'unknown error'}`
        )
        return true
      }
      const until = trial.trialExpiresAt.slice(0, 10)
      await sendWhatsAppMessage(
        from,
        `✅ *${biz.name}* approved - ${TRIAL_PLAN_LABEL} started (until ${until}, ${TRIAL_DAYS} days).`
      )
      if (biz.phone) {
        await notifyBusinessLive(biz)
        await sendWhatsAppMessage(
          biz.phone,
          [
            `🆓 *${TRIAL_PLAN_LABEL} active*`,
            '',
            `Your free trial runs until *${until}* (${TRIAL_DAYS} days). No payment is needed.`,
            'We will remind you before it ends.',
          ].join('\n')
        )
      }
      return true
    }

    if (op === 'verify') {
      // Mirror the dashboard approve (app/api/admin/verify): approving a
      // listing activates it with a day-grant (default 30) so it shows in
      // search; the cron reminder + expiry machinery takes over from here.
      // An already-active (paid) listing is just verified — never extended
      // for free unless the admin explicitly typed days.
      const alreadyActive = biz.payment_status === 'active'

      // A listing whose owner asked for the 90-day free trial is approved as a
      // trial. Approving it with the generic grant silently cut them to 30
      // days and left the trial request pending forever.
      let pendingTrial = false
      if (!days && !alreadyActive) {
        const { data: trialRows } = await getSupabase()
          .from('listing_subscriptions')
          .select('id')
          .eq('business_id', biz.id)
          .eq('trial_status', 'requested')
          .is('trial_activated_at', null)
          .limit(1)
        pendingTrial = !!trialRows?.length
      }

      if (pendingTrial) {
        const trial = await startTrialForBusiness(biz.id, { adminOverride: true })
        if (!trial.ok || !trial.trialExpiresAt) {
          await sendWhatsAppMessage(
            from,
            `❌ Could not start the free trial for *${biz.name}*: ${trial.error || 'unknown error'}`
          )
          return true
        }
        const until = trial.trialExpiresAt.slice(0, 10)
        await sendWhatsAppMessage(
          from,
          `✅ *${biz.name}* approved - ${TRIAL_PLAN_LABEL} started (until ${until}, ${TRIAL_DAYS} days).`
        )
        if (biz.phone) {
          await notifyBusinessLive(biz)
          await sendWhatsAppMessage(
            biz.phone,
            [
              `🆓 *${TRIAL_PLAN_LABEL} active*`,
              '',
              `Your free trial runs until *${until}* (${TRIAL_DAYS} days). No payment is needed.`,
              'We will remind you before it ends.',
            ].join('\n')
          )
        }
        return true
      }

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
        // Always notify the owner — verifying your own listing still deserves
        // the go-live message with all the links (profile, website, portal).
        if (biz.phone) {
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

  // Resend the go-live details (profile, website, portal setup, shop how-to).
  // Useful when Meta blocked delivery the first time and the owner has since
  // messaged again - the 24h window is now open, so free-form text lands.
  const welcomeCmd = clean.match(/^welcome(?:\s+([\s\S]+))?$/i)
  if (welcomeCmd) {
    const arg = (welcomeCmd[1] || '').trim()
    if (!arg) {
      await sendWhatsAppMessage(from, 'Use *welcome <business name>* - e.g. *welcome Diamond tradings*.')
      return true
    }
    const matches = await findBusinessesByName(arg)
    if (!matches.length) {
      await sendWhatsAppMessage(from, `No business close to *${arg}*. Check the spelling, or use *pending* to see the list.`)
      return true
    }
    const exact = matches.find(b => bestNameSimilarity(arg, b.name) === 1)
    const biz = exact || matches[0]
    if (!exact && bestNameSimilarity(arg, biz.name) < 0.82) {
      await sendWhatsAppMessage(
        from,
        [`🤔 Did you mean *${biz.name}*? Reply *welcome ${biz.name}* to confirm.`, '', ...matches.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`)].join('\n')
      )
      return true
    }
    if (!biz.phone) {
      await sendWhatsAppMessage(from, `*${biz.name}* has no phone number on file, so there is nowhere to send the details.`)
      return true
    }
    await notifyBusinessLive(biz)
    await sendWhatsAppMessage(from, `📤 Go-live details re-sent to *${biz.name}* (+${digitsOnly(biz.phone)}).`)
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
  // Registration review buttons: Edit reopens the same ready-to-publish card,
  // and Publish from the OCR review submits without a second "proceed" step.
  if (action === 'reg_review_publish' || action === 'reg_edit') {
    const conv = await getConversationState(from)
    const step = conv?.context?.step
    if (conv && (step === 'review_extracted' || step === 'final_review')) {
      if (action === 'reg_review_publish' && step === 'review_extracted') {
        await publishRegistrationReview(from, conv)
      } else {
        await sendRegistrationReview(from, conv.context, {
          hint: '✏️ Type the detail you want to change, e.g. `City: Bulawayo`.',
        })
      }
      return
    }
  }

  // ── #1 bidding callbacks (business owners) ───────────────────────────
  // The amount buttons carry the full scope in the id, so no stored state.
  if (action.startsWith('bid_biz_')) {
    await handleBidBusinessSelection(from, action)
    return
  }
  if (action.startsWith('bid_cat_')) {
    await handleBidCategorySelection(from, action)
    return
  }
  if (action.startsWith('bid_city_')) {
    await handleBidCitySelection(from, action)
    return
  }
  if (action.startsWith('bid_nationwide_')) {
    await handleBidNationwideSelection(from, action)
    return
  }
  if (action.startsWith('bid_amt_')) {
    if (action.startsWith('bid_amt_custom')) {
      // bid_amt_custom__<category>__<city> — the suffix carries the scope.
      const parts = action.slice('bid_amt_custom'.length).split('__')
      // New ids carry the listing: __<rowId>__<category>__<city>.
      // Legacy ids are __<category>__<city>.
      const offset = parts.length >= 4 ? 1 : 0
      const category = (parts[1 + offset] || '').trim()
      const city = (parts[2 + offset] || '').replace(/_/g, ' ').trim()
      await sendWhatsAppMessage(
        from,
        category
          ? `Type the amount, then confirm in this format:\n\`confirm <amount> <ecocash-number> ${category}${city ? ` in ${city}` : ' nationwide'}\``
          : 'Reply with: `confirm <amount> <phone> <category> [in <city> | nationwide]`'
      )
      return
    }
    const parsed = parseBidAmountId(action)
    // The id carries the listing, so multi-listing owners resolve correctly.
    if (parsed?.businessId) {
      await handleBidAmount(from, parsed.businessId, parsed.category, parsed.city, parsed.amount)
      return
    }
    if (!parsed) {
      await sendWhatsAppMessage(from, 'Reply with: `confirm <amount> <phone> <category> [in <city> | nationwide]`')
      return
    }
    // Legacy id without a listing id: fall back to the sender's first listing.
    // (.maybeSingle() would error when the number owns more than one.)
    const { data: bizRows } = await getSupabase()
      .from('businesses')
      .select('id')
      .eq('phone', from)
      .order('created_at', { ascending: true })
      .limit(1)
    const biz = bizRows?.[0]
    if (biz) {
      await handleBidAmount(from, biz.id, parsed.category, parsed.city, parsed.amount)
    } else {
      await sendWhatsAppMessage(from, 'No business found for this WhatsApp number. Register first with *register*.')
    }
    return
  }

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
  if (action === 'note_skip') {
    await resetForNewSearch(from, session)
    await sendWhatsAppMessage(from, '👍 No note sent - the buyer already has your number.')
    return
  }
  const coNote = action.match(/^co_note_(\d+)$/)
  if (coNote) {
    const row = await getSupplyOrderById(Number(coNote[1]))
    if (!row) {
      await sendWhatsAppMessage(from, 'That order is gone - send *orders* to see the current ones.')
      return
    }
    await saveSession(from, 'order_note', { ...(session?.data || {}), order_note_id: row.id })
    await sendWhatsAppMessage(
      from,
      `✍️ Send the message for the buyer of wa.directory/go/o/${row.token} - a price, pickup note, anything.`
    )
    return
  }
  const coPrice = action.match(/^co_price_(\d+)$/)
  if (coPrice) {
    const row = await getSupplyOrderById(Number(coPrice[1]))
    if (!row) {
      await sendWhatsAppMessage(from, 'That order is gone - send *orders* to see the current ones.')
      return
    }
    const lines = (row.lines || []) as { name: string; qty: number; price: number | null }[]
    await saveSession(from, 'order_counter', {
      ...(session?.data || {}),
      order_counter_id: row.id,
    })
    await sendWhatsAppMessage(
      from,
      [
        `💰 *New price* for wa.directory/go/o/${row.token}`,
        '',
        ...lines.map(
          (l, n) =>
            `${n + 1}. ${l.qty} × ${l.name}${l.price != null ? ` - ${monoUSD(l.price).replace(/`/g, '')} each` : ''}`
        ),
        '',
        lines.length === 1
          ? 'Send the new price, e.g. *3.50*.'
          : 'Send one price per item as number=price, e.g. *1=3.50 2=20*.',
        '',
        'The buyer has to accept before it applies. Reply *cancel* to leave prices alone.',
      ].join('\n')
    )
    return
  }
  const coYes = action.match(/^co_yes_(\d+)$/)
  if (coYes) {
    await answerCounter(from, Number(coYes[1]), true)
    return
  }
  const coNo = action.match(/^co_no_(\d+)$/)
  if (coNo) {
    await answerCounter(from, Number(coNo[1]), false)
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
  const askContact = action.match(/^ask_contact_(\d+)$/)
  if (askContact) {
    await handleAskContact(from, Number(askContact[1]))
    return
  }
  const askPhoto = action.match(/^ask_photo_(\d+)$/)
  if (askPhoto) {
    await handleAskPhoto(from, Number(askPhoto[1]))
    return
  }
  const contactYes = action.match(/^contact_yes_(\d+)$/)
  if (contactYes) {
    await handleContactConsent(from, true, Number(contactYes[1]))
    return
  }
  const contactNo = action.match(/^contact_no_(\d+)$/)
  if (contactNo) {
    await handleContactConsent(from, false, Number(contactNo[1]))
    return
  }

  // ── Post-activation shelf batch: finish, skip a price, or pick the shop ──
  if (action === 'itembatch_done' || action === 'itembatch_skip' || action === 'itembatch_cancel') {
    const live = session || (await getSession(from))
    if (!live || live.step !== 'item_batch' || !live.data.itemBatch) {
      await sendWhatsAppMessage(from, 'That upload has expired - send your product photos again.')
      return
    }
    if (action === 'itembatch_cancel') {
      await clearSession(from)
      await sendWhatsAppMessage(from, 'Cancelled - no items were added to your shop.')
      return
    }
    if (action === 'itembatch_skip') {
      await handleBatchPriceReply(from, live, 'skip')
      return
    }
    await finalizeShelfBatch(from, live)
    return
  }
  const itemBatchBiz = action.match(/^itembatchbiz_(.+)$/)
  if (itemBatchBiz) {
    const live = session || (await getSession(from))
    const batch = live?.data.itemBatch
    if (!live || live.step !== 'item_batch' || !batch) {
      await sendWhatsAppMessage(from, 'That upload has expired - send your product photos again.')
      return
    }
    const { data: row } = await getSupabase()
      .from('businesses')
      .select('id, name')
      .eq('id', itemBatchBiz[1])
      .maybeSingle()
    const next: ItemBatch = {
      ...batch,
      businessId: itemBatchBiz[1],
      businessName: row?.name || 'your shop',
    }
    await saveSession(from, 'item_batch', { itemBatch: next })
    // The photos were already sent; picking the shop is the last step, so
    // close the batch now instead of making the seller send more.
    await finalizeShelfBatch(from, { phone: from, step: 'item_batch', data: { itemBatch: next } })
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

  // Back from the cart's confirm screen to the quantity controls.
  if (action === 'cart_edit') {
    const cur = await loadCartSession(from, session)
    const data = { ...(cur?.data || {}), pendingOrder: undefined }
    await saveSession(from, 'browse', data)
    await handleViewCart(from, { phone: from, step: 'browse', data })
    return
  }

  // Change quantity: cart_item_<itemId> opens the item, cart_inc|dec|del_<id>
  const cartItemMatch = action.match(/^cart_item_(.+)$/)
  if (cartItemMatch) {
    const cartSession = await loadCartSession(from, session)
    await sendCartItemScreen(from, cartSession?.data || {}, cartItemMatch[1])
    return
  }
  const cartQtyMatch = action.match(/^cart_(inc|dec|del)_(.+)$/)
  if (cartQtyMatch) {
    const [, op, itemId] = cartQtyMatch
    session = await loadCartSession(from, session)
    if (!session) {
      await sendWhatsAppMessage(from, 'That cart has expired - add your items again and reply *cart*.')
      return
    }
    const item = getCart(session.data).find(c => c.itemId === itemId)
    if (!item) {
      await sendWhatsAppMessage(from, 'That item is no longer in your cart.')
      return
    }
    const data =
      op === 'del'
        ? removeFromCart(session.data, item.businessId, itemId)
        : updateCartQty(session.data, item.businessId, itemId, item.qty + (op === 'inc' ? 1 : -1))
    await saveSession(from, session.step, data)
    if (getCart(data).some(c => c.itemId === itemId)) {
      await sendCartItemScreen(from, data, itemId)
    } else {
      await sendWhatsAppMessage(from, `🗑 Removed *${item.itemName}*.`)
      await handleViewCart(from, { ...session, data })
    }
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
    case 'menu_bid':
      await handleBidCommand(from, 'bid')
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
      await startImageFirstRegister(from)
      return
    }
    // Admins choose whose business the registration is for. "My business"
    // runs the normal flow; "Another business" asks for the owner's number and
    // then runs the same flow with that number owning the listing.
    case 'reg_for_self': {
      await startImageFirstRegister(from, { asSelf: true })
      return
    }
    case 'reg_for_other': {
      if (!(await isBotAdmin(from))) {
        await startImageFirstRegister(from, { asSelf: true })
        return
      }
      await clearConversationState(from)
      await saveSession(from, 'admin_add_business', { addingBusiness: true } as ChatSessionData)
      await sendWhatsAppMessage(
        from,
        [
          '🏬 *Add another business*',
          '',
          'Send the WhatsApp number that will *own* this listing (e.g. 0771234567).',
          'Their number owns the portal and receives cart/order replies; the success message comes to you to forward.',
          '',
          'Type *cancel* to stop.',
        ].join('\n')
      )
      return
    }
    // ── Interactive category tree ─────────────────────────────────────
    // The tree message owns the connect/disconnect actions; every branch is a
    // short guided flow so the admin never has to remember the command syntax.
    case 'tree_connect': {
      if (!(await isBotAdmin(from))) return
      const cur = session || (await getSession(from))
      await saveSession(from, 'admin_tree_connect_child', {
        ...(cur?.data || {}),
        treeConnectChild: undefined,
        treeConnectParent: undefined,
        treeLink: undefined,
      })
      await sendWhatsAppMessage(
        from,
        '🔗 *Connect a branch*\n\nSend the *child* category - the one that should sit under another (e.g. Tree Cutting).\n\nType *cancel* to stop.'
      )
      return
    }
    case 'tree_connect_yes': {
      if (!(await isBotAdmin(from))) return
      await finishTreeConnect(from, session || (await getSession(from)))
      return
    }
    case 'tree_connect_no': {
      if (!(await isBotAdmin(from))) return
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Cancelled. Nothing was connected.')
      await showAdminCategoryTree(from)
      return
    }
    case 'tree_disconnect': {
      if (!(await isBotAdmin(from))) return
      const links = await listCategoryConnections()
      if (!links.length) {
        await sendWhatsAppMessage(from, '✂️ No connections to remove.')
        await showAdminCategoryTree(from)
        return
      }
      const shown = links.slice(0, 9)
      const cur = session || (await getSession(from))
      await saveSession(from, 'admin_tree_disconnect', {
        ...(cur?.data || {}),
        treeLinks: shown,
        treeLink: undefined,
      })
      await sendInteractiveList(
        from,
        `✂️ *Disconnect a branch*\n\nTap the connection to remove - both names will search separately again.` +
          (links.length > shown.length ? `\n\nShowing ${shown.length} of ${links.length}.` : ''),
        shown.map((link, i) => ({
          id: `tree_cut_${i}`,
          title: `${i + 1}. ${link.child}`.slice(0, 24),
          description: `Under ${link.parent}`.slice(0, 72),
        })),
        'Connections'
      )
      return
    }
    case 'tree_cut_yes': {
      if (!(await isBotAdmin(from))) return
      await finishTreeDisconnect(from, session || (await getSession(from)))
      return
    }
    case 'tree_cut_no': {
      if (!(await isBotAdmin(from))) return
      await clearSession(from)
      await sendWhatsAppMessage(from, '✖ Kept as it is.')
      await showAdminCategoryTree(from)
      return
    }
    case 'tree_done': {
      await clearSession(from)
      await sendWhatsAppMessage(from, '🌳 Category tree closed.')
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
      await startImageFirstRegister(from)
      return
    // Personal contacts were removed from sign-up. Old buttons still land
    // here, so they now begin a business listing instead of a dead end.
    case 'reg_personal':
    case 'reg_contact_pay_monthly':
    case 'reg_contact_publish':
    case 'reg_contact_pay_6m':
    case 'reg_contact_pay_year':
    case 'reg_contact_fix': {
      await sendWhatsAppMessage(
        from,
        'Personal contacts are no longer offered. Let\'s list your business instead 👇'
      )
      await sendRegisterChoice(from)
      return
    }
    case 'list_publish': {
      if (session?.step === 'list_form') {
        await tryPublishForm(from, session, msgId)
      } else {
        await startImageFirstRegister(from)
      }
      return
    }
    case 'list_edit': {
      if (session?.step === 'list_form') {
        const before = session.data.list || {}
        await saveSession(from, 'list_form', { ...session.data, list: before, wizard: 0 } as ChatSessionData)
        await sendWizardQuestion(from, before, 0, "Let's go through your answers again - *Skip* anything you want to keep.")
      } else {
        await startImageFirstRegister(from)
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
    case 'role_buyer': {
      const name = (await getBotContactName(from)) || ''
      await sendInteractiveButtons(from, renderBuyerIntro(name || undefined), [
        { id: 'menu_needs', title: '🛒 Post a need' },
        { id: 'menu_help', title: '✆ Help' },
        { id: 'role_seller', title: "🏪 I'm a seller" },
      ])
      return
    }
    case 'role_seller':
      await sendRegisterChoice(from)
      return
    case 'menu_help':
      await sendWhatsAppMessage(from, await helpText(from))
      return
    case 'menu_pay':
    case 'pay':
      await sendWhatsAppMessage(
        from,
        'Payments are paused for now. New listings are submitted free and go live when an admin approves them. Send *register* to list your business.'
      )
      return
    case 'pay_existing':
      await sendOwnPayList(from)
      return
    case 'pay_search':
      await startPaySearch(from)
      return
    case 'pay_new':
      await startImageFirstRegister(from)
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
      await sendWhatsAppMessage(from, CANCEL_TEXT)
      return
    // Image-first registration buttons. The plan/trial buttons no longer
    // appear, but old messages may still carry them - treat them as "register".
    case 'reg_plan_trial':
    case 'reg_plan_paid':
      await startImageFirstRegister(from)
      return
    case 'reg_upload':
    case 'reg_skip':
    case 'reg_proceed':
    case 'reg_publish':
    case 'reg_edit':
    case 'reg_talk_admin':
    case 'reg_ask_admin_permission':
    case 'reg_change_phone': {
      const convState = await getConversationState(from)
      if (convState && convState.state.startsWith('REGISTRATION_')) {
        await runRegistrationAction(from, action, convState.context)
        return
      }
      await startImageFirstRegister(from)
      return
    }
    case 'reg_duplicate_photo': {
      const convState = await getConversationState(from)
      const owner =
        typeof convState?.context?.onBehalfOf === 'string'
          ? normalizeRegistrationOwner(convState.context.onBehalfOf)
          : ''
      if (owner) await startImageFirstRegister(from, { onBehalfOf: owner })
      else await startImageFirstRegister(from)
      return
    }
    case 'reg_owner_retry':
      await promptOwnerNumber(from, await isAgent(from))
      return
    case 'reg_cancel':
      await clearConversationState(from)
      await clearSession(from)
      await sendWhatsAppMessage(from, CANCEL_TEXT)
      return
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

  // Category-tree disconnect rows: the id is the index into the list that was
  // actually on screen, never a branch re-derived from the category data.
  const treeCut = action.match(/^tree_cut_([0-9]{1,2})$/)
  if (treeCut) {
    if (!(await isBotAdmin(from))) return
    const cur = session || (await getSession(from))
    const link = cur?.data.treeLinks?.[Number(treeCut[1])]
    if (!link) {
      await sendWhatsAppMessage(from, '⌛ That list expired. Send *category tree* to see the current connections.')
      return
    }
    await saveSession(from, 'admin_tree_disconnect_confirm', {
      ...(cur?.data || {}),
      treeLink: link,
    })
    await sendInteractiveButtons(
      from,
      `Disconnect *${link.child}* from *${link.parent}*?\n\nTheir search results split again.`,
      [
        { id: 'tree_cut_yes', title: '✂️ Disconnect' },
        { id: 'tree_cut_no', title: '✖ Keep' },
      ]
    )
    return
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
  opts?: { replyTo?: string; aliased?: boolean; nationwideTried?: boolean; goalAskDone?: boolean; correctedFrom?: string }
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
  // A category an admin connected to another answers to both names, so either
  // search surfaces the same shops.
  const categoryNames = await connectedCategoryNames(p.term || '', category)

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
  const candidates = scope.filter(b => bizMatchesQuery(b, term, categoryNames))
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

  // Spelling rescue, Google-style: "fertilizer" must still find a listing
  // spelled "Fertiliser" (and vice versa) instead of reporting it unavailable.
  // Runs before the nearby-town tier so a spelling fix keeps the user's town.
  if (results.length === 0 && term.length >= 3 && !opts?.correctedFrom) {
    const approvedCats = await getApprovedCategories()
    for (const variant of searchVariants(term).slice(0, 4)) {
      const variantCategory = matchCategoryAgainst(variant, approvedCats)
      const variantNames = await connectedCategoryNames(variant, variantCategory)
      if (scope.some(b => bizMatchesQuery(b, variant, variantNames))) {
        await runSearchAndReply(
          from,
          { term: variant, city: p.city, nationwide: p.nationwide, origin: p.origin },
          { ...opts, correctedFrom: p.term }
        )
        return
      }
    }
    // Products only: first variant may still name a shelf item whose
    // business is called something else.
    const firstVariant = searchVariants(term)[0]
    if (firstVariant && (await fetchMatchingItems(scope.map(b => b.id), firstVariant)).size > 0) {
      await runSearchAndReply(
        from,
        { term: firstVariant, city: p.city, nationwide: p.nationwide, origin: p.origin },
        { ...opts, correctedFrom: p.term }
      )
      return
    }
  }

  results = results.slice(0, MAX_RESULTS)
  const termDisplay = p.term || category.toLowerCase()

  // Tell the user which spelling we actually searched (only when the
  // corrected query found something).
  if (opts?.correctedFrom && results.length > 0) {
    await sendWhatsAppMessage(
      from,
      `No results for *${opts.correctedFrom}*. Showing results for *${termDisplay}* instead.`,
      opts.replyTo
    )
  }

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
      .filter(b => b.city !== city && bizMatchesQuery(b, term, categoryNames))
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
            bizMatchesQuery(b, alias, categoryNames)
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
  const photos = session?.data.pendingOrder?.photos || []
  const pendingOrder: PendingOrder = {
    groups: groups.map(g => ({
      businessId: g.supplier.businessId,
      businessName: g.supplier.businessName,
      supplierDigits: g.supplier.supplierDigits,
      city: g.supplier.city || undefined,
      lines: g.lines.map(l => ({ name: l.item.name, qty: l.qty, price: l.item.price })),
    })),
    photos,
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
  const photoLine = photos.length
    ? `📸 ${photos.length} photo${photos.length === 1 ? '' : 's'} attached. Send another, or tap ✅ Send order.`
    : '📷 Got a photo for this order? Send it here - optional, I attach it for the shop.'
  await sendWhatsAppMessage(
    from,
    `${renderOrderVerify(pendingOrder.groups)}\n${note}${note ? '\n' : '\n\n'}${photoLine}`
  )
  await sendInteractiveButtons(from, 'Does that look right? Send it, or re-type it.', [
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
    if (row) {
      // Photos live on the order trace (JSONB), so no schema change is needed.
      // The buyer's photo events survive later push/claim events.
      const photos = (pending.photos || []).slice(0, 3)
      if (photos.length) {
        const trace = photos.map(url => ({ event: 'photo', url, at: new Date().toISOString() }))
        await getSupabase().from('supply_orders').update({ trace }).eq('id', row.id)
        row.trace = trace
      }
      rows.push(row)
    }
  }
  if (!rows.length) {
    await sendWhatsAppMessage(from, '⚠️ Could not file the order - try again in a minute.')
    return
  }
  const stranded: SupplyOrderRow[] = []
  for (const row of rows) {
    const ok = await pushOrderToSupplier(row, from)
    if (ok != null) {
      await getSupabase()
        .from('supply_orders')
        .update({ pushed_via: ok ? 'dm' : 'silent' })
        .eq('id', row.id)
    }
    // false = the shop has WhatsApp but has not messaged the bot in 24h, so
    // Meta will not let us open a conversation. The order is filed and the
    // buyer gets a send-now link; admins get told so it is not forgotten.
    if (ok === false) stranded.push(row)
  }
  if (stranded.length) {
    await notifyAdminsText(
      [
        '⏳ *Order not auto-sent*',
        ...stranded.map(r => `• ${r.biz_name} · wa.directory/go/o/${r.token}`),
        `👤 Buyer: +${digitsOnly(from)}`,
        'Shop has not messaged in 24h. The buyer has a one-tap send link; the shop sees it under *orders* next time they chat.',
      ].join('\n')
    )
  }
  await saveSession(from, 'browse', {
    ...session.data,
    pendingOrder: undefined,
    lastScreen: 'list',
    // A committed cart is done — empty it so the next tap starts fresh.
    cart: [],
  })
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

/** Buyer photos stored as trace events on a supply order (max 3). */
function orderPhotoUrls(row: SupplyOrderRow): string[] {
  return ((row.trace || []) as { event?: string; url?: string }[])
    .filter(t => t.event === 'photo' && typeof t.url === 'string' && t.url)
    .map(t => String(t.url))
    .slice(0, 3)
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
  const photos = orderPhotoUrls(row)
  const body = [
    '🧾 *New order on WA Directory*',
    '',
    ...((row.lines || []) as { name: string; qty: number; price: number | null }[]).map(
      l =>
        `• ${l.qty} × ${l.name}` +
        (l.price != null ? ` - ${monoUSD(l.price * l.qty).replace(/`/g, '')} (${monoUSD(l.price).replace(/`/g, '')} each)` : '')
    ),
    '',
    ...(() => {
      const lines = (row.lines || []) as { qty: number; price: number | null }[]
      const total = lines.reduce((sum, l) => sum + (l.price ?? 0) * l.qty, 0)
      return lines.length && lines.every(l => l.price != null)
        ? [`*Total: ${monoUSD(total).replace(/`/g, '')}*`, '']
        : []
    })(),
    '',
    ...(photos.length
      ? [`📸 ${photos.length} photo${photos.length === 1 ? '' : 's'} from the buyer - below.`, '']
      : []),
    '🔒 Buyer contact is hidden until they agree to share it.',
    `Checkout: ${shortUrl}`,
    '',
    'Tap ✅ when you can supply - or 📱 Ask for contact to request their number.',
  ].join('\n')

  if (!digits) {
    await bumpOrderTrace(row.id, { event: 'push-skip', reason: 'voice-only' })
    return null
  }
  const active = await supplierRecentlyActive(digits)
  if (active) {
    try {
      await sendWhatsAppMessage(digits, body)
      await sendInteractiveButtons(digits, 'Can you supply this order?', [
        { id: `oclaim_${row.id}`, title: '✅ I can supply' },
        { id: `ask_contact_${row.id}`, title: '📱 Ask for contact' },
        { id: `ask_photo_${row.id}`, title: '📸 Ask for photo' },
      ])
      for (const [n, url] of photos.entries()) {
        await sendWhatsAppImage(digits, url, `📸 Buyer photo ${n + 1}/${photos.length} · ${orderReference(row.token)}`)
      }
      await bumpOrderTrace(row.id, { event: 'push-dm', at: new Date().toISOString() })
      if (photos.length) {
        await bumpOrderTrace(row.id, { event: 'photos-dm', count: photos.length, at: new Date().toISOString() })
      }
      return true
    } catch {
      // window/escalation failure — fall through to the silent path below
    }
  }
  // Outside the 24h window only an approved template can open the chat.
  // "New order on WA Directory" takes two body vars: the shop name and the
  // order reference (`ORD-<token>`) it tells them to reply *orders* for.
  const tpl = process.env.WHATSAPP_TEMPLATE_ORDER
  if (tpl && !active) {
    try {
      await sendWhatsAppTemplate(digits, tpl, [row.biz_name, orderReference(row.token)])
      await bumpOrderTrace(row.id, { event: 'push-template', at: new Date().toISOString() })
      return true
    } catch {
      // template missing/unapproved — category still listed below
    }
  }
  await bumpOrderTrace(row.id, { event: 'push-skip', reason: 'inactive' })
  return false
}

// Shops know an order by the reference the template showed them (ORD-XXXXXX),
// so every supplier-facing screen uses this same spelling.
function orderReference(token: string): string {
  return `ORD-${String(token || '').toUpperCase()}`
}

async function bumpOrderTrace(id: number, event: Record<string, unknown>) {
  try {
    const row = await getSupplyOrderById(id)
    if (!row) return
    // Append, never overwrite: buyer photo events live in this same trace.
    const trace = [...(row.trace || []), event].slice(-40)
    await getSupabase().from('supply_orders').update({ trace }).eq('id', id)
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

/** Where the price conversation on a row ended up: the last counter event
 * wins, so a later counter after a decline shows as pending again. */
function counterState(row: SupplyOrderRow): 'pending' | 'accepted' | 'declined' | null {
  const last = [...(row.trace || [])]
    .reverse()
    .map(t => String((t as { event?: string }).event || ''))
    .find(e => e === 'counter' || e === 'counter-accepted' || e === 'counter-declined')
  if (!last) return null
  return last === 'counter' ? 'pending' : last === 'counter-accepted' ? 'accepted' : 'declined'
}

/** Order total from the stored lines (the current, possibly countered, price). */
function orderTotal(row: SupplyOrderRow): number {
  return sumLines((row.lines || []) as { qty: number; price: number | null }[])
}

/** Claim a row without dropping the trace (buyer photos live there). */
async function claimOrder(orderId: number): Promise<SupplyOrderRow | null> {
  const existing = await getSupplyOrderById(orderId)
  if (!existing) return null
  if (existing.status !== 'open' && existing.status !== 'sent') return null
  const trace = [...(existing.trace || []), { event: 'claimed', at: new Date().toISOString() }]
  const { data } = await getSupabase()
    .from('supply_orders')
    .update({ status: 'claimed', closed_at: null, trace })
    .eq('id', orderId)
    .in('status', ['open', 'sent'])
    .select('id')
    .maybeSingle()
  if (!data) return null
  return await getSupplyOrderById(orderId)
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
  const claimed = await claimOrder(orderId)
  if (!claimed) {
    await sendWhatsAppMessage(from, 'Already confirmed - the buyer knows.')
    return
  }
  const photos = orderPhotoUrls(claimed)
  const contact = buyerContactState(claimed)
  const buyer = digitsOnly(row.buyer_phone)
  // The buyer's status update repeats the order exactly as they confirmed it:
  // every line with its quantity, the line total and the order total.
  const lines = (row.lines || []) as { name: string; qty: number; price: number | null }[]
  const itemLines = lines.map(
    l =>
      `· ${l.qty} × ${l.name}` +
      (l.price != null ? ` - ${monoUSD(l.price * l.qty).replace(/`/g, '')}` : '')
  )
  const allPriced = lines.length > 0 && lines.every(l => l.price != null)
  const total = lines.reduce((sum, l) => sum + (l.price ?? 0) * l.qty, 0)
  await sendWhatsAppMessage(
    buyer,
    [
      '✅ *Order confirmed*',
      '',
      `🏪 *${row.biz_name}*${row.city ? `, ${row.city}` : ''}`,
      ...itemLines,
      ...(allPriced ? ['', `*Total: ${monoUSD(total).replace(/`/g, '')}*`] : []),
      '',
      digits ? `📱 Shop: +${digits}` : '📱 The shop number is on their listing page.',
      `🧾 Order: wa.directory/go/o/${row.token}`,
    ].join('\n')
  )
  if (digits) {
    await sendCtaUrl(
      buyer,
      `*${row.biz_name}* confirmed your order - say hi and lock in pickup/delivery 🛒`,
      '💬 Chat shop ▸',
      `https://wa.me/${digits}?text=${encodeURIComponent(
        `Hello! I placed order wa.directory/go/o/${row.token}.`
      )}`
    )
  }
  // Optional message for the buyer: a price adjustment, a pickup note, anything.
  await saveSession(from, 'order_note', {
    ...(session?.data || {}),
    order_note_id: row.id,
    order_note_token: row.token,
  })
  await sendInteractiveButtons(
    from,
    (contact === 'shared'
      ? `✅ Noted — buyer contact: +${buyer}.`
      : '✅ Noted — the buyer\'s number stays private until they agree.') +
      '\n\nAnything to change? Send a message, or change the price.',
    [
      { id: `co_price_${row.id}`, title: '💰 Change price' },
      { id: `co_note_${row.id}`, title: '💬 Add a message' },
      { id: 'note_skip', title: '⏭ Skip' },
    ]
  )
  const followUp: { id: string; title: string }[] = []
  if (contact === 'none' || contact === 'asked') {
    followUp.push({ id: `ask_contact_${row.id}`, title: '📱 Ask for contact' })
  }
  followUp.push({ id: `ask_photo_${row.id}`, title: '📸 Ask for photo' })
  await sendInteractiveButtons(from, 'Need anything from the buyer?', followUp)
  // Template-delivered orders never carried the photos; the claim opens a
  // 24h window, so send them now. DM pushes already attached them.
  const photosDelivered = (claimed.trace || []).some(e => (e as { event?: string }).event === 'photos-dm')
  if (photos.length && !photosDelivered) {
    for (const [n, url] of photos.entries()) {
      await sendWhatsAppImage(from, url, `📸 Buyer photo ${n + 1}/${photos.length} · ${row.token}`)
    }
  }
}

/** Where the buyer's contact consent landed. The latest event wins. */
type BuyerContactState = 'none' | 'asked' | 'shared' | 'declined'
function buyerContactState(row: SupplyOrderRow): BuyerContactState {
  const last = [...(row.trace || [])]
    .reverse()
    .map(t => String((t as { event?: string }).event || ''))
    .find(e => e === 'contact-asked' || e === 'contact-shared' || e === 'contact-declined')
  return last === 'contact-asked' ? 'asked' : last === 'contact-shared' ? 'shared' : last === 'contact-declined' ? 'declined' : 'none'
}

/** Supplier taps 📱 Ask for contact: ask the buyer, never reveal by default. */
async function handleAskContact(from: string, orderId: number) {
  const row = await getSupplyOrderById(orderId)
  if (!row) {
    await sendWhatsAppMessage(from, 'That order is gone - send *orders* to see the current ones.')
    return
  }
  const shop = await businessWhatsAppDigits(row.biz_id)
  if (shop && digitsOnly(from) !== shop) {
    await sendWhatsAppMessage(from, 'Only the shop WhatsApp on this order can ask for contact.')
    return
  }
  if (row.status === 'closed') {
    await sendWhatsAppMessage(from, 'That order has expired - the buyer cannot be asked now.')
    return
  }
  const state = buyerContactState(row)
  const buyer = digitsOnly(row.buyer_phone)
  if (state === 'shared') {
    await sendWhatsAppMessage(from, `📱 The buyer already shared their number: +${buyer}`)
    return
  }
  if (state === 'declined') {
    await sendWhatsAppMessage(
      from,
      '🚫 The buyer declined to share their number. You can still send them a message here and I will pass it on.'
    )
    return
  }
  if (state === 'asked') {
    await sendWhatsAppMessage(from, '⏳ Already asked - I will tell you as soon as the buyer answers.')
    return
  }
  if (!buyer) {
    await sendWhatsAppMessage(from, 'This order has no buyer number to ask.')
    return
  }
  await bumpOrderTrace(row.id, { event: 'contact-asked', at: new Date().toISOString() })
  await sendInteractiveButtons(
    buyer,
    `👋 *${row.biz_name}* is asking for your number for order *${row.token}*.\n\nShare it with them?`,
    [
      { id: `contact_yes_${row.id}`, title: '✅ Share number' },
      { id: `contact_no_${row.id}`, title: '🚫 Keep private' },
    ]
  )
  await sendWhatsAppMessage(from, '📨 Asked the buyer - I will tell you as soon as they answer.')
}

/** Supplier taps 📸 Ask for photo: request one product photo from the buyer. */
async function handleAskPhoto(from: string, orderId: number) {
  const row = await getSupplyOrderById(orderId)
  if (!row) {
    await sendWhatsAppMessage(from, 'That order is gone - send *orders* to see the current ones.')
    return
  }
  const shop = await businessWhatsAppDigits(row.biz_id)
  if (shop && digitsOnly(from) !== shop) {
    await sendWhatsAppMessage(from, 'Only the shop WhatsApp on this order can ask for a photo.')
    return
  }
  if (row.status === 'closed') {
    await sendWhatsAppMessage(from, 'That order has expired - the buyer cannot be asked now.')
    return
  }
  const last = [...(row.trace || [])]
    .reverse()
    .map(t => String((t as { event?: string }).event || ''))
    .find(e => e === 'photo-requested' || e === 'photo-sent')
  if (last === 'photo-requested') {
    await sendWhatsAppMessage(from, '⏳ Already asked - I will pass on the photo as soon as the buyer sends it.')
    return
  }
  const buyer = digitsOnly(row.buyer_phone)
  if (!buyer) {
    await sendWhatsAppMessage(from, 'This order has no buyer number to ask.')
    return
  }
  await bumpOrderTrace(row.id, { event: 'photo-requested', at: new Date().toISOString() })
  const buyerSession = await getSession(buyer)
  await saveSession(buyer, buyerSession?.step || 'browse', {
    ...(buyerSession?.data || {}),
    order_photo_request_id: row.id,
  })
  await sendWhatsAppMessage(
    buyer,
    `📸 *${row.biz_name}* wants a photo of the product for order *${row.token}*.\n\nSend it here and I will pass it to them.`
  )
  await sendWhatsAppMessage(from, '📸 Asked the buyer for a product photo - I will forward it when it arrives.')
}

/** Buyer taps Share / Keep private on a supplier's contact request. */
async function handleContactConsent(from: string, yes: boolean, orderId: number) {
  const row = await getSupplyOrderById(orderId)
  if (!row) {
    await sendWhatsAppMessage(from, 'That order is gone - nothing was shared.')
    return
  }
  if (digitsOnly(row.buyer_phone) !== digitsOnly(from)) {
    await sendWhatsAppMessage(from, 'Only the buyer on this order can answer that.')
    return
  }
  const state = buyerContactState(row)
  if (state === 'shared') {
    await sendWhatsAppMessage(from, '✅ You already shared your number on this order.')
    return
  }
  if (state === 'declined') {
    await sendWhatsAppMessage(from, '👍 You already kept your number private on this order.')
    return
  }
  const shop = await businessWhatsAppDigits(row.biz_id)
  const buyer = digitsOnly(row.buyer_phone)

  if (!yes) {
    await bumpOrderTrace(row.id, { event: 'contact-declined', at: new Date().toISOString() })
    await sendWhatsAppMessage(from, '👍 Okay - your number was not shared.')
    if (shop) {
      await sendWhatsAppMessage(
        shop,
        `🚫 The buyer for order *${orderReference(row.token)}* chose not to share their number. You can still send them a message here and I will pass it on.`
      )
    }
    return
  }

  await bumpOrderTrace(row.id, { event: 'contact-shared', at: new Date().toISOString() })
  await sendWhatsAppMessage(from, `✅ Shared - *${row.biz_name}* can now WhatsApp you.`)
  if (shop) {
    await sendWhatsAppMessage(
      shop,
      `📱 The buyer for order *${orderReference(row.token)}* shared their number: +${buyer}\nSay hi and lock in pickup or delivery.`
    )
  }
}

/** Rewrite the order's prices to the shop's counter-offer and ask the buyer to
 * accept or decline. The totals the buyer sees are the stored ones. */
async function applyCounterPrices(
  from: string,
  session: ChatSession,
  row: SupplyOrderRow,
  prices: number[]
) {
  const oldLines = (row.lines || []).map(l => ({ ...l }))
  const newLines = oldLines.map((l, n) => ({ name: l.name, qty: l.qty, price: prices[n] }))
  const oldTotal = sumLines(oldLines)
  const newTotal = sumLines(newLines)
  const trace = [...(row.trace || []), { event: 'counter', at: new Date().toISOString(), oldTotal, newTotal, oldLines }]
  await getSupabase().from('supply_orders').update({ lines: newLines, trace }).eq('id', row.id)

  const buyer = digitsOnly(row.buyer_phone)
  if (buyer) {
    await sendWhatsAppMessage(
      buyer,
      [
        `💰 *${row.biz_name}* changed the price on your order`,
        `🧾 wa.directory/go/o/${row.token}`,
        '',
        ...newLines.map(l =>
          `· ${l.qty} × ${l.name} - ${monoUSD((l.price ?? 0) * l.qty).replace(/`/g, '')}`
        ),
        '',
        `*New total: ${monoUSD(newTotal).replace(/`/g, '')}* (was ${monoUSD(oldTotal).replace(/`/g, '')})`,
        '',
        'Accept the new price, or decline and the original price stands.',
      ].join('\n')
    )
    await sendInteractiveButtons(buyer, 'Your call:', [
      { id: `co_yes_${row.id}`, title: '✅ Accept' },
      { id: `co_no_${row.id}`, title: '❌ Decline' },
    ])
  }

  await resetForNewSearch(from, session)
  await sendWhatsAppMessage(
    from,
    buyer
      ? `📤 Sent to the buyer: *${monoUSD(newTotal).replace(/`/g, '')}*, up from *${monoUSD(oldTotal).replace(/`/g, '')}*. Nothing changes until they accept.`
      : 'Saved, but this order has no buyer number to ask.'
  )
}

/** Buyer taps Accept / Decline on a counter-price. Accept keeps the new lines;
 * decline restores the prices captured when the counter was made. */
async function answerCounter(from: string, orderId: number, accept: boolean) {
  const row = await getSupplyOrderById(orderId)
  if (!row) {
    await sendWhatsAppMessage(from, 'That order is gone - send *orders* to see the current ones.')
    return
  }
  if (digitsOnly(row.buyer_phone) !== digitsOnly(from)) {
    await sendWhatsAppMessage(from, 'Only the buyer on this order can answer.')
    return
  }
  const counters = (row.trace || []).filter(
    (t): t is { event: string; oldTotal: number; newTotal: number; oldLines: SupplyOrderLine[] } =>
      (t as { event?: string }).event === 'counter'
  )
  const last = counters[counters.length - 1]
  if (!last) {
    await sendWhatsAppMessage(from, 'There is no price change on this order.')
    return
  }
  const shopPhone = await businessWhatsAppDigits(row.biz_id)
  const lines = accept ? (row.lines || []) : (last.oldLines || [])
  const total = sumLines(lines)
  const trace = [
    ...(row.trace || []),
    { event: accept ? 'counter-accepted' : 'counter-declined', at: new Date().toISOString() },
  ]
  await getSupabase().from('supply_orders').update({ lines, trace }).eq('id', row.id)

  await sendWhatsAppMessage(
    from,
    accept
      ? `✅ Price accepted. Your order with *${row.biz_name}* stands at *${monoUSD(total).replace(/`/g, '')}*.`
      : `👍 Declined. The original price stands at *${monoUSD(total).replace(/`/g, '')}* - chat the shop if you want to settle on something else.`
  )
  if (shopPhone) {
    await sendWhatsAppMessage(
      shopPhone,
      accept
        ? `✅ The buyer accepted your price for wa.directory/go/o/${row.token}: *${monoUSD(total).replace(/`/g, '')}*. Confirm delivery details with them.`
        : `❌ The buyer declined your price for wa.directory/go/o/${row.token}. The original *${monoUSD(total).replace(/`/g, '')}* stands - message them if you want to negotiate.`
    )
  }
  await notifyAdminsText(
    [
      accept ? '💰 *Counter-price accepted*' : '❌ *Counter-price declined*',
      `• ${row.biz_name} · wa.directory/go/o/${row.token}`,
      `• Buyer: +${digitsOnly(row.buyer_phone)}`,
      `• ${accept ? 'New' : 'Original'} total: ${monoUSD(total).replace(/`/g, '')}`,
    ].join('\n')
  )
}

/** WhatsApp digits for a business id ('' when voice-only / unknown). */
async function businessWhatsAppDigits(bizId: string | null): Promise<string> {
  if (!bizId) return ''
  const { data } = await getSupabase()
    .from('businesses')
    .select('phone, phone_type, whatsapp_link')
    .eq('id', bizId)
    .maybeSingle()
  const b = data as { phone: string | null; phone_type: string | null; whatsapp_link: string | null } | null
  return b ? await cartWaDigits(b.phone_type, b.phone || '', b.whatsapp_link) : ''
}

/** Relay a supplier's note (often a new price) to the buyer of a confirmed
 * order, and keep a copy on the order so admins can see what was said. */
async function relayOrderNote(from: string, session: ChatSession, text: string) {
  const orderId = Number(session.data.order_note_id)
  const order = Number.isFinite(orderId) && orderId > 0 ? await getSupplyOrderById(orderId) : null
  if (!order) {
    await resetForNewSearch(from, session)
    await sendWhatsAppMessage(from, 'That order is no longer open - send *orders* to see the current ones.')
    return
  }
  const note = text.trim().slice(0, 600)
  if (!note) return
  const buyer = digitsOnly(order.buyer_phone)
  if (buyer) {
    await sendWhatsAppMessage(
      buyer,
      [
        `💬 *${order.biz_name}* added a note to your order`,
        `🧾 wa.directory/go/o/${order.token}`,
        '',
        note,
      ].join('\n')
    )
  }
  // Keep the note with the order (best effort) for the admin view.
  try {
    const existing = (order as { note?: string | null }).note || ''
    await getSupabase()
      .from('supply_orders')
      .update({ note: [existing, note].filter(Boolean).join('\n') })
      .eq('id', order.id)
  } catch {}
  await resetForNewSearch(from, session)
  await sendWhatsAppMessage(
    from,
    buyer ? '📤 Sent - the buyer has your note.' : 'Saved, but this order has no buyer number to message.'
  )
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
    const photoCount = orderPhotoUrls(r).length
    const contact = buyerContactState(r)
    lines.push(
      `*${orderReference(r.token)}* · ${contact === 'shared' && r.buyer_phone ? '+' + digitsOnly(r.buyer_phone) : '🔒 buyer number private'}`
    )
    lines.push(`↳ ${summary}`)
    const bits = [
      `*${monoUSD(orderTotal(r)).replace(/`/g, '')}*`,
      photoCount ? `📸 ${photoCount} photo${photoCount === 1 ? '' : 's'}` : '',
      (() => {
        const c = counterState(r)
        if (c === 'pending') return '💰 your new price: awaiting buyer'
        if (c === 'accepted') return '💰 new price accepted'
        if (c === 'declined') return '💰 new price declined - original stands'
        return ''
      })(),
    ].filter(Boolean)
    if (bits.length) lines.push(`   ↳ ${bits.join(' · ')}`)
    lines.push('')
  }
  await sendWhatsAppMessage(from, lines.join('\n'))
  await sendInteractiveButtons(
    from,
    'Tap to confirm an order - the buyer is notified instantly.',
    allRows.slice(0, 3).map(r => ({ id: `oclaim_${r.id}`, title: `✅ ${orderReference(r.token)}` }))
  )
  const photoRows = allRows.slice(0, 3).filter(r => orderPhotoUrls(r).length)
  if (photoRows.length) {
    await sendWhatsAppMessage(
      from,
      `📸 See the buyer's photos: reply */photos ${orderReference(photoRows[0].token)}*` +
        (photoRows.length > 1
          ? `\nOther orders with photos: ${photoRows.slice(1).map(r => `*${orderReference(r.token)}*`).join(', ')}`
          : '')
    )
  }
}

/** `/photos CODE` for a shop: the buyer's attachments on one open order. */
async function sendOrderPhotos(from: string, tokenArg: string) {
  const digits = digitsOnly(from)
  const { data: bizRows } = await getSupabase()
    .from('businesses')
    .select('id')
    .or(`phone.ilike.${digits},phone.ilike.+${digits},phone.ilike.%${digits}`)
    .limit(3)
  const bizIds = ((bizRows || []) as { id: string }[]).map(b => b.id)
  if (!bizIds.length) {
    await sendWhatsAppMessage(from, 'No shop synced to this WhatsApp number yet. List yours first - *menu*.')
    return
  }

  const token = (tokenArg || '').trim().toUpperCase()
  if (token) {
    const row = await getOrderByToken(token)
    if (!row || !row.biz_id || !bizIds.includes(row.biz_id)) {
      await sendWhatsAppMessage(from, `I can't find order *${orderReference(token)}* on your shop.`)
      return
    }
    const photos = orderPhotoUrls(row)
    if (!photos.length) {
      await sendWhatsAppMessage(from, `Order *${orderReference(row.token)}* has no buyer photos.`)
      return
    }
    for (const [n, url] of photos.entries()) {
      await sendWhatsAppImage(from, url, `📸 ${row.biz_name} · ${orderReference(row.token)} · photo ${n + 1}/${photos.length}`)
    }
    return
  }

  const rows: SupplyOrderRow[] = []
  for (const id of bizIds) rows.push(...(await listOrdersForBusiness(id, 3)))
  const withPhotos = rows.filter(r => orderPhotoUrls(r).length)
  if (!withPhotos.length) {
    await sendWhatsAppMessage(from, 'No buyer photos on your open orders.')
    return
  }
  if (withPhotos.length > 1) {
    await sendWhatsAppMessage(
      from,
      [
        '📸 Which order? Reply */photos CODE*:',
        ...withPhotos.map(r => `• *${orderReference(r.token)}* - ${orderPhotoUrls(r).length} photo${orderPhotoUrls(r).length === 1 ? '' : 's'}`),
      ].join('\n')
    )
    return
  }
  const row = withPhotos[0]
  const photos = orderPhotoUrls(row)
  for (const [n, url] of photos.entries()) {
    await sendWhatsAppImage(from, url, `📸 ${row.biz_name} · ${row.token} · photo ${n + 1}/${photos.length}`)
  }
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
    renderMyOrders(
      rows.map(r => ({
        biz_name: r.biz_name,
        status: r.status,
        token: r.token,
        total: orderTotal(r),
        counter: counterState(r),
      }))
    )
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

  // Keep the exact products the card printed (same order) so a typed number
  // can add one to the cart. The typed-order flow also latches onto this shop:
  // a bare `order` line prefers its shelf over the whole directory.
  const shownItems = ((itemRows as { id: string; name: string; price: number | null }[] | null) || []).map(
    i => ({ id: i.id, name: i.name, price: i.price })
  )
  await saveSession(from, 'browse', {
    ...session.data,
    lastScreen: 'detail',
    lastBizId: b.id,
    detailItems: shownItems,
  })

  // One message, not three: the card and its buttons ride together when the
  // text fits WhatsApp's 1024-char interactive body, and directions live in
  // the card as a plain link instead of a separate CTA message.
  let msg = renderDetailCard({
    name: b.name,
    slug: b.slug,
    city: b.city,
    area: b.area,
    rating: b.rating,
    reviewCount: b.review_count,
    items: shownItems,
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
  // 🧭 Directions — a bare link inside the card. Coords give a Google Maps
  // route; otherwise a place search from name + area + city.
  const hasCoords = b.lat != null && b.lng != null
  const placeBits = [b.name, b.area, b.city, 'Zimbabwe'].filter(Boolean)
  if (hasCoords || (b.name && (b.area || b.city))) {
    const directionsUrl = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeBits.join(', '))}`
    msg += `\n\n🧭 *Directions*\n${directionsUrl}`
  }

  // Buttons: browse, chat and the single-photo pick-list. Voice-only listings
  // have nothing to chat with, so they skip that one.
  const digits = (b.phone || '').replace(/[^0-9]/g, '')
  const buttons: InteractiveButton[] =
    digits && b.phone_type !== 'voice'
      ? [
          { id: `browse_items_detail_${b.id}`, title: '🧺 Browse all items' },
          { id: `cta_chat_${b.id}`, title: '💬 Chat on WhatsApp' },
          { id: `photo_pick_${b.id}`, title: '📸 See a photo' },
        ]
      : [
          { id: `browse_items_detail_${b.id}`, title: '🧺 Browse all items' },
          { id: `photo_pick_${b.id}`, title: '📸 See a photo' },
        ]

  if (msg.length <= 1024) {
    // One message: profile + buttons, so the buttons can never drift away
    // from the shop they belong to.
    await sendInteractiveButtons(from, msg, buttons)
  } else {
    // Long profile (many areas/socials): the text goes alone, buttons follow.
    await sendWhatsAppMessage(from, msg)
    await sendInteractiveButtons(from, 'What next?', buttons)
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

/** 💬 Chat on WhatsApp.
 *
 * The old CTA opened the /go redirect in WhatsApp's in-app browser, which
 * handed the wa.me link to the phone's DEFAULT WhatsApp handler. Anyone using
 * WhatsApp Business was pushed into personal WhatsApp. A WhatsApp contact
 * card is handled inside the app the customer is already in, so the message
 * button opens WhatsApp Business instead. */
async function handleCtaChat(from: string, businessId: string) {
  const { data: b } = await getSupabase()
    .from('businesses')
    .select('id, name, phone, phone_type')
    .eq('id', businessId)
    .maybeSingle()
  if (!b) {
    await sendWhatsAppMessage(from, 'That listing is not available anymore. Type your search again.')
    return
  }
  const name = b.name || 'this shop'
  const digits = digitsOnly(b.phone || '')
  if (!digits || b.phone_type === 'voice') {
    await sendWhatsAppMessage(
      from,
      digits
        ? `☎️ *${name}* is call-only. Call ${formatPhone(digits)}.`
        : `*${name}* has not shared a direct number yet. Browse their items here and I'll keep you posted.`
    )
    return
  }
  const intl = digits.startsWith('263')
    ? digits
    : digits.startsWith('0')
      ? `263${digits.slice(1)}`
      : digits
  await sendContactCard(from, name, intl)
  await sendWhatsAppMessage(
    from,
    [
      `💬 *Chat with ${name}*`,
      '',
      'Tap the contact above, then *Message* to open the chat.',
      'This stays in the app you are using - WhatsApp Business included - so you are not pushed into personal WhatsApp.',
      '',
      `Number: +${intl}`,
    ].join('\n')
  )
}

async function handleAddToCart(from: string, session: ChatSession | null, itemId: string, msgId?: string) {
  // A tap can arrive long after the browse session expired; the item id in the
  // button is enough to start the cart, so never drop the tap on a null session.
  session = await loadCartSession(from, session)
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

  const updatedData = addToCart(session?.data || {}, {
    businessId: item.business_id,
    businessName: (item.businesses as any)?.name || 'Shop',
    itemId: item.id,
    itemName: item.name,
    price: item.price || 0,
    qty: 1,
    imageUrl: item.image_url || undefined,
  })

  await saveSession(from, session?.step || 'idle', updatedData)
  await sendInteractiveButtons(
    from,
    `✅ Added *${item.name}* to your cart.`,
    [
      { id: 'view_cart', title: '🛒 View cart' },
      { id: 'new_search', title: '🔍 Search more' },
    ]
  )
}

/** Cart handlers can arrive with no in-memory session (a shelved or 'idle'
 * row reads as none) while the cart itself still lives on that row. */
async function loadCartSession(from: string, session: ChatSession | null): Promise<ChatSession | null> {
  return session ?? (await getSession(from))
}

/** Cart text: numbered lines so the pick-list below can refer to them, with
 * quantities and per-shop subtotals. */
function renderCartBody(summary: ReturnType<typeof getCartSummary>): string {
  let n = 0
  const lines = [`🛒 *Your Cart* (${summary.totalItems} item${summary.totalItems === 1 ? '' : 's'})`, '']
  for (const group of summary.groups) {
    lines.push(`🏪 *${group.businessName}* - ${monoUSD(group.subtotal).replace(/`/g, '')}`)
    for (const item of group.items) {
      n += 1
      lines.push(`  ${n}. ${item.itemName} ×${item.qty} - ${monoUSD(item.price * item.qty).replace(/`/g, '')}`)
    }
    lines.push('')
  }
  lines.push(`*Grand Total: ${monoUSD(summary.grandTotal).replace(/`/g, '')}*`)
  return lines.join('\n')
}

/** One cart line's quantity screen: ➕ / ➖ / remove, three buttons exactly. */
async function sendCartItemScreen(from: string, data: ChatSessionData, itemId: string) {
  const item = getCart(data).find(c => c.itemId === itemId)
  if (!item) {
    await sendWhatsAppMessage(from, 'That item is no longer in your cart.')
    return
  }
  await sendInteractiveButtons(
    from,
    [
      `*${item.itemName}*`,
      `🏪 ${item.businessName}`,
      '',
      `Quantity: *${item.qty}* · ${monoUSD(item.price * item.qty).replace(/`/g, '')}`,
      '',
      'Tap ➕ or ➖ to change it, or 🛒 *cart* to see the whole cart.',
    ].join('\n'),
    [
      { id: `cart_inc_${item.itemId}`, title: '➕ Add one' },
      { id: `cart_dec_${item.itemId}`, title: '➖ Remove one' },
      { id: `cart_del_${item.itemId}`, title: '🗑 Remove' },
    ]
  )
}

async function handleViewCart(from: string, session: ChatSession | null) {
  session = await loadCartSession(from, session)
  const summary = getCartSummary(session?.data || {})
  if (!summary.totalItems) {
    await sendWhatsAppMessage(
      from,
      '🛒 Your cart is empty.\nSearch for a shop, open an item and tap *Add to cart* - or send *menu*.'
    )
    return
  }

  const items = summary.groups.flatMap(g => g.items)
  const body = renderCartBody(summary)
  // The pick-list body shares WhatsApp's 1024-char cap with the text above it,
  // so a big cart gets a compact header and keeps the numbered rows instead.
  const listBody =
    body.length <= 900
      ? `${body}\n\nTap an item to change its quantity.`
      : `🛒 *Your Cart* (${summary.totalItems} item${summary.totalItems === 1 ? '' : 's'}) · ${monoUSD(summary.grandTotal).replace(/`/g, '')} from ${summary.groups.length} shop${summary.groups.length === 1 ? '' : 's'}\n\nTap an item to change its quantity.`

  await sendInteractiveList(
    from,
    listBody,
    items.slice(0, 10).map((item, i) => ({
      id: `cart_item_${item.itemId}`,
      title: `${i + 1}. ${item.itemName}`,
      description: `×${item.qty} · ${monoUSD(item.price * item.qty).replace(/`/g, '')}`,
    })),
    'Change quantity'
  )

  await sendInteractiveButtons(from, 'Ready to order?', [
    { id: 'checkout_cart', title: '✅ Send all orders' },
    { id: 'clear_cart', title: '🗑️ Clear cart' },
    { id: 'new_search', title: '🔍 Search more' },
  ])
}

async function handleCheckoutCart(from: string, session: ChatSession | null) {
  session = await loadCartSession(from, session)
  const summary = getCartSummary(session?.data || {})
  if (!summary.totalItems) {
    await sendWhatsAppMessage(
      from,
      '🛒 Nothing to send yet - add an item first, then reply *checkout*.'
    )
    return
  }

  // Resolve each shop's WhatsApp target and town once, then hand the cart to
  // the same verify screen the typed-order flow uses — so the quantities the
  // buyer just set are what the confirm card, the supply_orders rows and the
  // supplier message all show. Nothing is sent until they confirm.
  const { data: shopRows } = await getSupabase()
    .from('businesses')
    .select('id, phone, phone_type, whatsapp_link, city')
    .in('id', summary.groups.map(g => g.businessId))
  const shops = new Map(
    (
      (shopRows as
        | { id: string; phone: string | null; phone_type: string | null; whatsapp_link: string | null; city: string | null }[]
        | null) || []
    ).map(r => [r.id, r])
  )

  const groups: PendingGroup[] = []
  for (const group of summary.groups) {
    const shop = shops.get(group.businessId)
    groups.push({
      businessId: group.businessId,
      businessName: group.businessName,
      supplierDigits: shop
        ? await cartWaDigits(shop.phone_type, shop.phone || '', shop.whatsapp_link)
        : '',
      city: shop?.city || undefined,
      lines: group.items.map(i => ({ name: i.itemName, qty: i.qty, price: i.price })),
    })
  }

  const photos = session?.data.pendingOrder?.photos || []
  const pendingOrder: PendingOrder = { groups, photos }
  await saveSession(from, 'order', { ...(session?.data || {}), pendingOrder })
  await sendWhatsAppMessage(
    from,
    `${renderOrderVerify(groups, 'Tap ✅ to send these orders, or 🛒 to change quantities.')}\n\n` +
      (photos.length
        ? `📸 ${photos.length} photo${photos.length === 1 ? '' : 's'} attached. Send another, or tap ✅ Send all orders.`
        : '📷 Got a photo for this order? Send it here - optional, the shop will see it.') +
      '\nNothing is sent until you confirm.'
  )
  await sendInteractiveButtons(from, 'Send these orders to the shops?', [
    { id: 'osend', title: '✅ Send all orders' },
    { id: 'cart_edit', title: '🛒 Edit quantities' },
  ])
}

async function handleClearCart(from: string, session: ChatSession | null) {
  session = await loadCartSession(from, session)
  if (!session || !getCartSummary(session.data).totalItems) {
    await sendWhatsAppMessage(from, '🛒 Your cart is already empty.')
    return
  }
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
    // The owner's own wording travels with the listing so an ambiguous
    // category becomes an admin request, not a silent guess.
    requestedCategory: typeof data.list?.requested_category === 'string' ? data.list.requested_category : undefined,
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

  // Auto-request unapproved category / city / area so admins can review them
  // (same mechanism as the web form's feature requests; a verified business
  // auto-approves its pending location requests).
  if (businessId) {
    const { data: bizRow } = await getSupabase()
      .from('businesses')
      .select('name, business_id, category, city, location, phone')
      .eq('id', businessId)
      .maybeSingle()
    const cats = Array.isArray(bizRow?.category) ? (bizRow!.category as string[]) : []
    const newRequests = await autoRequestUnapprovedFeatures(businessId, {
      categories: cats,
      city: city || '',
      areas: area ? [area] : [],
    })
    if (newRequests.length && process.env.ADMIN_WHATSAPP) {
      const notice = adminRequestNotice(bizRow?.name || '', bizRow?.business_id || '', newRequests)
      if (notice) {
        await sendAdminNotice(
          process.env.ADMIN_WHATSAPP,
          notice,
          reviewRequestButtons(bizRow?.name || '')
        ).catch(() => {})
      }
    }
  }

  // ✅ React to the tap the user sent — a lightweight thumbs-up confirmation
  // that the form truly landed before the long status message arrives.
  if (msgId) await sendReaction(from, msgId, '✅').catch(() => {})

  // Payments are paused: every listing is submitted for approval and goes
  // live when an admin approves it. Never ask for EcoCash at sign-up.
  await sendWhatsAppMessage(
    from,
    [
      '🎉 *Submitted for Approval!*',
      '',
      `Your business "${name}" is now pending review.`,
      'No payment is needed. Once an admin approves it you will get a confirmation here.',
      '',
      ...(result.isYellowPages
        ? ['⭐ Public-service listing: our team verifies it fast.', '']
        : []),
      '📸 *After go-live:* send product photos with a caption that includes the product name and price (e.g. *bread $2*), and add details like *"i make home deliveries and customize cakes to your liking"*.',
      'The bot will list the items, quote descriptions, bold names, and show prices in US dollars.',
      '',
      '📸 *Photo tips:* While optional, we strongly recommend uploading original photos of your actual products - this builds customer trust. Please avoid internet-sourced or AI-generated images. If we detect non-original images, they may be removed.',
      '',
      `✏️ Save this link to edit your listing later:`,
      `${SITE_URL}/edit?token=${token}`,
      '',
      `🔐 Inside your portal (opens a web page): edit your listing & website, business card + QR code templates, stats, conversations.`,
      `${SITE_URL}/account-setup?token=${token}`,
      '',
      `📱 Your QR codes (chat + portal): print them for customers:`,
      `${SITE_URL}/my-qr/${slug}`,
      '',
      'Reply *help* anytime.',
    ].join('\n')
  )

  // One-time channel pitch while the registration window is open: this is
  // where live buyer needs surface, and quoting is one reply.
  const chLink = await channelLinkRaw()
  if (chLink) {
    await sendWhatsAppMessage(from, renderChannelPitch(chLink)).catch(() => {})
  }

  if (ADMIN_WHATSAPP) {
    sendAdminNotice(
      ADMIN_WHATSAPP,
      submissionNoticeBody({
        title: result.isYellowPages
          ? '🚨 YELLOW PAGES SUBMISSION: VERIFY FAST'
          : '🆕 NEW BUSINESS PENDING VERIFICATION',
        name,
        code: result.businessId,
        category: result.categories.join(', '),
        location: result.city || '',
        phone,
        extra: [
          ...(result.isYellowPages
            ? ['Public-service listing: verify ASAP for the Emergency & Essential strip.']
            : []),
        ],
      }),
      pendingVerificationButtons(name)
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
        // Unknown town: accept it (it goes to admin for review) instead of
        // looping the user. createListing keeps it as a pending city.
        const newCity = sanitizeLocationInput(t)
        if (!newCity) {
          const cities = zimbabweCities.slice(0, 8).map(c => c.name).join(', ')
          await sendWhatsAppMessage(from, `I couldn't find that town. Pick one:\n\n${cities}...\n\nOr type *whole country*`)
          break
        }
        const merged: ChatSessionData = { ...data, city: newCity, area: '' }
        await saveSession(from, 'area', merged)
        await sendWhatsAppMessage(
          from,
          `🆕 You're the first business we've seen in *${newCity}* — we'll send it to our admin to verify. Once approved, other businesses there can be listed too.\n\nWhich area of *${newCity}* is your business in? (or type *skip*)`
        )
        break
      }
      const cityObj = zimbabweCities.find(c => c.name === city)
      if (cityObj && cityObj.areas.length > 0) {
        await saveSession(from, 'area', { ...data, city })
        // Admin-approved DB areas for this city join the static dataset.
        const dbAreas = Array.from(await getApprovedAreaNames(city))
        const allAreas = Array.from(new Set([...cityObj.areas, ...dbAreas]))
        const areas = allAreas.slice(0, 12).join(', ')
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
        // Unknown area: accept it (admin review) instead of looping.
        const newArea = sanitizeLocationInput(t)
        if (!newArea) {
          await sendWhatsAppMessage(from, `I couldn't match that area in *${city}*. Type one of the areas listed, or *skip*.`)
          break
        }
        const merged: ChatSessionData = { ...data, area: newArea }
        await saveSession(from, 'confirm', merged)
        await sendWhatsAppMessage(
          from,
          `🆕 You're the first business we've seen in *${newArea}, ${city}* — we'll send it to our admin to verify. Once approved, other businesses there can be listed too.`
        )
        await sendConfirmation(from, merged)
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
      // An unknown or stale tap is not a reason to dump the help manual or
      // wipe the session — just point at the menu.
      await sendWhatsAppMessage(
        from,
        'That option has expired. Send *menu* to see what I can do, or just type what you need.'
      )
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

// A limit notice at most once per six hours per number: a customer mid-flow
// should hear when AI comes back, not on every message.
const AI_NOTICE_TTL_MS = 6 * 60 * 60 * 1000

async function maybeNoticeAiLimit(from: string): Promise<void> {
  if (!from) return
  const key = `ai_notice:${digitsOnly(from)}`
  const last = await getBotSetting(key)
  if (last) {
    const at = new Date(last).getTime()
    if (Number.isFinite(at) && Date.now() - at < AI_NOTICE_TTL_MS) return
  }

  const status = await getAiLimitStatus()
  if (!status.limited || !status.resetAt) return

  await sendWhatsAppMessage(from, renderAiLimitNotice(status.resetAt))
  await setBotSetting(key, new Date().toISOString())
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

    // Delivery receipts (sent → delivered → read, or failed with a reason) are
    // the only proof an outbound message reached the phone — Meta accepts a
    // send even when the recipient never gets it. Log them so a silent failure
    // is diagnosable instead of invisible.
    if (Array.isArray(value?.statuses)) {
      for (const st of value.statuses) {
        const err = st?.errors?.[0]
        console.log(
          `[delivery] ${st?.id || '?'} -> ${st?.status || '?'}${err ? ` (${err.code}: ${err.title || err.message || ''})` : ''}`
        )
      }
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    }

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

        // AI out of quota: one short notice with the exact time it is back,
        // sent alongside the normal reply so nothing else is delayed.
        maybeNoticeAiLimit(from).catch(() => {})

        // Word-for-word inbound record (fail-open) for the admin transcript
        // view. Taps keep the button/list label the human actually saw (the
        // raw id alone reads as gibberish) and photos keep Meta's media id so
        // the portal can render the picture instead of the word "Photo".
        const tapTitle =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title ||
          ''
        const inboundMediaId =
          (mediaKind === 'image' && message.image?.id) ||
          (mediaKind === 'audio' && message.audio?.id) ||
          ''
        logBotMessage(
          from,
          'in',
          text ? 'text' : mediaKind === 'audio' ? 'voice' : mediaKind === 'image' ? 'image' : location ? 'location' : action ? 'tap' : 'other',
          text ||
            (tapTitle ? `${tapTitle} [${action}]` : action) ||
            (inboundMediaId
              ? `wa-media:${inboundMediaId}${mediaKind === 'audio' ? '\n[voice note]' : ''}`
              : `[${mediaKind === 'audio' ? 'voice note' : mediaKind === 'image' ? 'photo' : 'location'}]`)
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
        const fromIsAdmin = await isBotAdmin(from)

        // ── Human takeover gate ─────────────────────────────────────────
        // Held sessions relay inbound messages to the admins instead of
        // driving bot flows, whatever step the chat was on when it was held.
        // stop-opt-out was handled before this point, so an admin hold never
        // blocks opt-out. contactSession (not session) is used because
        // idle-step rows are nulled just above.
        if (contactSession?.data?.held) {
          // Admins can still run the commands that manage the hold (notably
          // `release`), even when the held chat is their own.
          if (!fromIsAdmin || !/^(?:release|reply|respond|say|hold|admin)\b/i.test(text)) {
            await relayHeldMessage(from, text, action, mediaKind, location)
            continue
          }
        }

        // A request for a person holds the chat and alerts the admins. This
        // sits before every flow (and before the agent gate) so "help"
        // mid-registration still reaches a human instead of cancelling.
        // Admins get the same handover for a real ask ("I need help"), but a
        // bare `help` stays the admin help command instead of holding their
        // own chat and locking them out of the bot.
        const adminHelpCommand = /^(?:help|help me|support|assistance|assist me)[\s.!]*$/i.test(text)
        if (text && isSupportRequest(text) && (!fromIsAdmin || !adminHelpCommand)) {
          await startSupportHandoff(from, text, session || contactSession, waName)
          continue
        }

        // ── Field agents: register other people's businesses only ──────
        // They are checked before the admin suite: an agent is never an
        // admin, so they get no notices and no other commands.
        if (!fromIsAdmin && (await isAgent(from))) {
          const agentPhoto =
            mediaKind === 'image' && inboundMediaId
              ? {
                  id: inboundMediaId,
                  caption: String(
                    (message.image as { caption?: string } | undefined)?.caption || ''
                  ),
                  messageId: msgId,
                }
              : null
          if (await handleAgentTurn(from, session, text, action, agentPhoto)) continue
        }

        // ── Admin command suite (owner + allowlisted numbers) ───────────
        if (fromIsAdmin) {
          // The owner-number step belongs to both admins and agents.
          if (session?.step === 'admin_add_business' && text) {
            if (await handleOwnerNumberEntry(from, text, session)) continue
          }
          // A tapped admin button carries its command in the id, so treat the
          // tap exactly like the typed line it stands for. Only our own admin
          // button ids are routed this way: other taps (menus, bids) must not
          // collide with commands like "reset" or "hold".
          const menuCommand = adminMenuCommand(action)
          const adminTap =
            menuCommand ||
            (/^(?:verify|unverify|trial|pending|requests|reqs|approve req|reject req|connect req)\b/i.test(
              action
            )
              ? action
              : '')
          if (await handleAdminCommand(from, text || adminTap)) {
            continue
          }
          // A pending/verify list was the last thing on screen, so a bare
          // number is the pick the list asked for - not a stray message for
          // the generic handler to answer with "that option has expired".
          const adminPick = text.trim().match(/^([1-9][0-9]?)$/)
          if (session?.step === 'admin_pending' && adminPick) {
            const pendingOp = session.data.pendingOp
            const op = pendingOp === 'unverify' || pendingOp === 'trial' ? pendingOp : 'verify'
            if (await handleAdminCommand(from, `${op} ${adminPick[1]}`)) {
              continue
            }
          }
          // Admins fall through: their phone works as a normal user too.
        }

        // ── Supplier's counter-price on a confirmed order ───────────────
        if (session?.step === 'order_counter') {
          if (!text) continue
          if (/^(?:skip|cancel|no|none)$/i.test(lower.trim())) {
            await resetForNewSearch(from, session)
            await sendWhatsAppMessage(from, '👍 Prices left as they were.')
            continue
          }
          const orderId = Number(session.data.order_counter_id)
          const row = Number.isFinite(orderId) ? await getSupplyOrderById(orderId) : null
          if (!row) {
            await resetForNewSearch(from, session)
            await sendWhatsAppMessage(from, 'That order is no longer open - send *orders* to see the current ones.')
            continue
          }
          const lines = (row.lines || []) as { name: string; qty: number; price: number | null }[]
          const prices = parseCounterPrices(text, lines)
          if (!prices) {
            await sendWhatsAppMessage(
              from,
              lines.length === 1
                ? 'Send a price like *3.50*, or *cancel* to leave it.'
                : `Send one price per item as number=price, e.g. *1=3.50 2=20* (there are ${lines.length} items), or *cancel*.`
            )
            continue
          }
          await applyCounterPrices(from, session, row, prices)
          continue
        }

        // ── Supplier's optional note on a just-confirmed order ──────────
        // Read before any pivot/search routing so "can do $4 each" is a note,
        // not a search.
        if (session?.step === 'order_note') {
          if (!text) continue
          if (/^(?:skip|no|none|cancel|n\/?a)$/i.test(lower.trim())) {
            await resetForNewSearch(from, session)
            await sendWhatsAppMessage(from, '👍 No note sent - the buyer already has your number.')
            continue
          }
          await relayOrderNote(from, session, text)
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
          if (!wasKnown) {
            // First contact: the buyer/seller fork saves typing and leads each
            // person into the right flow immediately.
            await sendInteractiveButtons(
              from,
              `👋 *Welcome to WA Directory${greetName ? `, ${greetName}` : ''}!*\n\nAre you here to *buy*, or to *sell / list a business*?`,
              [
                { id: 'role_buyer', title: "🛒 I'm a buyer" },
                { id: 'role_seller', title: "🏪 I'm a seller" },
              ]
            )
            continue
          }
          const body = renderWelcomeBack(greetName)
          await sendInteractiveList(from, body, MENU_ROWS, 'Main menu')
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

        // ── Retired image-first registration (REGISTRATION_* states) ─────────
        // A stale shared-flow row must not keep asking for a business-card
        // photo. Clear it and move straight to the short manual wizard.
        // Pick up a flow that an earlier direction change shelved (the draft
        // lives in the session row, which may be the 'idle' placeholder).
        // A resume request with nothing to resume answers plainly - it used to
        // fall through to search, so *resume* looked broken.
        const resumeAsk = /^(?:resume|continue|pick ?up|carry on)(?:\s+(?:my|the)?\s*(?:draft|registration|listing|form|order|where i left(?: off)?))?[.!]*$/.test(
          lower.trim()
        )

        const convState = await getConversationState(from)
        if (convState && convState.state.startsWith('REGISTRATION_')) {
          // A fresh register command replaces any in-progress registration
          // with the photo/manual prompt.
          if (registrationCommand(text)) {
            await startImageFirstRegister(from)
            continue
          }
          // "resume" is not an answer to a registration question.
          if (resumeAsk) {
            await sendWhatsAppMessage(
              from,
              '📝 Your registration is still open - answer the last question above to carry on, or send *cancel* to stop.\n\nType *menu* for everything else.'
            )
            continue
          }
          // Never re-open the old trial/paid plan screen. A stale state still
          // sitting on it moves to the photo/manual prompt instead.
          if (
            convState.state === 'REGISTRATION_STARTED' ||
            convState.context?.step === 'choose_plan' ||
            convState.context?.step === 'flow_active'
          ) {
            await startImageFirstRegister(from)
            continue
          }
          // At the photo/manual prompt, anything that is not one of the two
          // choices re-sends our prompt. Without this guard the shared handler
          // falls back to its old "You chose: free trial" message.
          if (
            convState.context?.step === 'choose_material' ||
            convState.context?.step === 'awaiting_photo'
          ) {
            const choice = text.trim().toLowerCase()
            if (
              !/^(?:skip|manual|enter manually|reg_skip|send picture|picture|photo|upload|reg_upload)$/i.test(
                choice
              )
            ) {
              await startImageFirstRegister(from)
              continue
            }
          }
          // Keep the owner on the review card after an edit instead of
          // making them type *proceed* to see their updated listing again.
          if (await handleRegistrationReviewText(from, text, convState)) continue
          await runRegistrationAction(from, text, convState.context)
          continue
        }

        if (resumeAsk) {
          if (await resumePaused(from, session || (await getSession(from)))) continue
          const current = await getSession(from)
          const staleAt = current?.data?.paused?.at
          await sendWhatsAppMessage(
            from,
            staleAt
              ? '⌛ That draft is more than 24 hours old, so I no longer have it.\n\nSend *register* to start again, or *menu* to see everything.'
              : "Nothing to resume right now - you're not in the middle of anything.\n\nSend what you're looking for plus your town, or *menu* for the options."
          )
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
        // Buyer photos on an order. Slash form, or `photos CODE`, so a plain
        // "photos" search still reaches photographers.
        const photosCmd =
          lower.match(/^\/photos(?:\s+(?:ord-)?([a-z0-9]{4,8}))?$/) ||
          lower.match(/^photos\s+(?:ord-)?([a-z0-9]{4,8})$/)
        if (photosCmd) {
          await sendOrderPhotos(from, photosCmd[1] || '')
          continue
        }

        // ── My listings: /contact & /paid ────────────────────────────────
        // /contact lists a payer's business listings, /paid everything their
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
          await sendMyListings(from, false)
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

        // ── #1 bidding text commands (business owners) ──────────────────
        // Skipped while a data-entry step is active so flow answers are
        // never hijacked (e.g. "confirm" mid-order stays flow text).
        if (!dataEntryLocked) {
          if (lower === 'bid' || lower.startsWith('bid ')) {
            await handleBidCommand(from, text)
            continue
          }
          if (lower === 'my bids') {
            await handleMyBidsCommand(from)
            continue
          }
          if (lower === 'outbid') {
            await handleOutbidCommand(from)
            continue
          }
          if (lower.startsWith('confirm ')) {
            await handleBidConfirm(from, text)
            continue
          }
        }

        // ── 🛒 Cart typed commands ──────────────────────────────────────
        // Button ids (view_cart, checkout_cart, clear_cart) only fire on a
        // tap. Typed words must reach the same handlers, or "Check cart"
        // falls through to search and the person gets a town prompt.
        const cartText = lower.replace(/[!.?]+$/, '').trim()
        if (!dataEntryLocked && cartText) {
          if (
            /^(?:(?:check|view|open|show|see|display)\s+)?(?:my\s+|the\s+)?(?:shopping\s+)?cart$/.test(cartText) ||
            /^what(?:'s| is|s)?\s+in\s+(?:my\s+|the\s+)?cart$/.test(cartText)
          ) {
            await handleViewCart(from, session)
            continue
          }
          if (/^(?:clear|empty|reset)\s+(?:my\s+|the\s+)?cart$/.test(cartText)) {
            await handleClearCart(from, session)
            continue
          }
          if (
            /^(?:check\s?out|checkout\s+(?:my\s+|the\s+)?cart)$/.test(cartText) ||
            /^send\s+(?:all\s+)?(?:my\s+)?orders?$/.test(cartText)
          ) {
            await handleCheckoutCart(from, session)
            continue
          }
        }

        // ── Bot search conversation steps ───────────────────────────────
        if (session?.step === 'search_loc') {
          // Waiting for the user's town (term already captured)
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
            continue
          }
          if (lower === 'back') {
            // Back = pause ordering (search results stay alive).
            await saveSession(from, 'browse', { ...session.data, pendingOrder: undefined, lastScreen: 'list' })
            await sendWhatsAppMessage(from, 'Ordering paused. Reply a numbered business, or send a new search.')
            continue
          }
          // A cart confirm screen also sits on the 'order' step; cart words must
          // still reach the quantity controls instead of becoming a search.
          if (/^(?:cart|check cart|view cart|my cart|edit (?:cart|quantities)|change quantit(?:y|ies))$/.test(lower)) {
            const data = { ...session.data, pendingOrder: undefined }
            await saveSession(from, 'browse', data)
            await handleViewCart(from, { phone: from, step: 'browse', data })
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
            await sendInteractiveButtons(from, 'Type the new line, or send the order as it stands.', [
              { id: 'osend', title: '✅ Send as-is' },
            ])
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
          await resetForNewSearch(from, session)
          session = null
          await dispatchSearch(from, text)
          continue
        }

        if (session?.step === 'browse') {
          // Numbered results are on screen; taps and typed numbers open cards,
          // more/next pages through the stored candidates.
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
          // A shop card is open: a bare number picks that product from the
          // card's price list and adds it to the cart — the same action as the
          // 🧺 Add to cart button, without the round trip through the catalog.
          if (session.data.lastScreen === 'detail') {
            const picked = lower.match(/^\s*([1-9])\s*$/)
            const items = session.data.detailItems || []
            if (picked && items.length) {
              const item = items[Number(picked[1]) - 1]
              if (item) {
                await handleAddToCart(from, session, item.id, msgId)
              } else {
                await sendWhatsAppMessage(
                  from,
                  `That card lists ${items.length} product${items.length === 1 ? '' : 's'} (1-${items.length}). Tap *🧺 Browse all items* to see the whole shelf.`
                )
              }
              continue
            }
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
          await resetForNewSearch(from, session)
          session = null
          await dispatchSearch(from, text)
          continue
        }

        // ── Personal contact intake: name + phone (+ city, socials) ─────
        if (session?.step === 'reg_contact') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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

        // ── Living list-form: parse + re-render after every reply ──────
        if (session?.step === 'list_form') {
          if (registrationCommand(text)) {
            await startImageFirstRegister(from)
            continue
          }
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
            continue
          }
          if (/^(publish|submit|yes|y|go live)\b/.test(lower)) {
            await tryPublishForm(from, session)
            continue
          }
          await handleListFormText(from, session, text)
          continue
        }

        // ── Shelf batch: collecting photos or answering a price question ──
        if (session?.step === 'item_batch') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
            continue
          }
          if (session.data.itemBatch?.asking != null) {
            if (await handleBatchPriceReply(from, session, text)) continue
          }
          if (/^(?:done|finish(?:ed)?|that'?s all|no more|ready|continue|submit)$/i.test(lower.trim())) {
            await finalizeShelfBatch(from, session)
            continue
          }
          await sendWhatsAppMessage(
            from,
            `Send another product photo (up to ${SHELF_BATCH_MAX}), or reply *done* and I will ask for the prices.`
          )
          continue
        }

        // ── Shelf item: photo queued, waiting for "name $price" ────────
        if (session?.step === 'item_photo') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
            continue
          }
          await handlePaySearchText(from, session, text)
          continue
        }
        if (session?.step === 'pay_pick') {
          if (lower === 'cancel' || lower === 'help') {
            await clearSession(from)
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
            await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
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
          await sendWhatsAppMessage(from, lower === 'cancel' ? CANCEL_TEXT : await helpText(from))
          continue
        }

        // Pay intent before everything else free-text: "I want to pay", renew,
        // subscription… all open the same two-way question.
        if (/\b(?:pay|payment|paynow|pay now|subscription|subscribe|renew|ecocash|top ?up)\b/.test(lower)) {
          appendTranscript(from, text)
          await startPayChoice(from)
          continue
        }

        const regCommand = registrationCommand(text)
        if (regCommand) {
          if (regCommand === 'choice') {
            await sendRegisterChoice(from)
          } else {
            // Open the photo/manual step instead of the old plan screen.
            await startImageFirstRegister(from)
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

        // Small talk before search: "thank you", "i need help", "ok" and
        // "bye" are answers, not queries. This sits after every flow step so a
        // registration answer of "ok" still belongs to the form.
        const social = renderSocialReply(text, (await getBotContactName(from)) || waName)
        if (social) {
          appendTranscript(from, text)
          await sendWhatsAppMessage(from, social.kind === 'help' ? await helpText(from) : social.body)
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

