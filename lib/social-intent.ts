// Small-talk understanding.
//
// Typed greetings, thanks, goodbyes and "I need help" used to fall through to
// the search engine, so a customer saying "thank you" got "No matches found"
// and a person asking for help got asked for their town. This layer answers
// the human first and points at the two ways forward: search, or menu.
//
// Rules are deliberately tight: the whole message must be the social phrase
// (plus a little filler), because "hi plumber harare" is a search, not a
// greeting.

export type SocialKind = 'thanks' | 'help' | 'bye' | 'ack' | 'howdy'

export interface SocialReply {
  kind: SocialKind
  body: string
}

// Filler that may sit around a social phrase without changing its meaning.
const FILLER = new Set([
  'so', 'very', 'much', 'a', 'lot', 'lots', 'sir', 'madam', 'boss', 'bro',
  'bra', 'sisi', 'shamwari', 'my', 'friend', 'please', 'pls', 'plz', 'the',
  'you', 'u', 'guys', 'team', 'there', 'again', 'really', 'man', 'mate',
])

// Spelling slips people actually type, mapped onto the phrase they meant.
const TYPOS: Record<string, string> = {
  tank: 'thank',
  tanks: 'thanks',
  tanx: 'thanks',
  thanx: 'thanks',
  thnx: 'thanks',
  thnks: 'thanks',
  thx: 'thanks',
  tenks: 'thanks',
  thankyou: 'thank you',
  thak: 'thank',
  pleae: 'please',
  plese: 'please',
  hepl: 'help',
  hlep: 'help',
  helo: 'hello',
  helpp: 'help',
  hlp: 'help',
  hiee: 'hie',
  byee: 'bye',
  goodbey: 'goodbye',
}

const THANKS_WORDS = new Set([
  'thank', 'thanks', 'thankyou', 'tatenda', 'ndatenda', 'ngiyabonga',
  'siyabonga', 'zvikuru', 'shukran', 'merci', 'asante',
])

const BYE_WORDS = new Set([
  'bye', 'byebye', 'goodbye', 'later', 'laterz', 'goodnight', 'night',
  'chisarai', 'tichaonana', 'sara', 'sala', 'zvakanaka', 'kahle', 'usale',
])

const ACK_WORDS = new Set([
  'ok', 'okay', 'okey', 'k', 'kk', 'cool', 'noted', 'fine', 'alright',
  'sure', 'got', 'see', 'understood', 'sharp', 'great', 'nice', 'good',
])

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => TYPOS[w] || w)
    .flatMap(w => w.split(' '))
}

function who(name?: string): string {
  const first = (name || '').trim().split(' ')[0]
  return first ? ` ${first}` : ''
}

export function renderSocialReply(text: string, name?: string): SocialReply | null {
  const raw = (text || '').trim()
  // Long messages are prose or a search, never small talk.
  if (!raw || raw.length > 60) return null
  if (/\d/.test(raw)) return null

  const all = words(raw)
  if (!all.length) return null
  const core = all.filter(w => !FILLER.has(w))
  const joined = core.join(' ')
  const sentence = all.join(' ')
  const has = (set: Set<string>) => core.some(w => set.has(w))
  const person = who(name)

  // Help first: "i need help", "can you help me", "how do i use this".
  // Tested against the whole sentence, because a request for help is
  // allowed to be a little longer than a bare greeting.
  if (
    /^(?:please\s+|pls\s+)?(?:can|could|would)\s+you\s+help/.test(sentence) ||
    /^(?:i|we)\s+(?:really\s+)?(?:need|want)\s+(?:some\s+|your\s+)?(?:help|assistance)/.test(sentence) ||
    /^help(?:\s+me)?(?:\s+please)?$/.test(sentence) ||
    /^how\s+(?:do|does|can)\s+(?:i|you|this|it)\b/.test(sentence) ||
    /^what\s+(?:can|do)\s+you\s+do$/.test(sentence) ||
    /^(?:ndi)?batsire(?:i)?$/.test(sentence) ||
    /\b(?:batsire|batsira|usizo|lusizo)\b/.test(sentence)
  ) {
    if (all.length > 9) return null
    return {
      kind: 'help',
      body: [
        `Happy to help${person} 👋`,
        '',
        'You can:',
        '🔍 *Find something* — send the product or service plus your town, e.g. *plumber harare*',
        '🏢 *Register a business* — type *register*',
        '🧾 *Order or negotiate* — include a price, e.g. *bread chinhoyi usd 1*',
        '📋 *See everything* — type *menu*',
        '',
        'What do you need?',
      ].join('\n'),
    }
  }

  if (core.length > 5) return null

  // "How are you" pleasantries.
  if (
    /^how\s+are\s+(?:you|u|things)\b/.test(sentence) ||
    /^howzit$/.test(sentence) ||
    /^(?:uri|makadii|unjani|kunjani)\s+sei$/.test(sentence) ||
    /^(?:wakawaka|sawubona|salibonani|mhoro|makadii|masikati)$/.test(sentence)
  ) {
    return {
      kind: 'howdy',
      body: [
        `All good here${person}, thanks for asking! 💪`,
        '',
        'Tell me what you are looking for plus your town and I will find it — e.g. *bread chinhoyi*.',
      ].join('\n'),
    }
  }

  // Thanks: "thank you", "tank you so much", "tatenda".
  if (has(THANKS_WORDS) || joined === 'thank' || joined === 'thank u') {
    return {
      kind: 'thanks',
      body: [
        `You're welcome${person}! 😊`,
        '',
        'Whenever you need something, just send what you are looking for and your town — e.g. *plumber harare*.',
        'Type *menu* for everything else.',
      ].join('\n'),
    }
  }

  // Goodbye.
  if (has(BYE_WORDS) || /^(?:see|catch)\s+(?:you|u)(?:\s+(?:later|soon))?$/.test(joined)) {
    return {
      kind: 'bye',
      body: `👋 Bye${person}! Come back any time — just send what you need and your town.`,
    }
  }

  // Bare acknowledgements: "ok", "noted", "sure".
  if (has(ACK_WORDS) && core.length <= 2) {
    return {
      kind: 'ack',
      body: [
        `👍 Noted${person}.`,
        '',
        'Send a product or service plus your town when you are ready — e.g. *plumber harare* — or type *menu*.',
      ].join('\n'),
    }
  }

  return null
}
