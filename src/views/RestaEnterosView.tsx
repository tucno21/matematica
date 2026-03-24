import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "flip" | "play" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
    isSubtrahend: boolean;
    flipped: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 50;
const SNAP_DISTANCE = 68;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

/** Place chips in one half of the area (left=minuend, right=subtrahend) */
function buildSideChips(
    color: ChipColor,
    count: number,
    isSubtrahend: boolean,
    areaW: number,
    areaH: number,
): Chip[] {
    if (count === 0) return [];
    const halfW = areaW / 2;

    // Define the available area for this group
    const startX = isSubtrahend ? halfW : 0;
    const availableWidth = halfW;

    // Calculate grid layout
    const cols = Math.max(1, Math.ceil(Math.sqrt(count * 1.4)));
    const cellW = Math.max(CHIP_SIZE + 12, (availableWidth - 12) / cols);
    const cellH = Math.max(CHIP_SIZE + 12, cellW);

    return Array.from({ length: count }, (_, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const jx = (Math.random() - 0.5) * 12;
        const jy = (Math.random() - 0.5) * 12;

        // Calculate position relative to the start of this half
        const relativeX = 6 + col * cellW + cellW / 2 - CHIP_SIZE / 2 + jx;
        const absoluteX = startX + relativeX;

        // Constrain within this half's boundaries
        const minX = startX + 4;
        const maxX = startX + availableWidth - CHIP_SIZE - 4;

        return {
            id: uid(),
            color,
            x: Math.max(minX, Math.min(maxX, absoluteX)),
            y: Math.max(4, Math.min(areaH - CHIP_SIZE - 4,
                row * cellH + cellH / 2 - CHIP_SIZE / 2 + jy)),
            exploding: false,
            exploded: false,
            isSubtrahend,
            flipped: false,
        };
    });
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const TOKEN = {
    blue: {
        chipGrad: "from-blue-400 to-blue-600",
        chipShadow: "shadow-blue-500/40",
        chipBorder: "border-blue-300/30",
        sign: "+1",
        particle: "#60a5fa",
    },
    red: {
        chipGrad: "from-red-400 to-red-600",
        chipShadow: "shadow-red-500/40",
        chipBorder: "border-red-300/30",
        sign: "−1",
        particle: "#f87171",
    },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignToggle({ value, onChange }: { value: "positive" | "negative"; onChange: (v: "positive" | "negative") => void }) {
    return (
        <div className="flex rounded-xl overflow-hidden border border-white/10 shrink-0">
            <button onClick={() => onChange("positive")}
                className={`px-3 py-1.5 text-xs font-black transition-all duration-200
          ${value === "positive" ? "bg-blue-500/20 text-blue-300" : "bg-transparent text-white/35 hover:text-white/55"}`}>+</button>
            <button onClick={() => onChange("negative")}
                className={`px-3 py-1.5 text-xs font-black transition-all duration-200
          ${value === "negative" ? "bg-red-500/20 text-red-300" : "bg-transparent text-white/35 hover:text-white/55"}`}>−</button>
        </div>
    );
}

function NumberInputCard({ label, sublabel, sign, count, onSignChange, onCountChange }: {
    label: string; sublabel: string;
    sign: "positive" | "negative"; count: number;
    onSignChange: (v: "positive" | "negative") => void;
    onCountChange: (v: number) => void;
    accentColor: "blue" | "orange";
}) {
    // Colores basados en el signo (+ = azul, - = rojo)
    const signColor: ChipColor = sign === "positive" ? "blue" : "red";

    const colorMap = {
        blue: { text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/25", dot: "bg-blue-500", btn: "bg-blue-500 hover:bg-blue-400" },
        red: { text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/25", dot: "bg-red-500", btn: "bg-red-500 hover:bg-red-400" },
    };
    const c = colorMap[signColor];
    const t = TOKEN[signColor];

    return (
        <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3 transition-colors duration-300`}>
            {/* Row 1: label + color toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <div>
                        <span className="text-[11px] font-black tracking-widest text-white/40 uppercase">{label}</span>
                        <p className="text-[10px] text-white/25">{sublabel}</p>
                    </div>
                </div>
                <SignToggle value={sign} onChange={onSignChange} />
            </div>

            {/* Row 2: mini chip dots + counter controls */}
            <div className="flex items-center justify-between gap-3">
                {/* Mini chip preview */}
                <div className="flex flex-wrap gap-1.5 flex-1 min-h-7 content-center">
                    {count === 0 ? (
                        <span className="text-white/20 text-xs italic">Sin fichas aún</span>
                    ) : (
                        Array.from({ length: Math.min(count, 10) }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-5 h-5 rounded-full bg-linear-to-br ${t.chipGrad} flex items-center justify-center shadow-sm`}
                            >
                                <span className="text-white text-[8px] font-black leading-none">
                                    {sign === "positive" ? "+" : "−"}
                                </span>
                            </div>
                        ))
                    )}
                    {count > 10 && <span className={`text-xs font-bold ${c.text} opacity-60`}>+{count - 10}</span>}
                </div>

                {/* Counter */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        className={`w-9 h-9 rounded-xl ${c.btn} active:scale-90 text-white text-xl font-black shadow transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onCountChange(Math.max(0, count - 1))}
                        disabled={count === 0}
                    >−</button>
                    <span className={`w-8 text-center text-2xl font-black tabular-nums ${c.text}`}>
                        {count}
                    </span>
                    <button
                        className={`w-9 h-9 rounded-xl ${c.btn} active:scale-90 text-white text-xl font-black shadow transition-all duration-100 disabled:opacity-20 disabled:cursor-not-allowed`}
                        onClick={() => onCountChange(Math.min(9, count + 1))}
                        disabled={count === 9}
                    >+</button>
                </div>
            </div>

            {/* Row 3: summary label */}
            {count > 0 && (
                <p className={`text-xs font-semibold ${c.text} opacity-60 leading-none`}>
                    {count} ficha{count !== 1 ? "s" : ""} {sign === "positive" ? "positiva" : "negativa"}{count !== 1 ? "s" : ""} ({sign === "positive" ? "+1" : "−1"})
                </p>
            )}
        </div>
    );
}

function ExplosionParticles({ color }: { color: ChipColor }) {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="absolute w-2 h-2 rounded-full animate-particle"
                    style={{ background: TOKEN[color].particle, left: "50%", top: "50%", "--angle": `${i * 45}deg` } as React.CSSProperties} />
            ))}
        </div>
    );
}

function ChipEl({ chip, dragging, onPointerDown, onDoubleClick, isFlipping, canDrag }: {
    chip: Chip; dragging: boolean;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
    onDoubleClick: (id: string) => void;
    isFlipping: boolean;
    canDrag: boolean;
}) {
    if (chip.exploded) return null;
    const t = TOKEN[chip.color];
    const isFlippable = !canDrag && chip.isSubtrahend && !chip.flipped && !chip.exploded;

    return (
        <div
            className={`absolute select-none
        ${chip.exploding ? "animate-explode" : ""}
        ${isFlipping ? "animate-flip" : ""}
        ${dragging ? "scale-125 z-50" : ""}
        ${!dragging && canDrag ? "z-10 hover:scale-110 cursor-grab active:cursor-grabbing" : ""}
        ${!dragging && !canDrag && isFlippable ? "z-10 cursor-pointer hover:scale-110 pulse-hint" : ""}
        ${!dragging && !canDrag && !isFlippable ? "z-10" : ""}
      `}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: chip.x, top: chip.y, touchAction: "none" }}
            onPointerDown={(e) => onPointerDown(e, chip.id)}
            onDoubleClick={() => onDoubleClick(chip.id)}
        >
            <div className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-lg ${t.chipShadow} flex items-center justify-center relative`}>
                <span className="text-white font-black text-[14px] leading-none select-none">{t.sign}</span>
                {chip.isSubtrahend && !chip.flipped && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border border-amber-200 flex items-center justify-center">
                        <span className="text-[7px] font-black text-amber-900">S</span>
                    </div>
                )}
                {chip.isSubtrahend && chip.flipped && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border border-emerald-200 flex items-center justify-center">
                        <span className="text-[7px] font-black text-emerald-900">✓</span>
                    </div>
                )}
            </div>
            {chip.exploding && <ExplosionParticles color={chip.color} />}
        </div>
    );
}

// ─── Main View ────────────────────────────────────────────────────────────────
export default function RestaEnterosView() {
    const navigate = useNavigate();

    // Minuendo: positive by default. Sustraendo: NEGATIVE (red) by default.
    const [minuendSign, setMinuendSign] = useState<"positive" | "negative">("positive");
    const [minuendValue, setMinuendValue] = useState(0);
    const [subtrahendSign, setSubtrahendSign] = useState<"positive" | "negative">("negative");
    const [subtrahendValue, setSubtrahendValue] = useState(0);

    const [phase, setPhase] = useState<Phase>("setup");
    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const [autoCancelling, setAutoCancelling] = useState(false);
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [resultValue, setResultValue] = useState(0);

    // ── Computed ──────────────────────────────────────────────────────────────
    const minuendActual = minuendSign === "positive" ? minuendValue : -minuendValue;
    const subtrahendActual = subtrahendSign === "positive" ? subtrahendValue : -subtrahendValue;
    const oppositeOfSubtrahend = -subtrahendActual;

    const minuendColor: ChipColor = minuendActual >= 0 ? "blue" : "red";
    const subtrahendColor: ChipColor = subtrahendActual >= 0 ? "blue" : "red";

    const canGenerate = minuendValue > 0 || subtrahendValue > 0;

    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;
    const hasPairs = liveBlue > 0 && liveRed > 0;
    const remainingChips = chips.filter((c) => !c.exploded);

    const subtrahendChips = chips.filter((c) => c.isSubtrahend);
    const flippedCount = subtrahendChips.filter((c) => c.flipped).length;
    const allSubtrahendFlipped = subtrahendChips.length === 0 || flippedCount === subtrahendChips.length;

    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";

    const formatNum = (n: number) => n >= 0 ? `+${n}` : `${n}`;
    const formatExpr = (n: number) => n >= 0 ? `(+${n})` : `(${n})`;

    // ── Setup → Flip ──────────────────────────────────────────────────────────
    const handleGenerate = () => {
        // Cambiar a la fase flip primero para que el área se renderice
        setPhase("flip");
        // Las fichas se generarán en el useEffect cuando el área esté disponible
    };

    // ── Generar fichas después de que el área esté disponible en la fase flip ───────
    useEffect(() => {
        if (phase === "flip" && chips.length === 0 && (minuendValue > 0 || subtrahendValue > 0)) {
            // Esperar un poco para que el DOM se actualice
            setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
                const h = rect?.height ?? Math.max(300, window.innerHeight - 320);

                console.log('Área:', { w, h });
                console.log('Minuendo:', { color: minuendColor, count: Math.abs(minuendActual), isSubtrahend: false });
                console.log('Sustraendo:', { color: subtrahendColor, count: Math.abs(subtrahendActual), isSubtrahend: true });

                const minuendChips = buildSideChips(minuendColor, Math.abs(minuendActual), false, w, h);
                const subtrahendChips = buildSideChips(subtrahendColor, Math.abs(subtrahendActual), true, w, h);

                console.log('Fichas minuendo:', minuendChips.map(c => ({ id: c.id, x: c.x, isSubtrahend: c.isSubtrahend })));
                console.log('Fichas sustraendo:', subtrahendChips.map(c => ({ id: c.id, x: c.x, isSubtrahend: c.isSubtrahend })));

                const built = [...minuendChips, ...subtrahendChips];
                setChips(built);
            }, 100);
        }
    }, [phase, minuendValue, subtrahendValue, minuendColor, subtrahendColor, minuendActual, subtrahendActual, chips.length]);

    // ── Double-click: flip single subtrahend chip ─────────────────────────────
    const handleSingleFlip = useCallback((id: string) => {
        const chip = chips.find((c) => c.id === id);
        if (!chip || !chip.isSubtrahend || chip.flipped || chip.exploded) return;

        setFlippingIds((prev) => new Set(prev).add(id));
        setTimeout(() => {
            setChips((prev) => prev.map((c) =>
                c.id === id ? { ...c, color: c.color === "blue" ? "red" : "blue", flipped: true } : c
            ));
            setTimeout(() => {
                setFlippingIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
            }, 175);
        }, 175);
    }, [chips]);

    // ── Auto transition to play phase when all subtrahend chips are flipped ───────
    useEffect(() => {
        if (phase === "flip" && allSubtrahendFlipped && flippingIds.size === 0) {
            // Esperar un poco antes de transicionar para dar tiempo a la animación
            const timer = setTimeout(() => {
                setPhase("play");
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [phase, allSubtrahendFlipped, flippingIds.size]);

    // ── Button: flip ALL remaining subtrahend chips ───────────────────────────
    const handleFlipAll = async () => {
        const toFlip = chips.filter((c) => c.isSubtrahend && !c.flipped && !c.exploded);
        for (const chip of toFlip) {
            setFlippingIds((prev) => new Set(prev).add(chip.id));
            await new Promise((r) => setTimeout(r, 175));
            setChips((prev) => prev.map((c) =>
                c.id === chip.id ? { ...c, color: c.color === "blue" ? "red" : "blue", flipped: true } : c
            ));
            await new Promise((r) => setTimeout(r, 100));
            setFlippingIds((prev) => { const n = new Set(prev); n.delete(chip.id); return n; });
            await new Promise((r) => setTimeout(r, 60));
        }
    };

    // ── Game-end detection ─────────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== "play" || chips.length === 0) return;
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        if (active.length === 0 && chips.every((c) => !c.exploding)) {
            const t = setTimeout(() => { setResultValue(0); setPhase("result"); }, 600);
            return () => clearTimeout(t);
        }
    }, [chips, phase]);

    const handleShowResult = () => {
        const active = chips.filter((c) => !c.exploded && !c.exploding);
        const b = active.filter((c) => c.color === "blue").length;
        const r = active.filter((c) => c.color === "red").length;
        setResultValue(b - r);
        setPhase("result");
    };

    // ── Drag (play phase only) ────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "play") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const chip = chips.find((c) => c.id === id);
        if (!chip || chip.exploded || chip.exploding) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        dragOffset.current = { x: e.clientX - rect.left - chip.x, y: e.clientY - rect.top - chip.y };
        setDraggingId(id);
    }, [chips, phase]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!draggingId) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        setChips((prev) => prev.map((c) => c.id === draggingId ? {
            ...c,
            x: Math.max(0, Math.min(rect.width - CHIP_SIZE, e.clientX - rect.left - dragOffset.current.x)),
            y: Math.max(0, Math.min(rect.height - CHIP_SIZE, e.clientY - rect.top - dragOffset.current.y)),
        } : c));
    }, [draggingId]);

    const explodePair = useCallback((id1: string, id2: string) => {
        setChips((prev) => prev.map((c) => c.id === id1 || c.id === id2 ? { ...c, exploding: true } : c));
        setTimeout(() => {
            setChips((prev) => prev.map((c) => c.id === id1 || c.id === id2 ? { ...c, exploding: false, exploded: true } : c));
        }, 480);
    }, []);

    const handlePointerUp = useCallback(() => {
        if (!draggingId) return;
        const dragged = chips.find((c) => c.id === draggingId);
        if (dragged) {
            const opposite = chips
                .filter((c) => c.id !== draggingId && c.color !== dragged.color && !c.exploded && !c.exploding)
                .map((c) => {
                    const dx = c.x + CHIP_SIZE / 2 - (dragged.x + CHIP_SIZE / 2);
                    const dy = c.y + CHIP_SIZE / 2 - (dragged.y + CHIP_SIZE / 2);
                    return { chip: c, dist: Math.sqrt(dx * dx + dy * dy) };
                })
                .sort((a, b) => a.dist - b.dist)[0];
            if (opposite && opposite.dist < SNAP_DISTANCE) explodePair(draggingId, opposite.chip.id);
        }
        setDraggingId(null);
    }, [draggingId, chips, explodePair]);

    // ── Auto cancel ───────────────────────────────────────────────────────────
    const handleAutoCancel = async () => {
        setAutoCancelling(true);
        const cur = chips.filter((c) => !c.exploded && !c.exploding);
        const blues = cur.filter((c) => c.color === "blue");
        const reds = cur.filter((c) => c.color === "red");
        for (let i = 0; i < Math.min(blues.length, reds.length); i++) {
            explodePair(blues[i].id, reds[i].id);
            await new Promise((r) => setTimeout(r, 340));
        }
        setAutoCancelling(false);
    };

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setMinuendSign("positive"); setMinuendValue(0);
        setSubtrahendSign("negative"); setSubtrahendValue(0);
        setChips([]); setDraggingId(null);
        setAutoCancelling(false); setFlippingIds(new Set());
        setPhase("setup");
    };

    const getResultText = () => {
        if (resultValue === 0) return "¡Los pares se cancelaron perfectamente! El resultado es cero.";
        if (resultValue > 0) return `Sobran ${resultValue} ficha${resultValue !== 1 ? "s" : ""} positiva${resultValue !== 1 ? "s" : ""}. El resultado es +${resultValue}.`;
        return `Sobran ${Math.abs(resultValue)} ficha${Math.abs(resultValue) !== 1 ? "s" : ""} negativa${Math.abs(resultValue) !== 1 ? "s" : ""}. El resultado es ${resultValue}.`;
    };

    const phaseList: Phase[] = ["setup", "flip", "play", "result"];

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-dvh bg-[#080c18] text-white flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes explode {
          0%   { transform: scale(1);   opacity: 1; }
          45%  { transform: scale(1.7); opacity: 0.7; }
          100% { transform: scale(0);   opacity: 0; }
        }
        .animate-explode { animation: explode 0.48s ease-out forwards; }
        @keyframes particle {
          0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0);     opacity: 1; }
          100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-44px); opacity: 0; }
        }
        .animate-particle { animation: particle 0.48s ease-out forwards; }
        @keyframes floatChip {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-10px) rotate(4deg); }
        }
        .animate-float { animation: floatChip 2.6s ease-in-out infinite; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-up  { animation: fadeUp 0.42s ease-out both; }
        @keyframes popIn {
          0%   { transform: scale(0.72); opacity: 0; }
          70%  { transform: scale(1.06); }
          100% { transform: scale(1);    opacity: 1; }
        }
        .anim-pop { animation: popIn 0.38s ease-out both; }
        @keyframes glowTeal {
          0%,100% { box-shadow: 0 0 18px rgba(20,184,166,.35); }
          50%      { box-shadow: 0 0 36px rgba(20,184,166,.7); }
        }
        .glow-teal { animation: glowTeal 2.2s ease-in-out infinite; }
        @keyframes glowAmber {
          0%,100% { box-shadow: 0 0 18px rgba(245,158,11,.35); }
          50%      { box-shadow: 0 0 36px rgba(245,158,11,.7); }
        }
        .glow-amber { animation: glowAmber 2.2s ease-in-out infinite; }
        @keyframes flipChip {
          0%   { transform: scaleX(1) scale(1.1); }
          50%  { transform: scaleX(0) scale(1.3); }
          100% { transform: scaleX(1) scale(1); }
        }
        .animate-flip { animation: flipChip 0.35s ease-in-out; }
        @keyframes pulse-hint {
          0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
          50%      { box-shadow: 0 0 0 7px rgba(251,191,36,0.22); }
        }
        .pulse-hint { animation: pulse-hint 1.8s ease-in-out infinite; }
      `}</style>

            {/* ── Top bar ── */}
            <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
                <button onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 text-sm font-bold border border-white/10 shrink-0 active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-[15px] sm:text-lg font-black tracking-tight leading-tight truncate">Resta de Enteros</h1>
                    <p className="text-[10px] text-white/30 font-semibold">Suma el opuesto del sustraendo</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {phaseList.map((p, i) => (
                        <div key={p} className={`h-1.5 rounded-full transition-all duration-300
              ${phase === p ? "w-5 bg-teal-400" : phaseList.indexOf(phase) > i ? "w-2.5 bg-white/25" : "w-2.5 bg-white/8"}`} />
                    ))}
                </div>
            </header>

            {/* ══════════════════ SETUP ══════════════════ */}
            {phase === "setup" && (
                <main className="flex-1 flex flex-col gap-4 px-4 pb-6 overflow-y-auto">
                    <div className="text-center anim-up pt-1">
                        <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-1">Construye la resta</p>
                        <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
                            Ingresa los dos números. Verás cómo{" "}
                            <span className="text-teal-400 font-bold">restar = sumar el opuesto</span>
                        </p>
                    </div>

                    <div className="anim-up" style={{ animationDelay: "0.05s" }}>
                        <NumberInputCard
                            label="Minuendo" sublabel="El número del que se resta"
                            sign={minuendSign} count={minuendValue}
                            onSignChange={setMinuendSign} onCountChange={setMinuendValue}
                            accentColor="blue" />
                    </div>

                    <div className="flex items-center gap-3 px-2 anim-up" style={{ animationDelay: "0.1s" }}>
                        <div className="flex-1 h-px bg-white/8" />
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <span className="text-white/50 text-lg font-black">−</span>
                        </div>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <div className="anim-up" style={{ animationDelay: "0.14s" }}>
                        <NumberInputCard
                            label="Sustraendo" sublabel="El número que se resta"
                            sign={subtrahendSign} count={subtrahendValue}
                            onSignChange={setSubtrahendSign} onCountChange={setSubtrahendValue}
                            accentColor="orange" />
                    </div>

                    {/* Preview: NO result shown — student discovers it */}
                    {canGenerate && (
                        <div className="anim-up anim-pop bg-white/4 border border-white/8 rounded-2xl px-4 py-4" style={{ animationDelay: "0.18s" }}>
                            <p className="text-center text-white/25 text-[10px] uppercase tracking-widest mb-3 font-bold">La clave</p>

                            {/* Original expression */}
                            <div className="flex items-center justify-center gap-2 text-xl font-black mb-2">
                                <span className={minuendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(minuendActual)}</span>
                                <span className="text-white/30">−</span>
                                <span className={subtrahendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(subtrahendActual)}</span>
                            </div>

                        </div>
                    )}

                    <div className="anim-up" style={{ animationDelay: "0.24s" }}>
                        <button
                            disabled={!canGenerate}
                            onClick={handleGenerate}
                            className={`w-full py-4 rounded-2xl text-base font-black transition-all duration-200
                ${canGenerate
                                    ? "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-lg shadow-teal-500/25 hover:scale-[1.02] active:scale-[0.97] glow-teal"
                                    : "bg-white/6 text-white/20 cursor-not-allowed"
                                }`}>
                            Generar Fichas ✨
                        </button>
                    </div>
                </main>
            )}

            {/* ══════════════════ FLIP ══════════════════
           Left = minuend (static)   Right = subtrahend (double-click to flip)
           Button = flip all remaining (shortcut)
           Once all flipped → "Continuar" button appears
      ════════════════════════════════════════════ */}
            {phase === "flip" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    {/* Instruction banner */}
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">🔄</span>
                            <div>
                                <p className="text-amber-300 font-black text-xs">Paso 1: Voltea las fichas del sustraendo</p>
                                <p className="text-amber-200/55 text-[11px] leading-snug mt-0.5">
                                    <span className="text-amber-400 font-bold">Doble clic</span> en cada ficha{" "}
                                    <span className="text-amber-400 font-bold">S</span> para cambiarla al opuesto.
                                    Usa el botón para voltear todas de golpe.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transformation reminder — no result */}
                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className={minuendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(minuendActual)}</span>
                        <span className="text-white/30">−</span>
                        <span className={subtrahendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(subtrahendActual)}</span>
                    </div>

                    {/* Zone labels */}
                    <div className="flex gap-2 shrink-0">
                        <div className="flex-1 bg-blue-500/8 border border-blue-500/20 rounded-xl px-2 py-1.5 flex items-center justify-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500/60" />
                            <span className="text-blue-300/55 text-[10px] font-black uppercase tracking-widest">Minuendo</span>
                        </div>
                        <div className="flex-1 bg-amber-500/8 border border-amber-500/20 rounded-xl px-2 py-1.5 flex items-center justify-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-amber-400/60" />
                            <span className="text-amber-300/55 text-[10px] font-black uppercase tracking-widest">Sustraendo</span>
                        </div>
                    </div>

                    {/* Chip area with center divider */}
                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                    >
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }} />

                        {/* Center divider line */}
                        <div className="absolute top-2 bottom-2 left-1/2 w-px bg-white/10" style={{ transform: "translateX(-0.5px)" }}>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#080c18] border border-white/10 rounded-full w-7 h-7 flex items-center justify-center">
                                <span className="text-white/25 text-base font-black">−</span>
                            </div>
                        </div>

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                dragging={false}
                                onPointerDown={() => { }}
                                onDoubleClick={handleSingleFlip}
                                isFlipping={flippingIds.has(chip.id)}
                                canDrag={false}
                            />
                        ))}

                        {/* Double-click hint on right side */}
                        {!allSubtrahendFlipped && subtrahendChips.filter(c => !c.flipped).length > 0 && (
                            <div className="absolute bottom-3 right-3 pointer-events-none">
                                <div className="bg-amber-500/15 border border-amber-400/30 rounded-xl px-2.5 py-1.5">
                                    <p className="text-amber-300/70 text-[10px] font-bold">2× clic para voltear</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Button */}
                    {!allSubtrahendFlipped && (
                        <div className="shrink-0">
                            <button onClick={handleFlipAll}
                                className="w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98] glow-amber">
                                🔄 Voltear todas
                            </button>
                        </div>
                    )}
                </main>
            )}

            {/* ══════════════════ PLAY ══════════════════
           Chips freely mixed — drag to cancel pairs
      ════════════════════════════════════════════ */}
            {phase === "play" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            Paso 2: Cancela los pares · Arrastra +1 sobre −1
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/60 shrink-0" />
                            <span className="text-blue-300 font-black text-lg tabular-nums">{liveBlue}</span>
                            <span className="text-white/25 text-xs hidden sm:inline">positivas</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/60 shrink-0" />
                            <span className="text-red-300 font-black text-lg tabular-nums">{liveRed}</span>
                            <span className="text-white/25 text-xs hidden sm:inline">negativas</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <span className="text-white/35 text-xs">
                            <span className="font-bold text-white/55">{liveBlue + liveRed}</span> fichas
                        </span>
                        {hasPairs && (
                            <>
                                <div className="w-px h-4 bg-white/10" />
                                <span className="text-amber-400/80 text-xs font-bold">
                                    {Math.min(liveBlue, liveRed)} par{Math.min(liveBlue, liveRed) !== 1 ? "es" : ""}
                                </span>
                            </>
                        )}
                    </div>

                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }} />

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                dragging={draggingId === chip.id}
                                onPointerDown={handlePointerDown}
                                onDoubleClick={() => { }}
                                isFlipping={false}
                                canDrag={true}
                            />
                        ))}

                        {!hasPairs && liveBlue + liveRed > 0 && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/75 backdrop-blur-md rounded-2xl px-5 py-3 text-center anim-up border border-white/10">
                                    <p className="text-white font-bold text-sm">✅ No quedan más pares</p>
                                    <p className="text-white/40 text-xs mt-0.5">Pulsa para ver el resultado</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <p className="text-center text-white/20 text-[11px] shrink-0">
                        Arrastra +1 sobre −1 para cancelarlos
                    </p>

                    <button
                        disabled={hasPairs ? autoCancelling : false}
                        onClick={hasPairs ? handleAutoCancel : handleShowResult}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
              ${hasPairs && !autoCancelling
                                ? "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98]"
                                : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98]"
                            }`}>
                        {hasPairs
                            ? (autoCancelling ? "⚡ Cancelando pares…" : "⚡ Cancelar todos automáticamente")
                            : "✅ Ver resultado"
                        }
                    </button>
                </main>
            )}

            {/* ══════════════════ RESULT ══════════════════ */}
            {phase === "result" && (
                <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6 overflow-y-auto">
                    <div className="flex flex-wrap justify-center gap-2.5 min-h-14 items-center anim-up max-w-xs">
                        {remainingChips.length === 0
                            ? <div className="text-5xl animate-float">⚖️</div>
                            : remainingChips.slice(0, 16).map((c, i) => (
                                <div key={c.id}
                                    className={`w-11 h-11 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-sm shadow-lg animate-float
                    ${c.color === "blue" ? "from-blue-400 to-blue-600 shadow-blue-500/40" : "from-red-400 to-red-600 shadow-red-500/40"}`}
                                    style={{ animationDelay: `${i * 0.1}s` }}>
                                    {c.color === "blue" ? "+1" : "−1"}
                                </div>
                            ))
                        }
                        {remainingChips.length > 16 && <span className="text-white/30 text-xs font-bold">+{remainingChips.length - 16}</span>}
                    </div>

                    <div className="text-center anim-up anim-pop" style={{ animationDelay: "0.1s" }}>
                        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-1">Resultado</p>
                        <div className={`text-[72px] sm:text-8xl font-black tabular-nums leading-none ${resultBigColor} drop-shadow-2xl`}>
                            {resultValue > 0 ? `+${resultValue}` : resultValue}
                        </div>
                    </div>

                    <div className="anim-up bg-white/4 border border-white/8 rounded-2xl px-5 py-4 max-w-xs w-full text-center" style={{ animationDelay: "0.2s" }}>
                        <p className={`font-bold text-sm leading-relaxed ${resultTextColor}`}>{getResultText()}</p>
                        {resultValue === 0 && <p className="text-purple-300/50 text-xs mt-1.5">¡Perfecto equilibrio! 🎉</p>}
                    </div>

                    {/* Step recap */}
                    <div className="anim-up bg-teal-500/8 border border-teal-500/20 rounded-2xl px-4 py-3 max-w-xs w-full" style={{ animationDelay: "0.26s" }}>
                        <p className="text-teal-400/60 text-[10px] font-black uppercase tracking-widest mb-2 text-center">Lo que aprendimos</p>
                        <div className="flex flex-col gap-1.5 text-sm font-bold text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={minuendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(minuendActual)}</span>
                                <span className="text-white/30">−</span>
                                <span className={subtrahendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(subtrahendActual)}</span>
                            </div>
                            <span className="text-teal-400/50 text-xs">↓ sumar el opuesto del sustraendo</span>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={minuendActual >= 0 ? "text-blue-300" : "text-red-300"}>{formatExpr(minuendActual)}</span>
                                <span className="text-white/30">+</span>
                                <span className="text-teal-300">{formatExpr(oppositeOfSubtrahend)}</span>
                                <span className="text-white/30">=</span>
                                <span className={resultBigColor}>{formatNum(resultValue)}</span>
                            </div>
                        </div>
                    </div>

                    <button onClick={handleReset}
                        className="px-8 py-3.5 rounded-2xl text-base font-black bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-lg shadow-teal-500/25 hover:scale-105 active:scale-95 transition-all duration-200 glow-teal anim-up"
                        style={{ animationDelay: "0.34s" }}>
                        Nuevo Ejercicio 🔄
                    </button>
                </main>
            )}
        </div>
    );
}