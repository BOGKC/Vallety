import { useEffect, useMemo, useRef, useState } from 'react'
import { Sparkles, ArrowUp, ClipboardCopy, Info, Check } from 'lucide-react'
import toast from '../../components/Toast'
import { formatEuro } from '../../shared/lib/formatters'
import {
  getApiKey, setApiKey, streamAdvisor, type ChatMessage,
} from '../../shared/lib/claudeClient'
import { buildAdvisorContext, monthlyTotals } from '../../shared/lib/buildAdvisorContext'

const SYSTEM_PROMPT = `You are a friendly and helpful personal finance assistant for a Finnish user. You have access to their financial data summary below. Provide practical, specific advice based on their actual numbers. Keep responses concise (2-4 sentences unless a longer answer is genuinely needed). Use euros (€) exclusively — never dollars. Always be encouraging and non-judgmental about spending. You provide general financial information only — you are not a tax advisor or investment advisor. When discussing Finnish-specific topics (taxes, banking, etc.) be accurate but always recommend consulting a professional for official advice.

User financial summary:
{context}`

const PROMPT_CHIPS = [
  'How much did I spend on food last month?',
  'Am I on track to hit my savings goals?',
  'Where am I overspending this month?',
  'Build me a 50/30/20 plan from my numbers',
  'What are my top 5 merchants this month?',
  'How can I save €500 more each month?',
]

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
        className="flex items-center gap-1 border border-default bg-bg-card px-3.5 py-3"
        style={{ borderRadius: '14px 14px 14px 4px' }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="advisor-dot h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: 'var(--text-secondary)', animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

export function AdvisorPage() {
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

    const system = SYSTEM_PROMPT.replace('{context}', buildAdvisorContext(now))
    let acc = ''
    try {
      await streamAdvisor({
        apiKey,
        system,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
        onText: (chunk) => {
          acc += chunk
          setStreamingText(acc)
        },
      })
      setMessages((prev) => [...prev, { id: nextId('a'), role: 'assistant', content: acc }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Check your API key and try again.')
    } finally {
      setStreaming(false)
      setStreamingText('')
    }
  }

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
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--color-accent)' }} />
          <h1 className="text-[18px] font-semibold text-text-primary">AI Advisor</h1>
        </div>
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
              {PROMPT_CHIPS.map((chip) => (
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
                onClick={() => send(input)}
                disabled={!input.trim() || streaming}
                className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  opacity: !input.trim() || streaming ? 0.4 : 1,
                  cursor: !input.trim() || streaming ? 'not-allowed' : 'pointer',
                }}
                aria-label="Send"
              >
                {streaming ? <Check className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
