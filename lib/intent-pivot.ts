// ── Mid-conversation intent pivots ──────────────────────────────────────
// Typed text normally feeds the step the user is on — a results list, the
// listing form, the pay flow. But people change their minds: someone deep in
// a shopping list suddenly wants to register their business. The bot follows
// the person instead of the script — it says plans have changed, shelves the
// unfinished flow (*resume* brings it back) and opens what was asked for.

import { parseOrderLine } from './order-intake.js'

export type FlowFamily = 'register' | 'pay' | 'need' | 'search' | 'order' | 'none'
// A pivot opens one of these: any flow family, plus the main menu.
export type PivotKind = 'register' | 'pay' | 'need' | 'search' | 'order' | 'menu'

// Which flow each step belongs to. A message is only a pivot when the goal it
// states differs from the flow already open, so a typed answer inside a form
// can never hijack its own step.
const STEP_FAMILY: Record<string, FlowFamily> = {
  // Registration wizard, living list form, personal contact, shelf photos.
  name: 'register',
  username: 'register',
  phone: 'register',
  category: 'register',
  description: 'register',
  city: 'register',
  area: 'register',
  confirm: 'register',
  list_form: 'register',
  reg_contact: 'register',
  item_photo: 'register',
  item_pick: 'register',
  // EcoCash payment flow.
  pay_search: 'pay',
  pay_pick: 'pay',
  pay_plan: 'pay',
  pay_ecocash: 'pay',
  // Search conversation.
  search_loc: 'search',
  search_term: 'search',
  browse: 'search',
  need_form: 'need',
  order: 'order',
}

export function familyOf(step?: string | null): FlowFamily {
  return (step && STEP_FAMILY[step]) || 'none'
}

// Steps where the message answers a direct question ("Which town?", "Describe
// your business"). There only a framed change of plans counts as a pivot —
// a bare goal word may simply be their answer.
export const DATA_ENTRY_STEPS = new Set([
  'name',
  'username',
  'phone',
  'category',
  'description',
  'city',
  'area',
  'confirm',
  'list_form',
  'reg_contact',
  'item_photo',
  'item_pick',
  'need_form',
])

const ACK_WORDS =
  /^(?:yes|no|ok(?:ay)?|done|skip|back|edit|confirm|thanks?|thank you|cancel|resume|stop)$/i

export function pivotCandidateForIntent(text: string): boolean {
  const t = text.trim()
  if (t.length < 4) return false
  if (/^[\d\s+]+$/.test(t)) return false
  if (ACK_WORDS.test(t)) return false
  return true
}

// "actually / wait / let me / how do I …" — the frame that turns a goal word
// into a stated change of direction rather than a search term or an answer.
const PIVOT_FRAME =
  /\b(?:actually|wait|hold on|hold up|scratch that|never ?mind|change of (?:plan|plans)|changed my mind|i(?:'ve)? changed my mind|instead|rather|let me|i (?:want|need|would like|decided) to|i'd like to|can i|could i|how (?:do|can) i|how to|help me(?: out)?|time to|switch to|go back to|start over with|by the way|on second thought|am thinking of)\b/i

// The goal each pivot opens. Checked in PIVOT_ORDER so a message carrying two
// goals ("register and pay") lands on the first.
const GOAL: Record<PivotKind, RegExp> = {
  register:
    /\b(?:register(?:ing|ation)?|sign ?(?:me )?up|list (?:my|our|a|the) (?:business|company|shop|store|service|listing)|get (?:my |our )?(?:business|listing) (?:on|listed)|add (?:my|our|a) business|put (?:my|our) business|advertise|business listing|join (?:the )?directory|personal contact)\b/i,
  pay: /\b(?:pay(?:ment|ing)?|renew(?:al)?|subscrib(?:e|ption)|top up|ecocash)\b/i,
  need: /\b(?:post|add|send) (?:a|my|our) need\b|\bsuppliers? (?:can )?quote/i,
  search: /\b(?:search|find|look for|browse|shop|buy)\b/i,
  order: /\border\b/i,
  menu: /\b(?:main )?menu\b|\bwhat can you do\b|\boptions\b|\bstart over\b/i,
}

const PIVOT_ORDER: PivotKind[] = ['register', 'pay', 'need', 'order', 'search', 'menu']

// Bare commands: the whole message *is* the request. Exact-match only, so a
// search for "register office" or "advertising agencies" stays a search.
const BARE_PIVOTS: [RegExp, PivotKind][] = [
  [
    /^(?:register(?:ing|ation)?|sign ?(?:me )?up|register(?: my| our| a| the)? (?:business|company|shop|store|listing)|list(?: a| the| my| our)? (?:business|company|shop|store|listing)|add my business|put my business on|business listing)$/,
    'register',
  ],
  [/^(?:pay|payment|pay now|pay my bill|renew|renewal|ecocash|top up)$/, 'pay'],
  [
    /^(?:how much (?:is|does|for)(?: an?| the)? (?:listing|business|registration|advert)(?: fee| price)?|listing fee|listing price)$/,
    'pay',
  ],
  [/^(?:post a need|post need|add a need)$/, 'need'],
  [/^(?:menu|main menu|options|what can you do|start over)$/, 'menu'],
]

// Words that make a short message a search, not a pivot: "register office",
// "advertising agencies", "how much is a school ad".
const PIVOT_BLOCK = /\b(?:office|agency|agencies|school|hospital|form|plate)\b/

// Short goal starters without any framing word — "register business",
// "how much is a listing". Unambiguous intents only, outside the data-entry
// steps where a short message may simply be the answer they were typing.
const PIVOT_STARTERS: [RegExp, PivotKind][] = [
  [
    /\b(?:register(?:ing|ation)?|sign ?up|business registration|list(?:ing)? (?:a |the )?(?:business|company|shop|store)|get listed|advert(?:ise|isement)?)\b/i,
    'register',
  ],
  [/\b(?:how much|listing fee|payment|pay)\b/i, 'pay'],
  [/\b(?:i need|we need|looking for suppliers?|suppliers (?:to|can)|quote)\b/i, 'need'],
]

// ── Goal words that double as search terms ────────────────────────────
// "pay" opens the pay flow, but businesses are called Paymore / Payless too 
// — same for "register" and "order". When a typed word is BOTH a menu goal
// and a plausible search term, the bot asks which was meant instead of
// guessing (route.ts wires the two-way prompt; the flow button shelving is
// the same stashPaused/resume engine the stored pivots use).
export type GoalAskKind = 'register' | 'pay' | 'order'

export function goalKindForWord(term: string): GoalAskKind | null {
  const t = term.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!t) return null
  if (/^(?:pay(?:ment|ments)?|renew(?:al)?|ecocash|top ?up)$/.test(t)) return 'pay'
  if (/^(?:register|registration|sign ?up)$/.test(t)) return 'register'
  if (/^(?:order|orders)$/.test(t)) return 'order'
  return null
}

export function detectPivot(text: string, step: string | null): PivotKind | null {
  const t = text.trim().replace(/\s+/g, ' ').toLowerCase()
  if (!t || t.length > 400) return null
  const family = familyOf(step)

  // 1 — the whole message is the request ("register", "post a need").
  for (const [re, kind] of BARE_PIVOTS) {
    if (re.test(t)) return kind === family ? null : kind
  }

  // 2 — a clean order line ("order 2 bread") pulls them out of anything
  //     except the single-line intakes, where quantities are the answer.
  const orderM = t.match(/^order\b[,;:]?\s*(.*)$/)
  if (orderM && family !== 'order' && !['list_form', 'reg_contact', 'need_form'].includes(step || '')) {
    const tail = orderM[1].trim()
    if (!tail) return 'order'
    const { pairs, junk } = parseOrderLine(tail)
    if (pairs.length && !junk.length) return 'order'
  }

  // 3 — a framed goal: "wait, I'd like to register my business".
  if (PIVOT_FRAME.test(t)) {
    for (const kind of PIVOT_ORDER) if (GOAL[kind].test(t) && kind !== family) return kind
    return null
  }

  // 4 — short goal + possessive outside the data-entry steps:
  //     "list our shop please", "find me a plumber".
  if (!DATA_ENTRY_STEPS.has(step || '') && t.split(' ').length <= 7 && /\b(?:my|our|me|i|we)\b/.test(t)) {
    for (const kind of PIVOT_ORDER) if (GOAL[kind].test(t) && kind !== family) return kind
  }

  // 5 — a short goal with no framing and no possessive, again outside the
  //     data-entry steps: "register business", "how much is a listing".
  if (!DATA_ENTRY_STEPS.has(step || '') && t.split(' ').length <= 6) {
    const blocked = PIVOT_BLOCK.test(t)
    for (const [re, starterKind] of PIVOT_STARTERS) {
      if (blocked || starterKind === family) continue
      if (re.test(t)) return starterKind
    }
  }
  return null
}
