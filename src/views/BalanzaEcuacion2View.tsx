import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, HelpCircle, Play, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import ModalHelp from '../components/ModalHelp'

type TT = 'var' | 'unit'
interface Term { type: TT; val: number }
interface PTok { type: TT; sign: 1 | -1 }
type Side = 'left' | 'right'
type TokType = 'px' | 'nx' | 'p1' | 'n1'
type FBKind = 'info' | 'error' | 'success' | 'victory'

const BLU = '#378ADD', BLU_D = '#185FA5'
const RED = '#E24B4A', RED_D = '#A32D2D'

const TOK: Record<TokType, { tt: TT; s: 1 | -1; label: string }> = {
  px: { tt: 'var', s: 1, label: '+x' },
  nx: { tt: 'var', s: -1, label: '−x' },
  p1: { tt: 'unit', s: 1, label: '+1' },
  n1: { tt: 'unit', s: -1, label: '−1' },
}

function parseExpr(raw: string): Term[] {
  const t = raw.replace(/\s/g, '').replace(/X/g, 'x').replace(/−/g, '-')
  if (!t) return [{ type: 'unit', val: 0 }]
  const parts = t.match(/[+-]?[^+-]+/g) || []
  let v = 0, u = 0
  for (const p of parts) {
    if (p.includes('x')) {
      let c = p.replace('x', '')
      if (c === '' || c === '+') c = '1'
      if (c === '-') c = '-1'
      const n = parseFloat(c)
      if (!isNaN(n)) v += n
    } else {
      const n = parseFloat(p)
      if (!isNaN(n)) u += n
    }
  }
  const r: Term[] = []
  if (v !== 0) r.push({ type: 'var', val: v })
  if (u !== 0 || r.length === 0) r.push({ type: 'unit', val: u })
  return r
}

function simplify(terms: Term[]): Term[] {
  let v = 0, u = 0
  for (const t of terms) {
    if (t.type === 'var') v += t.val
    else u += t.val
  }
  v = Math.round(v * 100) / 100
  u = Math.round(u * 100) / 100
  const r: Term[] = []
  if (v !== 0) r.push({ type: 'var', val: v })
  if (u !== 0 || r.length === 0) r.push({ type: 'unit', val: u })
  return r
}

function fmtT(t: Term, first: boolean): string {
  if (t.type === 'var') {
    const abs = Math.abs(t.val)
    const sign = t.val < 0 ? '−' : (first ? '' : '+')
    if (abs === 1) return `${sign}x`
    return `${sign}${abs}x`
  }
  const v = t.val
  if (first) return `${v}`
  return v >= 0 ? `+${v}` : `${v}`
}

function inR(x: number, y: number, r: DOMRect): boolean {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
}

function fmtScale(op: string): string {
  return op[0] === 'm' ? `×${op.slice(1)}` : `÷${op.slice(1)}`
}

function PlateTokens({ terms, pending, cx, plateY, cancelSet, fadeCopies = 0 }: { terms: Term[]; pending: PTok[]; cx: number; plateY: number; cancelSet: Set<string>; fadeCopies?: number }) {
  const VAR_SZ = 16, VAR_GAP = 1.5, VAR_COL_MAX = 5
  const UNIT_SZ = 10, UNIT_GAP = 1.5, UNIT_COL_MAX = 8
  const COL_GAP = 3, GROUP_GAP = 6

  const consVar: { isPos: boolean; id: string }[] = []
  const consUnit: { isPos: boolean; id: string }[] = []
  const pendVar: { isPos: boolean; id: string }[] = []
  const pendUnit: { isPos: boolean; id: string }[] = []

  for (const t of terms) {
    const n = Math.min(Math.abs(Math.round(t.val)), 20)
    if (n === 0) continue
    for (let i = 0; i < n; i++) {
      const id = `c-${t.type}-${t.val > 0 ? 'p' : 'n'}-${i}`
      if (t.type === 'var') consVar.push({ isPos: t.val > 0, id })
      else consUnit.push({ isPos: t.val > 0, id })
    }
  }
  for (let pi = 0; pi < pending.length; pi++) {
    const p = pending[pi]
    const id = `p-${p.type}-${p.sign > 0 ? 'p' : 'n'}-${pi}`
    if (p.type === 'var') pendVar.push({ isPos: p.sign > 0, id })
    else pendUnit.push({ isPos: p.sign > 0, id })
  }

  const els: React.ReactNode[] = []
  let globalIdx = 0
  const cancelPositions: { x: number; y: number }[] = []
  const cancelStyle: React.CSSProperties = { animation: 'cancelBurst 0.7s ease-out forwards' }
  const fadeStyle: React.CSSProperties = { animation: 'cancelBurst 0.7s ease-out 1.5s forwards' }

  const renderVarBlock = (toks: { isPos: boolean; id: string }[], offsetX: number, isPend: boolean, isFade: boolean) => {
    for (let i = 0; i < toks.length; i++) {
      const col = Math.floor(i / VAR_COL_MAX)
      const row = i % VAR_COL_MAX
      const tk = toks[i]
      const fill = tk.isPos ? BLU : RED
      const stroke = tk.isPos ? BLU_D : RED_D
      const x = offsetX + col * (VAR_SZ + COL_GAP)
      const y = plateY - (row + 1) * (VAR_SZ + VAR_GAP) - 2
      const isCancel = cancelSet.has(tk.id)
      if (isCancel) cancelPositions.push({ x: x + VAR_SZ / 2, y: y + VAR_SZ / 2 })
      const st = isCancel ? cancelStyle : isFade ? fadeStyle : undefined
      els.push(<rect key={`r${globalIdx}`} x={x} y={y} width={VAR_SZ} height={VAR_SZ} fill={fill} stroke={stroke} strokeWidth={1.2} rx={2} opacity={isPend ? 0.7 : 1} strokeDasharray={isPend ? '2 1.5' : 'none'} style={st} />)
      els.push(<text key={`x${globalIdx}`} x={x + VAR_SZ / 2} y={y + VAR_SZ / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={VAR_SZ * 0.62} fontWeight="bold" style={st ? { ...st, pointerEvents: 'none' } as React.CSSProperties : undefined}>x</text>)
      globalIdx++
    }
  }

  const renderUnitBlock = (toks: { isPos: boolean; id: string }[], offsetX: number, isPend: boolean, isFade: boolean) => {
    for (let i = 0; i < toks.length; i++) {
      const col = Math.floor(i / UNIT_COL_MAX)
      const row = i % UNIT_COL_MAX
      const tk = toks[i]
      const fill = tk.isPos ? BLU : RED
      const stroke = tk.isPos ? BLU_D : RED_D
      const x = offsetX + col * (UNIT_SZ + COL_GAP)
      const y = plateY - (row + 1) * (UNIT_SZ + UNIT_GAP) - 2
      const isCancel = cancelSet.has(tk.id)
      if (isCancel) cancelPositions.push({ x: x + UNIT_SZ / 2, y: y + UNIT_SZ / 2 })
      const st = isCancel ? cancelStyle : isFade ? fadeStyle : undefined
      els.push(<rect key={`u${globalIdx}`} x={x} y={y} width={UNIT_SZ} height={UNIT_SZ} fill={fill} stroke={stroke} strokeWidth={1} rx={1.5} opacity={isPend ? 0.7 : 1} strokeDasharray={isPend ? '2 1.5' : 'none'} style={st} />)
      globalIdx++
    }
  }

  const colW = (count: number, sz: number) => count > 0 ? count * sz + (count - 1) * COL_GAP : 0
  const consVarCols = consVar.length > 0 ? Math.ceil(consVar.length / VAR_COL_MAX) : 0
  const pendVarCols = pendVar.length > 0 ? Math.ceil(pendVar.length / VAR_COL_MAX) : 0
  const consUnitCols = consUnit.length > 0 ? Math.ceil(consUnit.length / UNIT_COL_MAX) : 0
  const pendUnitCols = pendUnit.length > 0 ? Math.ceil(pendUnit.length / UNIT_COL_MAX) : 0

  const hasVar = consVar.length > 0 || pendVar.length > 0
  const hasUnit = consUnit.length > 0 || pendUnit.length > 0
  const hasFadeVar = fadeCopies > 0 && consVar.length > 0
  const hasFadeUnit = fadeCopies > 0 && consUnit.length > 0

  const totalW =
    colW(consVarCols, VAR_SZ) + (pendVarCols > 0 ? COL_GAP + colW(pendVarCols, VAR_SZ) : 0)
    + (hasFadeVar ? fadeCopies * (COL_GAP + colW(consVarCols, VAR_SZ)) : 0)
    + (hasVar || hasFadeVar ? (hasUnit || hasFadeUnit ? GROUP_GAP : 0) : 0)
    + colW(consUnitCols, UNIT_SZ) + (pendUnitCols > 0 ? COL_GAP + colW(pendUnitCols, UNIT_SZ) : 0)
    + (hasFadeUnit ? fadeCopies * (COL_GAP + colW(consUnitCols, UNIT_SZ)) : 0)

  let curX = cx - totalW / 2

  if (consVar.length > 0) { renderVarBlock(consVar, curX, false, false); curX += colW(consVarCols, VAR_SZ) }
  if (pendVar.length > 0) { if (consVar.length > 0) curX += COL_GAP; renderVarBlock(pendVar, curX, true, false); curX += colW(pendVarCols, VAR_SZ) }
  for (let g = 0; g < fadeCopies; g++) { if (consVar.length > 0) { curX += COL_GAP; renderVarBlock(consVar, curX, false, true); curX += colW(consVarCols, VAR_SZ) } }
  if (hasVar || hasFadeVar) { if (hasUnit || hasFadeUnit) curX += GROUP_GAP }
  if (consUnit.length > 0) { renderUnitBlock(consUnit, curX, false, false); curX += colW(consUnitCols, UNIT_SZ) }
  if (pendUnit.length > 0) { if (consUnit.length > 0) curX += COL_GAP; renderUnitBlock(pendUnit, curX, true, false); curX += colW(pendUnitCols, UNIT_SZ) }
  for (let g = 0; g < fadeCopies; g++) { if (consUnit.length > 0) { curX += COL_GAP; renderUnitBlock(consUnit, curX, false, true) } }

  if (cancelPositions.length > 0) {
    const midX = cancelPositions.reduce((s, p) => s + p.x, 0) / cancelPositions.length
    const midY = cancelPositions.reduce((s, p) => s + p.y, 0) / cancelPositions.length

    els.push(
      <circle key={`flash${globalIdx++}`} cx={midX} cy={midY} r="1" fill="#fef08a" opacity="0">
        <animate attributeName="r" from="1" to="14" dur="0.3s" fill="freeze" begin="0.1s" />
        <animate attributeName="opacity" values="0;1;0" dur="0.35s" fill="freeze" begin="0.1s" keyTimes="0;0.25;1" />
      </circle>
    )

    els.push(
      <circle key={`shock${globalIdx++}`} cx={midX} cy={midY} r="2" fill="none" stroke="#fde047" strokeWidth="3" opacity="0">
        <animate attributeName="r" from="2" to="26" dur="0.5s" fill="freeze" begin="0.12s" />
        <animate attributeName="opacity" values="0;0.9;0.4;0" dur="0.5s" fill="freeze" begin="0.12s" keyTimes="0;0.2;0.6;1" />
        <animate attributeName="stroke-width" from="3" to="0.5" dur="0.5s" fill="freeze" begin="0.12s" />
      </circle>
    )

    const angles = [0, 45, 90, 135, 180, 225, 270, 315]
    const sparkDist = 22
    for (let a = 0; a < angles.length; a++) {
      const rad = angles[a] * Math.PI / 180
      const dx = Math.cos(rad) * sparkDist
      const dy = Math.sin(rad) * sparkDist
      els.push(
        <circle key={`spark${globalIdx}-${a}`} cx={midX} cy={midY} r="2.5" fill={a % 2 === 0 ? '#fbbf24' : '#fb923c'} opacity="0">
          <animate attributeName="cx" from={String(midX)} to={String(midX + dx)} dur="0.4s" fill="freeze" begin="0.15s" />
          <animate attributeName="cy" from={String(midY)} to={String(midY + dy)} dur="0.4s" fill="freeze" begin="0.15s" />
          <animate attributeName="opacity" values="0;1;0" dur="0.45s" fill="freeze" begin="0.15s" keyTimes="0;0.15;1" />
          <animate attributeName="r" from="2.5" to="0.5" dur="0.45s" fill="freeze" begin="0.15s" />
        </circle>
      )
    }
    globalIdx++
  }

  return <>{els}</>
}

function ScaleSVG({ angle, tL, tR, pL, pR, pSL, pSR, hlL, hlR, cancelSet, fadeCopiesL, fadeCopiesR }: {
  angle: number; tL: Term[]; tR: Term[]; pL: PTok[]; pR: PTok[]
  pSL: string | null; pSR: string | null; hlL: boolean; hlR: boolean; cancelSet: Set<string>
  fadeCopiesL: number; fadeCopiesR: number
}) {
  const W = 400, H = 250, px = 200, py = 32, half = 145, chain = 116, pY = py + chain
  const plateW = 114, plateH = 7
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-[min(56vh,320px)] lg:max-h-[min(65vh,480px)] xl:max-h-[min(70vh,560px)] select-none" style={{ touchAction: 'none' }}>
      <ellipse cx={px} cy={H - 5} rx={36} ry={6} fill="#475569" />
      <rect x={px - 4} y={py} width={8} height={H - py - 5} fill="#64748b" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${px}px ${py}px`, transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' }}>
        <line x1={px - half} y1={py} x2={px + half} y2={py} stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <line x1={px - half} y1={py} x2={px - half} y2={pY} stroke="#64748b" strokeWidth="2" />
        <line x1={px + half} y1={py} x2={px + half} y2={pY} stroke="#64748b" strokeWidth="2" />
        <rect x={px - half - plateW / 2} y={pY} width={plateW} height={plateH} rx={3} fill="#1e293b" stroke={hlL ? '#38bdf8' : '#475569'} strokeWidth={hlL ? 2 : 1.5} style={hlL ? { filter: 'brightness(1.3)' } : undefined} />
        <rect x={px + half - plateW / 2} y={pY} width={plateW} height={plateH} rx={3} fill="#1e293b" stroke={hlR ? '#38bdf8' : '#475569'} strokeWidth={hlR ? 2 : 1.5} style={hlR ? { filter: 'brightness(1.3)' } : undefined} />
        <PlateTokens terms={tL} pending={pL} cx={px - half} plateY={pY} cancelSet={cancelSet} fadeCopies={fadeCopiesL} />
        <PlateTokens terms={tR} pending={pR} cx={px + half} plateY={pY} cancelSet={cancelSet} fadeCopies={fadeCopiesR} />
      </g>
      {pSL && (
        <rect x={px - half - 18} y={pY + 14} width={36} height={17} rx={8} fill="#0ea5e9" opacity={0.25} />
      )}
      {pSL && (
        <text x={px - half} y={pY + 26} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">{fmtScale(pSL)}</text>
      )}
      {pSR && (
        <rect x={px + half - 18} y={pY + 14} width={36} height={17} rx={8} fill="#0ea5e9" opacity={0.25} />
      )}
      {pSR && (
        <text x={px + half} y={pY + 26} textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="bold">{fmtScale(pSR)}</text>
      )}
      <circle cx={px} cy={py} r={6} fill="#94a3b8" />
      <circle cx={px} cy={py} r={3} fill="#475569" />
    </svg>
  )
}

const KB_ROWS = [
  ['1', '2', '3', 'x', '⌫'],
  ['4', '5', '6', '2x', '+'],
  ['7', '8', '9', '3x', '−'],
  ['0', 'C', '✓'],
]

function EqChips({ left, right }: { left: Term[]; right: Term[] }) {
  const chip = (t: Term, first: boolean) => {
    const isPos = t.val >= 0
    const bg = isPos ? 'bg-blue-500/25 border-blue-400/40 text-blue-200' : 'bg-red-500/25 border-red-400/40 text-red-200'
    return <span key={`${t.type}${t.val}${first}`} className={`px-1.5 py-0.5 lg:px-2.5 lg:py-1 rounded text-[10px] lg:text-xs font-mono border font-bold ${bg}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtT(t, first)}</span>
  }
  return (
    <div className="flex items-center justify-center gap-1 lg:gap-1.5 flex-wrap">
      {left.length ? left.map((t, i) => chip(t, i === 0)) : <span className="text-white/30 text-xs">0</span>}
      <span className="text-white/40 font-bold text-xs lg:text-sm mx-0.5">=</span>
      {right.length ? right.map((t, i) => chip(t, i === 0)) : <span className="text-white/30 text-xs">0</span>}
    </div>
  )
}

const SCALE_MULT = ['m2', 'm3', 'm5', 'm7']
const SCALE_DIV = ['d2', 'd3', 'd5', 'd7']

export default function BalanzaEcuacion2View() {
  const nav = useNavigate()

  const [kbL, setKbL] = useState('3x-2')
  const [kbR, setKbR] = useState('7')
  const [activeKb, setActiveKb] = useState<Side | null>(null)

  const [stL, setStL] = useState<Term[]>(() => parseExpr('3x-2'))
  const [stR, setStR] = useState<Term[]>(() => parseExpr('7'))
  const [pL, setPL] = useState<PTok[]>([])
  const [pR, setPR] = useState<PTok[]>([])
  const [pendScaleL, setPendScaleL] = useState<string | null>(null)
  const [pendScaleR, setPendScaleR] = useState<string | null>(null)
  const [generated, setGenerated] = useState(true)

  const [fb, setFb] = useState<{ kind: FBKind; msg: string }>({ kind: 'info', msg: 'Arrastra fichas u operaciones a ambos platillos para equilibrar.' })
  const [shakeB, setShakeB] = useState(false)
  const [shakeM, setShakeM] = useState(false)
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null)
  const [ghostTok, setGhostTok] = useState<TokType | null>(null)
  const [ghostScale, setGhostScale] = useState<string | null>(null)
  const [hlL, setHlLState] = useState(false)
  const [hlR, setHlRState] = useState(false)
  const [cancelSet, setCancelSet] = useState<Set<string>>(new Set())
  const [consolidating, setConsolidating] = useState(false)
  const [fadeCopiesL, setFadeCopiesL] = useState(0)
  const [fadeCopiesR, setFadeCopiesR] = useState(0)
  const [showHelp, setShowHelp] = useState(false)

  const leftDropRef = useRef<HTMLDivElement>(null)
  const rightDropRef = useRef<HTMLDivElement>(null)

  const pendWL = pL.reduce((s, p) => s + (p.type === 'var' ? 2 : 1), 0)
  const pendWR = pR.reduce((s, p) => s + (p.type === 'var' ? 2 : 1), 0)
  const pendDiff = pendWR - pendWL
  const angle = Math.max(-9, Math.min(9, (pendDiff / 8) * 9))
  const balanced = pendWL === pendWR

  const triggerShake = useCallback((target: 'balanza' | 'msg') => {
    if (target === 'balanza') { setShakeB(true); setTimeout(() => setShakeB(false), 450) }
    else { setShakeM(true); setTimeout(() => setShakeM(false), 450) }
  }, [])

  const checkVictory = useCallback((l: Term[], r: Term[]) => {
    const has1x = l.some(t => t.type === 'var' && t.val === 1)
    const noUL = !l.some(t => t.type === 'unit' && t.val !== 0)
    const noVR = !r.some(t => t.type === 'var' && t.val !== 0)
    const hasUR = r.some(t => t.type === 'unit')
    if (has1x && noUL && noVR && hasUR) {
      const xVal = r.find(t => t.type === 'unit')?.val ?? 0
      setFb({ kind: 'victory', msg: `¡Ecuación resuelta! x = ${xVal}` })
    }
  }, [])

  const handleGenerate = useCallback(() => {
    const lt = parseExpr(kbL)
    const rt = parseExpr(kbR)
    setStL(lt); setStR(rt)
    setPL([]); setPR([])
    setPendScaleL(null); setPendScaleR(null)
    setGenerated(true)
    setActiveKb(null)
    setFb({ kind: 'info', msg: 'Ecuación lista. Arrastra fichas u operaciones a los platillos.' })
  }, [kbL, kbR])

  const handleKb = useCallback((key: string) => {
    const set = activeKb === 'left' ? setKbL : setKbR
    if (key === '⌫') set(p => p.slice(0, -1))
    else if (key === 'C') set('')
    else if (key === '✓') setActiveKb(null)
    else set(p => p + key)
  }, [activeKb])

  const startDrag = useCallback((tt: TokType, e: React.PointerEvent) => {
    e.preventDefault()
    setGhostTok(tt); setGhostPos({ x: e.clientX, y: e.clientY })
    setPendScaleL(null); setPendScaleR(null)

    const onMove = (ev: PointerEvent) => {
      setGhostPos({ x: ev.clientX, y: ev.clientY })
      const lr = leftDropRef.current?.getBoundingClientRect()
      const rr = rightDropRef.current?.getBoundingClientRect()
      setHlLState(!!(lr && inR(ev.clientX, ev.clientY, lr)))
      setHlRState(!!(rr && inR(ev.clientX, ev.clientY, rr)))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const lr = leftDropRef.current?.getBoundingClientRect()
      const rr = rightDropRef.current?.getBoundingClientRect()
      const oL = !!(lr && inR(ev.clientX, ev.clientY, lr))
      const oR = !!(rr && inR(ev.clientX, ev.clientY, rr))
      if (oL) setPL(prev => [...prev, { type: TOK[tt].tt, sign: TOK[tt].s }])
      if (oR) setPR(prev => [...prev, { type: TOK[tt].tt, sign: TOK[tt].s }])
      setGhostPos(null); setGhostTok(null); setHlLState(false); setHlRState(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const startDragScale = useCallback((op: string, e: React.PointerEvent) => {
    e.preventDefault()
    setGhostScale(op); setGhostPos({ x: e.clientX, y: e.clientY })
    setPL([]); setPR([])

    const onMove = (ev: PointerEvent) => {
      setGhostPos({ x: ev.clientX, y: ev.clientY })
      const lr = leftDropRef.current?.getBoundingClientRect()
      const rr = rightDropRef.current?.getBoundingClientRect()
      setHlLState(!!(lr && inR(ev.clientX, ev.clientY, lr)))
      setHlRState(!!(rr && inR(ev.clientX, ev.clientY, rr)))
    }
    const onUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const lr = leftDropRef.current?.getBoundingClientRect()
      const rr = rightDropRef.current?.getBoundingClientRect()
      const oL = !!(lr && inR(ev.clientX, ev.clientY, lr))
      const oR = !!(rr && inR(ev.clientX, ev.clientY, rr))
      if (oL) setPendScaleL(prev => prev === op ? null : op)
      if (oR) setPendScaleR(prev => prev === op ? null : op)
      setGhostPos(null); setGhostScale(null); setHlLState(false); setHlRState(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [])

  const computeCancellations = (oldTerms: Term[], newTerms: Term[]): string[] => {
    const cancels: string[] = []
    for (const t of oldTerms) {
      const n = Math.min(Math.abs(Math.round(t.val)), 20)
      if (n === 0) continue
      const newTerm = newTerms.find(nt => nt.type === t.type)
      const newVal = newTerm ? Math.abs(Math.round(newTerm.val)) : 0
      const oldVal = Math.abs(Math.round(t.val))
      const cancelled = oldVal - newVal
      if (cancelled > 0) {
        for (let i = 0; i < cancelled; i++) {
          cancels.push(`c-${t.type}-${t.val > 0 ? 'p' : 'n'}-${oldVal - 1 - i}`)
        }
      }
    }
    return cancels
  }

  const handleOperate = useCallback(() => {
    if (consolidating) return

    if (pendScaleL || pendScaleR) {
      if (!pendScaleL || !pendScaleR) {
        setFb({ kind: 'error', msg: `Arrastra la operación a ambos platillos (solo tiene ${pendScaleL ? 'izquierdo' : 'derecho'})` })
        triggerShake('msg'); return
      }
      if (pendScaleL !== pendScaleR) {
        setFb({ kind: 'error', msg: `Operaciones diferentes: izq ${fmtScale(pendScaleL)}, der ${fmtScale(pendScaleR)}` })
        triggerShake('balanza'); return
      }
      const op = pendScaleL[0]
      const n = parseFloat(pendScaleL.slice(1))
      const apply = (terms: Term[]): Term[] => simplify(terms.map(t => ({
        ...t,
        val: Math.round((op === 'm' ? t.val * n : t.val / n) * 100) / 100
      })))
      const newL = apply(stL)
      const newR = apply(stR)

      if (op === 'm') {
        const makeCopy = (src: Term[]): PTok[] => {
          const out: PTok[] = []
          for (const t of src) {
            const cnt = Math.min(Math.abs(Math.round(t.val)), 20)
            for (let i = 0; i < cnt; i++) out.push({ type: t.type, sign: t.val > 0 ? 1 as const : -1 as const })
          }
          return out
        }
        const allPL: PTok[] = [], allPR: PTok[] = []
        for (let c = 0; c < n - 1; c++) { allPL.push(...makeCopy(stL)); allPR.push(...makeCopy(stR)) }
        setPL(allPL); setPR(allPR)
        setPendScaleL(null); setPendScaleR(null)
        setConsolidating(true)
        setFb({ kind: 'success', msg: `Multiplicación ×${n} aplicada.` })
        setTimeout(() => {
          setStL(newL); setStR(newR); setPL([]); setPR([])
          setConsolidating(false)
          checkVictory(newL, newR)
        }, 1300)
        return
      }

      const computeRemoved = (orig: Term[], result: Term[]): boolean => {
        for (const type of ['var', 'unit'] as const) {
          const origN = orig.find(t => t.type === type)
          const resN = result.find(t => t.type === type)
          if ((origN ? Math.abs(Math.round(origN.val)) : 0) !== (resN ? Math.abs(Math.round(resN.val)) : 0)) return true
        }
        return false
      }
      const hasDiff = computeRemoved(stL, newL) || computeRemoved(stR, newR)
      setStL(newL); setStR(newR)
      setPendScaleL(null); setPendScaleR(null)
      if (hasDiff) {
        setFadeCopiesL(n - 1); setFadeCopiesR(n - 1)
        setConsolidating(true)
        setFb({ kind: 'success', msg: `División ÷${n} aplicada.` })
        setTimeout(() => {
          setFadeCopiesL(0); setFadeCopiesR(0)
          setConsolidating(false)
          checkVictory(newL, newR)
        }, 2300)
      } else {
        setFb({ kind: 'success', msg: `División ÷${n} aplicada.` })
        checkVictory(newL, newR)
      }
      return
    }

    if (pL.length > 0 || pR.length > 0) {
      const lv = pL.reduce((s, p) => s + (p.type === 'var' ? p.sign : 0), 0)
      const rv = pR.reduce((s, p) => s + (p.type === 'var' ? p.sign : 0), 0)
      const lu = pL.reduce((s, p) => s + (p.type === 'unit' ? p.sign : 0), 0)
      const ru = pR.reduce((s, p) => s + (p.type === 'unit' ? p.sign : 0), 0)

      if (lv !== rv) {
        setFb({ kind: 'error', msg: `Desequilibrio en variables: izq tiene ${lv > 0 ? '+' : ''}${lv}x, der tiene ${rv > 0 ? '+' : ''}${rv}x` })
        triggerShake('balanza'); return
      }
      if (lu !== ru) {
        setFb({ kind: 'error', msg: `Desequilibrio en unidades: izq tiene ${lu > 0 ? '+' : ''}${lu}, der tiene ${ru > 0 ? '+' : ''}${ru}` })
        triggerShake('balanza'); return
      }

      const allL = [...stL, ...pL.map(p => ({ type: p.type, val: p.sign as number }))]
      const allR = [...stR, ...pR.map(p => ({ type: p.type, val: p.sign as number }))]
      const newL = simplify(allL)
      const newR = simplify(allR)

      const leftCancels = computeCancellations(stL, newL)
      const rightCancels = computeCancellations(stR, newR)
      const allCancels = [...leftCancels, ...rightCancels]

      if (allCancels.length > 0) {
        setConsolidating(true)
        setCancelSet(new Set(allCancels))
        setTimeout(() => {
          setCancelSet(new Set())
          setStL(newL); setStR(newR); setPL([]); setPR([])
          setConsolidating(false)
          const cancelCount = allCancels.length
          setFb({ kind: 'success', msg: `Operación correcta. ${cancelCount} ficha${cancelCount > 1 ? 's' : ''} cancelada${cancelCount > 1 ? 's' : ''}.` })
          checkVictory(newL, newR)
        }, 1100)
      } else {
        setStL(newL); setStR(newR); setPL([]); setPR([])
        setFb({ kind: 'success', msg: 'Operación correcta. Balanza actualizada.' })
        checkVictory(newL, newR)
      }
      return
    }

    setFb({ kind: 'error', msg: 'Arrastra fichas u operaciones a ambos platillos primero' })
    triggerShake('msg')
  }, [consolidating, pendScaleL, pendScaleR, stL, stR, pL, pR, triggerShake, checkVictory])

  const clearPending = useCallback(() => {
    setPL([]); setPR([]); setPendScaleL(null); setPendScaleR(null)
  }, [])

  const pendingSummary = useCallback((p: PTok[]) => {
    const v = p.reduce((s, t) => s + (t.type === 'var' ? t.sign : 0), 0)
    const u = p.reduce((s, t) => s + (t.type === 'unit' ? t.sign : 0), 0)
    const parts: string[] = []
    if (v !== 0) parts.push(`${v > 0 ? '+' : ''}${v === 1 && v > 0 ? '' : v === -1 ? '-' : v}x`)
    if (u !== 0) parts.push(`${u > 0 ? '+' : ''}${u}`)
    return parts.length ? parts.join(' ') : '—'
  }, [])

  const fbCls: Record<FBKind, string> = {
    info: 'bg-white/5 border-white/10 text-white/60',
    error: 'bg-red-500/15 border-red-400/30 text-red-300 font-semibold',
    success: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 font-semibold',
    victory: 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 font-bold',
  }

  const kbVal = activeKb === 'left' ? kbL : kbR
  const hasPending = pL.length > 0 || pR.length > 0 || !!pendScaleL || !!pendScaleR

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* ── Barra superior compacta (34px tablet / 42px laptop) ── */}
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
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[13px] lg:text-[15px] font-bold text-white/90 truncate">
              Balanza de Ecuaciones
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 lg:px-2 rounded text-[9px] lg:text-[10px] font-mono bg-teal-400/10 text-teal-300 border border-teal-400/20">
              1° Grado
            </span>
          </div>
        </div>

        {/* Chips de ecuación centrados en la cabecera cuando está generada */}
        {generated && (
          <div className="hidden sm:flex items-center">
            <EqChips left={stL} right={stR} />
          </div>
        )}

        <div className="flex items-center gap-1">
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

      {/* ── Barra de entrada de ecuación (36px tablet / 42px laptop) ── */}
      <div className="relative shrink-0 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs">
        <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-1 min-w-0">
          <span className="text-[10px] lg:text-[11px] text-white/40 font-medium shrink-0 hidden sm:inline">Ecuación:</span>
          <button
            onClick={() => setActiveKb(activeKb === 'left' ? null : 'left')}
            className={`h-7 lg:h-8 min-w-[64px] sm:min-w-[76px] lg:min-w-[90px] px-2 lg:px-3 rounded-md font-mono text-[11px] lg:text-xs font-bold border transition-all truncate text-center ${activeKb === 'left' ? 'border-teal-400 bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/50' : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'}`}
            title="Tocar para editar primer miembro"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {kbL || '—'}
          </button>
          <span className="text-white/40 font-bold text-xs lg:text-sm shrink-0">=</span>
          <button
            onClick={() => setActiveKb(activeKb === 'right' ? null : 'right')}
            className={`h-7 lg:h-8 min-w-[48px] sm:min-w-[64px] lg:min-w-[80px] px-2 lg:px-3 rounded-md font-mono text-[11px] lg:text-xs font-bold border transition-all truncate text-center ${activeKb === 'right' ? 'border-teal-400 bg-teal-400/20 text-teal-200 ring-1 ring-teal-400/50' : 'border-white/10 bg-white/5 text-white/90 hover:bg-white/10'}`}
            title="Tocar para editar segundo miembro"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {kbR || '—'}
          </button>
          <button
            onClick={handleGenerate}
            className="h-7 lg:h-8 px-2 sm:px-2.5 lg:px-3.5 rounded-md bg-teal-500 hover:bg-teal-400 text-white font-bold text-[11px] lg:text-xs active:scale-95 transition-all shrink-0 flex items-center gap-1.5 shadow-sm"
            title="Generar balanza con esta ecuación"
          >
            <RefreshCw size={11} className={consolidating ? 'animate-spin' : ''} />
            <span className="hidden xs:inline">Generar</span>
          </button>
        </div>

        {/* Indicador de equilibrio */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] lg:text-[11px]">
          {balanced ? (
            <span className="inline-flex items-center gap-1.5 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Equilibrada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2 lg:px-2.5 py-0.5 lg:py-1 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {pendWL > pendWR ? 'Izq. pesa +' : 'Der. pesa +'}
            </span>
          )}
        </div>

        {/* Teclado Virtual en Popover / Overlay elegante */}
        {activeKb && (
          <div className="absolute left-2 sm:left-4 top-10 lg:top-12 z-50 w-[270px] sm:w-[290px] lg:w-[320px] bg-[#0c1529] p-2.5 lg:p-3 rounded-xl border border-teal-500/30 shadow-2xl space-y-1.5 lg:space-y-2 backdrop-blur-md">
            <div className="flex items-center justify-between text-[11px] lg:text-xs text-white/50 px-0.5">
              <span>Editando: <strong className="text-teal-300">{activeKb === 'left' ? '1° miembro' : '2° miembro'}</strong></span>
              <button onClick={() => setActiveKb(null)} className="text-white/40 hover:text-white p-0.5 text-xs">✕</button>
            </div>
            <div className="text-center font-mono text-white text-xs lg:text-sm py-1 px-2 bg-white/5 rounded border border-white/10 min-h-[26px] flex items-center justify-center font-bold tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {kbVal || '—'}
            </div>
            <div className="grid grid-cols-5 gap-1 lg:gap-1.5">
              {KB_ROWS.flat().map((k, i) => {
                const isOp = k === '+' || k === '−'
                const isDel = k === '⌫'
                const isClr = k === 'C'
                const isOk = k === '✓'
                let cls = 'h-7 lg:h-8 rounded text-[11px] lg:text-xs font-bold active:scale-95 transition-all flex items-center justify-center '
                if (isOk) cls += 'col-span-3 bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/35'
                else if (isDel) cls += 'bg-red-500/20 text-red-300 border border-red-400/30 hover:bg-red-500/30'
                else if (isClr) cls += 'bg-red-500/15 text-red-300/70 border border-red-400/20 hover:bg-red-500/25'
                else if (isOp) cls += 'bg-sky-500/20 text-sky-300 border border-sky-400/30 hover:bg-sky-500/30'
                else cls += 'bg-white/10 text-white border border-white/10 hover:bg-white/15'
                return <button key={`${k}-${i}`} className={cls} onClick={() => handleKb(k)}>{k}</button>
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Área de Trabajo Principal (Balanza + Estantes laterales) ── */}
      <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
        {/* Columna Izquierda: Fichas (+x, -x, +1, -1) */}
        <aside className="w-[52px] sm:w-[60px] lg:w-[68px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-1.5 lg:gap-2">
            <div className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-white/30 text-center">
              Fichas
            </div>
            {(['px', 'nx', 'p1', 'n1'] as TokType[]).map(tt => {
              const d = TOK[tt]
              const isVar = d.tt === 'var'
              const isPos = d.s > 0
              const fill = isPos ? BLU : RED
              const sz = isVar ? 20 : 16
              return (
                <button
                  key={tt}
                  onPointerDown={e => startDrag(tt, e)}
                  className="flex flex-col items-center justify-center w-10 sm:w-11 lg:w-12 h-10 lg:h-11 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all cursor-grab active:cursor-grabbing shadow-sm"
                  title={`Arrastrar ${d.label}`}
                >
                  <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
                    <rect width={sz} height={sz} fill={fill} rx={2.5} />
                    {isVar && <text x={sz / 2} y={sz / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={sz * 0.6} fontWeight="bold">x</text>}
                  </svg>
                  <span className="text-[8px] lg:text-[9px] font-bold text-white/50 leading-none mt-0.5">{d.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={clearPending}
            className="text-[9px] lg:text-[10px] text-white/40 hover:text-white py-1 px-1 lg:px-2 rounded hover:bg-white/5 transition-colors"
            title="Limpiar fichas pendientes"
          >
            Limpiar
          </button>
        </aside>

        {/* Centro: Balanza Interactiva */}
        <main className="flex-1 min-w-0 flex flex-col items-center justify-between relative bg-gradient-to-b from-white/[0.01] to-white/[0.03] border border-white/5 rounded-xl px-1 sm:px-2 lg:px-4 pt-1 lg:pt-2 pb-1 overflow-hidden">
          {/* Fila de ecuación superior */}
          <div className="shrink-0 flex items-center justify-center gap-2 pt-0.5 lg:pt-1">
            <EqChips left={stL} right={stR} />
          </div>

          {/* Contenedor central con la balanza pegada abajo hacia la leyenda en tablet y amplia en laptop */}
          <div className="relative w-full max-w-[540px] lg:max-w-[760px] xl:max-w-[880px] flex-1 min-h-0 flex items-end justify-center pb-0">
            <div className={`w-full flex justify-center ${shakeB ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              <ScaleSVG
                angle={angle}
                tL={stL}
                tR={stR}
                pL={pL}
                pR={pR}
                pSL={pendScaleL}
                pSR={pendScaleR}
                hlL={hlL}
                hlR={hlR}
                cancelSet={cancelSet}
                fadeCopiesL={fadeCopiesL}
                fadeCopiesR={fadeCopiesR}
              />
            </div>

            {/* Zonas de detección de arrastre sobre los platillos */}
            <div
              ref={leftDropRef}
              className="absolute pointer-events-auto transition-all duration-150"
              style={{
                left: '2%',
                top: '12%',
                width: '34%',
                height: '70%',
                borderRadius: 14,
                border: hlL ? '2px dashed #38bdf8' : '1px dashed transparent',
                backgroundColor: hlL ? 'rgba(56,189,248,0.12)' : 'transparent',
              }}
            />
            <div
              ref={rightDropRef}
              className="absolute pointer-events-auto transition-all duration-150"
              style={{
                right: '2%',
                top: '12%',
                width: '34%',
                height: '70%',
                borderRadius: 14,
                border: hlR ? '2px dashed #38bdf8' : '1px dashed transparent',
                backgroundColor: hlR ? 'rgba(56,189,248,0.12)' : 'transparent',
              }}
            />
          </div>

          {/* Micro-leyenda compacta pegada a la base */}
          <div className="shrink-0 flex items-center justify-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-white/35 pt-0 pb-0.5 lg:pb-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-[2px]" style={{ background: BLU }} /> +x / +1
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-[2px]" style={{ background: RED }} /> −x / −1
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-sky-300/60 font-semibold">
              ×n multiplica
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-emerald-300/60 font-semibold">
              ÷n divide
            </span>
          </div>
        </main>

        {/* Columna Derecha: Multiplicar / Dividir */}
        <aside className="w-[52px] sm:w-[60px] lg:w-[68px] shrink-0 flex flex-col items-center justify-between py-1 lg:py-2 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="w-full flex flex-col items-center gap-1 lg:gap-1.5">
            <div className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-sky-400/70 text-center">
              Mult.
            </div>
            {SCALE_MULT.map(op => {
              const n = op.slice(1)
              const active = pendScaleL === op || pendScaleR === op
              return (
                <button
                  key={op}
                  onPointerDown={e => startDragScale(op, e)}
                  className={`w-10 sm:w-11 lg:w-12 h-6 lg:h-7 rounded-md text-[10px] lg:text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center cursor-grab active:cursor-grabbing ${active ? 'bg-sky-500/35 border-sky-400/60 text-sky-100 border shadow-sm' : 'bg-sky-500/10 text-sky-300/75 border border-sky-400/20 hover:bg-sky-500/20'}`}
                  title={`Arrastrar multiplicación por ${n}`}
                >
                  ×{n}
                </button>
              )
            })}

            <div className="w-8 lg:w-10 h-px bg-white/10 my-0.5" />

            <div className="text-[9px] lg:text-[10px] font-black uppercase tracking-wider text-emerald-400/70 text-center">
              Div.
            </div>
            {SCALE_DIV.map(op => {
              const n = op.slice(1)
              const active = pendScaleL === op || pendScaleR === op
              return (
                <button
                  key={op}
                  onPointerDown={e => startDragScale(op, e)}
                  className={`w-10 sm:w-11 lg:w-12 h-6 lg:h-7 rounded-md text-[10px] lg:text-[11px] font-bold transition-all active:scale-95 flex items-center justify-center cursor-grab active:cursor-grabbing ${active ? 'bg-emerald-500/35 border-emerald-400/60 text-emerald-100 border shadow-sm' : 'bg-emerald-500/10 text-emerald-300/75 border border-emerald-400/20 hover:bg-emerald-500/20'}`}
                  title={`Arrastrar división entre ${n}`}
                >
                  ÷{n}
                </button>
              )
            })}
          </div>
        </aside>
      </div>

      {/* ── Barra Inferior de Acción y Feedback (40px tablet / 48px laptop) ── */}
      <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
        {/* Mensaje de estado / Feedback */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 sm:gap-2">
          {fb.kind === 'victory' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 lg:px-3.5 lg:py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] lg:text-xs font-bold">
              <Sparkles size={13} className="text-emerald-300 shrink-0 animate-bounce" />
              <span className="truncate">{fb.msg}</span>
            </div>
          ) : (
            <div className={`px-2 py-0.5 lg:px-3 lg:py-1 rounded-md border text-[10px] lg:text-[11px] truncate max-w-full font-medium ${fbCls[fb.kind]} ${shakeM ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              {fb.msg}
            </div>
          )}

          {/* Resumen de operaciones pendientes en platillos */}
          {hasPending && (
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] lg:text-[11px] font-mono px-2 py-0.5 lg:px-3 lg:py-1 rounded bg-white/5 border border-white/10 shrink-0">
              {(pendScaleL || pendScaleR) ? (
                <>
                  <span className={pendScaleL ? 'text-sky-300 font-bold' : 'text-white/25'}>Izq: {pendScaleL ? fmtScale(pendScaleL) : '—'}</span>
                  <span className="text-white/20">|</span>
                  <span className={pendScaleR ? 'text-sky-300 font-bold' : 'text-white/25'}>Der: {pendScaleR ? fmtScale(pendScaleR) : '—'}</span>
                </>
              ) : (
                <>
                  <span className="text-blue-300 font-bold">Izq: {pendingSummary(pL)}</span>
                  <span className="text-white/20">|</span>
                  <span className="text-amber-300 font-bold">Der: {pendingSummary(pR)}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción: Deshacer selección y OPERAR */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasPending && (
            <button
              onClick={clearPending}
              className="h-7 lg:h-8 px-2 lg:px-2.5 rounded-lg bg-white/5 border border-white/10 text-[10px] lg:text-[11px] text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center gap-1"
              title="Cancelar fichas u operaciones pendientes"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Deshacer</span>
            </button>
          )}

          <button
            onClick={handleOperate}
            disabled={consolidating}
            className={`h-7 lg:h-8 px-3.5 lg:px-5 rounded-lg text-white font-bold text-[11px] lg:text-xs active:scale-95 shadow transition-all flex items-center gap-1.5 shrink-0 ${
              hasPending
                ? 'bg-blue-500 hover:bg-blue-400 ring-2 ring-blue-400/30 shadow-blue-500/25'
                : 'bg-blue-600/70 hover:bg-blue-500/80 text-white/90'
            }`}
          >
            <Play size={11} fill="currentColor" />
            <span>Operar</span>
          </button>
        </div>
      </footer>

      {/* ── Elemento Fantasma Flotante al arrastrar ── */}
      {ghostPos && ghostTok && (() => {
        const d = TOK[ghostTok]
        const isVar = d.tt === 'var'
        const sz = isVar ? 26 : 20
        const fill = d.s > 0 ? BLU : RED
        return (
          <div className="fixed pointer-events-none z-50 opacity-90 -translate-x-1/2 -translate-y-1/2" style={{ left: ghostPos.x, top: ghostPos.y }}>
            <svg width={sz} height={sz}><rect width={sz} height={sz} fill={fill} rx={3} />{isVar && <text x={sz / 2} y={sz / 2 + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={sz * 0.55} fontWeight="bold">x</text>}</svg>
          </div>
        )
      })()}

      {ghostPos && ghostScale && (
        <div className="fixed pointer-events-none z-50 opacity-90 -translate-x-1/2 -translate-y-1/2" style={{ left: ghostPos.x, top: ghostPos.y }}>
          <div className="px-2.5 py-1 rounded-lg bg-sky-500 border border-sky-300 text-white text-xs font-bold shadow-xl">
            {fmtScale(ghostScale)}
          </div>
        </div>
      )}

      {/* ── Modal de Ayuda Adaptado a Tablets ── */}
      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo usar la Balanza de Ecuaciones?"
        bgColor="#080c18"
        maxWidth="max-w-md"
        buttonColor="bg-blue-500 hover:bg-blue-400"
      >
        <ol className="space-y-2 text-white/80 text-xs leading-relaxed list-decimal list-inside pb-2">
          <li>
            <strong className="text-white">Escribe la ecuación</strong> en los campos del 1° y 2° miembro tocando cada casilla. Presiona <strong className="text-teal-400">Generar</strong>.
          </li>
          <li>
            <strong className="text-white">Arrastra fichas</strong> desde el panel izquierdo (+x, −x, +1, −1) a los platillos de la balanza para sumar o restar términos.
          </li>
          <li>
            Para conservar el equilibrio, arrastra <strong className="text-amber-300">la misma cantidad</strong> a <strong className="text-white">ambos platillos</strong>.
          </li>
          <li>
            También puedes <strong className="text-sky-300">multiplicar</strong> (×2, ×3…) o <strong className="text-emerald-300">dividir</strong> (÷2, ÷3…) arrastrando esas operaciones a los dos platillos.
          </li>
          <li>
            Presiona <strong className="text-blue-400">Operar</strong> en la barra inferior para aplicar los cambios y cancelar opuestos.
          </li>
          <li>
            Continúa hasta despejar <strong className="text-sky-300">x</strong> en un platillo y el valor numérico en el otro para resolver la ecuación.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
