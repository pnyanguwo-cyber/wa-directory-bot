import fs from 'node:fs'

const envFile = fs.readFileSync('../wa.directory/.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split(/\r?\n/).filter(l => l.includes('=') && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  })
)
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'

const sent = []
const realFetch = globalThis.fetch
globalThis.fetch = async (url, init) => {
  const href = String(url)
  if (!/graph\.facebook\.com/.test(href)) return realFetch(url, init)
  let body = ''
  try { body = init?.body ? init.body.toString() : '' } catch {}
  sent.push(body)
  return new Response(JSON.stringify({ messages: [{ id: 'x' }] }), { status: 200, headers: { 'content-type': 'application/json' } })
}

const { createRequire } = await import('node:module')
const require = createRequire(import.meta.url)
const shared = require('@wa-directory/shared')
const sb = shared.getSupabase()
const PHONE = '263773791864'

const { data: real } = await sb.from('conversation_state').select('state, context_json').eq('phone', PHONE).single()
console.log('real state:', real.state, 'step:', real.context_json.step, 'city:', real.context_json.fields?.city?.value)

const TEST = '263770000099'
const ctx = JSON.parse(JSON.stringify(real.context_json))
await sb.from('conversation_state').upsert({ phone: TEST, state: real.state, context_json: ctx, expires_at: new Date(Date.now() + 3600e3).toISOString() }, { onConflict: 'phone' })

for (const text of ['Edit city : Bulawayo', 'reg_edit', 'City: Bulawayo']) {
  sent.length = 0
  try {
    await shared.handleRegistrationMessage(TEST, text, ctx)
  } catch (e) {
    console.log(`\n${JSON.stringify(text)} THREW:`, e.message)
    continue
  }
  const after = await sb.from('conversation_state').select('state, context_json').eq('phone', TEST).single()
  console.log(`\n${JSON.stringify(text)} -> state=${after.data.state} step=${after.data.context_json.step} city=${after.data.context_json.fields?.city?.value}`)
  for (const b of sent) {
    try {
      const j = JSON.parse(b)
      const buttons = (j.interactive?.action?.buttons || []).map(x => x.reply?.title || x.title).join(' | ')
      console.log('  SENT:', (j.text?.body || j.interactive?.body?.text || '').replace(/\n/g, ' / ').slice(0, 160), buttons ? `[buttons: ${buttons}]` : '')
    } catch { console.log('  SENT(raw)') }
  }
  ctx.fields = after.data.context_json.fields
  ctx.listing = after.data.context_json.listing
}

await sb.from('conversation_state').delete().eq('phone', TEST)
