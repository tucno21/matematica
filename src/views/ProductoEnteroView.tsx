import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase = "setup" | "build" | "flip" | "count" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
    groupIndex: number; // Para saber a qué grupo pertenece
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

/** Build chips scattered randomly (not grouped) */
function buildScatteredChips(
    numGroups: number,
    chipsPerGroup: number,
    color: ChipColor,
    areaW: number,
    areaH: number,
): Chip[] {
    if (numGroups === 0 || chipsPerGroup === 0) return [];

    const totalChips = numGroups * chipsPerGroup;
    const chips: Chip[] = [];

    for (let i = 0; i < totalChips; i++) {
        const x = Math.max(10, Math.min(areaW - CHIP_SIZE - 10,
            Math.random() * (areaW - CHIP_SIZE - 20) + 10));
        const y = Math.max(10, Math.min(areaH - CHIP_SIZE - 10,
            Math.random() * (areaH - CHIP_SIZE - 20) + 10));

        chips.push({
            id: uid(),
            color,
            x,
            y,
            exploding: false,
            exploded: false,
            groupIndex: -1, // Not assigned to any group yet
        });
    }

    return chips;
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

function ChipEl({ chip, isFlipping, canDrag, dragging, onPointerDown }: {
    chip: Chip;
    isFlipping: boolean;
    canDrag: boolean;
    dragging: boolean;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
}) {
    if (chip.exploded) return null;
    const t = TOKEN[chip.color];

    return (
        <div
            className={`absolute select-none
        ${chip.exploding ? "animate-explode" : ""}
        ${isFlipping ? "animate-flip" : ""}
        ${dragging ? "scale-125 z-50" : ""}
        ${!dragging && canDrag ? "z-10 hover:scale-110 cursor-grab active:cursor-grabbing" : "z-10"}
      `}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: chip.x, top: chip.y, touchAction: "none" }}
            onPointerDown={(e) => onPointerDown(e, chip.id)}
        >
            <div className={`w-full h-full rounded-full bg-linear-to-br ${t.chipGrad} border-2 ${t.chipBorder} shadow-lg ${t.chipShadow} flex items-center justify-center`}>
                <span className="text-white font-black text-[14px] leading-none select-none">{t.sign}</span>
            </div>
            {chip.exploding && <ExplosionParticles color={chip.color} />}
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

// ─── Main View ────────────────────────────────────────────────────────────────
export default function ProductoEnteroView() {
    const navigate = useNavigate();

    // a = número de grupos, b = cantidad en cada grupo
    const [aSign, setASign] = useState<"positive" | "negative">("positive");
    const [aValue, setAValue] = useState(0);
    const [bSign, setBSign] = useState<"positive" | "negative">("positive");
    const [bValue, setBValue] = useState(0);

    const [phase, setPhase] = useState<Phase>("setup");
    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [flipping, setFlipping] = useState(false);
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [counting, setCounting] = useState(false);
    const [resultValue, setResultValue] = useState(0);

    // Dragging state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const NUM_COLUMNS = 9;

    // ── Computed ──────────────────────────────────────────────────────────────
    const aActual = aSign === "positive" ? aValue : -aValue;
    const bActual = bSign === "positive" ? bValue : -bValue;

    const aColor: ChipColor = aActual >= 0 ? "blue" : "red";
    const bColor: ChipColor = bActual >= 0 ? "blue" : "red";

    const canGenerate = aValue > 0 || bValue > 0;

    const activeChips = chips.filter((c) => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter((c) => c.color === "blue").length;
    const liveRed = activeChips.filter((c) => c.color === "red").length;

    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";

    const formatNum = (n: number) => n >= 0 ? `+${n}` : `${n}`;
    const formatExpr = (n: number) => n >= 0 ? `(+${n})` : `(${n})`;

    const signsSame = (aActual >= 0) === (bActual >= 0);

    // ── Column and Group Detection ─────────────────────────────────────────────
    const getColumnForChip = (chipX: number, areaW: number): number => {
        const columnWidth = areaW / NUM_COLUMNS;
        return Math.floor(chipX / columnWidth);
    };

    const countChipsInColumns = useCallback(() => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return new Array(NUM_COLUMNS).fill(0);

        const counts = new Array(NUM_COLUMNS).fill(0);
        activeChips.forEach((chip) => {
            const col = getColumnForChip(chip.x, rect.width);
            if (col >= 0 && col < NUM_COLUMNS) {
                counts[col]++;
            }
        });
        return counts;
    }, [activeChips]);

    const validColumnCount = countChipsInColumns().filter(count => count === Math.abs(bActual)).length;
    const groupsAreCorrect = validColumnCount === Math.abs(aActual);

    // ── Setup → Build ──────────────────────────────────────────────────────────
    const handleGenerate = () => {
        setPhase("build");
    };

    // ── Generar grupos después de que el área esté disponible ─────────────────────
    useEffect(() => {
        if (phase === "build" && chips.length === 0 && (aValue > 0 || bValue > 0)) {
            setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
                const h = rect?.height ?? Math.max(400, window.innerHeight - 280);

                const numGroups = Math.abs(aValue);
                const chipsPerGroup = Math.abs(bValue);
                const color = bColor;

                const built = buildScatteredChips(numGroups, chipsPerGroup, color, w, h);
                setChips(built);
                // No cambiar de fase automáticamente - el usuario debe formar los grupos manualmente
            }, 100);
        }
    }, [phase, aValue, bValue, aColor, bColor, chips.length]);

    // ── Flip: Cambiar color de todas las fichas ─────────────────────────────
    const handleFlipAll = useCallback(() => {
        setFlipping(true);
        const toFlip = chips.filter((c) => !c.exploded && !c.exploding);

        // Primero, agregar todos los IDs a flippingIds
        setFlippingIds(new Set(toFlip.map((c) => c.id)));

        // Luego, cambiar los colores uno por uno
        setTimeout(() => {
            let idx = 0;
            const interval = setInterval(() => {
                if (idx >= toFlip.length) {
                    clearInterval(interval);
                    setFlipping(false);
                    setFlippingIds(new Set());
                    setPhase("count");
                } else {
                    const chip = toFlip[idx];
                    setChips((prev) => prev.map((c) =>
                        c.id === chip.id ? { ...c, color: c.color === "blue" ? "red" : "blue" } : c
                    ));
                    idx++;
                }
            }, 200);
        }, 100);
    }, [chips]);

    // ── Drag Handlers ───────────────────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "build") return;
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

    const handlePointerUp = useCallback(() => {
        if (!draggingId) return;

        // Snap chip to column center
        const rect = areaRef.current?.getBoundingClientRect();
        if (rect) {
            const chip = chips.find((c) => c.id === draggingId);
            if (chip) {
                const col = getColumnForChip(chip.x, rect.width);
                const columnWidth = rect.width / NUM_COLUMNS;
                const targetX = col * columnWidth + (columnWidth - CHIP_SIZE) / 2;

                setChips((prev) => prev.map((c) =>
                    c.id === draggingId ? { ...c, x: targetX } : c
                ));
            }
        }

        setDraggingId(null);
    }, [draggingId, chips]);

    // ── Count: Contar fichas ─────────────────────────────────────
    const handleCount = useCallback(() => {
        setCounting(true);

        // Calcular el resultado directamente
        setTimeout(() => {
            const active = chips.filter((c) => !c.exploded && !c.exploding);
            const b = active.filter((c) => c.color === "blue").length;
            const r = active.filter((c) => c.color === "red").length;
            const quantity = b + r;
            const sign = signsSame ? 1 : -1;
            setResultValue(quantity * sign);
            setCounting(false);

            // Transición automática a result
            setPhase("result");
        }, 500);
    }, [chips, signsSame]);

    // ── Reset ─────────────────────────────────────────────────────────────────
    const handleReset = () => {
        setASign("positive"); setAValue(0);
        setBSign("positive"); setBValue(0);
        setChips([]); setFlipping(false);
        setFlippingIds(new Set()); setCounting(false);
        setResultValue(0);
        setPhase("setup");
    };

    const getResultText = () => {
        const quantity = Math.abs(aValue) * Math.abs(bValue);
        if (resultValue === 0) return `¡Contaste ${quantity} fichas! Todas se cancelaron perfectamente. El resultado es cero.`;
        if (resultValue > 0) return `Contaste ${quantity} fichas. Son todas positivas. El resultado es +${resultValue}.`;
        return `Contaste ${quantity} fichas. Son todas negativas. El resultado es ${resultValue}.`;
    };

    const phaseList: Phase[] = ["setup", "build", "flip", "count", "result"];

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
                    <h1 className="text-[15px] sm:text-lg font-black tracking-tight leading-tight truncate">Producto de Enteros</h1>
                    <p className="text-[10px] text-white/30 font-semibold">a veces b = agrupación y conteo</p>
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
                        <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-1">Multiplicación de enteros</p>
                        <p className="text-white/45 text-sm leading-relaxed max-w-xs mx-auto">
                            a × b se lee como <span className="text-teal-400 font-bold">"a veces el b"</span>.<br />
                            Ejemplo: 3 × 5 = "3 veces el 5"
                        </p>
                    </div>

                    <div className="anim-up" style={{ animationDelay: "0.05s" }}>
                        <NumberInputCard
                            label="a (grupos)" sublabel="Número de grupos"
                            sign={aSign} count={aValue}
                            onSignChange={setASign} onCountChange={setAValue}
                        />
                    </div>

                    <div className="flex items-center gap-3 px-2 anim-up" style={{ animationDelay: "0.1s" }}>
                        <div className="flex-1 h-px bg-white/8" />
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <span className="text-white/50 text-lg font-black">×</span>
                        </div>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <div className="anim-up" style={{ animationDelay: "0.14s" }}>
                        <NumberInputCard
                            label="b (cantidad)" sublabel="Fichas en cada grupo"
                            sign={bSign} count={bValue}
                            onSignChange={setBSign} onCountChange={setBValue}
                        />
                    </div>

                    {canGenerate && (
                        <div className="anim-up anim-pop bg-white/4 border border-white/8 rounded-2xl px-4 py-4" style={{ animationDelay: "0.18s" }}>
                            <p className="text-center text-white/25 text-[10px] uppercase tracking-widest mb-3 font-bold">Interpretación</p>

                            <div className="flex items-center justify-center gap-2 text-xl font-black mb-2">
                                <span className={aColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(aActual)}</span>
                                <span className="text-white/30">×</span>
                                <span className={bColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(bActual)}</span>
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex-1 h-px bg-white/8" />
                                <span className="text-teal-400 text-xs font-black uppercase">=</span>
                                <span className="text-teal-300 text-sm font-black">"{Math.abs(aActual)} veces el {Math.abs(bActual)}"</span>
                                <div className="flex-1 h-px bg-white/8" />
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
                            Generar Grupos ✨
                        </button>
                    </div>
                </main>
            )}

            {/* ══════════════════ BUILD ══════════════════ */}
            {phase === "build" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            Paso 1: Arrastra las fichas a las columnas para crear {Math.abs(aActual)} grupos
                        </p>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">grupos ←</span>
                        <span className={aColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(aActual)}</span>
                        <span className="text-white/30">×</span>
                        <span className={bColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(bActual)}</span>
                        <span className="text-white/40 text-base font-bold">→ fichas por grupo</span>
                    </div>

                    {/* Progreso de grupos */}
                    <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 shrink-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-white/35 text-xs font-semibold">
                                Grupos formados: <span className={groupsAreCorrect ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>{validColumnCount}</span> / {Math.abs(aActual)}
                            </span>
                            <span className={`text-xs font-bold ${groupsAreCorrect ? "text-emerald-400" : "text-amber-400"}`}>
                                {groupsAreCorrect ? "✅ Correcto" : "❌ Incompleto"}
                            </span>
                        </div>
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

                        {/* Column grid lines - more visible */}
                        <div className="absolute inset-0 pointer-events-none">
                            {Array.from({ length: NUM_COLUMNS - 1 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute w-0.5 bg-white/15 shadow-[0_0_8px_rgba(255,255,255,0.1)]"
                                    style={{
                                        left: `calc(${((i + 1) / NUM_COLUMNS) * 100}% - 2px)`,
                                        height: '100%'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Column numbers */}
                        <div className="absolute top-3 left-0 right-0 pointer-events-none flex justify-around px-2">
                            {Array.from({ length: NUM_COLUMNS }).map((_, i) => (
                                <div
                                    key={i}
                                    className="text-white/50 text-[11px] font-black flex items-center justify-center"
                                    style={{ width: `calc(100% / ${NUM_COLUMNS})` }}
                                >
                                    {i + 1}
                                </div>
                            ))}
                        </div>

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                isFlipping={flippingIds.has(chip.id)}
                                canDrag={true}
                                dragging={draggingId === chip.id}
                                onPointerDown={handlePointerDown}
                            />
                        ))}
                    </div>

                    <p className="text-center text-white/20 text-[11px] shrink-0">
                        Arrastra las fichas a las columnas. Cada columna debe tener {Math.abs(bActual)} fichas.
                    </p>

                    <div className="shrink-0">
                        <button
                            onClick={() => setPhase(aActual < 0 ? "flip" : "count")}
                            disabled={!groupsAreCorrect}
                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200
                ${!groupsAreCorrect
                                    ? "bg-white/6 text-white/20 cursor-not-allowed"
                                    : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98] glow-teal"
                                }`}>
                            {!groupsAreCorrect ? "⏳ Forma los grupos primero" : "✅ ¡Listo! Siguiente paso →"}
                        </button>
                    </div>
                </main>
            )}

            {/* ══════════════════ FLIP ══════════════════ */}
            {phase === "flip" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">⚠️</span>
                            <div>
                                <p className="text-amber-300 font-black text-xs">¡Atención! El primer número es negativo</p>
                                <p className="text-amber-200/55 text-[11px] leading-snug mt-0.5">
                                    Antes de contar, todas las fichas deben cambiar de color.<br />
                                    Cuando el primer número es negativo, todas las fichas se invierten.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">grupos ←</span>
                        <span className={aColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(aActual)}</span>
                        <span className="text-white/30">×</span>
                        <span className={bColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(bActual)}</span>
                        <span className="text-white/40 text-base font-bold">→ fichas por grupo</span>
                    </div>

                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                    >
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }} />

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                isFlipping={flippingIds.has(chip.id)}
                                canDrag={false}
                                dragging={false}
                                onPointerDown={() => { }}
                            />
                        ))}
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={handleFlipAll}
                            disabled={flipping}
                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200
                ${flipping
                                    ? "bg-white/6 text-white/20 cursor-not-allowed"
                                    : "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98] glow-amber"
                                }`}>
                            {flipping ? "Cambiando colores..." : "🔄 Cambiar color de todas las fichas"}
                        </button>
                    </div>
                </main>
            )}

            {/* ══════════════════ COUNT ══════════════════ */}
            {phase === "count" && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">grupos ←</span>
                        <span className={aColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(aActual)}</span>
                        <span className="text-white/30">×</span>
                        <span className={bColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(bActual)}</span>
                        <span className="text-white/40 text-base font-bold">→ fichas por grupo</span>
                    </div>

                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            {aActual < 0 ? "Paso 3: Contar las fichas con nuevo color" : "Paso 2: Contar todas las fichas"}
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
                        <span className="text-teal-400/80 text-xs font-bold">
                            ({Math.abs(aActual)} × {Math.abs(bActual)})
                        </span>
                    </div>

                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                    >
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                        }} />

                        {chips.map((chip) => (
                            <ChipEl
                                key={chip.id}
                                chip={chip}
                                isFlipping={false}
                                canDrag={false}
                                dragging={false}
                                onPointerDown={() => { }}
                            />
                        ))}
                    </div>

                    <p className="text-center text-white/20 text-[11px] shrink-0">
                        {counting ? "Calculando resultado..." : "Listo para contar"}
                    </p>

                    <button
                        onClick={handleCount}
                        disabled={counting}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
              ${counting
                                ? "bg-white/6 text-white/20 cursor-not-allowed"
                                : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98]"
                            }`}>
                        {counting ? "Contando..." : "✅ Contar fichas y ver resultado"}
                    </button>
                </main>
            )}

            {/* ══════════════════ RESULT ══════════════════ */}
            {phase === "result" && (
                <main className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6 overflow-y-auto">
                    <div className="flex flex-wrap justify-center gap-2.5 min-h-14 items-center anim-up max-w-xs">
                        {resultValue === 0
                            ? <div className="text-5xl animate-float">⚖️</div>
                            : Array.from({ length: Math.min(Math.abs(resultValue), 16) }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-11 h-11 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-sm shadow-lg animate-float
                    ${resultValue > 0 ? "from-blue-400 to-blue-600 shadow-blue-500/40" : "from-red-400 to-red-600 shadow-red-500/40"}`}
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    {resultValue > 0 ? "+1" : "−1"}
                                </div>
                            ))}
                        {Math.abs(resultValue) > 16 && <span className="text-white/30 text-xs font-bold">+{Math.abs(resultValue) - 16}</span>}
                    </div>

                    <div className="text-center anim-up anim-pop" style={{ animationDelay: "0.1s" }}>
                        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-1">Resultado</p>
                        <div className={`text-[72px] sm:text-8xl font-black tabular-nums leading-none ${resultBigColor} drop-shadow-2xl`}>
                            {formatNum(resultValue)}
                        </div>
                    </div>

                    <div className="anim-up bg-white/4 border border-white/8 rounded-2xl px-5 py-4 max-w-xs w-full text-center" style={{ animationDelay: "0.2s" }}>
                        <p className={`font-bold text-sm leading-relaxed ${resultTextColor}`}>{getResultText()}</p>
                        {resultValue === 0 && <p className="text-purple-300/50 text-xs mt-1.5">¡Perfecto equilibrio! 🎉</p>}
                    </div>

                    <div className="anim-up bg-teal-500/8 border border-teal-500/20 rounded-2xl px-4 py-3 max-w-xs w-full" style={{ animationDelay: "0.26s" }}>
                        <p className="text-teal-400/60 text-[10px] font-black uppercase tracking-widest mb-2 text-center">Lo que aprendimos</p>
                        <div className="flex flex-col gap-1.5 text-sm font-black text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={aColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(aActual)}</span>
                                <span className="text-white/30">×</span>
                                <span className={bColor === "blue" ? "text-blue-300" : "text-red-300"}>{formatExpr(bActual)}</span>
                            </div>
                            <span className="text-teal-400/50 text-xs">↓ {Math.abs(aActual)} veces el {Math.abs(bActual)}</span>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={aActual < 0 ? "text-red-300" : "text-blue-300"}>{Math.abs(aActual)} grupos de {Math.abs(bActual)} fichas</span>
                                {aActual < 0 && <span className="text-amber-400 ml-2">→ cambiadas a {aActual < 0 ? "rojas" : "azules"}</span>}
                            </div>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-bold ${signsSame ? "text-blue-300" : "text-red-300"}`}>Contamos {Math.abs(aActual) * Math.abs(bActual)} fichas</span>
                            </div>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-bold ${signsSame ? "text-blue-300" : "text-red-300"}`}>Signos {signsSame ? "iguales" : "diferentes"} → Resultado {signsSame ? "POSITIVO" : "NEGATIVO"}</span>
                            </div>
                            <span className="text-white/30 text-base">=</span>
                            <span className={`text-lg font-black ${resultBigColor}`}>{formatNum(resultValue)}</span>
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
