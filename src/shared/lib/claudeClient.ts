export const ANTHROPIC_KEY_STORAGE = 'vallety_anthropic_key'

export function getApiKey(): string | null {
  try {
    return window.localStorage.getItem(ANTHROPIC_KEY_STORAGE)
  } catch {
    return null
  }
}

export function setApiKey(key: string): void {
  try {
    window.localStorage.setItem(ANTHROPIC_KEY_STORAGE, key.trim())
  } catch {
    /* ignore */
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// claude-3-5-haiku-20241022 (named in the spec) retired on 2026-02-19; its
// documented drop-in replacement is claude-haiku-4-5.
const MODEL = 'claude-haiku-4-5'

interface StreamArgs {
  apiKey: string
  system: string
  messages: ChatMessage[]
  onText: (chunk: string) => void
  signal?: AbortSignal
}

/**
 * Stream a response from the Anthropic Messages API directly from the browser.
 * Requires the `anthropic-dangerous-direct-browser-access` header so the
 * request isn't blocked by CORS when called client-side.
 */
export async function streamAdvisor({ apiKey, system, messages, onText, signal }: StreamArgs): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      stream: true,
      system,
      messages,
    }),
    signal,
  })

  if (!res.ok || !res.body) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error?.message) message = body.error.message
    } catch {
      /* keep default */
    }
    throw new Error(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const evt = JSON.parse(data)
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          onText(evt.delta.text as string)
        }
      } catch {
        /* ignore non-JSON keepalive lines */
      }
    }
  }
}
