import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const THEME_STORAGE_KEY = 'matematic_theme'

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
  } catch {
    // Si localStorage no está disponible
  }
  // Por requerimiento expreso del usuario: por defecto está desactivado (modo claro)
  return 'light'
}

function applyThemeToDocument(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
  } else {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const initialTheme = getInitialTheme()
  // Aplicar inmediatamente al cargar el módulo
  applyThemeToDocument(initialTheme)

  return {
    theme: initialTheme,
    toggleTheme: () => {
      const nextTheme: Theme = get().theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
      } catch {
        // Ignorar errores de almacenamiento
      }
      applyThemeToDocument(nextTheme)
      set({ theme: nextTheme })
    },
    setTheme: (theme: Theme) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
      } catch {
        // Ignorar errores de almacenamiento
      }
      applyThemeToDocument(theme)
      set({ theme })
    }
  }
})
