import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
// Inicializar tema temprano antes del primer render
import './store/useThemeStore.ts'

// Registro confiable del Service Worker y persistencia de almacenamiento PWA
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('[PWA] Service Worker registrado con alcance:', registration.scope)

          // Solicitar persistencia de almacenamiento para evitar que el navegador
          // o el sistema operativo eliminen el caché tras varias horas de inactividad
          if (navigator.storage && navigator.storage.persist) {
            navigator.storage.persist().then((isPersisted) => {
              console.log('[PWA] Persistencia de almacenamiento:', isPersisted ? 'Concedida' : 'Por defecto')
            }).catch(() => {})
          }
        })
        .catch((error) => {
          console.error('[PWA] Error al registrar Service Worker:', error)
        })
    }

    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
    }
  } else {
    // En desarrollo limpiamos cualquier Service Worker o caché residual
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
      .catch(() => { })
    if ('caches' in window) {
      caches.keys()
        .then((names) => Promise.all(names.map((name) => caches.delete(name))))
        .catch(() => { })
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
