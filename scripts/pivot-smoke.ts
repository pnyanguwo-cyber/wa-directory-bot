import {
  detectPivot,
  goalKindForWord,
  familyOf,
  pivotCandidateForIntent,
  DATA_ENTRY_STEPS,
  registrationCommand,
} from '../lib/intent-pivot'

// Pivot-rule smoke (run: npx tsx scripts/pivot-smoke.ts) — the regex layer of
// handleIntentPivot: mid-conversation plan changes ("register business" while
// ordering) pivots, search-y lookalikes ("register office") do not.

let failed = 0
function ok(cond: boolean, label: string, extra = '') {
  if (cond) console.log(`OK   ${label}`)
  else {
    failed++
    console.log(`FAIL ${label}${extra ? ` — ${extra}` : ''}`)
  }
}
const dp = (text: string, step: string | null) => detectPivot(text, step)

// Families: every data-entry step maps to its flow, unknown steps to 'none'.
ok(familyOf('name') === 'register' && familyOf('pay_plan') === 'pay', 'step → family map')
ok(familyOf('need_form') === 'need' && familyOf('order') === 'order', 'intake steps map right')
ok(familyOf(null) === 'none' && familyOf(undefined) === 'none' && familyOf('idle') === 'none', 'unknown steps → none')
ok(DATA_ENTRY_STEPS.size === 13 && DATA_ENTRY_STEPS.has('city') && DATA_ENTRY_STEPS.has('item_pick'), 'data-entry set intact')

// Goal words that double as search terms (S19 two-way ask).
ok(
  goalKindForWord('pay') === 'pay' && goalKindForWord('renew') === 'pay' && goalKindForWord('ecocash') === 'pay',
  'pay-family words map to pay'
)
ok(
  goalKindForWord('register') === 'register' && goalKindForWord('sign up') === 'register',
  'register-family words map to register'
)
ok(
  goalKindForWord('order') === 'order' && goalKindForWord('orders') === 'order',
  'order words map to order'
)
ok(
  goalKindForWord('plumber') === null && goalKindForWord('register office') === null && goalKindForWord('') === null,
  'plain or blocked words are not goals'
)

// 1 — Bare pivots: the whole message is the request.
ok(dp('register', 'order') === 'register', 'bare "register" while ordering')
ok(dp('register', 'name') === null, 'bare "register" inside register flow stays put')
ok(dp('how much is a listing', 'order') === 'pay', 'bare pricing question → pay')
ok(dp('pay', 'search_loc') === 'pay', 'bare "pay" mid-search')
ok(dp('post a need', 'browse') === 'need', 'bare "post a need" while browsing')
ok(dp('menu', 'name') === 'menu', 'bare "menu" escapes a data-entry step')
ok(dp('order', 'browse') === 'order', 'bare "order" mid-search')

// 2 — Clean order line: pulls them out of anything except single-line intakes.
ok(dp('order 2 bread', 'search_loc') === 'order', '"order 2 bread" mid-search')
ok(dp('order 2 bread', 'order') === null, '"order 2 bread" in order flow stays put')
ok(dp('order 2 bread', 'need_form') === null, 'order line never hijacks single-line intakes')

// 3 — Framed goal ("wait / actually / let me") pivots outside data-entry too.
ok(dp("wait, I'd like to register my business", 'search_loc') === 'register', 'framed register mid-search')
ok(dp('wait, I want to pay with ecocash', 'name') === 'pay', 'framed pay inside register flow')
ok(dp("i'd like to register my business", 'name') === null, 'framed own-family goal stays put')

// 4/5 — Short goal starters outside the data-entry steps.
ok(dp('business registration', 'order') === 'register', 'starter "business registration"')
ok(dp('register and pay', 'order') === 'register', 'first goal wins (PIVOT_ORDER)')
ok(dp('register business', 'city') === null, 'starter inside register family stays put')
ok(dp('register office', 'order') === null, '"register office" blocked (PIVOT_BLOCK)')
ok(dp('advertising agencies', 'search_loc') === null, '"advertising agencies" blocked')

// Registration vocabulary — all the ways people ask to be listed.
const regStart = (t: string) => registrationCommand(t) === 'start'
const regChoice = (t: string) => registrationCommand(t) === 'choice'
ok(regChoice('register') && regChoice('join') && regChoice('list') && regChoice('sign me up'), 'bare register verbs ask business vs personal')
ok(
  ['register business', 'register a business', 'register my business', 'join wa directory', 'list business', 'list my company', 'get my business listed', 'add my business', 'create a listing', 'open a shop', 'become a supplier', 'i want to register my shop', 'how do i list my business', 'start selling on wa directory', 'sell on wa directory', 'business registration', 'list my bakery'].every(
    regStart
  ),
  'business-specific registration phrases open the form'
)
ok(regChoice('i want to register') && regChoice('how do i register') && regChoice('can i list'), 'framed generic register requests still ask the type')
ok(dp('register business', 'order') === 'register' && dp('join', 'order') === 'register' && dp('list business', 'order') === 'register', 'registration variants pivot mid-conversation')
ok(dp('i want to register', 'order') === 'register' && dp('become a supplier', 'order') === 'register', 'framed registration pivots too')
ok(dp('register my business', 'need_form') === null && dp('list business', 'name') === null, 'specific register phrases do not hijack direct-answer steps')
ok(dp('list of hardware stores', 'order') === null && dp('register office', 'order') === null, 'search-shaped list/register phrases stay searches')
ok(registrationCommand('advertising agencies') === null && registrationCommand('apply for a job') === null, 'unrelated phrases are not registration')
ok(dp('harare', 'search_loc') === null, 'town name stays a search answer')
ok(dp('a'.repeat(400) + ' register', 'order') === null, 'oversized text is never a pivot')

// The Gemini gate only fires on these: acks, numbers, blips are never seeds.
ok(!pivotCandidateForIntent('2') && !pivotCandidateForIntent('12345') && !pivotCandidateForIntent('+263 772 000 000'), 'numeric answers weigh nothing')
ok(!pivotCandidateForIntent('ok') && !pivotCandidateForIntent('yes') && !pivotCandidateForIntent('thank you'), 'ack words weigh nothing')
ok(pivotCandidateForIntent('register my business please') && pivotCandidateForIntent('how much is a listing'), 'real goals do reach the gate')

if (failed) {
  console.log(`\n${failed} failing`)
  process.exit(1)
}
console.log('\nall green')
