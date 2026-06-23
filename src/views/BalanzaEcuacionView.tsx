import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const VAR_SZ = 12, VAR_GAP = 1, VAR_COL_MAX = 5
  const UNIT_SZ = 7, UNIT_GAP = 1, UNIT_COL_MAX = 10
  const COL_GAP = 3, GROUP_GAP = 5

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
      const y = plateY - (row + 1) * (VAR_SZ + VAR_GAP) - 3
      const isCancel = cancelSet.has(tk.id)
      if (isCancel) cancelPositions.push({ x: x + VAR_SZ / 2, y: y + VAR_SZ / 2 })
      const st = isCancel ? cancelStyle : isFade ? fadeStyle : undefined
      els.push(<rect key={`r${globalIdx}`} x={x} y={y} width={VAR_SZ} height={VAR_SZ} fill={fill} stroke={stroke} strokeWidth={1.2} rx={1.5} opacity={isPend ? 0.7 : 1} strokeDasharray={isPend ? '2 1.5' : 'none'} style={st} />)
      els.push(<text key={`x${globalIdx}`} x={x + VAR_SZ / 2} y={y + VAR_SZ / 2 + 0.5} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={VAR_SZ * 0.6} fontWeight="bold" style={st ? { ...st, pointerEvents: 'none' } as React.CSSProperties : undefined}>x</text>)
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
      const y = plateY - (row + 1) * (UNIT_SZ + UNIT_GAP) - 3
      const isCancel = cancelSet.has(tk.id)
      if (isCancel) cancelPositions.push({ x: x + UNIT_SZ / 2, y: y + UNIT_SZ / 2 })
      const st = isCancel ? cancelStyle : isFade ? fadeStyle : undefined
      els.push(<rect key={`u${globalIdx}`} x={x} y={y} width={UNIT_SZ} height={UNIT_SZ} fill={fill} stroke={stroke} strokeWidth={1} rx={1} opacity={isPend ? 0.7 : 1} strokeDasharray={isPend ? '2 1.5' : 'none'} style={st} />)
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
  const W = 400, H = 250, px = 200, py = 35, half = 145, chain = 90, pY = py + chain
  const plateW = 100, plateH = 6
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ touchAction: 'none' }}>
      <ellipse cx={px} cy={H - 5} rx={30} ry={5} fill="#475569" />
      <rect x={px - 4} y={py} width={8} height={H - py - 5} fill="#64748b" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${px}px ${py}px`, transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)' }}>
        <line x1={px - half} y1={py} x2={px + half} y2={py} stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
        <line x1={px - half} y1={py} x2={px - half} y2={pY} stroke="#64748b" strokeWidth="2" />
        <line x1={px + half} y1={py} x2={px + half} y2={pY} stroke="#64748b" strokeWidth="2" />
        <rect x={px - half - plateW / 2} y={pY} width={plateW} height={plateH} rx={3} fill="#1e293b" stroke="#475569" strokeWidth={1.5} style={hlL ? { filter: 'brightness(1.3)' } : undefined} />
        <rect x={px + half - plateW / 2} y={pY} width={plateW} height={plateH} rx={3} fill="#1e293b" stroke="#475569" strokeWidth={1.5} style={hlR ? { filter: 'brightness(1.3)' } : undefined} />
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

function VirtualKeyboard({ active, value, onKey }: { active: Side | null; value: string; onKey: (k: string) => void }) {
  if (!active) return null
  return (
    <div className="bg-[#0f172a] rounded-xl border border-white/10 p-3 space-y-2">
      <div className="text-xs text-white/40 text-center">Editando: {active === 'left' ? 'Primer miembro' : 'Segundo miembro'}</div>
      <div className="text-center font-mono text-white text-sm py-1 px-3 bg-white/5 rounded-lg min-h-[28px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value || '—'}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {KB_ROWS.flat().map((k, i) => {
          const isOp = k === '+' || k === '−'
          const isDel = k === '⌫'
          const isClr = k === 'C'
          const isOk = k === '✓'
          let cls = 'py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-all '
          if (isOk) cls += 'col-span-3 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
          else if (isDel) cls += 'bg-red-500/20 text-red-300 border border-red-400/30'
          else if (isClr) cls += 'bg-red-500/15 text-red-300/70 border border-red-400/20'
          else if (isOp) cls += 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
          else cls += 'bg-white/10 text-white border border-white/10'
          return <button key={`${k}-${i}`} className={cls} onClick={() => onKey(k)}>{k}</button>
        })}
      </div>
    </div>
  )
}

function EqChips({ left, right }: { left: Term[]; right: Term[] }) {
  const chip = (t: Term, first: boolean) => {
    const isPos = t.val >= 0
    const bg = isPos ? 'bg-blue-500/30 border-blue-400/40 text-blue-200' : 'bg-red-500/30 border-red-400/40 text-red-200'
    return <span key={`${t.type}${t.val}${first}`} className={`px-2 py-0.5 rounded-md text-xs font-mono border ${bg}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtT(t, first)}</span>
  }
  return (
    <div className="flex items-center justify-center gap-1.5 flex-wrap">
      {left.map((t, i) => chip(t, i === 0))}
      <span className="text-white/50 font-bold mx-1">=</span>
      {right.map((t, i) => chip(t, i === 0))}
    </div>
  )
}

const SCALE_MULT = ['m2', 'm3', 'm5', 'm7']
const SCALE_DIV = ['d2', 'd3', 'd5', 'd7']

export default function BalanzaEcuacionView() {
  const nav = useNavigate()

  const [kbL, setKbL] = useState('3x-2')
  const [kbR, setKbR] = useState('7')
  const [activeKb, setActiveKb] = useState<Side | null>(null)

  const [stL, setStL] = useState<Term[]>([])
  const [stR, setStR] = useState<Term[]>([])
  const [pL, setPL] = useState<PTok[]>([])
  const [pR, setPR] = useState<PTok[]>([])
  const [pendScaleL, setPendScaleL] = useState<string | null>(null)
  const [pendScaleR, setPendScaleR] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)

  const [fb, setFb] = useState<{ kind: FBKind; msg: string }>({ kind: 'info', msg: 'Escribe una ecuación y presiona Generar balanza' })
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

  const computeCancellations = (oldTerms: Term[], newTerms: Term[], _prefix: string): string[] => {
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

      const leftCancels = computeCancellations(stL, newL, 'L')
      const rightCancels = computeCancellations(stR, newR, 'R')
      const allCancels = [...leftCancels, ...rightCancels]

      if (allCancels.length > 0) {
        setConsolidating(true)
        setCancelSet(new Set(allCancels))
        setTimeout(() => {
          setCancelSet(new Set())
          setStL(newL); setStR(newR); setPL([]); setPR([])
          setConsolidating(false)
          const cancelCount = allCancels.length
          setFb({ kind: 'success', msg: `Operación correcta. ${cancelCount} ficha${cancelCount > 1 ? 's' : ''} eliminada${cancelCount > 1 ? 's' : ''} por cancelación.` })
          checkVictory(newL, newR)
        }, 1100)
      } else {
        setStL(newL); setStR(newR); setPL([]); setPR([])
        setFb({ kind: 'success', msg: 'Operación correcta. Estado actualizado.' })
        checkVictory(newL, newR)
      }
      return
    }

    setFb({ kind: 'error', msg: 'No has arrastrado ninguna ficha u operación a los platillos' })
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
    info: 'bg-white/5 border-white/10 text-white/50',
    error: 'bg-red-500/15 border-red-400/30 text-red-300',
    success: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
    victory: 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200 font-bold text-base',
  }

  const kbVal = activeKb === 'left' ? kbL : kbR

  return (
    <div className="min-h-dvh bg-[#080c18] text-white select-none" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div className="max-w-3xl mx-auto px-3 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => nav(-1)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 active:scale-95 transition-all">← Volver</button>
          <h1 className="text-lg font-bold text-white/80">Balanza de Ecuaciones</h1>
          <button
            onClick={() => setShowHelp(true)}
            className="w-7 h-7 rounded-full bg-white/10 border border-white/20 text-white/70 text-sm font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
          >
            ?
          </button>
        </div>

        <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <div className="text-[10px] text-white/30 mb-1">Primer miembro</div>
              <button
                onClick={() => setActiveKb('left')}
                className={`w-full text-left px-3 py-2 rounded-lg font-mono text-sm border transition-all ${activeKb === 'left' ? 'border-teal-400 bg-teal-400/10 text-white' : 'border-white/10 bg-white/5 text-white/70'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >{kbL || '—'}</button>
            </div>
            <span className="text-xl font-bold text-white/30 pb-2">=</span>
            <div className="flex-1">
              <div className="text-[10px] text-white/30 mb-1">Segundo miembro</div>
              <button
                onClick={() => setActiveKb('right')}
                className={`w-full text-left px-3 py-2 rounded-lg font-mono text-sm border transition-all ${activeKb === 'right' ? 'border-teal-400 bg-teal-400/10 text-white' : 'border-white/10 bg-white/5 text-white/70'}`}
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >{kbR || '—'}</button>
            </div>
            <button onClick={handleGenerate} className="px-4 py-2 rounded-lg bg-teal-500 text-white text-sm font-bold hover:bg-teal-600 active:scale-95 transition-all whitespace-nowrap self-end">
              Generar balanza
            </button>
          </div>
          <VirtualKeyboard active={activeKb} value={kbVal} onKey={handleKb} />
        </div>

        {generated && (
          <div className="flex gap-2" style={{ touchAction: 'none' }}>
            <div className="flex flex-col gap-2 w-[72px] shrink-0">
              <div className="text-[9px] text-white/30 text-center">Fichas</div>
              {(['px', 'nx', 'p1', 'n1'] as TokType[]).map(tt => {
                const d = TOK[tt]
                const isVar = d.tt === 'var'
                const isPos = d.s > 0
                const fill = isPos ? BLU : RED
                const sz = isVar ? 28 : 20
                return (
                  <button key={tt} onPointerDown={e => startDrag(tt, e)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/15 transition-all">
                    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
                      <rect width={sz} height={sz} fill={fill} rx={3} />
                      {isVar && <text x={sz / 2} y={sz / 2 + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={sz * 0.55} fontWeight="bold">x</text>}
                    </svg>
                    <span className="text-[9px] text-white/40">{d.label}</span>
                  </button>
                )
              })}
              <div className="h-px bg-white/10" />
              <button onClick={clearPending} className="text-[9px] text-white/30 py-1 hover:text-white/60 transition-colors">Limpiar</button>
            </div>

            <div className="flex-1 min-w-0">
              <div className={`relative ${shakeB ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
                <ScaleSVG angle={angle} tL={stL} tR={stR} pL={pL} pR={pR} pSL={pendScaleL} pSR={pendScaleR} hlL={hlL} hlR={hlR} cancelSet={cancelSet} fadeCopiesL={fadeCopiesL} fadeCopiesR={fadeCopiesR} />
                <div ref={leftDropRef} className="absolute" style={{ left: '3%', top: '25%', width: '25%', height: '45%', borderRadius: 12 }} />
                <div ref={rightDropRef} className="absolute" style={{ right: '3%', top: '25%', width: '25%', height: '45%', borderRadius: 12 }} />
              </div>
              <div className="text-center text-xs mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {balanced ? <span className="text-emerald-400">equilibrada ✓</span>
                  : pendWL > pendWR ? <span className="text-amber-300">izquierdo pesa más</span>
                  : <span className="text-amber-300">derecho pesa más</span>}
              </div>
            </div>

            <div className="flex flex-col gap-1.5 w-[60px] shrink-0">
              <div className="text-[9px] text-white/30 text-center">Multiplicar</div>
              {SCALE_MULT.map(op => {
                const n = op.slice(1)
                const active = pendScaleL === op || pendScaleR === op
                return (
                  <button key={op} onPointerDown={e => startDragScale(op, e)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${active ? 'bg-sky-500/30 border-sky-400/50 text-sky-200 border' : 'bg-sky-500/10 text-sky-300/60 border border-sky-400/20 hover:bg-sky-500/20'}`}
                  >×{n}</button>
                )
              })}
              <div className="h-px bg-white/10 my-0.5" />
              <div className="text-[9px] text-white/30 text-center">Dividir</div>
              {SCALE_DIV.map(op => {
                const n = op.slice(1)
                const active = pendScaleL === op || pendScaleR === op
                return (
                  <button key={op} onPointerDown={e => startDragScale(op, e)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${active ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-200 border' : 'bg-emerald-500/10 text-emerald-300/60 border border-emerald-400/20 hover:bg-emerald-500/20'}`}
                  >÷{n}</button>
                )
              })}
            </div>
          </div>
        )}

        {generated && (
          <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
            <div className="text-[10px] text-white/30 text-center">
              {(pendScaleL || pendScaleR)
                ? <span className="flex items-center justify-center gap-3">
                    <span className={pendScaleL ? 'text-sky-300' : 'text-white/20'}>Izq: {pendScaleL ? fmtScale(pendScaleL) : '—'}</span>
                    <span className={pendScaleR ? 'text-sky-300' : 'text-white/20'}>Der: {pendScaleR ? fmtScale(pendScaleR) : '—'}</span>
                  </span>
                : (pL.length > 0 || pR.length > 0)
                  ? <span className="flex items-center justify-center gap-3">
                      <span className="text-emerald-300">Izq: {pendingSummary(pL)}</span>
                      <span className="text-amber-300">Der: {pendingSummary(pR)}</span>
                    </span>
                  : 'Arrastra fichas u operaciones a los platillos y presiona Operar'
              }
            </div>
            <EqChips left={stL} right={stR} />
            <div className={`rounded-lg border px-3 py-2 text-center text-xs ${fbCls[fb.kind]} ${shakeM ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
              {fb.msg}
            </div>
            <button onClick={handleOperate} className="w-full py-3 rounded-xl bg-blue-500 text-white font-bold text-sm hover:bg-blue-600 active:scale-[0.98] transition-all">
              Operar
            </button>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 flex-wrap py-2 text-[10px] text-white/30">
          <span className="flex items-center gap-1"><svg width="14" height="14"><rect width="14" height="14" fill={BLU} rx="2" /><text x="7" y="8" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">x</text></svg> variable +</span>
          <span className="flex items-center gap-1"><svg width="14" height="14"><rect width="14" height="14" fill={RED} rx="2" /><text x="7" y="8" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">x</text></svg> variable −</span>
          <span className="flex items-center gap-1"><svg width="10" height="10"><rect width="10" height="10" fill={BLU} rx="2" /></svg> unidad +</span>
          <span className="flex items-center gap-1"><svg width="10" height="10"><rect width="10" height="10" fill={RED} rx="2" /></svg> unidad −</span>
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300/60 border border-sky-400/20 text-[10px] font-bold">×2</span> multiplicar</span>
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300/60 border border-emerald-400/20 text-[10px] font-bold">÷3</span> dividir</span>
        </div>

        {ghostPos && ghostTok && (() => {
          const d = TOK[ghostTok]
          const isVar = d.tt === 'var'
          const sz = isVar ? 32 : 22
          const fill = d.s > 0 ? BLU : RED
          return (
            <div className="fixed pointer-events-none z-50 opacity-80" style={{ left: ghostPos.x - sz / 2, top: ghostPos.y - sz / 2 }}>
              <svg width={sz} height={sz}><rect width={sz} height={sz} fill={fill} rx={3} />{isVar && <text x={sz / 2} y={sz / 2 + 1} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={sz * 0.5} fontWeight="bold">x</text>}</svg>
            </div>
          )
        })()}

        {ghostPos && ghostScale && (
          <div className="fixed pointer-events-none z-50 opacity-80" style={{ left: ghostPos.x - 24, top: ghostPos.y - 14 }}>
            <div className="px-3 py-1.5 rounded-lg bg-sky-500/40 border border-sky-400/60 text-sky-100 text-sm font-bold">
              {fmtScale(ghostScale)}
            </div>
          </div>
        )}
      </div>

      <ModalHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="¿Cómo usar la Balanza de Ecuaciones?"
        bgColor="#080c18"
        buttonColor="bg-blue-500 hover:bg-blue-400"
      >
        <ol className="space-y-3 text-white/80 text-sm leading-relaxed list-decimal list-inside">
          <li>
            <strong className="text-white">Escribe la ecuación</strong> en los campos del primer y segundo miembro usando el teclado virtual. Presiona <strong className="text-teal-400">Generar balanza</strong>.
          </li>
          <li>
            <strong className="text-white">Arrastra fichas</strong> desde la columna izquierda (+x, −x, +1, −1) y suéltalas sobre los platillos de la balanza. Las fichas representan términos que sumas o restas a ambos lados.
          </li>
          <li>
            Para mantener el equilibrio, debes arrastrar <strong className="text-amber-300">la misma cantidad</strong> de variables y unidades a <strong className="text-white">ambos platillos</strong>.
          </li>
          <li>
            También puedes <strong className="text-sky-300">multiplicar</strong> (×2, ×3…) o <strong className="text-emerald-300">dividir</strong> (÷2, ÷3…) arrastrando esas operaciones a ambos platillos.
          </li>
          <li>
            Presiona <strong className="text-blue-400">Operar</strong> para aplicar los cambios. Las fichas que se cancelan (+x con −x, +1 con −1) desaparecen con una animación.
          </li>
          <li>
            Repite hasta aislar <strong className="text-sky-300">x</strong> en un lado y el número en el otro. Cuando la ecuación quede resuelta verás el mensaje de victoria.
          </li>
        </ol>
      </ModalHelp>
    </div>
  )
}
