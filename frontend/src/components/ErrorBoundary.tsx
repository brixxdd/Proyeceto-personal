import { Component, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log to error reporting service in production
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div
                    className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="w-16 h-16 rounded-full bg-[var(--color-destructive)]/10 flex items-center justify-center mb-2">
                        <svg
                            aria-hidden="true"
                            className="w-8 h-8 text-[var(--color-destructive)]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
                        Algo salió mal
                    </h1>

                    <p className="text-[var(--color-muted-foreground)] max-w-md">
                        Lo sentimos, hubo un error al cargar esta página. Puedes intentar recargar o volver al inicio.
                    </p>

                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="px-5 py-3 rounded-[14px] font-semibold text-[15px] bg-[var(--color-primary)] text-white ios-shadow hover:opacity-90 transition-opacity"
                        >
                            Reintentar
                        </button>

                        <button
                            onClick={() => (window.location.href = '/')}
                            className="px-5 py-3 rounded-[14px] font-semibold text-[15px] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition-colors"
                        >
                            Ir al inicio
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
