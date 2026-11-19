import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh grid place-items-center app-bg-dark px-4">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-slate-950/75 p-7 text-center backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-rose-400/25 bg-rose-500/10 text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <AlertOctagon className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-white">Algo deu errado</h1>
            <p className="mt-2 text-sm text-white/60">
              Ocorreu um erro inesperado na interface. Tente recarregar a página.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-32 overflow-auto rounded-xl border border-white/[0.08] bg-slate-950/80 p-3 text-left font-mono text-xs text-rose-300">
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary mt-6"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
