import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
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

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Error capturado en la aplicación:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center p-4 bg-[#080c18] text-white select-none">
          <div className="max-w-md w-full p-6 rounded-2xl border border-white/10 bg-[#0f172a] shadow-xl text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-lg font-bold text-white">
              Algo no cargó correctamente
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              La aplicación ha detectado un problema al cargar esta pantalla. Puedes volver al inicio o recargar la página para continuar aprendiendo sin conexión.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
              >
                Ir al Inicio
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-lg border border-blue-500 bg-blue-600 hover:bg-blue-500 text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Recargar Aplicación
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
