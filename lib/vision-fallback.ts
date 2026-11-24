export interface VisionImage {
  bytes: Uint8Array
  mime: string
}

function toDataUrl(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`
}

function parseJson(text: string | null | undefined): any {
  if (!text) return null
  const cleaned = text.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

async function postChat(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  images: VisionImage[],
  timeoutMs: number,
  extraHeaders: Record<string, string> = {}
): Promise<any> {
  const content: any[] = [{ type: 'text', text: prompt }]
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: toDataUrl(img.bytes, img.mime) },
    })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content }],
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    })
    if (!res.ok) return null
    const data: any = await res.json().catch(() => null)
    const text =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      null
    return parseJson(typeof text === 'string' ? text : null)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function callVisionJson(
  prompt: string,
  images: VisionImage[],
  timeoutMs = 20_000
): Promise<any | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (openRouterKey) {
    const model =
      process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash:free'
    const result = await postChat(
      'https://openrouter.ai/api/v1/chat/completions',
      openRouterKey,
      model,
      prompt,
      images,
      timeoutMs,
      { 'HTTP-Referer': 'https://wa.directory', 'X-Title': 'wa-directory-bot' }
    )
    if (result) return result
  }

  const zaiKey = process.env.ZAI_API_KEY
  if (zaiKey) {
    const model = process.env.ZAI_MODEL || 'glm-4.6v-flash'
    const result = await postChat(
      'https://api.z.ai/api/paas/v4/chat/completions',
      zaiKey,
      model,
      prompt,
      images,
      timeoutMs
    )
    if (result) return result
  }

  return null
}
