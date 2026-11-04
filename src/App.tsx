import AppRouter from './routes/AppRouter'
// import FloatingThemeToggle from './components/FloatingThemeToggle'

export default function App() {
  return (
    <>
      <AppRouter />
      {/* Botón flotante para alternar tema (oculto en producción).
          Para pruebas, descomenta la siguiente línea y su import arriba: */}
      {/* <FloatingThemeToggle /> */}
    </>
  )
}
