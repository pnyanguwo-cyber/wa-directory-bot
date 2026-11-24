/**
 * Admin directory reports: pending/new listings, the full directory, engagement
 * rows and the CSV builders. Pure data access and formatting, kept out of the
 * webhook so routing stays readable.
 */
import { getSupabase, formatPhone } from '@wa-directory/shared'

export interface PendingBusiness {
  id: string
  name: string
  phone: string | null
  city: string | null
  created_at: string
}

export async function listUnverifiedBusinesses(limit = 10): Promise<PendingBusiness[]> {
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

// Newest businesses regardless of state - the "listings" admin view.
export type BusinessSummary = {
  id: number
  name: string
  username: string | null
  city: string | null
  verified: boolean
  payment_status: string | null
  created_at: string
}

export async function listRecentBusinesses(limit = 10): Promise<BusinessSummary[]> {
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
// Expired listings are excluded - renewals are tracked elsewhere.
export type DirectoryRow = {
  id: number
  name: string
  city: string | null
  phone: string
  phone_type: string | null
  category: string[] | null
}

export async function listDirectoryRows(limit = 600): Promise<DirectoryRow[]> {
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
export function contactChunkMessages(
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

// Everyone who has ever messaged the bot - the engagement list.
export type ChatCsvRow = {
  phone: string
  name: string | null
  first_seen: string | null
  last_seen: string | null
  message_count: number | null
  last_step: string | null
  opted_out: boolean | null
}

export async function listChatCsvRows(limit = 200): Promise<ChatCsvRow[]> {
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

export type BizCsvRow = {
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

export async function listBizCsvRows(): Promise<BizCsvRow[]> {
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

export function csvForBusinesses(rows: BizCsvRow[]): string {
  return csvBody(
    ['name', 'username', 'city', 'phone', 'phone_type', 'verified', 'payment_status', 'created_at'],
    rows
      .filter(r => !(r.category || []).includes('Personal Contact'))
      .map(r => [r.name, r.username || '', r.city || '', r.phone, r.phone_type || 'whatsapp', r.verified ? 'true' : 'false', r.payment_status || '', r.created_at || ''])
  )
}

export function csvForPeople(rows: BizCsvRow[]): string {
  return csvBody(
    ['name', 'city', 'phone', 'phone_type', 'socials', 'created_at'],
    rows
      .filter(r => (r.category || []).includes('Personal Contact'))
      .map(r => [r.name, r.city || '', r.phone, r.phone_type || 'whatsapp', (r.socials || []).join(' | '), r.created_at || ''])
  )
}

export function csvForChats(rows: ChatCsvRow[]): string {
  return csvBody(
    ['name', 'phone', 'first_seen', 'last_seen', 'notes', 'last_step', 'opted_out'],
    rows.map(r => [r.name || '', r.phone, r.first_seen || '', r.last_seen || '', r.message_count ?? 0, r.last_step || '', r.opted_out ? 'true' : 'false'])
  )
}
