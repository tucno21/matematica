import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

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
    prop: 'Reflexiva', sub: 'Todo es igual a sí mismo', mode: 'reflexive',
    initL: ['orange', 'apple', 'lemon'], initR: [],
    tray: ['orange', 'apple', 'lemon'],
  },
  {
    prop: 'Simétrica', sub: 'Si A = B entonces B = A', mode: 'symmetric',
    initL: ['watermelon'], initR: ['orange', 'lemon'],
    tray: [],
  },
  {
    prop: 'Transitiva', sub: 'Si A = B y B = C entonces A = C', mode: 'transitive',
    initL: ['watermelon'], initR: [],
    tray: ['apple', 'orange', 'lemon', 'pear', 'watermelon'],
  },
  {
    prop: 'Adición', sub: 'Si A = B entonces A + C = B + C', mode: 'addition',
    initL: ['pear'], initR: ['orange', 'orange'],
    tray: ['lemon'],
  },
  {
    prop: 'Adición+', sub: 'Combinaciones en ambos lados', mode: 'addition-combo',
    initL: ['watermelon'], initR: ['pear', 'apple'],
    tray: ['apple', 'orange'],
  },
  {
    prop: 'Multiplicación', sub: 'Si A = B entonces A × C = B × C', mode: 'multiply',
    initL: ['pear'], initR: ['orange', 'orange'],
    tray: [],
  },
  {
    prop: 'División', sub: 'Si A = B entonces A ÷ C = B ÷ C', mode: 'divide',
    initL: ['apple', 'apple', 'apple', 'apple'], initR: ['apple', 'apple', 'apple', 'apple'],
    tray: [],
  },
  {
    prop: 'Libre', sub: 'Experimenta libremente', mode: 'free',
    initL: [], initR: [],
    tray: ['apple', 'orange', 'lemon', 'pear', 'watermelon', 'box'],
  },
]

function ObjIcon({ type, size = 36 }: { type: ObjType; size?: number }) {
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
  const W = 600, H = 280
  const px = W / 2, py = 70
  const half = 200, chain = 80

  const rad = angle * Math.PI / 180
  const lx = px - half * Math.cos(rad), ly = py + half * Math.sin(rad)
  const rx = px + half * Math.cos(rad), ry = py - half * Math.sin(rad)
  const lpy = ly + chain, rpy = ry + chain

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: 'none' }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <polygon points={`${px - 35},${H - 10} ${px + 35},${H - 10} ${px},${H - 45}`} fill="#475569" />
      <rect x={px - 5} y={py - 5} width={10} height={H - 45 - py + 10} rx="3" fill="#64748b" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="5" fill="#94a3b8" />
      <circle cx={rx} cy={ry} r="5" fill="#94a3b8" />
      <line x1={lx} y1={ly} x2={lx} y2={lpy} stroke="#64748b" strokeWidth="2" />
      <line x1={rx} y1={ry} x2={rx} y2={rpy} stroke="#64748b" strokeWidth="2" />
      <ellipse cx={lx} cy={lpy + 8} rx={60} ry={8} fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <ellipse cx={rx} cy={rpy + 8} rx={60} ry={8} fill="#1e293b" stroke="#475569" strokeWidth="2" />
      <circle cx={px} cy={py} r="12" fill="#94a3b8" />
      <circle cx={px} cy={py} r="7" fill="#475569" />
      {balanced && (
        <circle cx={px} cy={py} r="16" fill="#22c55e" opacity=".5" filter="url(#glow)">
          <animate attributeName="opacity" values=".3;.7;.3" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  )
}

function MathDisplay({ left, right, swapped, addedObj, show }: {
  left: Obj[]
  right: Obj[]
  swapped?: boolean
  addedObj?: ObjType | null
  show: boolean
}) {
  if (!show) return null

  const fmtSide = (os: Obj[]) => {
    const counts = countTypes(os)
    const parts = Object.entries(counts).map(([t, c]) =>
      c > 1 ? `${DEFS[t as ObjType].name} ×${c}` : DEFS[t as ObjType].name
    )
    return parts.length ? parts.join(' + ') : '—'
  }
  const fmtWeights = (os: Obj[]) => {
    const counts = countTypes(os)
    const parts = Object.entries(counts).map(([t, c]) => c > 1 ? `${DEFS[t as ObjType].w} ×${c}` : `${DEFS[t as ObjType].w}`)
    return parts.length ? parts.join(' + ') : '0'
  }

  const lw = wOf(left), rw = wOf(right)

  return (
    <div className="text-center space-y-1 font-mono text-sm sm:text-base" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {swapped && <div className="text-amber-400 text-xs mb-1">↕ intercambiar</div>}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-teal-300">{fmtSide(left)}</span>
        <span className="text-white/60">=</span>
        <span className="text-violet-300">{fmtSide(right)}</span>
      </div>
      <div className="flex items-center justify-center gap-2 flex-wrap text-white/70">
        <span>{fmtWeights(left)}</span>
        <span className="text-white/60">=</span>
        <span>{fmtWeights(right)}</span>
      </div>
      {(lw > 0 || rw > 0) && (
        <div className="flex items-center justify-center gap-2 font-bold">
          <span className="text-teal-200">{lw}</span>
          <span className={lw === rw ? 'text-green-400' : 'text-red-400'}>{lw === rw ? '=' : '≠'}</span>
          <span className="text-violet-200">{rw}</span>
        </div>
      )}
      {addedObj && (
        <div className="text-amber-300 text-xs">
          + {DEFS[addedObj].name} ({DEFS[addedObj].w}) en ambos lados
        </div>
      )}
    </div>
  )
}

function HistoryPanel({ entries, show }: { entries: HistEntry[]; show: boolean }) {
  if (!show || entries.length === 0) return null
  return (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10 max-h-32 overflow-y-auto">
      <div className="text-xs text-white/40 mb-1">Historial</div>
      {entries.map((e, i) => (
        <div key={i} className="text-xs text-white/60 py-0.5">{e.text}</div>
      ))}
    </div>
  )
}

export default function IgualdadBalanzaView() {
  const nav = useNavigate()

  const [level, setLevel] = useState(1)
  const [leftPlate, setLeftPlate] = useState<Obj[]>([])
  const [rightPlate, setRightPlate] = useState<Obj[]>([])
  const [initLeft, setInitLeft] = useState<Obj[]>([])
  const [initRight, setInitRight] = useState<Obj[]>([])
  const [history, setHistory] = useState<HistEntry[]>([])
  const [showMath, setShowMath] = useState(false)
  const [showHist, setShowHist] = useState(false)
  const [phase, setPhase] = useState(0)
  const [complete, setComplete] = useState(false)
  const [completeLevel, setCompleteLevel] = useState(0)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [ghostType, setGhostType] = useState<ObjType | null>(null)
  const [swapped, setSwapped] = useState(false)
  const [addedObj, setAddedObj] = useState<ObjType | null>(null)
  const [showDivByZero, setShowDivByZero] = useState(false)
  const [shakeScale, setShakeScale] = useState(false)

  const leftRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragTypeRef = useRef<ObjType | null>(null)
  const dragSrcRef = useRef<{ side: Side; objId: string } | null>(null)

  const cfg = LVLS[level - 1]

  const leftW = wOf(leftPlate)
  const rightW = wOf(rightPlate)
  const balanced = leftW === rightW && (leftW > 0 || rightW > 0)

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
    setInitRight(r.map(o => ({ ...o })))
    setHistory([])
    setPhase(0)
    setComplete(false)
    setCompleteLevel(0)
    setSwapped(false)
    setAddedObj(null)
    setShowDivByZero(false)
    setShakeScale(false)
  }, [])

  useEffect(() => { initLevel(level) }, [level, initLevel])

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
    if (cy > cr.top + cr.height * 0.2 && cy < cr.bottom) {
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
    addHistory('Deshacer')
  }, [addHistory])

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

  useEffect(() => {
    if (complete || completeLevel === level) return
    const m = cfg.mode

    if (m === 'reflexive') {
      if (rightPlate.length > 0 && sameComp(leftPlate, rightPlate)) {
        setComplete(true); setCompleteLevel(level)
        addHistory('✓ Propiedad Reflexiva: a = a')
      }
    }

    if (m === 'symmetric') {
      if (swapped && balanced) {
        setComplete(true); setCompleteLevel(level)
        addHistory('✓ Propiedad Simétrica: A = B → B = A')
      }
    }

    if (m === 'transitive') {
      if (phase === 0 && balanced && rightPlate.length > 0) {
        setPhase(1)
        addHistory('Balanza 1 equilibrada')
      }
      if (phase === 1) {
        if (rightPlate.length > 0 && balanced && !sameComp(initLeft, rightPlate)) {
          setPhase(2)
          addHistory('Balanza 2 equilibrada — ¡cadena descubierta!')
          setComplete(true); setCompleteLevel(level)
        }
      }
    }

    if (m === 'addition' || m === 'addition-combo') {
      if (phase === 0) {
        const diff = Math.abs(leftW - rightW)
        if (diff > 0 && leftW !== wOf(initLeft) && rightW === wOf(initRight)) {
          setPhase(1)
          addHistory('Desequilibrio creado — ahora equilibra agregando al otro lado')
        }
        if (diff > 0 && rightW !== wOf(initRight) && leftW === wOf(initLeft)) {
          setPhase(1)
          addHistory('Desequilibrio creado — ahora equilibra agregando al otro lado')
        }
        if (balanced && leftW > wOf(initLeft) && rightW > wOf(initRight)) {
          setComplete(true); setCompleteLevel(level)
          addHistory('✓ Monotonía de la Adición: A + C = B + C')
        }
      }
      if (phase === 1 && balanced && leftW > wOf(initLeft)) {
        setComplete(true); setCompleteLevel(level)
        addHistory('✓ Monotonía de la Adición: A + C = B + C')
      }
    }

    if (m === 'multiply') {
      if (leftPlate.length > initLeft.length && balanced) {
        setComplete(true); setCompleteLevel(level)
        addHistory('✓ Monotonía de la Multiplicación: A × C = B × C')
      }
    }

    if (m === 'divide') {
      if (leftPlate.length < initLeft.length && balanced) {
        setComplete(true); setCompleteLevel(level)
        addHistory('✓ Monotonía de la División: A ÷ C = B ÷ C')
      }
    }

    if (m === 'free') {
      if (balanced && leftPlate.length > 0) {
        setComplete(true); setCompleteLevel(level)
      }
    }
  }, [leftPlate, rightPlate, balanced, cfg.mode, phase, complete, swapped, initLeft, initRight, leftW, rightW, addHistory])

  const trayTypes = cfg.tray

  const rad = displayAngle * Math.PI / 180
  const leftPlateVisualTop = 70 + 200 * Math.sin(rad) + 80
  const rightPlateVisualTop = 70 - 200 * Math.sin(rad) + 80
  const leftPct = leftPlateVisualTop / 280 * 100
  const rightPct = rightPlateVisualTop / 280 * 100

  const leftLocked = cfg.mode === 'reflexive'
  const rightLocked = cfg.mode === 'symmetric' && !swapped

  const showMultiply = cfg.mode === 'multiply'
  const showDivide = cfg.mode === 'divide'

  const promptText = useMemo(() => {
    const m = cfg.mode
    if (complete) return '¡Propiedad demostrada!'
    if (m === 'reflexive') return 'Equilibra colocando los mismos objetos en el plato derecho'
    if (m === 'symmetric') return 'Intercambia los platos y observa que el equilibrio se mantiene'
    if (m === 'transitive' && phase === 0) return 'Equilibra esta balanza con objetos del cajón'
    if (m === 'transitive' && phase >= 1) return 'Ahora encuentra otros objetos que también sumen lo mismo'
    if (m === 'addition' && phase === 0) return 'Agrega un objeto a un lado... ¿qué pasa?'
    if (m === 'addition' && phase === 1) return 'Agrega el mismo objeto al otro lado para equilibrar'
    if (m === 'addition-combo' && phase === 0) return 'Agrega objetos a un lado... ¿qué pasa con el equilibrio?'
    if (m === 'addition-combo' && phase === 1) return 'Agrega los mismos objetos al otro lado'
    if (m === 'multiply') return 'Usa ×2 o ×3 para duplicar ambos lados'
    if (m === 'divide') return 'Usa ÷2 o ÷4 para dividir ambos lados'
    if (m === 'free') return 'Coloca objetos libremente y observa la balanza'
    return ''
  }, [cfg.mode, phase, complete])

  return (
    <div className="min-h-dvh bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => nav(-1)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 active:scale-95 transition-all"
          >
            ← Volver
          </button>
          <div className="text-center flex-1 mx-3">
            <div className="text-xs text-teal-400 font-bold">{cfg.prop}</div>
            <div className="text-[10px] text-white/40">{cfg.sub}</div>
          </div>
          <div className="text-xs text-white/30">Nivel {level}/8</div>
        </div>

        {/* Prompt */}
        <div className="text-center text-sm text-amber-300 bg-amber-400/10 rounded-xl py-2 px-3 border border-amber-400/20">
          {promptText}
        </div>

        <div className="h-[56px] overflow-hidden">
          {complete && (
            <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-4 py-2 text-center animate-[popIn_0.4s_ease-out]">
              <div className="text-green-300 font-bold text-sm">¡Equilibrio!</div>
              <div className="text-green-400/60 text-[10px]">{cfg.prop}: {cfg.sub}</div>
            </div>
          )}
        </div>

        {/* Balance Scale */}
        <div
          ref={containerRef}
          className={`relative -mt-14 ${shakeScale ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
          style={{ touchAction: 'none' }}
        >
          <ScaleSVG angle={displayAngle} balanced={balanced} />

          {/* Left plate drop zone */}
          <div
            ref={leftRef}
            className="absolute flex flex-wrap justify-center content-end gap-1 px-2 pb-1"
            style={{
              left: '3%',
              width: '27%',
              top: `${leftPct + 4}%`,
              height: '22%',
              border: leftLocked ? '2px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(45,212,191,0.3)',
              borderRadius: '12px',
              background: leftLocked ? 'transparent' : 'rgba(45,212,191,0.03)',
            }}
          >
            {leftPlate.map(o => (
              <button
                key={o.id}
                className={`active:scale-90 transition-transform ${leftLocked ? 'pointer-events-none' : ''}`}
                onPointerDown={e => !leftLocked && startDrag(o.type, 'left', o.id, e)}
                onClick={() => !leftLocked && tapPlateObj('left', o.id)}
              >
                <ObjIcon type={o.type} size={20 + DEFS[o.type].w * 3} />
              </button>
            ))}
          </div>

          {/* Right plate drop zone */}
          <div
            ref={rightRef}
            className="absolute flex flex-wrap justify-center content-end gap-1 px-2 pb-1"
            style={{
              right: '3%',
              width: '27%',
              top: `${rightPct + 4}%`,
              height: '22%',
              border: rightLocked ? '2px dashed rgba(255,255,255,0.1)' : '2px dashed rgba(167,139,250,0.3)',
              borderRadius: '12px',
              background: rightLocked ? 'transparent' : 'rgba(167,139,250,0.03)',
            }}
          >
            {rightPlate.map(o => (
              <button
                key={o.id}
                className={`active:scale-90 transition-transform ${rightLocked ? 'pointer-events-none' : ''}`}
                onPointerDown={e => !rightLocked && startDrag(o.type, 'right', o.id, e)}
                onClick={() => !rightLocked && tapPlateObj('right', o.id)}
              >
                <ObjIcon type={o.type} size={20 + DEFS[o.type].w * 3} />
              </button>
            ))}
          </div>

          {/* Weight labels */}
          <div
            className="absolute text-center font-bold text-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", left: '3%', width: '27%', top: `${leftPct - 6}%` }}
          >
            <span className={leftW === rightW && leftW > 0 ? 'text-green-400' : 'text-teal-300'}>{leftW}</span>
          </div>
          <div
            className="absolute text-center font-bold text-sm"
            style={{ fontFamily: "'JetBrains Mono', monospace", right: '3%', width: '27%', top: `${rightPct - 6}%` }}
          >
            <span className={leftW === rightW && rightW > 0 ? 'text-green-400' : 'text-violet-300'}>{rightW}</span>
          </div>
        </div>

        {/* Transitive level: second scale info */}
        {cfg.mode === 'transitive' && phase >= 1 && (
          <div className="bg-violet-500/10 border border-violet-400/20 rounded-xl p-3 text-center">
            <div className="text-xs text-violet-300 mb-1">Cadena transitiva</div>
            <div className="text-sm text-white/70">
              {`Sandía (5) = ${rightPlate.map(o => DEFS[o.type].name).join(' + ')} (${wOf(rightPlate)})`}
            </div>
            <div className="text-sm text-white/70 mt-1">
              {`${rightPlate.map(o => DEFS[o.type].name).join(' + ')} = ...`}
            </div>
          </div>
        )}

        {/* Div by zero animation */}
        {showDivByZero && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-center animate-[shake_0.3s_ease-in-out]">
            <div className="text-red-400 font-bold text-lg">💥</div>
            <div className="text-red-300 text-sm font-bold">¡No se puede dividir entre cero!</div>
            <div className="text-red-400/60 text-xs mt-1">No existe ese reparto</div>
          </div>
        )}

        {/* Action buttons row */}
        <div className="flex flex-wrap gap-2 justify-center">
          {cfg.mode === 'symmetric' && (
            <button
              onClick={handleSwap}
              className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-bold hover:bg-amber-500/30 active:scale-95 transition-all"
            >
              ↔ Intercambiar
            </button>
          )}

          {showMultiply && (
            <>
              {[2, 3, 4].map(f => (
                <button
                  key={`m${f}`}
                  onClick={() => handleMultiplyBoth(f)}
                  className="px-3 py-2 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 text-sm font-bold hover:bg-teal-500/30 active:scale-95 transition-all"
                >
                  ×{f} ambos
                </button>
              ))}
            </>
          )}

          {showDivide && (
            <>
              {[2, 4].map(d => (
                <button
                  key={`d${d}`}
                  onClick={() => handleDivideBoth(d)}
                  className="px-3 py-2 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-300 text-sm font-bold hover:bg-violet-500/30 active:scale-95 transition-all"
                >
                  ÷{d} ambos
                </button>
              ))}
              <button
                onClick={() => handleDivideBoth(0)}
                className="px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-bold hover:bg-red-500/30 active:scale-95 transition-all"
              >
                ÷0
              </button>
            </>
          )}

          {(cfg.mode === 'addition' || cfg.mode === 'addition-combo') && trayTypes.length > 0 && (
            <>
              {trayTypes.map(t => (
                <button
                  key={`ab${t}`}
                  onClick={() => handleAddBoth(t)}
                  className="px-3 py-2 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 text-sm font-bold hover:bg-teal-500/30 active:scale-95 transition-all flex items-center gap-1"
                >
                  +<ObjIcon type={t} size={18} /> ambos
                </button>
              ))}
            </>
          )}

          {showMultiply && (
            <>
              <div className="w-full h-px bg-white/10 my-1" />
              <span className="text-[10px] text-white/30 self-center">Solo un lado:</span>
              {[2, 3].map(f => (
                <button
                  key={`ml${f}`}
                  onClick={() => handleMultiplyOne('left', f)}
                  className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300/60 text-xs hover:bg-red-500/20 active:scale-95 transition-all"
                >
                  ×{f} izq
                </button>
              ))}
              {[2, 3].map(f => (
                <button
                  key={`mr${f}`}
                  onClick={() => handleMultiplyOne('right', f)}
                  className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300/60 text-xs hover:bg-red-500/20 active:scale-95 transition-all"
                >
                  ×{f} der
                </button>
              ))}
            </>
          )}
        </div>

        {/* Object Tray */}
        {(trayTypes.length > 0 && !showMultiply && !showDivide) && (
          <div className="bg-white/5 rounded-2xl border border-white/10 p-3">
            <div className="text-xs text-white/30 mb-2 text-center">Cajón de objetos</div>
            <div className="flex flex-wrap justify-center gap-3">
              {trayTypes.map(t => (
                <button
                  key={`tray-${t}`}
                  onClick={() => tapTray(t)}
                  onPointerDown={e => startDrag(t, null, null, e)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-90 transition-all"
                >
                  <ObjIcon type={t} size={30 + DEFS[t].w * 3} />
                  <span className="text-[10px] text-white/40">{DEFS[t].w}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Utility buttons */}
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            onClick={() => setShowMath(s => !s)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all"
          >
            {showMath ? 'Ocultar matemática' : 'Ver matemática'}
          </button>
          <button
            onClick={() => setShowHist(s => !s)}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all"
          >
            Historial
          </button>
          <button
            onClick={handleUndo}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all"
          >
            ↩ Deshacer
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 active:scale-95 transition-all"
          >
            ↻ Reiniciar
          </button>
        </div>

        {/* Math display */}
        <MathDisplay left={leftPlate} right={rightPlate} swapped={swapped} addedObj={addedObj} show={showMath} />

        {/* History */}
        <HistoryPanel entries={history} show={showHist} />

        {/* Level navigation */}
        <div className="flex gap-2 justify-center pt-2 pb-6">
          <button
            onClick={() => level > 1 && setLevel(level - 1)}
            disabled={level === 1}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 active:scale-95 transition-all"
          >
            ← Anterior
          </button>
          <div className="flex gap-1.5 items-center">
            {LVLS.map((_, i) => (
              <button
                key={i}
                onClick={() => setLevel(i + 1)}
                className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${i + 1 === level
                  ? 'bg-teal-500 text-white scale-110'
                  : 'bg-white/10 text-white/40 hover:bg-white/20'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => level < 8 && setLevel(level + 1)}
            disabled={level === 8}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm disabled:opacity-30 hover:bg-white/10 active:scale-95 transition-all"
          >
            Siguiente →
          </button>
        </div>

        {/* Drag ghost */}
        {ghostPos && ghostType && (
          <div
            className="fixed pointer-events-none z-50 opacity-80"
            style={{ left: ghostPos.x - 20, top: ghostPos.y - 20 }}
          >
            <ObjIcon type={ghostType} size={40} />
          </div>
        )}
      </div>
    </div>
  )
}
