/**
 * Human-support intent.
 *
 * A customer asking for a person should not get the self-service guide or a
 * search for the word "help". This recognises the ways people actually ask to
 * be handed to a human, while leaving "help me find a plumber" as a search.
 */

const SEARCH_ASK = /\b(?:help|assist)\b.{0,18}\b(?:find|search|look\s+for|locate|register|list|buy|book|pay|sell|price|compare)\b/

const SUPPORT_PATTERNS: RegExp[] = [
  // talk / speak / chat / connect ... to a person
  /\b(?:talk|speak|chat|connect|transfer|reach|contact|message|call|get)\b(?:\s+\w+){0,4}\s+(?:to|with)\s+(?:a|an|the|your)?\s*(?:real\s+|live\s+|actual\s+)?(?:human|person|someone|somebody|agent|representative|rep|staff|support|team|operator|manager|admin|supervisor|consultant|helpdesk)\b/,
  /\b(?:talk|speak|chat|connect|transfer|reach|contact|message|get)\b\s+(?:me\s+)?(?:a|an|the|your)?\s*(?:real\s+|live\s+|actual\s+)?(?:human|person|someone|somebody|agent|representative|staff|support|team|operator|manager|admin|supervisor)\b/,
  // "human please", "real person", "anyone there?"
  /\b(?:real|live|actual)\s+(?:human|person|agent|representative|someone)\b/,
  /\b(?:is|are)\s+(?:there|any)\s+(?:a\s+|an\s+)?(?:human|person|someone|somebody|agent|support|staff)\b/,
  /\b(?:human|person|someone|somebody|agent|representative|support|operator|manager|admin|supervisor)\b(?:\s+\w+){0,2}\s+(?:please|now|available|online|around|there|help)\b/,
  /\b(?:put\s+me\s+through|connect\s+me|transfer\s+me)\b/,
  // customer care / help desk / call centre
  /\b(?:customer\s*(?:care|service|support)|help\s*desk|call\s*cent(?:er|re)|support\s*team)\b/,
  /\b(?:are|is)\s+(?:you|this)\s+(?:a\s+)?(?:bot|robot|machine|real\s+person|human)\b/,
  // Direct asks: "I need help", "help me", "assistance please".
  /\b(?:i|we)\s+(?:really\s+|urgently\s+)?(?:need|want|would\s+like|am\s+(?:looking|asking)\s+for|request(?:ing)?)\s+(?:some\s+|a\s+bit\s+of\s+)?(?:help|assistance|support|someone|a\s+person|a\s+human|an\s+agent)\b/,
  /\b(?:i|we)\s+(?:really\s+|urgently\s+)?(?:need|want)\s+to\s+(?:talk|speak|chat)\s+(?:to|with)\s+(?:a\s+|an\s+|the\s+)?(?:person|human|someone|somebody|agent|rep|representative|support|staff|manager|admin)\b/,
  // Shona / Ndebele asks.
  /\b(?:ndibatsire|ndibatsirei|batsirai|batsira|ndoda\s+kubatsirwa|ndinoda\s+kubatsirwa|ndoda\s+munhu|ndinoda\s+munhu|ndinoda\s+rubatsiro|ndoda\s+rubatsiro)\b/,
  /\b(?:ngicela\s+usizo|ngidinga\s+usizo|ngifuna\s+usizo|ngifuna\s+umuntu)\b/,
  // Complaints and account problems belong with a person.
  /\b(?:complaint|complain|report\s+(?:a\s+)?problem|refund|scam|fraud|wrong\s+(?:order|listing|item)|(?:order|listing|account|payment)\s+(?:is|was)\s+wrong|problem\s+with\s+(?:my\s+)?(?:order|listing|account|payment))\b/,
  /\b(?:didn'?t|did\s+not|never)\s+(?:receive|get)\b/,
  /\b(?:can'?t|cannot|unable\s+to)\s+(?:log\s?in|sign\s?in|access|open)\b/,
  /^(?:i\s+have\s+(?:a\s+)?(?:problem|issue)|something\s+is\s+wrong)\b/,
]

const BARE_SUPPORT =
  /^(?:help|help me|help me please|please help(?: me)?|assist me|please assist(?: me)?|support|i need help|need help|i need assistance|i want help|i want assistance|can you help(?: me)?|can someone help(?: me)?|can anybody help(?: me)?|human|person|agent|manager|supervisor|human being|real person|real human)[\s.!]*$/

const GREETING =
  /^(?:(?:hi|hie|hello|hey|good\s+(?:morning|afternoon|evening)|please|pls|plz|kindly|so|ok|okay|excuse me)[\s,!.]+)+/

export function isSupportRequest(text: string): boolean {
  const lower = (text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!lower || lower.length > 200) return false

  const body = lower.replace(GREETING, '').trim()
  if (!body) return false

  // "help me find ..." is a search, not a handoff. Neither is a search for
  // an HR officer ("human resource" is the job, not a request for a human).
  if (SEARCH_ASK.test(body) || /\bhuman\s+resource/.test(body)) return false

  if (BARE_SUPPORT.test(body)) return true
  return SUPPORT_PATTERNS.some((pattern) => pattern.test(body))
}
