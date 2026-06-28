import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  showDetails: boolean
}

/**
 * Catches render errors anywhere in its subtree and shows a calm, on-brand
 * fallback. Data lives in localStorage, so nothing is lost when a page throws —
 * "Try again" simply re-mounts the subtree.
 *
 * Must be a class component: React only supports error boundaries via the
 * getDerivedStateFromError / componentDidCatch lifecycle.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, showDetails: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging. Persisted data is untouched.
    console.error('ErrorBoundary caught an error:', error, info)
  }

  handleRetry = () => this.setState({ hasError: false, error: null, showDetails: false })

  toggleDetails = () => this.setState((s) => ({ showDetails: !s.showDetails }))

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, showDetails } = this.state
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        role="alert"
      >
        {/* Vallety logo mark */}
        <span
          className="font-bold leading-none"
          style={{ fontSize: 32, color: 'var(--color-accent)' }}
          aria-hidden
        >
          V
        </span>

        <h1 className="mt-4 text-[18px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Something went wrong
        </h1>
        <p className="mt-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          An unexpected error occurred. Your data is safe.
        </p>

        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={this.handleRetry}
            className="inline-flex h-10 items-center rounded-md px-4 text-[14px] font-semibold text-white"
            style={{ backgroundColor: 'var(--color-accent)', transition: 'var(--transition-fast)' }}
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex h-10 items-center rounded-md border px-4 text-[14px] font-medium"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            Go to dashboard
          </a>
        </div>

        <button
          onClick={this.toggleDetails}
          className="mt-5 text-[12px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>

        {showDetails && (
          <pre
            className="mt-2 max-w-md overflow-auto rounded-md border p-3 text-left text-[12px]"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--color-danger)',
            }}
          >
            {error?.message || 'Unknown error'}
          </pre>
        )}
      </div>
    )
  }
}
