/**
 * Field agents: numbers that add businesses for other people, mostly by
 * photographing street signs. They are NOT admins - they never receive
 * approval/verification notices - and their only job is registration.
 *
 * Stored in bot_settings.agent_allowlist as a JSON array of digits, next to the
 * existing admin_allowlist, so adding or removing one is a WhatsApp command and
 * needs no deploy.
 */
import { getBotSetting, setBotSetting, getSupabase, digitsOnly } from '@wa-directory/shared'

const AGENT_KEY = 'agent_allowlist'

/** 0771234567 and +263771234567 both normalise to 263771234567. */
export function normalizeOwnerPhone(raw: string | null | undefined): string {
  const digits = digitsOnly(raw || '')
  if (!digits) return ''
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `263${digits.slice(1)}`
  return digits
}

// The allowlist is read on every inbound message, so keep it warm briefly.
// add/remove always force a fresh read and clear this cache.
const CACHE_TTL_MS = 60_000
let cached: { at: number; numbers: string[] } | null = null

async function readAgentList(force = false): Promise<string[]> {
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.numbers
  const raw = await getBotSetting(AGENT_KEY)
  let numbers: string[] = []
  try {
    const parsed = JSON.parse(raw || '[]')
    if (Array.isArray(parsed)) {
      numbers = [...new Set(parsed.map((value) => normalizeOwnerPhone(String(value))).filter(Boolean))]
    }
  } catch {
    numbers = []
  }
  cached = { at: Date.now(), numbers }
  return numbers
}

async function writeAgentList(numbers: string[]): Promise<boolean> {
  const clean = [...new Set(numbers.map(normalizeOwnerPhone).filter(Boolean))].sort()
  const saved = await setBotSetting(AGENT_KEY, JSON.stringify(clean))
  cached = saved ? { at: Date.now(), numbers: clean } : null
  return saved
}

export async function agentNumbers(): Promise<string[]> {
  return readAgentList()
}

export async function isAgent(phone: string): Promise<boolean> {
  const number = normalizeOwnerPhone(phone)
  if (!number) return false
  return (await readAgentList()).includes(number)
}

export async function addAgent(
  phone: string
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const number = normalizeOwnerPhone(phone)
  if (number.length < 10 || number.length > 15) {
    return { ok: false, error: 'Send a full number, e.g. 0771234567 or 263771234567.' }
  }
  const current = await readAgentList(true)
  if (current.includes(number)) {
    return { ok: false, error: `+${number} is already an agent.`, number }
  }
  const saved = await writeAgentList([...current, number])
  if (!saved) return { ok: false, error: 'Could not save the agent. Please try again.' }
  // Read back: a settings write that silently failed must not report success.
  if (!(await readAgentList(true)).includes(number)) {
    return { ok: false, error: 'The agent did not save. Please try again.' }
  }
  return { ok: true, number }
}

export async function removeAgent(
  phone: string
): Promise<{ ok: boolean; error?: string; number?: string }> {
  const number = normalizeOwnerPhone(phone)
  if (!number) return { ok: false, error: 'Send the agent number to remove.' }
  const current = await readAgentList(true)
  if (!current.includes(number)) {
    return { ok: false, error: `+${number} is not an agent.` }
  }
  const saved = await writeAgentList(current.filter((n) => n !== number))
  if (!saved) return { ok: false, error: 'Could not remove the agent. Please try again.' }
  if ((await readAgentList(true)).includes(number)) {
    return { ok: false, error: 'The agent is still on the list. Please try again.' }
  }
  return { ok: true, number }
}

export type ListedBusiness = {
  id: number
  name: string
  business_id: string
  phone: string | null
  category: string[] | null
  created_at: string | null
}

/** The phone spellings a listing can be stored under. */
function phoneVariants(phone: string): string[] {
  const number = normalizeOwnerPhone(phone)
  if (!number) return []
  const variants = new Set<string>([number, `+${number}`])
  if (number.startsWith('263')) variants.add(`0${number.slice(3)}`)
  return [...variants]
}

/**
 * Every live listing already using this number. Personal-contact rows are
 * ignored: a contact card should never block a business listing.
 */
export async function findBusinessesByPhone(phone: string): Promise<ListedBusiness[]> {
  const variants = phoneVariants(phone)
  if (!variants.length) return []
  try {
    const { data } = await getSupabase()
      .from('businesses')
      .select('id, name, business_id, phone, category, created_at')
      .in('phone', variants)
      .order('created_at', { ascending: true })
      .limit(10)
    return ((data || []) as ListedBusiness[]).filter(
      (row) => !(row.category || []).includes('Personal Contact')
    )
  } catch {
    return []
  }
}

/** One readable line per existing listing, for the duplicate warning. */
export function duplicateBusinessLines(rows: ListedBusiness[]): string[] {
  return rows.map(
    (row) =>
      `🏪 *${row.name}* · ${row.business_id}` +
      (row.phone ? ` · +${normalizeOwnerPhone(row.phone)}` : '')
  )
}
