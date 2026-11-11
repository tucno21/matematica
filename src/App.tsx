import AppRouter from './routes/AppRouter'
import ErrorBoundary from './components/ErrorBoundary'
// import FloatingThemeToggle from './components/FloatingThemeToggle'

export default function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      {/* <FloatingThemeToggle /> */}
    </ErrorBoundary>
  )
}

