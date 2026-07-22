import { Component, type ErrorInfo, type ReactNode } from 'react'
import './playShellErrorBoundary.css'

interface PlayShellErrorBoundaryProps {
  children: ReactNode
  onReturnToHub: () => void
}

interface PlayShellErrorBoundaryState {
  hasError: boolean
  summary: string | null
  remountKey: number
}

function playShellErrorSummary(error: unknown): string {
  if (import.meta.env.DEV && error instanceof Error && error.message.trim()) {
    return error.message
  }
  return 'Something went wrong in the play view.'
}

/** EPIC-136: local recovery only — no remote crash reporting. */
export class PlayShellErrorBoundary extends Component<
  PlayShellErrorBoundaryProps,
  PlayShellErrorBoundaryState
> {
  override state: PlayShellErrorBoundaryState = {
    hasError: false,
    summary: null,
    remountKey: 0
  }

  static getDerivedStateFromError(error: unknown): Partial<PlayShellErrorBoundaryState> {
    return { hasError: true, summary: playShellErrorSummary(error) }
  }

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[play-shell-error-boundary]', error, info.componentStack)
    }
  }

  private handleReturnToHub = (): void => {
    this.setState({ hasError: false, summary: null })
    this.props.onReturnToHub()
  }

  private handleReloadPlay = (): void => {
    this.setState((state) => ({
      hasError: false,
      summary: null,
      remountKey: state.remountKey + 1
    }))
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="play-shell-error-fallback" role="alert">
          <h2>Play view interrupted</h2>
          <p>{this.state.summary}</p>
          <div className="play-shell-error-actions">
            <button type="button" onClick={this.handleReturnToHub}>
              Return to Hub
            </button>
            <button type="button" className="play-shell-error-secondary" onClick={this.handleReloadPlay}>
              Reload play
            </button>
          </div>
        </div>
      )
    }

    return <div key={this.state.remountKey}>{this.props.children}</div>
  }
}
