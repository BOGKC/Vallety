import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, ArrowUp, ClipboardCopy, Info, Square } from 'lucide-react'
import { useAppStore } from '../../shared/store/appStore'
import toast from '../../components/Toast'
import { LoadingMessages } from '../../components/LoadingMessages'
import { formatEuro } from '../../shared/lib/formatters'
import {
  getApiKey, setApiKey, streamAdvisor, type ChatMessage,
} from '../../shared/lib/claudeClient'
import { buildAdvisorContext, monthlyTotals } from '../../shared/lib/buildAdvisorContext'

// ── Mode personas — the advisor is a different expert per mode ────────────────

interface Persona {
  title: string
  tagline: string
  system: string
  chips: string[]
}

const SHARED_RULES = `Keep responses concise (2-4 sentences unless a longer answer is genuinely needed). Use euros (€) exclusively — never dollars. Base everything on the user's actual numbers from the summary below.`

const PERSONAS: Record<string, Persona> = {
  personal: {
    title: 'Your money coach',
    tagline: 'Warm, practical help with everyday money',
    system: `You are a friendly personal finance coach helping someone manage their everyday money. Be encouraging, practical, and non-judgmental — like a financially savvy friend. Focus on their budgets, spending patterns, bills, and savings goals. ${SHARED_RULES} You provide general financial information only, not professional financial advice.`,
    chips: [
      'Where am I overspending?',
      'How do I hit my savings goal faster?',
      'Build me a 50/30/20 budget',
      'Am I spending too much on dining?',
      'What are my top merchants this month?',
    ],
  },
  business: {
    title: 'Your business finance advisor',
    tagline: 'Sharp guidance for Finnish solo entrepreneurs',
    system: `You are a knowledgeable business finance advisor for a Finnish solo entrepreneur. You understand ALV (Finnish VAT), advance tax (ennakkovero), YEL pension, and the difference between toiminimi and osakeyhtiö. Be sharp, precise, and straight-talking — like a smart accountant friend. Give practical, specific guidance based on their business numbers: invoicing, deductions, pricing, cash flow, and take-home optimization. ${SHARED_RULES} IMPORTANT: always note that tax figures are estimates and recommend consulting a veroasiantuntija (tax professional) for official advice — you inform, you don't replace an accountant.`,
    chips: [
      'How much should I set aside for taxes this month?',
      'What business expenses can I deduct?',
      'Am I charging enough for my work?',
      'Should I switch from toiminimi to OY?',
      'How much can I safely pay myself?',
    ],
  },
  investment: {
    title: 'Your portfolio analyst',
    tagline: 'Measured, data-driven portfolio analysis',
    system: `You are a measured, analytical portfolio assistant. Help the user understand their portfolio's composition, performance, diversification, and dividend income based on their actual holdings. Be calm, factual, and data-driven — never hyped, never giving hot tips. You provide analysis and education ONLY, not investment advice or recommendations to buy or sell specific securities. ${SHARED_RULES} IMPORTANT: always make clear your analysis is informational only and not financial advice.`,
    chips: [
      'How diversified is my portfolio?',
      "What's my best and worst performer?",
      'How much dividend income did I earn this year?',
      'Am I too concentrated in one holding?',
      "What's my portfolio's asset allocation?",
    ],
  },
}

const SYSTEM_TEMPLATE = `{persona}

User financial summary:
{context}`

interface Msg extends ChatMessage {
  id: string
}

// ── Setup card ────────────────────────────────────────────────────────────────

function SetupCard({ onSaved }: { onSaved: () => void }) {
  const [value, setValue] = useState('')
  return (
    <div className="mx-auto max-w-md rounded-lg border border-default bg-bg-card p-6">
      <h2 className="text-[16px] font-medium text-text-primary">Connect your AI Advisor</h2>
      <p className="mt-1.5 text-[13px] text-text-secondary">
        Paste your Anthropic API key to enable AI-powered financial insights. Your key is stored
        only in this browser.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-..."
          className="h-10 flex-1 rounded-md border border-default bg-bg-input px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
        />
        <button
          onClick={() => { if (value.trim()) { setApiKey(value); onSaved() } }}
          disabled={!value.trim()}
          className="inline-flex h-10 items-center rounded-md px-4 text-[13px] font-semibold text-white"
          style={{ backgroundColor: 'var(--color-accent)', opacity: value.trim() ? 1 : 0.4 }}
        >
          Save key
        </button>
      </div>
    </div>
  )
}

// ── Message bubbles ───────────────────────────────────────────────────────────

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start justify-end gap-2">
      <div
        className="max-w-[80%] whitespace-pre-wrap px-3.5 py-2.5 text-[14px] text-white"
        style={{ backgroundColor: 'var(--color-accent)', borderRadius: '14px 14px 4px 14px' }}
      >
        {text}
      </div>
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white"
        style={{ backgroundColor: 'rgba(59,91,219,0.6)' }}
      >
        V
      </span>
    </div>
  )
}

function AssistantBubble({ text, streaming }: { text: string; streaming?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied')
    } catch {
      toast.error('Could not copy')
    }
  }
  return (
    <div className="group flex items-start gap-2">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated">
        <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
      </span>
      <div className="relative max-w-[85%]">
        <div
          className="whitespace-pre-wrap border border-default bg-bg-card px-3.5 py-2.5 text-[14px] text-text-primary"
          style={{ borderRadius: '14px 14px 14px 4px' }}
        >
          {text}
          {streaming && <span className="advisor-caret ml-0.5">|</span>}
        </div>
        {!streaming && text && (
          <button
            onClick={copy}
            className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Copy message"
          >
            <ClipboardCopy className="h-3 w-3 text-text-muted hover:text-text-primary" />
          </button>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-bg-elevated">
        <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--color-accent)' }} />
      </span>
      <div
        className="border border-default bg-bg-card px-3.5 py-2.5"
        style={{ borderRadius: '14px 14px 14px 4px' }}
      >
        {/* Dots appear instantly; the contextual script rotates with them. */}
        <LoadingMessages operation="advisor" appearAfterMs={0} />
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function AdvisorPage() {
  const mode = useAppStore((s) => s.mode)
  const persona = PERSONAS[mode] ?? PERSONAS.personal
  const [hasKey, setHasKey] = useState(() => !!getApiKey())
  const [messages, setMessages] = useState<Msg[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const now = useMemo(() => new Date(), [])
  const totals = useMemo(() => monthlyTotals(now), [now])
  const noData = totals.income === 0 && totals.expenses === 0

  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const idCounter = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const nextId = (prefix: string) => `${prefix}_${(idCounter.current += 1)}`

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamingText, streaming])

  // Auto-resize the textarea (1–4 rows).
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`
  }, [input])

  const send = async (text: string) => {
    const trimmed = text.trim()
    const apiKey = getApiKey()
    if (!trimmed || streaming || !apiKey) return

    setError('')
    setInput('')
    const userMsg: Msg = { id: nextId('u'), role: 'user', content: trimmed }
    const history = [...messages, userMsg]
    setMessages(history)
    setStreaming(true)
    setStreamingText('')

    const system = SYSTEM_TEMPLATE
      .replace('{persona}', persona.system)
      .replace('{context}', buildAdvisorContext(now, mode))
    const controller = new AbortController()
    abortRef.current = controller
    let acc = ''
    try {
      await streamAdvisor({
        apiKey,
        system,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        signal: controller.signal,
        onText: (chunk) => {
          acc += chunk
          setStreamingText(acc)
        },
      })
      if (acc.trim()) {
        setMessages((prev) => [...prev, { id: nextId('a'), role: 'assistant', content: acc }])
      } else {
        setError('The assistant returned an empty response. Please try again.')
      }
    } catch (e) {
      if (controller.signal.aborted) {
        // User stopped the stream — keep whatever streamed so far.
        if (acc.trim()) {
          setMessages((prev) => [...prev, { id: nextId('a'), role: 'assistant', content: acc }])
        }
      } else {
        // Raw details go to the console; the user gets calm, actionable copy
        // and never loses what they typed — the message returns to the box.
        console.error('Advisor request failed:', e)
        const raw = e instanceof Error ? e.message : ''
        setError(
          /rate.?limit|429|overloaded|529/i.test(raw)
            ? 'The advisor is taking a break — try again in a moment.'
            : /401|403|authentication|invalid.*key|x-api-key/i.test(raw)
              ? 'That API key didn’t work — check it in Profile & settings, then try again.'
              : 'The advisor couldn’t answer just now. Your message is back in the box — try again in a moment.'
        )
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        setInput(trimmed)
      }
    } finally {
      setStreaming(false)
      setStreamingText('')
      abortRef.current = null
    }
  }

  const stopStream = () => abortRef.current?.abort()

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const showChips = !streaming && (messages.length === 0 || messages[messages.length - 1].role === 'assistant')

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* Header / context cards */}
      <div className="flex-shrink-0">
        <div className="mb-3 flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--color-accent-muted)', transition: 'background-color 400ms ease' }}
          >
            <Sparkles className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          </span>
          <div>
            <h1 className="text-[18px] font-semibold leading-tight text-text-primary">{persona.title}</h1>
            <p className="text-[12px]" style={{ color: 'var(--color-accent)' }}>{persona.tagline}</p>
          </div>
        </div>
        {!noData && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-default bg-bg-card p-3">
              <p className="text-[16px] font-semibold" style={{ color: 'var(--color-success)' }}>
                {formatEuro(totals.income)}
              </p>
              <p className="text-[12px] text-text-muted">Income (mo)</p>
            </div>
            <div className="rounded-lg border border-default bg-bg-card p-3">
              <p className="text-[16px] font-semibold" style={{ color: 'var(--color-danger)' }}>
                {formatEuro(totals.expenses)}
              </p>
              <p className="text-[12px] text-text-muted">Expenses (mo)</p>
            </div>
          </div>
        )}

        {noData && (
          <div
            className="mt-3 flex items-start gap-2 rounded-md border border-default bg-bg-elevated px-3.5 py-2.5"
          >
            <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-info)' }} />
            <p className="text-[13px] text-text-secondary">
              Add some transactions first to get personalized insights — right now the advisor is
              working with no data about your finances.
            </p>
          </div>
        )}
      </div>

      {!hasKey ? (
        <div className="mt-8">
          <SetupCard onSaved={() => setHasKey(true)} />
        </div>
      ) : (
        <>
          {/* Chat area */}
          <div ref={scrollRef} className="mt-4 flex-1 space-y-4 overflow-y-auto py-2">
            {messages.length === 0 && !streaming && (
              <p className="py-6 text-center text-[13px] text-text-muted">
                Ask anything about your finances, or tap a suggestion below.
              </p>
            )}
            {messages.map((m) =>
              m.role === 'user'
                ? <UserBubble key={m.id} text={m.content} />
                : <AssistantBubble key={m.id} text={m.content} />
            )}
            {streaming && (streamingText ? <AssistantBubble text={streamingText} streaming /> : <TypingIndicator />)}
            {error && (
              <p className="text-[13px]" style={{ color: 'var(--color-danger)' }}>{error}</p>
            )}
          </div>

          {/* Prompt chips */}
          {showChips && (
            <div className="flex flex-shrink-0 gap-2 overflow-x-auto pb-2 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
              {persona.chips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="flex-shrink-0 rounded-full border border-default bg-bg-elevated px-3.5 py-2 text-[13px] text-text-secondary hover:text-text-primary"
                  style={{ transition: 'var(--transition-fast)' }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex-shrink-0 border-t border-subtle bg-bg-secondary px-1 py-3">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Ask about your finances..."
                className="w-full resize-none rounded-xl border border-default bg-bg-input py-2.5 pl-3.5 pr-12 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent"
              />
              <button
                onClick={() => (streaming ? stopStream() : send(input))}
                disabled={!streaming && !input.trim()}
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  opacity: !streaming && !input.trim() ? 0.4 : 1,
                  cursor: !streaming && !input.trim() ? 'not-allowed' : 'pointer',
                }}
                aria-label={streaming ? 'Stop generating' : 'Send'}
              >
                {streaming ? <Square className="h-3.5 w-3.5 fill-current" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
