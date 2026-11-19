import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="glass rounded-2xl px-6 py-8 shadow-glass">
          <p className="font-display text-3xl tracking-wide text-zinc-100">SOMETHING BROKE</p>
          <p className="mt-2 max-w-md text-sm text-zinc-400">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-5 rounded-xl border border-white/10 bg-white/10 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-white/15"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
