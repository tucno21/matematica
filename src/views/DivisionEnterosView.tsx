import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

type Phase = "setup" | "build" | "flip" | "count" | "result";
type ChipColor = "blue" | "red";

interface Chip {
    id: string;
    color: ChipColor;
    x: number;
    y: number;
    exploding: boolean;
    exploded: boolean;
}

interface Exercise {
    dividend: number;
    divisor: number;
}

const CHIP_SIZE = 50;

const uid = () => Math.random().toString(36).slice(2, 9);

const EXERCISES: Exercise[] = [
    { dividend: 6, divisor: 2 },
    { dividend: 8, divisor: -4 },
    { dividend: -12, divisor: 3 },
    { dividend: -10, divisor: -5 },
    { dividend: 12, divisor: 3 },
    { dividend: 6, divisor: -2 },
    { dividend: -8, divisor: 4 },
    { dividend: -12, divisor: -3 },
    { dividend: 8, divisor: 4 },
    { dividend: 10, divisor: -5 },
    { dividend: -6, divisor: 2 },
    { dividend: -8, divisor: -4 },
    { dividend: 10, divisor: 5 },
    { dividend: 12, divisor: -3 },
    { dividend: -10, divisor: 5 },
    { dividend: -6, divisor: -2 },
];

function buildScatteredChips(
    totalChips: number,
    color: ChipColor,
    areaW: number,
    areaH: number,
): Chip[] {
    if (totalChips === 0) return [];
    const chips: Chip[] = [];
    for (let i = 0; i < totalChips; i++) {
        const x = Math.max(10, Math.min(areaW - CHIP_SIZE - 10,
            Math.random() * (areaW - CHIP_SIZE - 20) + 10));
        const y = Math.max(10, Math.min(areaH - CHIP_SIZE - 10,
            Math.random() * (areaH - CHIP_SIZE - 20) + 10));
        chips.push({ id: uid(), color, x, y, exploding: false, exploded: false });
    }
    return chips;
}

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

export default function DivisionEnterosView() {
    const navigate = useNavigate();

    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [exercisePage, setExercisePage] = useState(0);
    const [phase, setPhase] = useState<Phase>("setup");

    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [flipping, setFlipping] = useState(false);
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());
    const [counting, setCounting] = useState(false);
    const [resultValue, setResultValue] = useState(0);
    const [showHelp, setShowHelp] = useState(false);

    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const NUM_COLUMNS = 9;

    const dividend = selectedExercise?.dividend ?? 0;
    const divisor = selectedExercise?.divisor ?? 0;
    const quotient = divisor !== 0 ? dividend / divisor : 0;

    const absDividend = Math.abs(dividend);
    const absDivisor = Math.abs(divisor);
    const absQuotient = Math.abs(quotient);

    const activeChips = chips.filter(c => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter(c => c.color === "blue").length;
    const liveRed = activeChips.filter(c => c.color === "red").length;

    const signsSame = (dividend >= 0) === (divisor >= 0);
    const needFlip = divisor < 0;

    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";

    const formatNum = (n: number) => n >= 0 ? `+${n}` : `${n}`;
    const formatExpr = (n: number) => n >= 0 ? `(+${n})` : `(${n})`;

    const dividendTextColor = dividend >= 0 ? "text-blue-300" : "text-red-300";
    const divisorTextColor = divisor >= 0 ? "text-blue-300" : "text-red-300";

    const getColumnForChip = (chipX: number, areaW: number): number => {
        const columnWidth = areaW / NUM_COLUMNS;
        return Math.floor(chipX / columnWidth);
    };

    const countChipsInColumns = useCallback(() => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return new Array(NUM_COLUMNS).fill(0);
        const counts = new Array(NUM_COLUMNS).fill(0);
        activeChips.forEach(chip => {
            const col = getColumnForChip(chip.x, rect.width);
            if (col >= 0 && col < NUM_COLUMNS) counts[col]++;
        });
        return counts;
    }, [activeChips]);

    const validColumnCount = countChipsInColumns().filter(count => count === absDivisor).length;
    const groupsAreCorrect = validColumnCount === absQuotient;

    const handleSelectExercise = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setPhase("build");
    };

    useEffect(() => {
        if (phase === "build" && chips.length === 0 && selectedExercise) {
            setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
                const h = rect?.height ?? Math.max(400, window.innerHeight - 280);
                const color: ChipColor = dividend >= 0 ? "blue" : "red";
                const built = buildScatteredChips(absDividend, color, w, h);
                setChips(built);
            }, 100);
        }
    }, [phase, absDividend, dividend, selectedExercise, chips.length]);

    const handleFlipAll = useCallback(() => {
        setFlipping(true);
        const toFlip = chips.filter(c => !c.exploded && !c.exploding);
        setFlippingIds(new Set(toFlip.map(c => c.id)));
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
                    setChips(prev => prev.map(c =>
                        c.id === chip.id ? { ...c, color: c.color === "blue" ? "red" : "blue" } : c
                    ));
                    idx++;
                }
            }, 200);
        }, 100);
    }, [chips]);

    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "build") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const chip = chips.find(c => c.id === id);
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
        setChips(prev => prev.map(c => c.id === draggingId ? {
            ...c,
            x: Math.max(0, Math.min(rect.width - CHIP_SIZE, e.clientX - rect.left - dragOffset.current.x)),
            y: Math.max(0, Math.min(rect.height - CHIP_SIZE, e.clientY - rect.top - dragOffset.current.y)),
        } : c));
    }, [draggingId]);

    const handlePointerUp = useCallback(() => {
        if (!draggingId) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (rect) {
            const chip = chips.find(c => c.id === draggingId);
            if (chip) {
                const col = getColumnForChip(chip.x, rect.width);
                const columnWidth = rect.width / NUM_COLUMNS;
                const targetX = col * columnWidth + (columnWidth - CHIP_SIZE) / 2;
                setChips(prev => prev.map(c =>
                    c.id === draggingId ? { ...c, x: targetX } : c
                ));
            }
        }
        setDraggingId(null);
    }, [draggingId, chips]);

    const handleCount = useCallback(() => {
        setCounting(true);
        setTimeout(() => {
            setResultValue(quotient);
            setCounting(false);
            setPhase("result");
        }, 500);
    }, [quotient]);

    const handleReset = () => {
        setSelectedExercise(null);
        setExercisePage(0);
        setChips([]);
        setFlipping(false);
        setFlippingIds(new Set());
        setCounting(false);
        setResultValue(0);
        setPhase("setup");
    };

    const getResultText = () => {
        if (resultValue === 0) return `Se formaron ${absQuotient} grupos. ¡El resultado es cero!`;
        if (resultValue > 0) return `Se formaron ${absQuotient} grupos de ${absDivisor} fichas positivas. El resultado es +${resultValue}.`;
        return `Se formaron ${absQuotient} grupos de ${absDivisor} fichas negativas. El resultado es ${resultValue}.`;
    };

    const phaseList: Phase[] = ["setup", "build", "flip", "count", "result"];
    const pageExercises = EXERCISES.slice(exercisePage * 4, exercisePage * 4 + 4);
    const totalPages = Math.ceil(EXERCISES.length / 4);

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

            <header className="flex items-center gap-3 px-4 pt-4 pb-2 shrink-0">
                <button onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-xl px-3 py-2 text-sm font-bold border border-white/10 shrink-0 active:scale-95">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-[15px] sm:text-lg font-black tracking-tight leading-tight truncate">División de Enteros</h1>
                    <p className="text-[10px] text-white/30 font-semibold">Repartir fichas en grupos iguales</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {phaseList.map((p, i) => (
                        <div key={p} className={`h-1.5 rounded-full transition-all duration-300
                            ${phase === p ? "w-5 bg-teal-400" : phaseList.indexOf(phase) > i ? "w-2.5 bg-white/25" : "w-2.5 bg-white/8"}`} />
                    ))}
                    <button
                        onClick={() => setShowHelp(true)}
                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm font-bold flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95"
                    >
                        ?
                    </button>
                </div>
            </header>

            {phase === "setup" && (
                <main className="flex-1 flex flex-col px-4 pb-6 overflow-y-auto">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className="text-center anim-up pt-1">
                            <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-1">División de enteros</p>
                            <p className="text-white/45 text-sm whitespace-nowrap">
                                a ÷ b = repartir <span className="text-teal-400 font-bold">a</span> fichas en grupos de <span className="text-teal-400 font-bold">b</span>
                            </p>
                        </div>

                        <div className="text-center anim-up" style={{ animationDelay: "0.03s" }}>
                            <span className="text-white/25 text-[10px] font-black uppercase tracking-widest">
                                Página {exercisePage + 1} / {totalPages}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 anim-up" style={{ animationDelay: "0.06s" }}>
                            {pageExercises.map((ex, idx) => {
                                const exSameSign = (ex.dividend >= 0) === (ex.divisor >= 0);
                                const borderColor = exSameSign ? "border-blue-500/25" : "border-amber-500/25";
                                const bgColor = exSameSign ? "bg-blue-500/10" : "bg-amber-500/10";
                                const hoverBorder = exSameSign ? "hover:border-blue-400/50" : "hover:border-amber-400/50";
                                const dText = ex.dividend >= 0 ? "text-blue-300" : "text-red-300";
                                const dsText = ex.divisor >= 0 ? "text-blue-300" : "text-red-300";
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleSelectExercise(ex)}
                                        className={`${bgColor} ${borderColor} ${hoverBorder} border rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] flex flex-col gap-2`}
                                    >
                                        <div className="flex items-center justify-center gap-1.5 text-lg font-black">
                                            <span className={dText}>{formatExpr(ex.dividend)}</span>
                                            <span className="text-white/30">÷</span>
                                            <span className={dsText}>{formatExpr(ex.divisor)}</span>
                                        </div>
                                        <p className="text-white/30 text-[10px] text-center font-semibold">
                                            {Math.abs(ex.dividend)} fichas en grupos de {Math.abs(ex.divisor)}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex items-center justify-center gap-3 anim-up" style={{ animationDelay: "0.1s" }}>
                            <button
                                onClick={() => setExercisePage(p => Math.max(0, p - 1))}
                                disabled={exercisePage === 0}
                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg font-bold flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                ‹
                            </button>
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setExercisePage(i)}
                                        className={`h-2 rounded-full transition-all duration-200 ${i === exercisePage ? "bg-teal-400 w-5" : "bg-white/20 w-2"}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setExercisePage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={exercisePage === totalPages - 1}
                                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg font-bold flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {phase === "build" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            Paso 1: Arrastra las fichas a las columnas para crear {absQuotient} grupos de {absDivisor}
                        </p>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">total ←</span>
                        <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                        <span className="text-white/30">÷</span>
                        <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                        <span className="text-white/40 text-base font-bold">→ fichas por grupo</span>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 shrink-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-white/35 text-xs font-semibold">
                                Grupos formados: <span className={groupsAreCorrect ? "text-emerald-400 font-black" : "text-amber-400 font-black"}>{validColumnCount}</span> / {absQuotient}
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
                        Arrastra las fichas a las columnas. Cada columna debe tener {absDivisor} fichas.
                    </p>

                    <div className="shrink-0">
                        <button
                            onClick={() => setPhase(needFlip ? "flip" : "count")}
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

            {phase === "flip" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">⚠️</span>
                            <div>
                                <p className="text-amber-300 font-black text-xs">¡Atención! El divisor es negativo</p>
                                <p className="text-amber-200/55 text-[11px] leading-snug mt-0.5">
                                    Cuando el divisor es negativo, todas las fichas deben cambiar de color.
                                    Dividir por un negativo invierte el signo del resultado.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">total ←</span>
                        <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                        <span className="text-white/30">÷</span>
                        <span className={divisorTextColor}>{formatExpr(divisor)}</span>
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

            {phase === "count" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap">
                        <span className="text-white/40 text-base font-bold">total ←</span>
                        <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                        <span className="text-white/30">÷</span>
                        <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                        <span className="text-white/40 text-base font-bold">→ fichas por grupo</span>
                    </div>

                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            {needFlip ? "Paso 3: Contar los grupos de fichas" : "Paso 2: Contar los grupos de fichas"}
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
                        <span className="text-teal-400/80 text-xs font-bold">
                            {absQuotient} grupos × {absDivisor} fichas
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
                        {counting ? "Calculando resultado..." : "Listo para contar los grupos"}
                    </p>

                    <button
                        onClick={handleCount}
                        disabled={counting}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
                            ${counting
                                ? "bg-white/6 text-white/20 cursor-not-allowed"
                                : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98]"
                            }`}>
                        {counting ? "Contando..." : "✅ Contar grupos y ver resultado"}
                    </button>
                </main>
            )}

            {phase === "result" && selectedExercise && (
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
                                <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                                <span className="text-white/30">÷</span>
                                <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                            </div>
                            <span className="text-teal-400/50 text-xs">↓ Repartir {absDividend} fichas en grupos de {absDivisor}</span>
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className="text-white/60">{absQuotient} grupos de {absDivisor} fichas</span>
                            </div>
                            {needFlip && (
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <span className="text-amber-400">Divisor negativo → fichas cambiaron de color</span>
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                <span className={`text-sm font-bold ${signsSame ? "text-blue-300" : "text-red-300"}`}>
                                    Signos {signsSame ? "iguales" : "diferentes"} → Resultado {signsSame ? "POSITIVO" : "NEGATIVO"}
                                </span>
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

            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo dividir enteros con fichas?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 1 — Elige un ejercicio</p>
                        <ol className="space-y-2 list-decimal list-inside">
                            <li>Selecciona una de las <strong className="text-white">16 tarjetas</strong> de ejercicios.</li>
                            <li>Cada tarjeta muestra una división con signos diferentes: (+)÷(+), (+)÷(−), (−)÷(+), (−)÷(−).</li>
                            <li>Usa las flechas para ver más ejercicios.</li>
                        </ol>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 2 — Forma los grupos</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Se generan <strong className="text-white">|dividendo|</strong> fichas del color del dividendo.</li>
                            <li><strong className="text-white">Arrastra</strong> las fichas a las columnas para crear grupos.</li>
                            <li>Cada columna debe tener exactamente <strong className="text-teal-400">|divisor|</strong> fichas.</li>
                            <li>El número de columnas completas es el <strong className="text-white">cociente</strong>.</li>
                        </ul>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 3 — Voltear (si el divisor es negativo)</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Si el <strong className="text-white">divisor</strong> es negativo, todas las fichas cambian de color.</li>
                            <li>Dividir por un negativo <strong className="text-amber-400">invierte el signo</strong> del resultado.</li>
                            <li>Si el divisor es positivo, se salta este paso.</li>
                        </ul>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 4 — Contar y resultado</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Presiona <strong className="text-teal-400">✅ Contar grupos y ver resultado</strong>.</li>
                            <li>Se muestra el <strong className="text-white">cociente</strong>: signos iguales → positivo, signos diferentes → negativo.</li>
                        </ul>
                    </div>

                    <div className="rounded-xl p-3" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
                        <p className="text-xs font-bold mb-1 text-teal-400">💡 Idea clave</p>
                        <p className="text-xs text-white/60">Dividir <strong className="text-white">a ÷ b</strong> significa repartir las fichas de <strong className="text-white">a</strong> en grupos de <strong className="text-white">b</strong>. El número de grupos es el resultado. Si los signos son iguales, el resultado es positivo; si son diferentes, es negativo.</p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
