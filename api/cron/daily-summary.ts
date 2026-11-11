import { compileDailySummary } from '../../src/daily-summary.js'
import { adminNumbers, notifyAdminsText } from '../../src/webhook.js'

/**
 * Vercel Cron target. Vercel sends `Authorization: Bearer $CRON_SECRET` when
 * that variable is set, so the endpoint stays closed to everyone else.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || ''
  const auth = req.headers.get('authorization') || ''
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }

  try {
    const body = await compileDailySummary()
    const admins = await adminNumbers()
    if (admins.length === 0) {
      return Response.json({ ok: false, error: 'no admin numbers configured' }, { status: 200 })
    }
    await notifyAdminsText(body)
    return Response.json({ ok: true, admins: admins.length, chars: body.length })
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'summary failed' },
      { status: 500 }
    )
  }
}
