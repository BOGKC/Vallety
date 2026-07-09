import { Component, type ErrorInfo, type ReactNode } from 'react'
import {
  BrokenShapeIllustration, ErrorActions, PrimaryAction, SecondaryAction,
} from './errors/ErrorState'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Catches render errors anywhere in its subtree and shows a calm, on-brand
 * fallback. Data lives in localStorage, so nothing is lost when a page throws —
 * "Try again" simply re-mounts the subtree. Raw error details are logged to
 * the console and attached to the "Report this" email, never shown on screen.
 *
 * Must be a class component: React only supports error boundaries via the
 * getDerivedStateFromError / componentDidCatch lifecycle.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console/monitoring only — the user never sees the stack.
    console.error('ErrorBoundary caught an error:', error, info)
  }

  handleRetry = () => this.setState({ hasError: false, error: null })

  buildReportHref = () => {
    const e = this.state.error
    const body = [
      'Something went sideways in Vallety — error report:',
      '',
      `Message: ${e?.message ?? 'Unknown'}`,
      `Page: ${window.location.pathname}`,
      `Time: ${new Date().toISOString()}`,
      `Browser: ${navigator.userAgent}`,
      '',
      (e?.stack ?? '').split('\n').slice(0, 6).join('\n'),
    ].join('\n')
    return `mailto:support@vallety.app?subject=${encodeURIComponent('Vallety error report')}&body=${encodeURIComponent(body)}`
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
        role="alert"
      >
        <BrokenShapeIllustration />

        <h1 className="mt-5 text-[20px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Something went sideways
        </h1>
        <p className="mt-1.5 max-w-sm text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          Don't worry — your data is safe. Let's get you back on track.
        </p>

        <ErrorActions>
          <PrimaryAction onClick={this.handleRetry}>Try again</PrimaryAction>
          <SecondaryAction href="/">Go to dashboard</SecondaryAction>
        </ErrorActions>

        <a
          href={this.buildReportHref()}
          className="mt-5 text-[12px] hover:underline"
          style={{ color: 'var(--text-muted)' }}
        >
          Report this
        </a>
      </div>
    )
  }
}
