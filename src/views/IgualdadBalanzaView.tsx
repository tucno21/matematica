import { useState, useCallback, useRef, useEffect, useMemo, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  Undo2,
  Sparkles,
  CheckCircle2,
  Calculator,
  History as HistoryIcon,
  ArrowRight,
  Repeat,
  AlertTriangle,
} from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

type ObjType = 'apple' | 'orange' | 'lemon' | 'pear' | 'watermelon' | 'box'
type Side = 'left' | 'right'

interface Obj {
  id: string
  type: ObjType
}

interface HistEntry {
  text: string
}

const DEFS: Record<ObjType, { name: string; w: number; color: string }> = {
  apple: { name: 'Manzana', w: 1, color: '#ef4444' },
  orange: { name: 'Naranja', w: 2, color: '#f97316' },
  lemon: { name: 'Limón', w: 3, color: '#eab308' },
  pear: { name: 'Pera', w: 4, color: '#22c55e' },
  watermelon: { name: 'Sandía', w: 5, color: '#16a34a' },
  box: { name: 'Caja', w: 10, color: '#92400e' },
}

let _id = 0
const mk = (t: ObjType): Obj => ({ id: `o${_id++}`, type: t })
const mks = (ts: ObjType[]): Obj[] => ts.map(t => mk(t))
const wOf = (os: Obj[]): number => os.reduce((s, o) => s + DEFS[o.type].w, 0)
const countTypes = (os: Obj[]): Record<string, number> => {
  const m: Record<string, number> = {}
  for (const o of os) m[o.type] = (m[o.type] || 0) + 1
  return m
}
const sameComp = (a: Obj[], b: Obj[]): boolean => {
  const ca = countTypes(a)
  const cb = countTypes(b)
  return Object.keys({ ...ca, ...cb }).every(k => ca[k] === cb[k])
}
const inRect = (x: number, y: number, r: DOMRect): boolean =>
  x >= r.left && x <= r.right && y >= r.top && y <= r.bottom

interface Lvl {
  prop: string
  sub: string
  mode: string
  initL: ObjType[]
  initR: ObjType[]
  tray: ObjType[]
}

const LVLS: Lvl[] = [
  {
    prop: 'Reflexiva',
    sub: 'Todo es igual a sí mismo (a = a)',
    mode: 'reflexive',
    initL: ['orange', 'apple', 'lemon'],
    initR: [],
    tray: ['orange', 'apple', 'lemon'],
  },
  {
    prop: 'Simétrica',
    sub: 'Si A = B entonces B = A',
    mode: 'symmetric',
    initL: ['watermelon'],
    initR: ['orange', 'lemon'],
    tray: [],
  },
  {
    prop: 'Transitiva',
    sub: 'Si A = B y B = C entonces A = C',
    mode: 'transitive',
    initL: ['watermelon'],
    initR: [],
    tray: ['apple', 'orange', 'lemon', 'pear', 'watermelon'],
  },
  {
    prop: 'Adición',
    sub: 'Si A = B entonces A + C = B + C',
    mode: 'addition',
    initL: ['pear'],
    initR: ['orange', 'orange'],
    tray: ['lemon'],
  },
  {
    prop: 'Adición+',
    sub: 'Combinaciones en ambos lados',
    mode: 'addition-combo',
    initL: ['watermelon'],
    initR: ['pear', 'apple'],
    tray: ['apple', 'orange'],
  },
  {
    prop: 'Multiplicación',
    sub: 'Si A = B entonces A × C = B × C',
    mode: 'multiply',
    initL: ['pear'],
    initR: ['orange', 'orange'],
    tray: [],
  },
  {
    prop: 'División',
    sub: 'Si A = B entonces A ÷ C = B ÷ C',
    mode: 'divide',
    initL: ['apple', 'apple', 'apple', 'apple'],
    initR: ['apple', 'apple', 'apple', 'apple'],
    tray: [],
  },
  {
    prop: 'Libre',
    sub: 'Experimenta libremente en la balanza',
    mode: 'free',
    initL: [],
    initR: [],
    tray: ['apple', 'orange', 'lemon', 'pear', 'watermelon', 'box'],
  },
]

function ObjIcon({ type, size = 32 }: { type: ObjType; size?: number }) {
  switch (type) {
    case 'apple':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <circle cx="20" cy="24" r="13" fill="#ef4444" />
          <rect x="19" y="8" width="2" height="6" rx="1" fill="#16a34a" />
          <ellipse cx="24" cy="9" rx="4" ry="2" fill="#22c55e" />
        </svg>
      )
    case 'orange':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <circle cx="20" cy="22" r="14" fill="#f97316" />
          <circle cx="14" cy="17" r="1.2" fill="#c2410c" opacity=".4" />
          <circle cx="26" cy="15" r="1.2" fill="#c2410c" opacity=".4" />
          <circle cx="18" cy="28" r="1.2" fill="#c2410c" opacity=".4" />
          <rect x="19" y="7" width="2" height="4" rx="1" fill="#16a34a" />
        </svg>
      )
    case 'lemon':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <ellipse cx="20" cy="22" rx="15" ry="11" fill="#eab308" />
          <ellipse cx="20" cy="22" rx="12" ry="8" fill="#fde047" opacity=".4" />
        </svg>
      )
    case 'pear':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <ellipse cx="20" cy="26" rx="11" ry="10" fill="#22c55e" />
          <ellipse cx="20" cy="15" rx="7" ry="7" fill="#4ade80" />
          <rect x="19" y="6" width="2" height="5" rx="1" fill="#854d0e" />
        </svg>
      )
    case 'watermelon':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <circle cx="20" cy="22" r="15" fill="#16a34a" />
          <path d="M7 18Q20 14 33 18" stroke="#15803d" strokeWidth="2" fill="none" />
          <path d="M9 26Q20 22 31 26" stroke="#15803d" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'box':
      return (
        <svg width={size} height={size} viewBox="0 0 40 40">
          <rect x="6" y="14" width="28" height="20" rx="2" fill="#a16207" />
          <rect x="6" y="14" width="28" height="6" rx="2" fill="#ca8a04" />
          <line x1="20" y1="14" x2="20" y2="34" stroke="#854d0e" strokeWidth="1.5" />
        </svg>
      )
  }
}

function ScaleSVG({ angle, balanced }: { angle: number; balanced: boolean }) {
  const W = 600, H = 260
  const px = 300, py = 60
  const half = 205, chain = 75

  const rad = (angle * Math.PI) / 180
  const lx = px - half * Math.cos(rad), ly = py + half * Math.sin(rad)
  const rx = px + half * Math.cos(rad), ry = py - half * Math.sin(rad)
  const lpy = ly + chain, rpy = ry + chain

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full select-none" style={{ touchAction: 'none' }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Base física */}
      <polygon points={`${px - 45},${H - 6} ${px + 45},${H - 6} ${px},${H - 36}`} fill="#334155" />
      <rect x={px - 5} y={py - 5} width={10} height={H - 36 - py + 6} rx="3" fill="#475569" />

      {/* Brazo oscilante */}
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="5" fill="#94a3b8" />
      <circle cx={rx} cy={ry} r="5" fill="#94a3b8" />

      {/* Cadenas */}
      <line x1={lx} y1={ly} x2={lx} y2={lpy} stroke="#64748b" strokeWidth="2" strokeDasharray="3,2" />
      <line x1={rx} y1={ry} x2={rx} y2={rpy} stroke="#64748b" strokeWidth="2" strokeDasharray="3,2" />

      {/* Platillos (elipses) */}
      <ellipse cx={lx} cy={lpy + 6} rx={58} ry={8} fill="#1e293b" stroke="#64748b" strokeWidth="2.5" />
      <ellipse cx={rx} cy={rpy + 6} rx={58} ry={8} fill="#1e293b" stroke="#64748b" strokeWidth="2.5" />

      {/* Pivote central */}
      <circle cx={px} cy={py} r="12" fill="#94a3b8" />
      <circle cx={px} cy={py} r="7" fill="#334155" />
      {balanced && (
        <circle cx={px} cy={py} r="16" fill="#22c55e" opacity=".5" filter="url(#glow)">
          <animate attributeName="opacity" values=".3;.7;.3" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

export default function IgualdadBalanzaView() {
  const nav = useNavigate()
  const helpId = useId()

  const [level, setLevel] = useState(1)
  const [leftPlate, setLeftPlate] = useState<Obj[]>(() => mks(LVLS[0].initL))
  const [rightPlate, setRightPlate] = useState<Obj[]>(() => mks(LVLS[0].initR))
  const [initLeft, setInitLeft] = useState<Obj[]>(() => mks(LVLS[0].initL))
  const [history, setHistory] = useState<HistEntry[]>([])
  const [showMath, setShowMath] = useState(false)
  const [showHist, setShowHist] = useState(false)
  const [phase, setPhase] = useState(0)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [ghostType, setGhostType] = useState<ObjType | null>(null)
  const [swapped, setSwapped] = useState(false)
  const [addedObj, setAddedObj] = useState<ObjType | null>(null)
  const [showDivByZero, setShowDivByZero] = useState(false)
  const [shakeScale, setShakeScale] = useState(false)
  const [showHelp, setShowHelp] = useState(false)

  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragTypeRef = useRef<ObjType | null>(null)
  const dragSrcRef = useRef<{ side: Side; objId: string } | null>(null)

  const cfg = LVLS[level - 1]

  const leftW = wOf(leftPlate)
  const rightW = wOf(rightPlate)
  const balanced = leftW === rightW && (leftW > 0 || rightW > 0)

  // Objetivo cumplido como valor derivado puro
  const complete = useMemo(() => {
    const m = cfg.mode
    if (m === 'reflexive') return rightPlate.length > 0 && sameComp(leftPlate, rightPlate)
    if (m === 'symmetric') return swapped && balanced
    if (m === 'transitive') {
      return phase === 2 || (phase === 1 && rightPlate.length > 0 && balanced && !sameComp(initLeft, rightPlate))
    }
    if (m === 'addition' || m === 'addition-combo') {
      return balanced && leftW > wOf(initLeft)
    }
    if (m === 'multiply') return leftPlate.length > initLeft.length && balanced
    if (m === 'divide') return leftPlate.length < initLeft.length && balanced
    if (m === 'free') return balanced && leftPlate.length > 0
    return false
  }, [cfg.mode, rightPlate, leftPlate, swapped, balanced, phase, initLeft, leftW])

  const targetAngle = useMemo(() => {
    const diff = leftW - rightW
    const ref = Math.max(leftW + rightW, 10)
    return Math.max(-15, Math.min(15, (diff / ref) * 20))
  }, [leftW, rightW])

  const [displayAngle, setDisplayAngle] = useState(0)

  useEffect(() => {
    const target = targetAngle
    let frame: number
    const tick = () => {
      setDisplayAngle(prev => {
        const d = target - prev
        if (Math.abs(d) < 0.15) return target
        frame = requestAnimationFrame(tick)
        return prev + d * 0.14
      })
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [targetAngle])

  const initLevel = useCallback((lvl: number) => {
    const c = LVLS[lvl - 1]
    _id = 0
    const l = mks(c.initL)
    const r = mks(c.initR)
    setLeftPlate(l)
    setRightPlate(r)
    setInitLeft(l.map(o => ({ ...o })))
    setHistory([])
    setPhase(0)
    setSwapped(false)
    setAddedObj(null)
    setShowDivByZero(false)
    setShakeScale(false)
  }, [])

  const changeLevel = useCallback((lvl: number) => {
    setLevel(lvl)
    initLevel(lvl)
  }, [initLevel])

  const addHistory = useCallback((text: string) => {
    setHistory(prev => [...prev, { text }])
  }, [])

  const addToPlate = useCallback((side: Side, type: ObjType) => {
    const obj = mk(type)
    if (side === 'left') setLeftPlate(prev => [...prev, obj])
    else setRightPlate(prev => [...prev, obj])
    addHistory(`+ ${DEFS[type].name} → plato ${side === 'left' ? 'izquierdo' : 'derecho'}`)
  }, [addHistory])

  const removeFromPlate = useCallback((side: Side, objId: string) => {
    if (side === 'left') setLeftPlate(prev => prev.filter(o => o.id !== objId))
    else setRightPlate(prev => prev.filter(o => o.id !== objId))
    addHistory(`– objeto retirado del plato ${side === 'left' ? 'izquierdo' : 'derecho'}`)
  }, [addHistory])

  const getDropSide = useCallback((cx: number, cy: number): Side | null => {
    const lr = leftRef.current?.getBoundingClientRect()
    const rr = rightRef.current?.getBoundingClientRect()
    if (lr && inRect(cx, cy, lr)) return 'left'
    if (rr && inRect(cx, cy, rr)) return 'right'
    const cr = containerRef.current?.getBoundingClientRect()
    if (!cr) return null
    const midX = cr.left + cr.width / 2
    if (cy > cr.top + cr.height * 0.15 && cy < cr.bottom) {
      return cx < midX ? 'left' : 'right'
    }
    return null
  }, [])

  const startDrag = useCallback((type: ObjType, srcSide: Side | null, objId: string | null, e: React.PointerEvent) => {
    e.preventDefault()
    dragTypeRef.current = type
    dragSrcRef.current = srcSide ? { side: srcSide, objId: objId! } : null
    setGhostPos({ x: e.clientX, y: e.clientY })
    setGhostType(type)

    const onMove = (ev: PointerEvent) => setGhostPos({ x: ev.clientX, y: ev.clientY })
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const side = getDropSide(ev.clientX, ev.clientY)
      const src = dragSrcRef.current
      if (side) {
        addToPlate(side, type)
        if (src && src.side !== side) {
          removeFromPlate(src.side, src.objId)
        }
      } else if (src) {
        removeFromPlate(src.side, src.objId)
      }
      setGhostPos(null)
      setGhostType(null)
      dragTypeRef.current = null
      dragSrcRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [addToPlate, removeFromPlate, getDropSide])

  const tapTray = useCallback((type: ObjType) => {
    const side: Side = phase === 0 && cfg.mode === 'reflexive' ? 'right' : 'left'
    addToPlate(side, type)
  }, [phase, cfg.mode, addToPlate])

  const tapPlateObj = useCallback((side: Side, objId: string) => {
    removeFromPlate(side, objId)
  }, [removeFromPlate])

  const handleSwap = useCallback(() => {
    setLeftPlate(prev => {
      const r = rightPlate
      setRightPlate(prev)
      return r
    })
    setSwapped(true)
    addHistory('Platos intercambiados')
  }, [rightPlate, addHistory])

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      if (last.text.startsWith('+')) {
        setRightPlate(rp => rp.slice(0, -1))
        setLeftPlate(lp => lp.slice(0, -1))
      }
      return prev.slice(0, -1)
    })
  }, [])

  const handleReset = useCallback(() => {
    initLevel(level)
  }, [level, initLevel])

  const handleMultiplyBoth = useCallback((factor: number) => {
    setLeftPlate(prev => {
      const copy = [...prev]
      for (let i = 0; i < factor - 1; i++) {
        for (const o of prev) copy.push(mk(o.type))
      }
      return copy
    })
    setRightPlate(prev => {
      const copy = [...prev]
      for (let i = 0; i < factor - 1; i++) {
        for (const o of prev) copy.push(mk(o.type))
      }
      return copy
    })
    addHistory(`× ${factor} en ambos lados`)
  }, [addHistory])

  const handleMultiplyOne = useCallback((side: Side, factor: number) => {
    const setter = side === 'left' ? setLeftPlate : setRightPlate
    setter(prev => {
      const copy = [...prev]
      for (let i = 0; i < factor - 1; i++) {
        for (const o of prev) copy.push(mk(o.type))
      }
      return copy
    })
    setShakeScale(true)
    setTimeout(() => setShakeScale(false), 400)
    addHistory(`× ${factor} solo plato ${side === 'left' ? 'izquierdo' : 'derecho'} — ¡desequilibrio!`)
  }, [addHistory])

  const handleDivideBoth = useCallback((divisor: number) => {
    if (divisor === 0) {
      setShowDivByZero(true)
      setShakeScale(true)
      setTimeout(() => { setShakeScale(false); setShowDivByZero(false) }, 1500)
      addHistory('÷ 0 — ¡No se puede dividir entre cero!')
      return
    }
    setLeftPlate(prev => prev.slice(0, Math.floor(prev.length / divisor)))
    setRightPlate(prev => prev.slice(0, Math.floor(prev.length / divisor)))
    addHistory(`÷ ${divisor} en ambos lados`)
  }, [addHistory])

  const handleAddBoth = useCallback((type: ObjType) => {
    addToPlate('left', type)
    addToPlate('right', type)
    setAddedObj(type)
  }, [addToPlate])

  const trayTypes = cfg.tray

  // ── Cálculo exacto de las posiciones de los platillos en el sistema 600×260 ──
  const rad = (displayAngle * Math.PI) / 180
  const px = 300, py = 60, half = 205, chain = 75
  const lx = px - half * Math.cos(rad)
  const ly = py + half * Math.sin(rad)
  const rx = px + half * Math.cos(rad)
  const ry = py - half * Math.sin(rad)
  const lpy = ly + chain
  const rpy = ry + chain

  // Coordenadas porcentuales exactas de la superficie de los platos
  const leftX_pct = (lx / 600) * 100
  const leftY_pct = (lpy / 260) * 100
  const rightX_pct = (rx / 600) * 100
  const rightY_pct = (rpy / 260) * 100

  const leftLocked = cfg.mode === 'reflexive'
  const rightLocked = cfg.mode === 'symmetric' && !swapped

  const showMultiply = cfg.mode === 'multiply'
  const showDivide = cfg.mode === 'divide'
  const hasSpecialActions =
    cfg.mode === 'symmetric' ||
    showMultiply ||
    showDivide ||
    ((cfg.mode === 'addition' || cfg.mode === 'addition-combo') && trayTypes.length > 0)

  const promptText = useMemo(() => {
    const m = cfg.mode
    if (complete) return '¡Propiedad demostrada con éxito! Presiona Siguiente.'
    if (m === 'reflexive') return 'Equilibra colocando los mismos objetos en el plato derecho.'
    if (m === 'symmetric') return 'Presiona Swap para intercambiar y comprueba que se mantiene el balance.'
    if (m === 'transitive' && phase === 0) return 'Equilibra esta balanza con objetos del cajón.'
    if (m === 'transitive' && phase >= 1) return 'Ahora encuentra otra combinación que también sume lo mismo.'
    if (m === 'addition' && phase === 0) return 'Agrega un objeto a un lado para romper el equilibrio.'
    if (m === 'addition' && phase === 1) return 'Agrega el mismo objeto al otro lado para restaurar el equilibrio.'
    if (m === 'addition-combo' && phase === 0) return 'Agrega objetos a un lado y observa qué pasa.'
    if (m === 'addition-combo' && phase === 1) return 'Agrega los mismos objetos al otro lado.'
    if (m === 'multiply') return 'Usa las palancas ×2 o ×3 para multiplicar ambos lados.'
    if (m === 'divide') return 'Usa las palancas ÷2 o ÷4 para dividir ambos lados.'
    if (m === 'free') return 'Coloca objetos libremente y experimenta con la balanza.'
    return ''
  }, [cfg.mode, phase, complete])

  // Formato matemático
  const fmtMathSide = (os: Obj[]) => {
    const counts = countTypes(os)
    const parts = Object.entries(counts).map(([t, c]) =>
      c > 1 ? `${DEFS[t as ObjType].name} ×${c}` : DEFS[t as ObjType].name
    )
    return parts.length ? parts.join(' + ') : '0'
  }

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none"
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      {/* ── 1. Cabecera (34-44px) ── */}
      <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => nav(-1)}
            className="flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            aria-label="Volver"
            title="Volver"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-[12px] sm:text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              Balanza de Igualdad
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-mono bg-teal-400/10 text-teal-300 border border-teal-400/20">
              {cfg.prop}
            </span>
          </div>
        </div>

        {/* Prompt contextual en cabecera */}
        <div className="flex-1 max-w-md mx-2 hidden sm:block text-center truncate">
          <span className="text-[11px] lg:text-xs text-amber-300 font-semibold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20 truncate inline-block max-w-full">
            {promptText}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] lg:text-xs text-white/40 font-mono hidden sm:inline">
            Nivel {level}/8
          </span>
          <button
            onClick={() => setShowHelp(true)}
            className="flex h-7 w-7 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all"
            aria-label="Ayuda"
            title="Ayuda"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </header>

      {/* ── 2. Barra de Navegación de Niveles y Utilidades (36-40px) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] overflow-x-auto custom-scrollbar">
        {/* Selector de los 8 niveles */}
        <div className="flex items-center gap-1 shrink-0">
          {LVLS.map((l, i) => (
            <button
              key={l.prop}
              onClick={() => changeLevel(i + 1)}
              className={`h-7 px-2 sm:px-2.5 rounded-md text-[10px] sm:text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 ${
                level === i + 1
                  ? 'bg-teal-500 text-black shadow-sm ring-1 ring-teal-400 font-black'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>{i + 1}.</span>
              <span className="hidden sm:inline">{l.prop}</span>
            </button>
          ))}
        </div>

        {/* Herramientas de utilidad */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setShowMath(s => !s)}
            className={`h-7 px-2 rounded-md border text-[10px] font-bold flex items-center gap-1 transition-all ${
              showMath
                ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
            title="Ver expresión matemática"
          >
            <Calculator size={11} />
            <span className="hidden sm:inline">Mate</span>
          </button>

          <button
            onClick={() => setShowHist(s => !s)}
            className={`h-7 px-2 rounded-md border text-[10px] font-bold flex items-center gap-1 transition-all ${
              showHist
                ? 'bg-violet-500/20 border-violet-400 text-violet-300'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
            title="Historial de acciones"
          >
            <HistoryIcon size={11} />
            <span className="hidden sm:inline">Historial</span>
          </button>

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold flex items-center gap-1 disabled:opacity-30 active:scale-95 transition-all"
            title="Deshacer última acción"
          >
            <Undo2 size={11} />
          </button>

          <button
            onClick={handleReset}
            className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 text-[10px] font-bold flex items-center gap-1 active:scale-95 transition-all"
            title="Reiniciar este nivel"
          >
            <RotateCcw size={11} />
          </button>
        </div>
      </div>

      {/* ── 3. Área de Trabajo Central: Estante Izquierdo, Balanza Central y Panel Derecho (flex-1 min-h-0) ── */}
      <div
        className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 gap-1 sm:gap-2 lg:gap-3"
        style={{ touchAction: 'none' }}
      >
        {/* PANEL IZQUIERDO: Estante de Objetos */}
        {trayTypes.length > 0 && (
          <aside className="w-[52px] sm:w-[60px] lg:w-[72px] xl:w-[80px] shrink-0 flex flex-col items-center justify-between py-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden shadow-inner">
            <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Cajón
            </span>

            <div className="flex-1 w-full flex flex-col items-center justify-around overflow-y-auto py-1 gap-1 custom-scrollbar">
              {trayTypes.map(t => (
                <button
                  key={`tray-${t}`}
                  onClick={() => tapTray(t)}
                  onPointerDown={e => startDrag(t, null, null, e)}
                  className="w-10 h-10 sm:w-11 sm:h-11 lg:w-13 lg:h-13 xl:w-14 xl:h-14 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90 transition-all flex flex-col items-center justify-center relative shadow-sm"
                  title={`${DEFS[t].name} (peso ${DEFS[t].w})`}
                >
                  <ObjIcon type={t} size={22 + DEFS[t].w * 2.2} />
                  <span className="absolute bottom-0 right-1 text-[8px] lg:text-[9px] font-mono font-bold text-white/50">
                    {DEFS[t].w}
                  </span>
                </button>
              ))}
            </div>

            <span className="text-[7px] lg:text-[8px] text-white/30 text-center leading-tight">
              Toca / arrastra
            </span>
          </aside>
        )}

        {/* ESPACIO CENTRAL: La Balanza Dinámica Adaptativa */}
        <main className="flex-1 min-w-0 flex flex-col items-center justify-between relative bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl p-1 sm:p-2 overflow-hidden">
          
          {/* Banner de objetivo cumplido o prompt móvil */}
          <div className="h-6 sm:h-7 shrink-0 flex items-center justify-center w-full">
            {complete ? (
              <div className="px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 shadow-md animate-bounce">
                <Sparkles size={12} className="text-emerald-300" />
                <span>¡Equilibrio! {cfg.prop}: {cfg.sub}</span>
              </div>
            ) : (
              <div className="text-[10px] sm:text-[11px] text-white/50 truncate text-center sm:hidden">
                {promptText}
              </div>
            )}
          </div>

          {/* Área adaptativa centrada para la Balanza SVG y las frutas */}
          <div className="w-full flex-1 min-h-0 flex items-center justify-center relative">
            <div
              ref={containerRef}
              className={`relative w-full max-w-[540px] sm:max-w-[620px] lg:max-w-[780px] xl:max-w-[880px] aspect-[600/260] select-none ${
                shakeScale ? 'animate-[shake_0.4s_ease-in-out]' : ''
              }`}
            >
              <ScaleSVG angle={displayAngle} balanced={balanced} />

              {/* Plato Izquierdo: Las frutas se apoyan EXACTAMENTE sobre el platillo */}
              <div
                ref={leftRef}
                className="absolute flex flex-wrap items-end justify-center content-end gap-1 px-1 transition-all"
                style={{
                  left: `${leftX_pct - 13}%`,
                  width: '26%',
                  top: `${leftY_pct - 27}%`,
                  height: '28%',
                  border: leftLocked ? '1.5px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(45,212,191,0.4)',
                  borderRadius: '12px 12px 4px 4px',
                  background: leftLocked ? 'transparent' : 'rgba(45,212,191,0.03)',
                }}
              >
                {leftPlate.map(o => (
                  <button
                    key={o.id}
                    className={`active:scale-90 transition-transform ${leftLocked ? 'pointer-events-none' : ''}`}
                    onPointerDown={e => !leftLocked && startDrag(o.type, 'left', o.id, e)}
                    onClick={() => !leftLocked && tapPlateObj('left', o.id)}
                    title={`${DEFS[o.type].name} (peso ${DEFS[o.type].w})`}
                  >
                    <ObjIcon type={o.type} size={22 + DEFS[o.type].w * 2.6} />
                  </button>
                ))}
              </div>

              {/* Plato Derecho: Las frutas se apoyan EXACTAMENTE sobre el platillo */}
              <div
                ref={rightRef}
                className="absolute flex flex-wrap items-end justify-center content-end gap-1 px-1 transition-all"
                style={{
                  left: `${rightX_pct - 13}%`,
                  width: '26%',
                  top: `${rightY_pct - 27}%`,
                  height: '28%',
                  border: rightLocked ? '1.5px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(167,139,250,0.4)',
                  borderRadius: '12px 12px 4px 4px',
                  background: rightLocked ? 'transparent' : 'rgba(167,139,250,0.03)',
                }}
              >
                {rightPlate.map(o => (
                  <button
                    key={o.id}
                    className={`active:scale-90 transition-transform ${rightLocked ? 'pointer-events-none' : ''}`}
                    onPointerDown={e => !rightLocked && startDrag(o.type, 'right', o.id, e)}
                    onClick={() => !rightLocked && tapPlateObj('right', o.id)}
                    title={`${DEFS[o.type].name} (peso ${DEFS[o.type].w})`}
                  >
                    <ObjIcon type={o.type} size={22 + DEFS[o.type].w * 2.6} />
                  </button>
                ))}
              </div>

              {/* Marcador de Peso colgante bajo el Plato Izquierdo */}
              <div
                className="absolute text-center font-bold font-mono text-[10px] sm:text-xs pointer-events-none -translate-x-1/2"
                style={{ left: `${leftX_pct}%`, top: `${leftY_pct + 4}%` }}
              >
                <span className={`px-2 py-0.5 rounded-full shadow-md ${leftW === rightW && leftW > 0 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 ring-1 ring-emerald-400/30' : 'bg-[#0f172a] text-teal-300 border border-teal-500/30'}`}>
                  {leftW}
                </span>
              </div>

              {/* Marcador de Peso colgante bajo el Plato Derecho */}
              <div
                className="absolute text-center font-bold font-mono text-[10px] sm:text-xs pointer-events-none -translate-x-1/2"
                style={{ left: `${rightX_pct}%`, top: `${rightY_pct + 4}%` }}
              >
                <span className={`px-2 py-0.5 rounded-full shadow-md ${leftW === rightW && rightW > 0 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 ring-1 ring-emerald-400/30' : 'bg-[#0f172a] text-violet-300 border border-violet-500/30'}`}>
                  {rightW}
                </span>
              </div>

              {/* Display Matemático Flotante (overlay cuando está activo) */}
              {showMath && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#0a0f1d]/90 backdrop-blur-md border border-white/15 rounded-xl px-3 py-1 text-center font-mono shadow-xl z-20 pointer-events-none">
                  <div className="text-[10px] sm:text-xs text-white/80">
                    <span className="text-teal-300 font-bold">{fmtMathSide(leftPlate)}</span>
                    <span className="mx-1 text-white/50">=</span>
                    <span className="text-violet-300 font-bold">{fmtMathSide(rightPlate)}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-black mt-0.5 flex items-center justify-center gap-1.5">
                    <span className="text-teal-200">{leftW}</span>
                    <span className={leftW === rightW ? 'text-emerald-400' : 'text-rose-400'}>
                      {leftW === rightW ? '=' : '≠'}
                    </span>
                    <span className="text-violet-200">{rightW}</span>
                  </div>
                  {addedObj && (
                    <div className="text-[9px] text-amber-300 mt-0.5">
                      + {DEFS[addedObj].name} ({DEFS[addedObj].w}) en ambos lados
                    </div>
                  )}
                </div>
              )}

              {/* Panel de Historial Flotante (overlay cuando está activo) */}
              {showHist && (
                <div className="absolute top-1 right-1 max-w-[210px] max-h-36 bg-[#0a0f1d]/95 backdrop-blur-md border border-white/20 rounded-xl p-2 text-[10px] text-white/70 overflow-y-auto shadow-2xl z-30 custom-scrollbar">
                  <div className="font-bold text-white/90 border-b border-white/10 pb-0.5 mb-1 flex items-center justify-between">
                    <span>Historial</span>
                    <button onClick={() => setShowHist(false)} className="text-white/40 hover:text-white">✕</button>
                  </div>
                  {history.length === 0 ? (
                    <div className="text-white/30 italic">Sin acciones aún</div>
                  ) : (
                    history.slice(-8).map((e, idx) => (
                      <div key={idx} className="py-0.5 border-b border-white/5 last:border-0 truncate">
                        {e.text}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Alerta de división por cero */}
              {showDivByZero && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-rose-500/90 text-white rounded-xl px-3 py-2 flex items-center gap-2 shadow-2xl z-40 animate-bounce">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-bold">¡No se puede dividir entre cero!</span>
                </div>
              )}
            </div>
          </div>

          {/* Micro-leyenda o Cadena transitiva en nivel 3 */}
          <div className="shrink-0 pt-0.5">
            {cfg.mode === 'transitive' && phase >= 1 ? (
              <div className="text-[10px] font-mono text-violet-300 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-400/30">
                Cadena: Sandía (5) = {rightPlate.map(o => DEFS[o.type].name).join(' + ')} ({wOf(rightPlate)})
              </div>
            ) : (
              <div className="text-[9px] text-white/35 flex items-center justify-center gap-2">
                <span>Plato izquierdo: {leftLocked ? 'Fijo' : 'Interactuable'}</span>
                <span>•</span>
                <span>Plato derecho: {rightLocked ? 'Fijo' : 'Interactuable'}</span>
              </div>
            )}
          </div>
        </main>

        {/* PANEL DERECHO: Herramientas de Operación especiales */}
        {hasSpecialActions && (
          <aside className="w-[52px] sm:w-[60px] lg:w-[72px] xl:w-[80px] shrink-0 flex flex-col items-center justify-between py-1 bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden shadow-inner">
            <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Acción
            </span>

            <div className="flex-1 w-full flex flex-col items-center justify-center gap-1.5 py-1">
              {/* Nivel Simétrico: Intercambiar */}
              {cfg.mode === 'symmetric' && (
                <button
                  onClick={handleSwap}
                  className="w-10 h-10 sm:w-11 sm:h-11 lg:w-13 lg:h-13 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-bold flex flex-col items-center justify-center active:scale-95 transition-all shadow-md"
                  title="Intercambiar platos"
                >
                  <Repeat size={15} />
                  <span className="text-[8px] lg:text-[9px] font-mono font-bold mt-0.5">Swap</span>
                </button>
              )}

              {/* Nivel Multiplicación */}
              {showMultiply && (
                <>
                  {[2, 3].map(f => (
                    <button
                      key={`m${f}`}
                      onClick={() => handleMultiplyBoth(f)}
                      className="w-10 h-8 sm:w-11 sm:h-9 lg:w-13 lg:h-10 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 text-xs font-mono font-bold active:scale-95 transition-all"
                      title={`Multiplicar ambos platos por ${f}`}
                    >
                      ×{f}
                    </button>
                  ))}
                  <button
                    onClick={() => handleMultiplyOne('left', 2)}
                    className="w-10 h-7 sm:w-11 sm:h-7 lg:w-13 lg:h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/20 text-rose-300 text-[8px] font-bold active:scale-95 transition-all"
                    title="Desequilibrar multiplicando solo un lado"
                  >
                    ×2 izq
                  </button>
                </>
              )}

              {/* Nivel División */}
              {showDivide && (
                <>
                  {[2, 4].map(d => (
                    <button
                      key={`d${d}`}
                      onClick={() => handleDivideBoth(d)}
                      className="w-10 h-8 sm:w-11 sm:h-9 lg:w-13 lg:h-10 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-200 text-xs font-mono font-bold active:scale-95 transition-all"
                      title={`Dividir ambos platos entre ${d}`}
                    >
                      ÷{d}
                    </button>
                  ))}
                  <button
                    onClick={() => handleDivideBoth(0)}
                    className="w-10 h-7 sm:w-11 sm:h-7 lg:w-13 lg:h-8 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-[9px] font-mono font-bold active:scale-95 transition-all"
                    title="Dividir entre cero"
                  >
                    ÷0
                  </button>
                </>
              )}

              {/* Niveles de Adición */}
              {(cfg.mode === 'addition' || cfg.mode === 'addition-combo') && (
                <>
                  {trayTypes.map(t => (
                    <button
                      key={`ab${t}`}
                      onClick={() => handleAddBoth(t)}
                      className="w-10 h-10 sm:w-11 sm:h-11 lg:w-13 lg:h-13 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-200 flex flex-col items-center justify-center active:scale-95 transition-all"
                      title={`+ ${DEFS[t].name} en ambos lados`}
                    >
                      <span className="text-[7px] lg:text-[8px] font-bold">+2 lados</span>
                      <ObjIcon type={t} size={16} />
                    </button>
                  ))}
                </>
              )}
            </div>

            <span className="text-[7px] lg:text-[8px] text-white/30 text-center leading-tight">
              Operar
            </span>
          </aside>
        )}
      </div>

      {/* ── 4. Barra Inferior de Acción y Feedback (40-48px) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {complete ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] sm:text-[11px] lg:text-xs font-bold">
              <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
              <span className="truncate">¡Propiedad {cfg.prop} demostrada!</span>
            </div>
          ) : (
            <div className="text-[10px] sm:text-[11px] text-white/70 truncate font-medium">
              {promptText}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => level > 1 && changeLevel(level - 1)}
            disabled={level === 1}
            className="h-7 lg:h-8 px-2 sm:px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-[10px] sm:text-[11px] font-bold disabled:opacity-30 active:scale-95 transition-all flex items-center gap-1"
          >
            <span>Anterior</span>
          </button>

          <button
            onClick={() => level < 8 && changeLevel(level + 1)}
            disabled={level === 8}
            className={`h-7 lg:h-8 px-2.5 sm:px-3.5 rounded-lg text-[10px] sm:text-[11px] font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md ${
              complete
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-black animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <span>Siguiente</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </footer>

      {/* Fantasma de arrastre (Ghost) */}
      {ghostPos && ghostType && (
        <div
          className="fixed pointer-events-none z-50 opacity-90 -translate-x-1/2 -translate-y-1/2"
          style={{ left: ghostPos.x, top: ghostPos.y }}
        >
          <ObjIcon type={ghostType} size={36} />
        </div>
      )}

      {/* Modal de Ayuda */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo usar la balanza de igualdad?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-teal-500 hover:bg-teal-400"
      >
        <div key={helpId} className="space-y-2 text-white/80 text-xs leading-relaxed pb-2">
          <p>
            Explora las <strong className="text-white">propiedades de la igualdad</strong> usando la balanza. Cada objeto tiene un peso distinto:
          </p>

          <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-white/5 border border-white/10 text-[11px]">
            <div>🍎 Manzana = 1</div>
            <div>🍊 Naranja = 2</div>
            <div>🍋 Limón = 3</div>
            <div>🍐 Pera = 4</div>
            <div>🍉 Sandía = 5</div>
            <div>📦 Caja = 10</div>
          </div>

          <ol className="space-y-1.5 list-decimal list-inside pl-1 text-[11px]">
            <li><strong className="text-teal-300">Reflexiva</strong>: Coloca los mismos objetos en el plato derecho ($a = a$).</li>
            <li><strong className="text-amber-300">Simétrica</strong>: Usa Swap para intercambiar platos ($A = B \implies B = A$).</li>
            <li><strong className="text-emerald-300">Transitiva</strong>: Equilibra la primera balanza y luego busca otra combinación igual.</li>
            <li><strong className="text-violet-300">Adición</strong>: Agrega lo mismo a ambos lados ($A + C = B + C$).</li>
            <li><strong className="text-sky-300">Multiplicación</strong>: Duplica o triplica ambos lados ($A \times C = B \times C$).</li>
            <li><strong className="text-rose-300">División</strong>: Divide ambos platos en partes iguales ($A \div C = B \div C$).</li>
          </ol>
        </div>
      </ModalHelp>
    </div>
  )
}
