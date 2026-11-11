import { getSupabase } from '@wa-directory/shared'

/**
 * One compact message an admin can read on their phone: what buyers did, what
 * orders came in, and what still needs a human decision. Deliberately shorter
 * than `digest` — the full report is still one word away.
 */

const DAY_MS = 24 * 3600_000

function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Harare',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(d)
}

function money(usd: number): string {
  return `$${(Math.round(usd * 100) / 100).toFixed(2)}`
}

function cap<T>(rows: T[], n: number): T[] {
  return rows.slice(0, n)
}

export async function compileDailySummary(now = new Date()): Promise<string> {
  const toIso = now.toISOString()
  const fromIso = new Date(now.getTime() - DAY_MS).toISOString()
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS).toISOString()
  const supabase = getSupabase()

  const [searchRes, needRes, orderRes, bizRes, pendingRes, subRes, openOrderRes] = await Promise.all([
    supabase.from('bot_searches').select('term, city').gte('created_at', fromIso).lte('created_at', toIso).limit(500),
    supabase
      .from('work_needs')
      .select('rq_id, item, qty, city, status')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('supply_orders').select('status, lines').gte('created_at', fromIso).lte('created_at', toIso).limit(200),
    supabase
      .from('businesses')
      .select('name, city, verified')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('verified', false),
    supabase
      .from('subscriptions')
      .select('id, expires_at')
      .eq('status', 'active')
      .gte('expires_at', toIso)
      .lte('expires_at', weekAhead)
      .limit(100),
    supabase
      .from('supply_orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'sent'])
      .limit(1),
  ])

  const searches = (searchRes.data || []) as { term: string | null; city: string | null }[]
  const needs = (needRes.data || []) as { rq_id: string; item: string; qty: string | null; city: string | null; status: string }[]
  const orders = (orderRes.data || []) as { status: string; lines: { price: number | null; qty: number }[] | null }[]
  const biz = (bizRes.data || []) as { name: string; city: string | null; verified: boolean }[]

  const confirmed = orders.filter(o => o.status === 'claimed' || o.status === 'closed').length
  const value = orders.reduce(
    (sum, o) => sum + (o.lines || []).reduce((s, l) => s + (l.price || 0) * (l.qty || 0), 0),
    0
  )
  const openOrders = openOrderRes.count || 0
  const pendingVerification = pendingRes.count || 0
  const expiring = (subRes.data || []).length

  const lines: string[] = [`📊 *Daily summary*`, `${dayLabel(now)} · last 24h (Harare)`]

  const quiet = searches.length === 0 && needs.length === 0 && orders.length === 0 && biz.length === 0

  if (quiet) {
    lines.push('', 'Quiet day — no searches, needs, orders or new listings.')
  } else {
    lines.push('', '*Buyers*')
    lines.push(`🔎 ${searches.length} search${searches.length === 1 ? '' : 'es'}`)
    if (searches.length > 0) {
      const tally = new Map<string, number>()
      for (const s of searches) {
        const key = `${(s.term || '').trim()}${s.city ? ` ${s.city}` : ''}`.toLowerCase()
        if (key) tally.set(key, (tally.get(key) || 0) + 1)
      }
      const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      if (top.length > 0) {
        lines.push(`   ${top.map(([t, c]) => (c > 1 ? `${t} ×${c}` : t)).join(' · ')}`)
      }
    }
    lines.push(`🛒 ${needs.length} need${needs.length === 1 ? '' : 's'} posted`)
    for (const n of cap(needs, 4)) {
      const head = [n.qty ? `${n.qty} ×` : '', n.item].filter(Boolean).join(' ') || 'item'
      lines.push(`   • ${head} · ${(n.city || 'ZIMBABWE').toUpperCase()}`)
    }
    if (needs.length > 4) lines.push(`   …and ${needs.length - 4} more`)

    lines.push('', '*Orders*')
    if (orders.length === 0) {
      lines.push('🧾 none today')
    } else {
      lines.push(`🧾 ${orders.length} sent · ${confirmed} confirmed · ${money(value)}`)
      if (openOrders > 0) lines.push(`   ⏳ ${openOrders} still waiting on a shop`)
    }

    lines.push('', '*Shops*')
    lines.push(`🏪 ${biz.length} new listing${biz.length === 1 ? '' : 's'}`)
    for (const b of cap(biz, 3)) {
      lines.push(`   • ${b.name}${b.city ? ` · ${b.city}` : ''}${b.verified ? '' : ' · unverified'}`)
    }
    if (biz.length > 3) lines.push(`   …and ${biz.length - 3} more`)
  }

  if (pendingVerification > 0) lines.push(`○ ${pendingVerification} listing${pendingVerification === 1 ? '' : 's'} waiting for verification`)
  if (expiring > 0) lines.push(`💳 ${expiring} subscription${expiring === 1 ? '' : 's'} expiring within 7 days`)
  if (quiet && pendingVerification === 0 && expiring === 0) lines.push('', 'Nothing needs you right now.')

  lines.push('', 'Full detail: *digest*')
  return lines.join('\n')
}
