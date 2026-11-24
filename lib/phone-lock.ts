/**
 * Cross-invocation per-number lock.
 *
 * Meta can deliver a burst of photos as separate webhook requests that run at
 * the same time. Reading a session, merging an item and writing it back is a
 * lost-update race without a lock: two requests each start from "0 photos" and
 * the last write wins. This uses bot_settings as a small insert-only lock row
 * (key is unique), so the merge is serialised across serverless instances.
 *
 * Best-effort: if the lock table cannot be written the caller proceeds
 * unlocked rather than dropping a customer's photo.
 */
import { getSupabase } from '@wa-directory/shared'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function lockKey(scope: string, phone: string): string {
  return `lock:${scope}:${(phone || '').replace(/\D/g, '')}`
}

export async function withPhoneLock<T>(
  scope: string,
  phone: string,
  fn: () => Promise<T>,
  opts: { waitMs?: number; ttlMs?: number } = {}
): Promise<T> {
  const key = lockKey(scope, phone)
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const value = JSON.stringify({ token, at: Date.now() })
  const waitMs = opts.waitMs ?? 12_000
  const ttlMs = opts.ttlMs ?? 30_000
  const deadline = Date.now() + waitMs
  let acquired = false

  while (Date.now() < deadline) {
    try {
      const { error } = await getSupabase()
        .from('bot_settings')
        .insert({ key, value, updated_at: new Date().toISOString() })
      if (!error) {
        acquired = true
        break
      }
      // 23505 = key already exists: another request holds it.
      if (error.code !== '23505') {
        console.warn('[phone-lock] acquire failed, continuing unlocked:', error.message)
        break
      }
      const { data } = await getSupabase()
        .from('bot_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle()
      const held = data?.value
      let heldAt = 0
      try {
        heldAt = Number(JSON.parse(String(held || '{}')).at) || 0
      } catch {
        heldAt = 0
      }
      // A crashed invocation must not block this number forever.
      if (heldAt && Date.now() - heldAt > ttlMs) {
        await getSupabase().from('bot_settings').delete().eq('key', key).eq('value', held)
        continue
      }
    } catch (err) {
      console.warn('[phone-lock] acquire error, continuing unlocked:', err)
      break
    }
    await sleep(120 + Math.floor(Math.random() * 80))
  }

  if (!acquired) console.warn(`[phone-lock] proceeding without lock for ${key}`)
  try {
    return await fn()
  } finally {
    if (acquired) {
      await getSupabase().from('bot_settings').delete().eq('key', key).eq('value', value)
    }
  }
}
