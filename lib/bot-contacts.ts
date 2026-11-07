import { getSupabase } from '@wa-directory/shared'
import { sendInteractiveButtons } from '@wa-directory/shared'

// One row per WhatsApp number that talks to the bot (customer base).
// Atomic increment happens in the DB (migration 025 upsert_bot_contact).
// Best-effort on every call: contact tracking must never break a bot reply.
export async function upsertBotContact(phone: string, name: string, step: string) {
  if (!phone) return
  try {
    await getSupabase().rpc('upsert_bot_contact', {
      p_phone: phone,
      p_name: (name || '').slice(0, 120),
      p_last_step: step || '',
    })
  } catch {
    // Ignore — the bot conversation continues either way.
  }
}

// Last-known WhatsApp profile name (Meta only sends contacts with most
// messages; greetings fall back to this when the payload omits it).
export async function getBotContactName(phone: string): Promise<string> {
  if (!phone) return ''
  try {
    const { data } = await getSupabase()
      .from('bot_contacts')
      .select('name')
      .eq('phone', phone)
      .maybeSingle()
    return data?.name || ''
  } catch {
    return ''
  }
}

// True when this number has messaged the bot before (must be checked BEFORE
// upsertBotContact runs, or every contact looks brand-new).
export async function hasSeenContact(phone: string): Promise<boolean> {
  if (!phone) return false
  try {
    const { data } = await getSupabase()
      .from('bot_contacts')
      .select('phone')
      .eq('phone', phone)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

export const IDLE_NUDGE_MINUTES = 30
export const NUDGE_WINDOW_HOURS = 24

// `stop` opts a number out of proactive messages (rating prompts still go out
// because they reference a chat the user initiated).
export async function markBotContactOptOut(phone: string) {
  try {
    await getSupabase()
      .from('bot_contacts')
      .upsert({ phone, opted_out: true }, { onConflict: 'phone' })
  } catch {
    // Ignore — user flow continues either way.
  }
}

// Admin `optin` command: undo an accidental `stop`.
export async function setBotContactOptIn(phone: string) {
  try {
    await getSupabase()
      .from('bot_contacts')
      .upsert({ phone, opted_out: false }, { onConflict: 'phone' })
  } catch {
    // Ignore — the next inbound re-creates the row anyway.
  }
}

// Piggyback sweep: every inbound message checks a few contacts that went
// idle 30+ minutes ago and nudges them once (app link + channel link).
// Vercel Hobby crons only fire daily, so a timer job is not an option.
export async function sweepIdleNudges(
  sendMessage: (phone: string, body: string) => Promise<unknown>
): Promise<void> {
  try {
    const since = new Date(Date.now() - NUDGE_WINDOW_HOURS * 3600000).toISOString()
    const { data: skipped } = await getSupabase()
      .from('bot_contacts')
      .select('phone')
      .not('nudge_sent_at', 'is', null)
      .gt('last_seen', since)

    const skip = new Set((skipped || []).map(c => c.phone))

    // Every inbound message resets nudge_sent_at to null, so "never nudged in
    // this session" = "nudge_sent_at is null"; last_seen > 24h is always
    // outside Meta's session window and filtered out.
    const quiet = new Date(Date.now() - IDLE_NUDGE_MINUTES * 60000).toISOString()
    const { data: due } = await getSupabase()
      .from('bot_contacts')
      .select('phone, last_step')
      .is('nudge_sent_at', null)
      .eq('opted_out', false)
      .lt('last_seen', quiet)
      .gt('last_seen', since)
      .order('last_seen', { ascending: false })
      .limit(8)

    // Users under a human takeover (chat_sessions.data.held) get no
    // automated nudges — an agent is speaking for the business.
    let held: Set<string> | null = null
    const duePhones = (due || []).map(c => c.phone)
    if (duePhones.length > 0) {
      const { data: heldRows } = await getSupabase()
        .from('chat_sessions')
        .select('phone, data')
        .in('phone', duePhones)
      held = new Set(
        (heldRows || [])
          .filter(r => (r.data as { held?: unknown } | null)?.held)
          .map(r => r.phone)
      )
    }

    const ACTIVE_NUDGE_STEPS = new Set([
      'search_term',
      'search_loc',
      'detail',
      'order',
      'need_draft',
      'need_confirm',
      'pay_search',
    ])

    for (const c of (due || []).slice(0, 5)) {
      if (skip.has(c.phone)) continue
      // Only nudge users who abandoned an active search or order flow
      if (!c.last_step || !ACTIVE_NUDGE_STEPS.has(c.last_step)) continue
      // Under human takeover: stay silent.
      if (held && held.has(c.phone)) continue
      await getSupabase()
        .from('bot_contacts')
        .update({ nudge_sent_at: new Date().toISOString() })
        .eq('phone', c.phone)
      await sendInteractiveButtons(c.phone, idleNudgeBody(), [
        { id: 'end_search', title: 'End search' }
      ])
    }
  } catch {
    // Never disturb the interacting customer.
  }
}

const CHANNEL_LINK = process.env.CHANNEL_LINK || ''
const APP_LINK = process.env.SITE_URL || 'https://wadirectory.co.zw'

export function idleNudgeBody(): string {
  return [
    'Hey! You were looking for something - just reply with what you need and I\'ll find it.',
    'If you\'re no longer searching, press **End search**.',
  ].join('\n')
}
