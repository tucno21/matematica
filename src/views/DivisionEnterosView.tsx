import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
type Phase = "setup" | "predict" | "build" | "flip" | "count" | "result";
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
    dividend: number;  // total de fichas (con signo)
    divisor: number;   // número de GRUPOS (con signo)
    story: string;
    chipLabel: (color: ChipColor) => string;
    resultLabel: (value: number) => string;
}

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const CHIP_SIZE = 46;
const uid = () => Math.random().toString(36).slice(2, 9);

/*
 * LÓGICA CORRECTA DE DIVISIÓN:
 *   dividendo ÷ divisor = cociente
 *   |divisor|  = número de GRUPOS que se forman
 *   |cociente| = fichas por grupo
 *
 *   Ejemplo: (+6) ÷ (+2) = +3
 *     → 6 fichas azules, repartidas en 2 grupos → 3 fichas por grupo → resultado +3
 */

const EXERCISES: Exercise[] = [
    {
        dividend: 6, divisor: 2,
        story: "Ganas s/6 en un juego y los repartes entre 2 amigos por igual. ¿Cuánto recibe cada amigo?",
        chipLabel: (c) => c === "blue" ? "s/1 ganado" : "s/1 perdido",
        resultLabel: (v) => v > 0 ? `Cada amigo recibe s/${v}` : `Cada amigo pierde s/${Math.abs(v)}`,
    },
    {
        dividend: 8, divisor: -4,
        story: "Tienes s/8 de ganancia y debes pagar 4 deudas iguales. Si usas tu ganancia para pagarlas, ¿cuánto pagas por cada deuda?",
        chipLabel: (c) => c === "blue" ? "s/1 ganado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Sobra s/${v} por deuda` : `Pagas s/${Math.abs(v)} por deuda`,
    },
    {
        dividend: -12, divisor: 3,
        story: "3 amigos perdieron juntos s/12 en un torneo. Si la pérdida es igual para todos, ¿cuánto perdió cada uno?",
        chipLabel: (c) => c === "blue" ? "s/1 ganado" : "s/1 perdido",
        resultLabel: (v) => v > 0 ? `Cada uno ganó s/${v}` : `Cada uno perdió s/${Math.abs(v)}`,
    },
    {
        dividend: -10, divisor: -5,
        story: "Tienes una deuda de s/10. Si cada semana reduces s/5, ¿cuántas semanas tardarás en llegar a s/0?",
        chipLabel: (c) => c === "blue" ? "s/1 pagado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Tardarás ${v} semanas` : `Tardarás ${Math.abs(v)} semanas`,
    },
    {
        dividend: 12, divisor: 3,
        story: "Subes 12 pisos en 3 viajes iguales en ascensor. ¿Cuántos pisos subes por viaje?",
        chipLabel: (c) => c === "blue" ? "↑ 1 piso" : "↓ 1 piso",
        resultLabel: (v) => v > 0 ? `Subes ${v} pisos por viaje` : `Bajas ${Math.abs(v)} pisos por viaje`,
    },
    {
        dividend: 6, divisor: -2,
        story: "Tienes 6 puntos a favor pero cometiste 2 faltas graves. Si te descuentan puntos por igual, ¿cuánto pierdes por falta?",
        chipLabel: (c) => c === "blue" ? "+1 punto" : "−1 punto",
        resultLabel: (v) => v > 0 ? `Ganas ${v} puntos por falta` : `Pierdes ${Math.abs(v)} puntos por falta`,
    },
    {
        dividend: -8, divisor: 4,
        story: "La temperatura bajó 8°C en 4 horas. Si bajó la misma cantidad cada hora, ¿cuánto bajó por hora?",
        chipLabel: (c) => c === "blue" ? "+1°C" : "−1°C",
        resultLabel: (v) => v > 0 ? `Subió ${v}°C por hora` : `Bajó ${Math.abs(v)}°C por hora`,
    },
    {
        dividend: -12, divisor: -3,
        story: "Tienes una deuda de s/12. Si cada semana reduces s/3, ¿cuántas semanas tardarás en llegar a s/0?",
        chipLabel: (c) => c === "blue" ? "s/1 pagado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Tardarás ${v} semanas` : `Tardarás ${Math.abs(v)} semanas`,
    },
    {
        dividend: 8, divisor: 4,
        story: "Tienes 8 manzanas para repartir en 4 canastas iguales. ¿Cuántas manzanas van en cada canasta?",
        chipLabel: (c) => c === "blue" ? "🍎 +1" : "🍎 −1",
        resultLabel: (v) => v > 0 ? `${v} manzanas por canasta` : `Faltan ${Math.abs(v)} por canasta`,
    },
    {
        dividend: 10, divisor: -5,
        story: "Ganaste 10 puntos en un juego pero cometiste 5 faltas. Si te descuentan puntos por igual, ¿cuánto pierdes por falta?",
        chipLabel: (c) => c === "blue" ? "+1 punto" : "−1 punto",
        resultLabel: (v) => v > 0 ? `Ganas ${v} puntos por falta` : `Pierdes ${Math.abs(v)} puntos por falta`,
    },
    {
        dividend: -6, divisor: 2,
        story: "Perdiste s/6 en total repartidos en 2 días iguales. ¿Cuánto perdiste cada día?",
        chipLabel: (c) => c === "blue" ? "s/1 ganado" : "s/1 perdido",
        resultLabel: (v) => v > 0 ? `Ganaste s/${v} por día` : `Perdiste s/${Math.abs(v)} por día`,
    },
    {
        dividend: -8, divisor: -4,
        story: "Tienes una deuda de s/8. Si cada semana reduces s/4, ¿cuántas semanas tardarás en llegar a s/0?",
        chipLabel: (c) => c === "blue" ? "s/1 pagado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Tardarás ${v} semanas` : `Tardarás ${Math.abs(v)} semanas`,
    },
    {
        dividend: 10, divisor: 5,
        story: "Un equipo anota 10 goles en 5 partidos iguales. ¿Cuántos goles anota por partido?",
        chipLabel: (c) => c === "blue" ? "⚽ +1" : "⚽ −1",
        resultLabel: (v) => v > 0 ? `${v} goles por partido` : `${Math.abs(v)} goles en contra por partido`,
    },
    {
        dividend: 12, divisor: -3,
        story: "Ahorraste s/12 pero tienes 3 cuentas que pagar iguales. ¿Cuánto pagas por cada cuenta?",
        chipLabel: (c) => c === "blue" ? "s/1 ahorrado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Sobra s/${v} por cuenta` : `Pagas s/${Math.abs(v)} por cuenta`,
    },
    {
        dividend: -10, divisor: 5,
        story: "Un submarino baja 10 metros en 5 minutos iguales. ¿Cuánto baja por minuto?",
        chipLabel: (c) => c === "blue" ? "🐟 +1m" : "🐟 −1m",
        resultLabel: (v) => v > 0 ? `Sube ${v}m por minuto` : `Baja ${Math.abs(v)}m por minuto`,
    },
    {
        dividend: -6, divisor: -2,
        story: "Tienes una deuda de s/6. Si cada semana reduces s/2, ¿cuántas semanas tardarás en llegar a s/0?",
        chipLabel: (c) => c === "blue" ? "s/1 pagado" : "s/1 deuda",
        resultLabel: (v) => v > 0 ? `Tardarás ${v} semanas` : `Tardarás ${Math.abs(v)} semanas`,
    },
];

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
function buildChipsForGroup(
    totalChips: number,
    color: ChipColor,
    _numGroups: number,
    areaW: number,
    areaH: number,
): Chip[] {
    // Coloca las fichas en la zona de "sin grupo" (derecha de la pantalla o en la base)
    // Zona de origen: franja inferior de la pantalla
    if (totalChips === 0) return [];
    const chips: Chip[] = [];
    const cols = Math.ceil(Math.sqrt(totalChips));
    for (let i = 0; i < totalChips; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const startX = areaW * 0.55 + col * (CHIP_SIZE + 6);
        const startY = 10 + row * (CHIP_SIZE + 6);
        chips.push({
            id: uid(),
            color,
            x: Math.min(startX, areaW - CHIP_SIZE - 4),
            y: Math.min(startY, areaH - CHIP_SIZE - 4),
            exploding: false,
            exploded: false,
        });
    }
    return chips;
}

// ─── COMPONENTES MENORES ──────────────────────────────────────────────────────
const TOKEN = {
    blue: {
        grad: "from-blue-400 to-blue-600",
        shadow: "shadow-blue-500/40",
        border: "border-blue-300/30",
        particle: "#60a5fa",
    },
    red: {
        grad: "from-red-400 to-red-600",
        shadow: "shadow-red-500/40",
        border: "border-red-300/30",
        particle: "#f87171",
    },
};

function ChipEl({
    chip, isFlipping, canDrag, dragging, onPointerDown, label,
}: {
    chip: Chip;
    isFlipping: boolean;
    canDrag: boolean;
    dragging: boolean;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
    label?: string;
}) {
    if (chip.exploded) return null;
    const t = TOKEN[chip.color];
    return (
        <div
            className={`absolute select-none touch-none
                ${chip.exploding ? "animate-explode" : ""}
                ${isFlipping ? "animate-flip" : ""}
                ${dragging ? "scale-125 z-50" : "z-10"}
                ${canDrag && !dragging ? "hover:scale-110 cursor-grab active:cursor-grabbing" : ""}
            `}
            style={{ width: CHIP_SIZE, height: CHIP_SIZE, left: chip.x, top: chip.y }}
            onPointerDown={(e) => onPointerDown(e, chip.id)}
        >
            <div className={`w-full h-full rounded-full bg-linear-to-br ${t.grad} border-2 ${t.border} shadow-lg ${t.shadow} flex items-center justify-center`}>
                <span className="text-white font-black text-[13px] leading-none select-none">
                    {label ?? (chip.color === "blue" ? "+1" : "−1")}
                </span>
            </div>
            {chip.exploding && (
                <div className="absolute inset-0 pointer-events-none">
                    {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className="absolute w-2 h-2 rounded-full animate-particle"
                            style={{ background: t.particle, left: "50%", top: "50%", "--angle": `${i * 45}deg` } as React.CSSProperties} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniChip({ positive }: { positive: boolean }) {
    return (
        <span className={`inline-flex w-5 h-5 rounded-full items-center justify-center text-[9px] font-black text-white
            ${positive ? "bg-blue-500" : "bg-red-500"}`}>
            {positive ? "+" : "−"}
        </span>
    );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function DivisionEnterosView() {
    const navigate = useNavigate();

    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [exercisePage, setExercisePage] = useState(0);
    const [phase, setPhase] = useState<Phase>("setup");

    // Predicción
    const [userPrediction, setUserPrediction] = useState<"positive" | "negative" | null>(null);
    const [predictionResult, setPredictionResult] = useState<"correct" | "wrong" | null>(null);
    const [predictionAttempts, setPredictionAttempts] = useState(0);

    // Fichas y área
    const areaRef = useRef<HTMLDivElement>(null);
    const [chips, setChips] = useState<Chip[]>([]);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Columnas dinámicas: el usuario empieza con 1 y va añadiendo
    // Cada columna representa un GRUPO
    const [numColumns, setNumColumns] = useState(1);

    // Flip
    const [flipping, setFlipping] = useState(false);
    const [flippingIds, setFlippingIds] = useState<Set<string>>(new Set());

    // Resultado
    const [counting, setCounting] = useState(false);
    const [resultValue, setResultValue] = useState(0);
    const [showHelp, setShowHelp] = useState(false);
    const [discoveries, setDiscoveries] = useState<Array<{ dividend: number; divisor: number; result: number }>>([]);

    // ── Valores derivados ─────────────────────────────────────────────────────
    const dividend = selectedExercise?.dividend ?? 0;
    const divisor = selectedExercise?.divisor ?? 0;
    const quotient = divisor !== 0 ? dividend / divisor : 0;

    const absDividend = Math.abs(dividend);
    const absDivisor = Math.abs(divisor);   // número correcto de grupos
    const absQuotient = Math.abs(quotient); // fichas por grupo

    const activeChips = chips.filter(c => !c.exploded && !c.exploding);
    const liveBlue = activeChips.filter(c => c.color === "blue").length;
    const liveRed = activeChips.filter(c => c.color === "red").length;

    const signsSame = (dividend >= 0) === (divisor >= 0);
    const needFlip = divisor < 0;
    const correctSign: "positive" | "negative" = quotient >= 0 ? "positive" : "negative";

    const resultBigColor = resultValue > 0 ? "text-blue-400" : resultValue < 0 ? "text-red-400" : "text-purple-400";
    const resultTextColor = resultValue > 0 ? "text-blue-300" : resultValue < 0 ? "text-red-300" : "text-purple-300";
    const dividendTextColor = dividend >= 0 ? "text-blue-300" : "text-red-300";
    const divisorTextColor = divisor >= 0 ? "text-blue-300" : "text-red-300";

    const formatNum = (n: number) => n >= 0 ? `+${n}` : `${n}`;
    const formatExpr = (n: number) => n >= 0 ? `(+${n})` : `(${n})`;

    // ── LÓGICA DE GRUPOS ──────────────────────────────────────────────────────
    /*
     * REGLA CORREGIDA:
     *   - El divisor indica CUÁNTOS GRUPOS se forman (|divisor| columnas)
     *   - El cociente indica CUÁNTAS FICHAS hay en cada grupo (|quotient|)
     *   - Validación: cada columna activa debe tener exactamente |quotient| fichas
     *     Y el número de columnas con fichas debe ser exactamente |divisor|
     */
    const getColumnForChip = useCallback((chipX: number, areaW: number): number => {
        if (numColumns === 0) return 0;
        return Math.floor(chipX / (areaW / numColumns));
    }, [numColumns]);

    const chipsPerColumn = useCallback((): number[] => {
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect || numColumns === 0) return [];
        const counts = new Array(numColumns).fill(0);
        activeChips.forEach(chip => {
            const col = getColumnForChip(chip.x, rect.width);
            if (col >= 0 && col < numColumns) counts[col]++;
        });
        return counts;
    }, [activeChips, numColumns, getColumnForChip]);

    // Un grupo es válido si tiene exactamente absQuotient fichas
    const columnCounts = chipsPerColumn();
    const validGroups = columnCounts.filter(c => c === absQuotient).length;
    // La tarea está completa cuando:
    //   - el número de columnas = absDivisor (número correcto de grupos)
    //   - cada columna tiene absQuotient fichas
    const groupsAreCorrect = numColumns === absDivisor && validGroups === absDivisor && activeChips.length === absDividend;

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const handleSelectExercise = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setUserPrediction(null);
        setPredictionResult(null);
        setPredictionAttempts(0);
        setNumColumns(1);
        setPhase("predict");
    };

    const handlePredict = (prediction: "positive" | "negative") => {
        setUserPrediction(prediction);
        if (prediction === correctSign) {
            setPredictionResult("correct");
        } else {
            setPredictionResult("wrong");
            setPredictionAttempts(a => a + 1);
        }
    };

    const handleContinueFromPredict = () => {
        setPhase("build");
    };

    // Construir fichas cuando entramos a "build"
    useEffect(() => {
        if (phase === "build" && chips.length === 0 && selectedExercise) {
            setTimeout(() => {
                const rect = areaRef.current?.getBoundingClientRect();
                const w = rect?.width ?? Math.min(window.innerWidth - 24, 520);
                const h = rect?.height ?? 320;
                const color: ChipColor = dividend >= 0 ? "blue" : "red";
                setChips(buildChipsForGroup(absDividend, color, absDivisor, w, h));
            }, 120);
        }
    }, [phase, absDividend, absDivisor, dividend, selectedExercise, chips.length]);

    // Drag & drop
    const handlePointerDown = useCallback((e: React.PointerEvent, id: string) => {
        if (phase !== "build") return;
        e.currentTarget.setPointerCapture(e.pointerId);
        const chip = chips.find(c => c.id === id);
        if (!chip || chip.exploded || chip.exploding) return;
        const rect = areaRef.current?.getBoundingClientRect();
        if (!rect) return;
        dragOffset.current = {
            x: e.clientX - rect.left - chip.x,
            y: e.clientY - rect.top - chip.y,
        };
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
        if (rect && numColumns > 0) {
            const chip = chips.find(c => c.id === draggingId);
            if (chip) {
                const col = getColumnForChip(chip.x, rect.width);
                const columnWidth = rect.width / numColumns;
                const snapX = col * columnWidth + (columnWidth - CHIP_SIZE) / 2;
                setChips(prev => prev.map(c =>
                    c.id === draggingId ? { ...c, x: Math.max(0, Math.min(rect.width - CHIP_SIZE, snapX)) } : c
                ));
            }
        }
        setDraggingId(null);
    }, [draggingId, chips, numColumns, getColumnForChip]);

    // Cambiar número de columnas — re-distribuir fichas cuando cambia
    const handleChangeColumns = useCallback((delta: number) => {
        setNumColumns(prev => {
            const next = Math.max(1, Math.min(absDivisor + 2, prev + delta));
            return next;
        });
    }, [absDivisor]);

    // Flip
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
            }, 180);
        }, 80);
    }, [chips]);

    // Contar y resultado
    const handleCount = useCallback(() => {
        setCounting(true);
        setTimeout(() => {
            setResultValue(quotient);
            setDiscoveries(prev => [...prev, { dividend, divisor, result: quotient }]);
            setCounting(false);
            setPhase("result");
        }, 500);
    }, [quotient, dividend, divisor]);

    const handleReset = () => {
        setSelectedExercise(null);
        setChips([]);
        setFlipping(false);
        setFlippingIds(new Set());
        setCounting(false);
        setResultValue(0);
        setUserPrediction(null);
        setPredictionResult(null);
        setPredictionAttempts(0);
        setNumColumns(1);
        setPhase("setup");
    };

    // ── DATOS DE UI ───────────────────────────────────────────────────────────
    const phaseList: Phase[] = ["setup", "predict", "build", "flip", "count", "result"];
    const pageExercises = EXERCISES.slice(exercisePage * 4, exercisePage * 4 + 4);
    const totalPages = Math.ceil(EXERCISES.length / 4);
    const chipLabel = selectedExercise?.chipLabel;

    // Feedback de grupos en tiempo real
    const groupFeedback = (() => {
        if (numColumns < absDivisor) return `Divide la pantalla en ${absDivisor} grupos`;
        if (numColumns > absDivisor) return `Tienes ${numColumns - absDivisor} grupo${numColumns - absDivisor > 1 ? "s" : ""} de más (necesitas ${absDivisor})`;
        const wrong = columnCounts.filter(c => c !== absQuotient).length;
        if (wrong > 0) return `Cada grupo debe tener ${absQuotient} ficha${absQuotient > 1 ? "s" : ""}`;
        return "✅ ¡Perfecto!";
    })();

    // ── RENDER ────────────────────────────────────────────────────────────────
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
                    0%   { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(0); opacity: 1; }
                    100% { transform: translate(-50%,-50%) rotate(var(--angle)) translateY(-44px); opacity: 0; }
                }
                .animate-particle { animation: particle 0.48s ease-out forwards; }
                @keyframes floatChip {
                    0%,100% { transform: translateY(0) rotate(-4deg); }
                    50%     { transform: translateY(-10px) rotate(4deg); }
                }
                .animate-float { animation: floatChip 2.6s ease-in-out infinite; }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(18px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .anim-up { animation: fadeUp 0.42s ease-out both; }
                @keyframes popIn {
                    0%   { transform: scale(0.72); opacity: 0; }
                    70%  { transform: scale(1.06); }
                    100% { transform: scale(1);    opacity: 1; }
                }
                .anim-pop { animation: popIn 0.38s ease-out both; }
                @keyframes glowTeal {
                    0%,100% { box-shadow: 0 0 18px rgba(20,184,166,.35); }
                    50%     { box-shadow: 0 0 36px rgba(20,184,166,.7); }
                }
                .glow-teal { animation: glowTeal 2.2s ease-in-out infinite; }
                @keyframes glowAmber {
                    0%,100% { box-shadow: 0 0 18px rgba(245,158,11,.35); }
                    50%     { box-shadow: 0 0 36px rgba(245,158,11,.7); }
                }
                .glow-amber { animation: glowAmber 2.2s ease-in-out infinite; }
                @keyframes flipChip {
                    0%   { transform: scaleX(1) scale(1.1); }
                    50%  { transform: scaleX(0) scale(1.3); }
                    100% { transform: scaleX(1) scale(1); }
                }
                .animate-flip { animation: flipChip 0.35s ease-in-out; }
                @keyframes shake {
                    0%,100% { transform: translateX(0); }
                    20%     { transform: translateX(-6px); }
                    40%     { transform: translateX(6px); }
                    60%     { transform: translateX(-4px); }
                    80%     { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }
            `}</style>

            {/* ── HEADER ─────────────────────────────────────────────────────── */}
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
                    <p className="text-[10px] text-white/30 font-semibold">Predice → Agrupa → Descubre</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {phaseList.map((p, i) => (
                        <div key={p} className={`h-1.5 rounded-full transition-all duration-300
                            ${phase === p ? "w-5 bg-teal-400" : phaseList.indexOf(phase) > i ? "w-2.5 bg-white/25" : "w-2.5 bg-white/8"}`} />
                    ))}
                    <button onClick={() => setShowHelp(true)}
                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm font-bold flex items-center justify-center hover:bg-white/10 hover:text-white transition-all active:scale-95">
                        ?
                    </button>
                </div>
            </header>

            {/* ══════════════════════════════════════════════════════════════════
                FASE: SETUP
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "setup" && (
                <main className="flex-1 flex flex-col px-4 pb-6 overflow-y-auto gap-4">
                    <div className="text-center anim-up pt-1">
                        <p className="text-white/35 text-xs font-bold uppercase tracking-widest mb-1">División de enteros</p>
                        <p className="text-white/50 text-sm">Primero predices el signo, luego lo compruebas con fichas</p>
                    </div>

                    {/* Tabla de descubrimientos */}
                    {discoveries.length > 0 && (
                        <div className="anim-up bg-white/4 border border-white/8 rounded-2xl px-4 py-3">
                            <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2 text-center">
                                Lo que descubriste ({discoveries.length} ejercicio{discoveries.length > 1 ? "s" : ""})
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {discoveries.slice(-4).map((d, i) => (
                                    <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            <MiniChip positive={d.dividend >= 0} />
                                            <span className="text-white/30">÷</span>
                                            <MiniChip positive={d.divisor >= 0} />
                                        </div>
                                        <span className="text-white/20 text-[10px]">
                                            signos {(d.dividend >= 0) === (d.divisor >= 0) ? "iguales" : "distintos"}
                                        </span>
                                        <span className={d.result >= 0 ? "text-blue-400 font-black" : "text-red-400 font-black"}>
                                            {d.result >= 0 ? "POSITIVO" : "NEGATIVO"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {discoveries.length >= 3 && (
                                <div className="mt-2 pt-2 border-t border-white/8 text-center">
                                    <p className="text-teal-400 text-[11px] font-black">
                                        💡 Signos iguales → positivo · Signos distintos → negativo
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="text-center">
                        <span className="text-white/25 text-[10px] font-black uppercase tracking-widest">
                            Página {exercisePage + 1} / {totalPages}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 anim-up">
                        {pageExercises.map((ex, idx) => {
                            const same = (ex.dividend >= 0) === (ex.divisor >= 0);
                            const dText = ex.dividend >= 0 ? "text-blue-300" : "text-red-300";
                            const dsText = ex.divisor >= 0 ? "text-blue-300" : "text-red-300";
                            return (
                                <button key={idx} onClick={() => handleSelectExercise(ex)}
                                    className={`border rounded-2xl p-3.5 text-left transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] flex flex-col gap-2
                                        ${same
                                            ? "bg-blue-500/10 border-blue-500/25 hover:border-blue-400/50"
                                            : "bg-amber-500/10 border-amber-500/25 hover:border-amber-400/50"}`}>
                                    <div className="flex items-center justify-center gap-2 text-2xl font-black">
                                        <span className={dText}>{ex.dividend >= 0 ? `(+${ex.dividend})` : `(${ex.dividend})`}</span>
                                        <span className="text-white/30">÷</span>
                                        <span className={dsText}>{ex.divisor >= 0 ? `(+${ex.divisor})` : `(${ex.divisor})`}</span>
                                    </div>
                                    <p className="text-white/40 text-xs text-center font-semibold leading-snug line-clamp-2">
                                        {ex.story.split(".")[0]}
                                    </p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-center gap-3 anim-up">
                        <button onClick={() => setExercisePage(p => Math.max(0, p - 1))} disabled={exercisePage === 0}
                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg font-bold flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed">
                            ‹
                        </button>
                        <div className="flex items-center gap-1.5">
                            {Array.from({ length: totalPages }).map((_, i) => (
                                <button key={i} onClick={() => setExercisePage(i)}
                                    className={`h-2 rounded-full transition-all duration-200 ${i === exercisePage ? "bg-teal-400 w-5" : "bg-white/20 w-2"}`} />
                            ))}
                        </div>
                        <button onClick={() => setExercisePage(p => Math.min(totalPages - 1, p + 1))} disabled={exercisePage === totalPages - 1}
                            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 text-lg font-bold flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed">
                            ›
                        </button>
                    </div>
                </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FASE: PREDICT
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "predict" && selectedExercise && (
                <main className="flex-1 flex flex-col px-4 pb-6 gap-4 justify-center">
                    {/* Historia */}
                    <div className="anim-up bg-indigo-500/10 border border-indigo-500/25 rounded-2xl px-4 py-4">
                        <p className="text-indigo-300/60 text-[10px] font-black uppercase tracking-widest mb-2">📖 Situación real</p>
                        <p className="text-white/80 text-sm leading-relaxed font-semibold">{selectedExercise.story}</p>
                        <div className="mt-3 flex items-center justify-center gap-2 text-xl font-black">
                            <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                            <span className="text-white/30">÷</span>
                            <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                            <span className="text-white/30 text-base">=</span>
                            <span className="text-white/20 text-base font-bold">?</span>
                        </div>
                        <p className="text-white/25 text-[11px] text-center mt-2">
                            {absDividend} fichas repartidas en {absDivisor} grupos → ¿cuántas fichas por grupo?
                        </p>
                    </div>

                    <div className="anim-up text-center" style={{ animationDelay: "0.06s" }}>
                        <p className="text-white font-black text-base mb-1">¿El resultado será…?</p>
                        <p className="text-white/30 text-xs">Antes de usar fichas, intenta predecir el signo</p>
                    </div>

                    {predictionResult === null && (
                        <div className="flex gap-3 anim-up" style={{ animationDelay: "0.1s" }}>
                            <button onClick={() => handlePredict("positive")}
                                className="flex-1 py-4 rounded-2xl border-2 border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-400/60 transition-all active:scale-95 flex flex-col items-center gap-1.5">
                                <span className="text-3xl">😊</span>
                                <span className="text-blue-300 font-black text-sm">POSITIVO</span>
                                <span className="text-blue-400/50 text-[10px]">mayor que cero</span>
                            </button>
                            <button onClick={() => handlePredict("negative")}
                                className="flex-1 py-4 rounded-2xl border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/20 hover:border-red-400/60 transition-all active:scale-95 flex flex-col items-center gap-1.5">
                                <span className="text-3xl">😰</span>
                                <span className="text-red-300 font-black text-sm">NEGATIVO</span>
                                <span className="text-red-400/50 text-[10px]">menor que cero</span>
                            </button>
                        </div>
                    )}

                    {predictionResult === "correct" && (
                        <div className="anim-pop anim-up flex flex-col gap-3">
                            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-4 py-4 text-center">
                                <p className="text-2xl mb-1">🎉</p>
                                <p className="text-emerald-400 font-black text-base">¡Predicción correcta!</p>
                                <p className="text-emerald-300/60 text-xs mt-1">
                                    {signsSame ? "Signos iguales → resultado positivo." : "Signos distintos → resultado negativo."}
                                </p>
                            </div>
                            <button onClick={handleContinueFromPredict}
                                className="w-full py-3 rounded-2xl font-bold text-sm bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 glow-teal hover:scale-[1.01] active:scale-[0.98]">
                                ✅ ¡Comprobarlo con fichas! →
                            </button>
                        </div>
                    )}

                    {predictionResult === "wrong" && (
                        <div className="anim-up flex flex-col gap-3">
                            <div className="bg-red-500/10 border border-red-500/25 rounded-2xl px-4 py-4 text-center animate-shake">
                                <p className="text-2xl mb-1">🤔</p>
                                <p className="text-red-400 font-black text-sm">No exactamente...</p>
                                {predictionAttempts === 1 && (
                                    <p className="text-white/50 text-xs mt-1.5 leading-snug">
                                        Pista: fíjate en los signos del dividendo y el divisor.
                                        {signsSame ? " ¿Son iguales?" : " ¿Son distintos?"}
                                    </p>
                                )}
                                {predictionAttempts >= 2 && (
                                    <p className="text-amber-300/70 text-xs mt-1.5">
                                        💡 Signos <strong>iguales</strong> → positivo · Signos <strong>distintos</strong> → negativo
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setUserPrediction(null); setPredictionResult(null); }}
                                    className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 font-bold text-sm text-white/60 active:scale-95 transition-all">
                                    Intentar de nuevo
                                </button>
                                <button onClick={handleContinueFromPredict}
                                    className="flex-1 py-3 rounded-2xl font-bold text-sm bg-white/8 hover:bg-white/12 border border-white/10 text-white/50 active:scale-95 transition-all">
                                    Ver con fichas →
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FASE: BUILD
                Lógica: divisor = número de GRUPOS, cociente = fichas por grupo
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "build" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2 min-h-0 overflow-hidden">
                    {/* Predicción recordatorio */}
                    {userPrediction && (
                        <div className={`shrink-0 anim-up rounded-xl px-3 py-1.5 flex items-center justify-between
                            ${predictionResult === "correct" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                            <p className="text-[11px] font-bold text-white/50">
                                Tu predicción: <span className={userPrediction === "positive" ? "text-blue-300" : "text-red-300"}>
                                    {userPrediction === "positive" ? "POSITIVO" : "NEGATIVO"}
                                </span>
                            </p>
                            <span className="text-xs">{predictionResult === "correct" ? "✅" : "❓"}</span>
                        </div>
                    )}

                    {/* Instrucción */}
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            Repartir {absDividend} fichas en <span className="text-teal-200">{absDivisor} grupos</span> iguales
                        </p>
                        <p className="text-teal-400/40 text-[10px] text-center mt-0.5">
                            Cada ficha = {chipLabel ? chipLabel(dividend >= 0 ? "blue" : "red") : "una unidad"} · Usa los botones para ajustar el número de grupos
                        </p>
                    </div>

                    {/* Expresión + Control de grupos */}
                    <div className="shrink-0 flex flex-col sm:flex-row gap-2">
                        <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0 flex-wrap sm:flex-1">
                            <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                            <span className="text-white/30">÷</span>
                            <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                            <span className="text-white/30 text-sm">=</span>
                            <span className="text-white/20 text-sm">?</span>
                        </div>

                        <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2.5 flex flex-col items-center gap-2 sm:flex-none">
                            <p className={`text-xs font-bold text-center leading-snug
                                ${groupsAreCorrect ? "text-emerald-400" : numColumns === absDivisor ? "text-amber-400" : "text-white/40"}`}>
                                {groupFeedback}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleChangeColumns(-1)}
                                    disabled={numColumns <= 1}
                                    className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 text-white font-black text-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                                    −
                                </button>
                                <div className="text-center min-w-[56px]">
                                    <p className="text-white font-black text-lg leading-none">{numColumns}</p>
                                    <p className="text-white/30 text-[9px]">grupo{numColumns > 1 ? "s" : ""}</p>
                                </div>
                                <button
                                    onClick={() => handleChangeColumns(1)}
                                    disabled={numColumns >= absDivisor + 2}
                                    className="w-9 h-9 rounded-xl bg-white/8 border border-white/12 text-white font-black text-xl flex items-center justify-center hover:bg-white/15 active:scale-90 transition-all disabled:opacity-20 disabled:cursor-not-allowed">
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Área de fichas */}
                    <div
                        ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        {/* Fondo de puntos */}
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "26px 26px",
                        }} />

                        {/* Líneas divisorias de grupos */}
                        {numColumns > 1 && Array.from({ length: numColumns - 1 }).map((_, i) => (
                            <div key={i}
                                className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
                                style={{ left: `calc(${((i + 1) / numColumns) * 100}% - 0.5px)` }} />
                        ))}

                        {/* Etiquetas de grupos */}
                        <div className="absolute top-2 left-0 right-0 pointer-events-none flex">
                            {Array.from({ length: numColumns }).map((_, i) => {
                                const count = columnCounts[i] ?? 0;
                                const isOk = count === absQuotient;
                                return (
                                    <div key={i} className="flex flex-col items-center"
                                        style={{ width: `calc(100% / ${numColumns})` }}>
                                        <span className={`text-[10px] font-black ${isOk ? "text-emerald-400" : "text-white/30"}`}>
                                            Grupo {i + 1}
                                        </span>
                                        <span className={`text-[9px] font-bold ${isOk ? "text-emerald-400/60" : "text-white/15"}`}>
                                            {count}/{absQuotient}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fichas */}
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

                    <p className="text-center text-white/20 text-[10px] shrink-0">
                        Arrastra las fichas · cada grupo debe tener exactamente {absQuotient} ficha{absQuotient > 1 ? "s" : ""}
                    </p>

                    <button
                        onClick={() => setPhase(needFlip ? "flip" : "count")}
                        disabled={!groupsAreCorrect}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
                            ${!groupsAreCorrect
                                ? "bg-white/6 text-white/20 cursor-not-allowed"
                                : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98] glow-teal"
                            }`}>
                        {!groupsAreCorrect ? "⏳ Completa los grupos primero" : "✅ ¡Listo! Siguiente paso →"}
                    </button>
                </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FASE: FLIP (divisor negativo)
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "flip" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    {userPrediction && (
                        <div className={`shrink-0 anim-up rounded-xl px-3 py-1.5 flex items-center justify-between
                            ${predictionResult === "correct" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                            <p className="text-[11px] font-bold text-white/50">
                                Tu predicción: <span className={userPrediction === "positive" ? "text-blue-300" : "text-red-300"}>
                                    {userPrediction === "positive" ? "POSITIVO" : "NEGATIVO"}
                                </span>
                            </p>
                            <span className="text-xs">{predictionResult === "correct" ? "✅" : "❓"}</span>
                        </div>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl px-3 py-3 shrink-0 anim-up">
                        <div className="flex items-center gap-2.5">
                            <span className="text-xl shrink-0">⚠️</span>
                            <div>
                                <p className="text-amber-300 font-black text-xs">¡El divisor es negativo!</p>
                                <p className="text-amber-200/55 text-[11px] leading-snug mt-0.5">
                                    Dividir entre un número negativo invierte el signo:
                                    todas las fichas cambian de color.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0">
                        <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                        <span className="text-white/30">÷</span>
                        <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                    </div>

                    <div ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}>
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "26px 26px",
                        }} />
                        {numColumns > 1 && Array.from({ length: numColumns - 1 }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
                                style={{ left: `calc(${((i + 1) / numColumns) * 100}% - 0.5px)` }} />
                        ))}
                        {chips.map((chip) => (
                            <ChipEl key={chip.id} chip={chip} isFlipping={flippingIds.has(chip.id)}
                                canDrag={false} dragging={false} onPointerDown={() => { }} />
                        ))}
                    </div>

                    <button onClick={handleFlipAll} disabled={flipping}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
                            ${flipping
                                ? "bg-white/6 text-white/20 cursor-not-allowed"
                                : "bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-orange-500/20 hover:scale-[1.01] active:scale-[0.98] glow-amber"
                            }`}>
                        {flipping ? "Cambiando colores..." : "🔄 Invertir fichas — divisor negativo"}
                    </button>
                </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FASE: COUNT
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "count" && selectedExercise && (
                <main className="flex-1 flex flex-col px-3 pb-3 gap-2.5 min-h-0 overflow-hidden">
                    <div className="bg-white/4 border border-white/8 rounded-2xl px-3 py-2 flex items-center justify-center gap-2 text-xl font-black shrink-0">
                        <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                        <span className="text-white/30">÷</span>
                        <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                    </div>

                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl px-3 py-2.5 shrink-0 anim-up">
                        <p className="text-teal-300 font-black text-xs text-center">
                            {needFlip ? "Paso 3: " : "Paso 2: "}Conta los grupos formados
                        </p>
                        <p className="text-teal-400/40 text-[10px] text-center mt-0.5">
                            {absDivisor} grupos × {absQuotient} ficha{absQuotient > 1 ? "s" : ""} cada uno = {absDividend} fichas totales
                        </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white/4 border border-white/8 rounded-2xl px-4 py-2.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/60 shrink-0" />
                            <span className="text-blue-300 font-black text-lg tabular-nums">{liveBlue}</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/60 shrink-0" />
                            <span className="text-red-300 font-black text-lg tabular-nums">{liveRed}</span>
                        </div>
                        <div className="w-px h-4 bg-white/10" />
                        <span className="text-teal-400/80 text-xs font-bold">
                            {absDivisor} grupos de {absQuotient}
                        </span>
                    </div>

                    <div ref={areaRef}
                        className="relative flex-1 rounded-2xl border border-white/[0.07] bg-white/2 overflow-hidden"
                        style={{ touchAction: "none", minHeight: 0 }}>
                        <div className="absolute inset-0 opacity-[0.025]" style={{
                            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                            backgroundSize: "26px 26px",
                        }} />
                        {numColumns > 1 && Array.from({ length: numColumns - 1 }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 w-px bg-white/20 pointer-events-none"
                                style={{ left: `calc(${((i + 1) / numColumns) * 100}% - 0.5px)` }} />
                        ))}
                        <div className="absolute top-2 left-0 right-0 pointer-events-none flex">
                            {Array.from({ length: numColumns }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center"
                                    style={{ width: `calc(100% / ${numColumns})` }}>
                                    <span className="text-emerald-400/60 text-[10px] font-black">Grupo {i + 1}</span>
                                </div>
                            ))}
                        </div>
                        {chips.map((chip) => (
                            <ChipEl key={chip.id} chip={chip} isFlipping={false}
                                canDrag={false} dragging={false} onPointerDown={() => { }} />
                        ))}
                    </div>

                    <button onClick={handleCount} disabled={counting}
                        className={`w-full py-3 rounded-2xl font-bold text-sm transition-all duration-200 shrink-0
                            ${counting
                                ? "bg-white/6 text-white/20 cursor-not-allowed"
                                : "bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-md shadow-teal-500/20 hover:scale-[1.01] active:scale-[0.98]"
                            }`}>
                        {counting ? "Contando..." : `✅ Son ${absDivisor} grupos de ${absQuotient} → ver resultado`}
                    </button>
                </main>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                FASE: RESULT
            ══════════════════════════════════════════════════════════════════ */}
            {phase === "result" && selectedExercise && (
                <main className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-5 overflow-y-auto">
                    {/* Fichas animadas */}
                    <div className="flex flex-wrap justify-center gap-2 min-h-12 items-center anim-up max-w-xs">
                        {resultValue === 0
                            ? <div className="text-5xl animate-float">⚖️</div>
                            : Array.from({ length: Math.min(Math.abs(resultValue), 12) }).map((_, i) => (
                                <div key={i}
                                    className={`w-10 h-10 rounded-full bg-linear-to-br flex items-center justify-center font-black text-white text-xs shadow-lg animate-float
                                        ${resultValue > 0 ? "from-blue-400 to-blue-600 shadow-blue-500/40" : "from-red-400 to-red-600 shadow-red-500/40"}`}
                                    style={{ animationDelay: `${i * 0.1}s` }}>
                                    {resultValue > 0 ? "+1" : "−1"}
                                </div>
                            ))}
                    </div>

                    {/* Número resultado */}
                    <div className="text-center anim-up anim-pop" style={{ animationDelay: "0.1s" }}>
                        <p className="text-white/25 text-[10px] font-black uppercase tracking-widest mb-1">Resultado</p>
                        <div className={`text-[68px] sm:text-8xl font-black tabular-nums leading-none ${resultBigColor} drop-shadow-2xl`}>
                            {formatNum(resultValue)}
                        </div>
                    </div>

                    {/* Narración contextual */}
                    <div className="anim-up bg-indigo-500/10 border border-indigo-500/20 rounded-2xl px-4 py-3 max-w-xs w-full text-center" style={{ animationDelay: "0.15s" }}>
                        <p className="text-indigo-300/50 text-[10px] font-black uppercase tracking-widest mb-1">📖 Lo que significa</p>
                        <p className={`font-bold text-sm leading-relaxed ${resultTextColor}`}>
                            {selectedExercise.resultLabel(resultValue)}
                        </p>
                    </div>

                    {/* Verificación predicción */}
                    {userPrediction && (
                        <div className={`anim-up max-w-xs w-full rounded-2xl px-4 py-3 text-center border
                            ${predictionResult === "correct" ? "bg-emerald-500/10 border-emerald-500/25" : "bg-amber-500/10 border-amber-500/20"}`}
                            style={{ animationDelay: "0.2s" }}>
                            <p className={`font-black text-sm ${predictionResult === "correct" ? "text-emerald-400" : "text-amber-400"}`}>
                                {predictionResult === "correct" ? "🎯 ¡Predijiste correctamente!" : "📚 La predicción no fue correcta esta vez"}
                            </p>
                            <p className="text-white/35 text-xs mt-1">
                                Predijiste: {userPrediction === "positive" ? "POSITIVO" : "NEGATIVO"} · Real: {resultValue >= 0 ? "POSITIVO" : "NEGATIVO"}
                            </p>
                        </div>
                    )}

                    {/* Regla descubierta */}
                    <div className="anim-up bg-teal-500/8 border border-teal-500/20 rounded-2xl px-4 py-3 max-w-xs w-full" style={{ animationDelay: "0.26s" }}>
                        <p className="text-teal-400/60 text-[10px] font-black uppercase tracking-widest mb-2 text-center">Regla descubierta</p>
                        <div className="flex flex-col gap-1.5 text-sm font-black text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap text-base">
                                <span className={dividendTextColor}>{formatExpr(dividend)}</span>
                                <span className="text-white/30">÷</span>
                                <span className={divisorTextColor}>{formatExpr(divisor)}</span>
                                <span className="text-white/30">=</span>
                                <span className={`font-black ${resultBigColor}`}>{formatNum(resultValue)}</span>
                            </div>
                            <p className="text-white/35 text-xs">
                                {absDividend} fichas ÷ {absDivisor} grupos = {absQuotient} fichas por grupo
                            </p>
                            {needFlip && (
                                <p className="text-amber-400 text-xs">Divisor negativo → fichas cambiaron de color</p>
                            )}
                            <p className={`text-xs font-bold ${signsSame ? "text-blue-300" : "text-red-300"}`}>
                                Signos {signsSame ? "iguales" : "distintos"} → resultado {signsSame ? "POSITIVO" : "NEGATIVO"}
                            </p>
                            {discoveries.length >= 2 && (
                                <p className="text-white/25 text-[10px] mt-1">
                                    {discoveries.length} ejercicios completados — ¡el patrón se repite!
                                </p>
                            )}
                        </div>
                    </div>

                    <button onClick={handleReset}
                        className="px-8 py-3.5 rounded-2xl text-base font-black bg-linear-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 shadow-lg shadow-teal-500/25 hover:scale-105 active:scale-95 transition-all duration-200 glow-teal anim-up"
                        style={{ animationDelay: "0.34s" }}>
                        Nuevo Ejercicio 🔄
                    </button>
                </main>
            )}

            {/* ── MODAL AYUDA ────────────────────────────────────────────────── */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo funciona la división?"
                bgColor="#080c18"
                buttonColor="bg-teal-500 hover:bg-teal-400"
            >
                <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div className="rounded-xl p-3" style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.2)" }}>
                        <p className="text-teal-300 font-black text-xs mb-1">💡 Concepto clave</p>
                        <p className="text-xs text-white/60">
                            En <strong className="text-white">a ÷ b</strong>, el divisor <strong className="text-white">b</strong> es el <strong className="text-teal-300">número de grupos</strong> que se forman.
                            El cociente es cuántas fichas tiene <strong className="text-teal-300">cada grupo</strong>.
                        </p>
                        <p className="text-xs text-white/40 mt-1">Ejemplo: (+6) ÷ (+2) → 2 grupos de 3 fichas → resultado +3</p>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 1 — Lee la situación y predice</p>
                        <p>Cada ejercicio tiene un contexto real. Antes de ver las fichas, elige si el resultado será <strong className="text-blue-300">positivo</strong> o <strong className="text-red-300">negativo</strong>. Si fallas, recibes una pista.</p>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 2 — Forma los grupos</p>
                        <ul className="space-y-1.5 text-xs text-white/60 list-disc list-inside">
                            <li>Usa <strong className="text-white">−</strong> y <strong className="text-white">+</strong> para ajustar el número de columnas (grupos).</li>
                            <li>El divisor indica <strong className="text-white">cuántos grupos</strong> necesitas.</li>
                            <li>Arrastra fichas hasta que cada grupo tenga el mismo número de fichas.</li>
                            <li>Cada grupo tiene tantas fichas como el <strong className="text-white">cociente</strong>.</li>
                        </ul>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Paso 3 — Voltear (solo si el divisor es negativo)</p>
                        <p className="text-xs text-white/60">Cuando el divisor es negativo, todas las fichas cambian de color. Esto explica la regla de signos.</p>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Regla de signos</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                                <p className="text-blue-300 font-black">(+)÷(+) = <span className="text-blue-400">+</span></p>
                                <p className="text-blue-400/50 text-[10px]">iguales → positivo</p>
                            </div>
                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                                <p className="text-red-300 font-black">(+)÷(−) = <span className="text-red-400">−</span></p>
                                <p className="text-red-400/50 text-[10px]">distintos → negativo</p>
                            </div>
                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                                <p className="text-red-300 font-black">(−)÷(+) = <span className="text-red-400">−</span></p>
                                <p className="text-red-400/50 text-[10px]">distintos → negativo</p>
                            </div>
                            <div className="rounded-lg p-2 text-center" style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)" }}>
                                <p className="text-blue-300 font-black">(−)÷(−) = <span className="text-blue-400">+</span></p>
                                <p className="text-blue-400/50 text-[10px]">iguales → positivo</p>
                            </div>
                        </div>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}