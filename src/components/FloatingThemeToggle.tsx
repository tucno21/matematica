import { useState, useRef, useEffect } from 'react'
import { useThemeStore } from '../store/useThemeStore'
import { Sun, Moon } from 'lucide-react'

export default function FloatingThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const isDark = theme === 'dark'

  // Posición libremente arrastrable para que no estorbe en ninguna vista ni en tablet
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    origX: number
    origY: number
    isDragging: boolean
    hasMoved: boolean
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    isDragging: false,
    hasMoved: false,
  })

  const btnRef = useRef<HTMLButtonElement>(null)

  // Inicializar posición por defecto en la esquina inferior derecha (encima de la barra footer)
  useEffect(() => {
    const updateDefaultPos = () => {
      if (!pos) {
        const btnWidth = 140
        const btnHeight = 38
        const marginX = 14
        const marginY = 56 // 56px para estar sobre la barra footer
        setPos({
          x: Math.max(10, window.innerWidth - btnWidth - marginX),
          y: Math.max(10, window.innerHeight - btnHeight - marginY),
        })
      }
    }

    updateDefaultPos()
    window.addEventListener('resize', updateDefaultPos)
    return () => window.removeEventListener('resize', updateDefaultPos)
  }, [pos])

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Capturar puntero para arrastre suave con touch o mouse
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      isDragging: true,
      hasMoved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY

    if (Math.hypot(dx, dy) > 5) {
      dragRef.current.hasMoved = true
    }

    const btnWidth = btnRef.current?.offsetWidth || 140
    const btnHeight = btnRef.current?.offsetHeight || 38
    const newX = Math.min(Math.max(8, dragRef.current.origX + dx), window.innerWidth - btnWidth - 8)
    const newY = Math.min(Math.max(8, dragRef.current.origY + dy), window.innerHeight - btnHeight - 8)

    setPos({ x: newX, y: newY })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.isDragging) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignorar si el puntero ya no está capturado
    }

    const wasClick = !dragRef.current.hasMoved
    dragRef.current.isDragging = false

    if (wasClick) {
      toggleTheme()
    }
  }

  return (
    <button
      ref={btnRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      type="button"
      aria-label="Alternar modo claro / modo oscuro"
      title={`Modo actual: ${isDark ? 'Oscuro' : 'Claro'}. Toca para cambiar o arrastra para reubicar.`}
      className={`fixed z-[99999] flex items-center gap-1.5 px-3 py-1.5 rounded-full select-none font-bold text-[11px] shadow-2xl transition-transform active:scale-95 cursor-grab active:cursor-grabbing border ${
        isDark
          ? 'bg-indigo-950/95 text-amber-200 border-indigo-400/60 shadow-indigo-950/60'
          : 'bg-indigo-600 text-white border-indigo-300/80 shadow-indigo-900/40'
      }`}
      style={{
        left: pos ? `${pos.x}px` : undefined,
        top: pos ? `${pos.y}px` : undefined,
        right: !pos ? '14px' : undefined,
        bottom: !pos ? '56px' : undefined,
        touchAction: 'none',
        backdropFilter: 'blur(8px)',
        boxShadow: isDark
          ? '0 6px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(99, 102, 241, 0.4)'
          : '0 6px 20px rgba(0, 0, 0, 0.3), 0 0 12px rgba(79, 70, 229, 0.4)',
      }}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-300 animate-spin-slow shrink-0" />
          <span className="leading-none whitespace-nowrap font-extrabold tracking-wide">
            Modo: Oscuro
          </span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-sky-200 shrink-0" />
          <span className="leading-none whitespace-nowrap font-extrabold tracking-wide">
            Modo: Claro
          </span>
        </>
      )}
      <span className="text-[9px] opacity-75 font-mono ml-0.5 px-1 py-0.2 rounded bg-black/20">
        ⇄
      </span>
    </button>
  )
}
