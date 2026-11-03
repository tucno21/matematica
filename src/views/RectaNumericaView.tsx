import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ModalHelp from "../components/ModalHelp";
import { useThemeStore } from "../store/useThemeStore";

// ─── Constants ────────────────────────────────────────────────────────────────
const MIN = -30;
const MAX = 30;
const RANGE = MAX - MIN; // 60

// ─── Types ────────────────────────────────────────────────────────────────────
type PlayerKey = "advance" | "retreat";
type TurnPhase = "roll" | "drag" | "result";
type GamePhase = "idle" | "playing" | "finished";

interface PlayerState {
    position: number;
    errors: number;
    correct: number;
    turnsLeft: number;
}

interface Players {
    advance: PlayerState;
    retreat: PlayerState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const linePct = (val: number): number => ((val - MIN) / RANGE) * 100;

const initPlayer = (turns: number): PlayerState => ({
    position: 0,
    errors: 0,
    correct: 0,
    turnsLeft: turns,
});

// Dice dot grid positions [col, row] for faces 1–6
const DICE_DOTS: Record<number, [number, number][]> = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
};

// ─── DiceFace ─────────────────────────────────────────────────────────────────
interface DiceFaceProps {
    value: number;
    rolling: boolean;
    onClick: () => void;
    canRoll: boolean;
    isActiveResult: boolean;
    color: string;
}

function DiceFace({ value, rolling, onClick, canRoll, isActiveResult, color }: DiceFaceProps) {
    const isDark = useThemeStore((s) => s.theme === "dark");
    const dots = DICE_DOTS[value] ?? DICE_DOTS[1];

    const bg = isDark
        ? isActiveResult
            ? "rgba(255,255,255,0.15)"
            : canRoll
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.03)"
        : isActiveResult
        ? "#ffffff"
        : canRoll
        ? "#ffffff"
        : "#f8fafc";

    const borderColor = isActiveResult
        ? color
        : canRoll
        ? color
        : isDark
        ? "rgba(255,255,255,0.15)"
        : "#cbd5e1";

    const shadow = isActiveResult
        ? isDark
            ? `0 0 22px ${color}66`
            : `0 6px 20px ${color}45, 0 2px 6px rgba(0,0,0,0.08)`
        : canRoll
        ? isDark
            ? `0 4px 14px ${color}33`
            : `0 3px 12px ${color}30, 0 1px 2px rgba(0,0,0,0.06)`
        : "none";

    const dotColor = isActiveResult
        ? color
        : canRoll
        ? isDark
            ? "#ffffff"
            : color
        : isDark
        ? "rgba(255,255,255,0.25)"
        : "#94a3b8";

    return (
        <button
            type="button"
            onClick={canRoll ? onClick : undefined}
            disabled={!canRoll}
            className={`relative select-none transition-all ${canRoll ? "hover:scale-105 active:scale-95 animate-pulse" : ""}`}
            style={{
                width: 62,
                height: 62,
                borderRadius: 14,
                background: bg,
                border: `2.5px solid ${borderColor}`,
                cursor: canRoll ? "pointer" : "default",
                boxShadow: shadow,
                padding: 10,
                display: "grid",
                gridTemplate: "repeat(3,1fr) / repeat(3,1fr)",
                gap: 2,
                transform: isActiveResult ? "scale(1.06)" : "scale(1)",
                transition: "transform .2s ease, background .3s, border-color .3s, box-shadow .3s",
                animation: rolling ? "diceRoll .1s ease-in-out infinite alternate" : undefined,
                outline: "none",
            }}
            title={canRoll ? "Toca para lanzar el dado" : `Resultado: ${value}`}
        >
            {Array.from({ length: 9 }, (_, idx) => {
                const col = idx % 3;
                const row = Math.floor(idx / 3);
                const hasDot = dots.some(([c, r]) => c === col && r === row);
                return (
                    <div
                        key={idx}
                        style={{
                            borderRadius: "50%",
                            background: hasDot ? dotColor : "transparent",
                            boxShadow: hasDot && isActiveResult ? `0 0 6px ${color}88` : "none",
                            width: "100%",
                            height: "100%",
                            transition: "background .2s, box-shadow .2s",
                        }}
                    />
                );
            })}
        </button>
    );
}

// ─── PlayerPanel ──────────────────────────────────────────────────────────────
interface PlayerPanelProps {
    name: string;
    color: string;
    player: PlayerState;
    isActive: boolean;
    direction: string;
    ballPos: number;
    totalTurns: number;
}

function PlayerPanel({ name, color, player, isActive, direction, ballPos, totalTurns }: PlayerPanelProps) {
    const isDark = useThemeStore((s) => s.theme === "dark");
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center gap-1 px-3 py-3"
            style={{
                background: isActive ? `${color}18` : "transparent",
                transition: "background .4s",
                minWidth: 0,
            }}
        >
            <div className="flex items-center gap-1.5">
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isActive ? color : (isDark ? "rgba(255,255,255,.2)" : "#94a3b8"),
                    boxShadow: isActive ? `0 0 10px ${color}` : "none",
                    transition: "all .3s",
                    flexShrink: 0,
                }} />
                <p
                    className="text-xs font-black uppercase tracking-wider truncate"
                    style={{ color: isActive ? color : (isDark ? "rgba(255,255,255,.5)" : "#64748b"), transition: "color .3s" }}
                >
                    {direction}&nbsp;{name}
                </p>
            </div>

            {/* Show shared ball position */}
            <p
                className="font-black"
                style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 26,
                    color: isActive ? (isDark ? "#ffffff" : "#0f172a") : (isDark ? "rgba(255,255,255,.45)" : "#64748b"),
                    lineHeight: 1,
                    transition: "color .3s",
                }}
            >
                {ballPos > 0 ? `+${ballPos}` : ballPos}
            </p>

            <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-extrabold" style={{ color: isDark ? "#34d399" : "#047857" }}>✓ {player.correct}</span>
                <span className="text-[10px] font-extrabold" style={{ color: isDark ? "#f87171" : "#b91c1c" }}>✗ {player.errors}</span>
                <span className="text-[10px] font-bold" style={{ color: isDark ? "rgba(255,255,255,.4)" : "#64748b" }}>
                    {totalTurns - player.turnsLeft}/{totalTurns}
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RectaNumerica() {
    const navigate = useNavigate();
    const isDark = useThemeStore((s) => s.theme === "dark");

    const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
    const [currentTurn, setCurrentTurn] = useState<PlayerKey>("advance");
    const [turnPhase, setTurnPhase] = useState<TurnPhase>("roll");
    const [totalTurns, setTotalTurns] = useState<number>(0);

    // ── Configuration state ──
    const [turnsPerRound, setTurnsPerRound] = useState<number>(3);
    const [numberOfDice, setNumberOfDice] = useState<number>(2);

    // ── ONE shared ball on the line. Stats per player track only ✓/✗ counts ──
    const [ballPos, setBallPos] = useState<number>(0);   // shared marker
    const [players, setPlayers] = useState<Players>({ advance: initPlayer(turnsPerRound), retreat: initPlayer(turnsPerRound) });

    const [diceValue, setDiceValue] = useState<number>(1);
    const [diceFace, setDiceFace] = useState<number>(1);
    const [dice2Face, setDice2Face] = useState<number>(1);
    const [diceRolling, setDiceRolling] = useState<boolean>(false);

    const [markerPos, setMarkerPos] = useState<number>(0);   // what student drags
    const [dragging, setDragging] = useState<boolean>(false);
    const [dragLocked, setDragLocked] = useState<boolean>(false);

    const [feedback, setFeedback] = useState<{ correct: boolean; msg: string } | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showRules, setShowRules] = useState(false);

    const lineRef = useRef<HTMLDivElement>(null);

    // ── Derived ──
    // Avanzar → positivo → AZUL  |  Retroceder → negativo → ROJO
    const advColor = isDark ? "#60a5fa" : "#2563eb";
    const retColor = isDark ? "#f87171" : "#dc2626";
    const curColor = currentTurn === "advance" ? advColor : retColor;

    // Expected position is always relative to the SHARED ball position
    const expectedDelta = currentTurn === "advance" ? diceValue : -diceValue;
    const expectedPos = ballPos + expectedDelta;

    // ── On new turn: reset draggable marker to current ball position ──
    useEffect(() => {
        if (gamePhase === "playing" && turnPhase === "roll") {
            setMarkerPos(ballPos);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTurn, turnPhase, gamePhase]);

    // ── Roll dice ──
    const rollDice = useCallback((): void => {
        if (diceRolling || turnPhase !== "roll" || gamePhase !== "playing") return;
        setDiceRolling(true);
        setFeedback(null);
        let ticks = 0;
        const id = setInterval(() => {
            ticks++;
            setDiceFace(Math.ceil(Math.random() * 6));
            if (numberOfDice === 2) {
                setDice2Face(Math.ceil(Math.random() * 6));
            }
            if (ticks >= 14) {
                clearInterval(id);
                const final1 = Math.ceil(Math.random() * 6);
                const final2 = numberOfDice === 2 ? Math.ceil(Math.random() * 6) : 1;
                const totalDiceValue = numberOfDice === 2 ? final1 + final2 : final1;

                setDiceValue(totalDiceValue);
                setDiceFace(final1);
                if (numberOfDice === 2) {
                    setDice2Face(final2);
                }
                setDiceRolling(false);
                setTurnPhase("drag");
            }
        }, 80);
    }, [diceRolling, turnPhase, gamePhase, numberOfDice]);

    // ── Drag helpers ──
    const posFromClientX = useCallback((clientX: number): number => {
        if (!lineRef.current) return markerPos;
        const rect = lineRef.current.getBoundingClientRect();
        const ratio = (clientX - rect.left) / rect.width;
        const clamped = Math.max(0, Math.min(1, ratio));
        return Math.round(clamped * RANGE + MIN);
    }, [markerPos]);

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
        if (dragLocked || turnPhase !== "drag") return;
        setDragging(true);
        setMarkerPos(posFromClientX(e.clientX));
    }, [dragLocked, turnPhase, posFromClientX]);

    const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>): void => {
        if (dragLocked || turnPhase !== "drag") return;
        setDragging(true);
        setMarkerPos(posFromClientX(e.touches[0].clientX));
    }, [dragLocked, turnPhase, posFromClientX]);

    // ── Evaluate answer ──
    const evaluate = useCallback((finalPos: number): void => {
        setDragLocked(true);
        setTurnPhase("result");
        const isCorrect = finalPos === expectedPos;

        const diceDisplay = numberOfDice === 2
            ? `(${diceFace} + ${dice2Face} = ${diceValue})`
            : `${diceValue}`;

        setFeedback({
            correct: isCorrect,
            msg: isCorrect
                ? `¡Correcto! ${currentTurn === "advance" ? "+" : "−"}${diceDisplay} → ${expectedPos > 0 ? "+" : ""}${expectedPos}`
                : `Error — debías ir al ${expectedPos > 0 ? "+" : ""}${expectedPos}`,
        });

        // Snap shared ball to correct position regardless of student answer
        setBallPos(expectedPos);
        setMarkerPos(expectedPos);

        // Update only this player's ✓/✗ stats
        setPlayers(prev => ({
            ...prev,
            [currentTurn]: {
                ...prev[currentTurn],
                position: expectedPos,
                correct: prev[currentTurn].correct + (isCorrect ? 1 : 0),
                errors: prev[currentTurn].errors + (isCorrect ? 0 : 1),
                turnsLeft: prev[currentTurn].turnsLeft - 1,
            },
        }));

        setTimeout(() => {
            setTotalTurns(prev => {
                const next = prev + 1;
                if (next >= turnsPerRound * 2) {
                    setGamePhase("finished");
                    return next;
                }
                const nextPlayer: PlayerKey = next % 2 === 0 ? "advance" : "retreat";
                setCurrentTurn(nextPlayer);
                setDragLocked(false);
                setFeedback(null);
                setTurnPhase("roll");
                return next;
            });
        }, 1800);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expectedPos, currentTurn, diceValue]);

    // ── Global mouse/touch listeners ──
    useEffect(() => {
        if (!dragging) return;
        const onMove = (e: MouseEvent | TouchEvent): void => {
            const x = "touches" in e ? e.touches[0].clientX : e.clientX;
            setMarkerPos(posFromClientX(x));
        };
        const onUp = (e: MouseEvent | TouchEvent): void => {
            setDragging(false);
            const x = "changedTouches" in e
                ? e.changedTouches[0].clientX
                : (e as MouseEvent).clientX;
            const finalPos = posFromClientX(x);
            setMarkerPos(finalPos);
            if (turnPhase === "drag") evaluate(finalPos);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend", onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, posFromClientX, turnPhase]);

    // ── Start/Restart ──
    const startGame = (): void => {
        setGamePhase("playing");
        setCurrentTurn("advance");
        setTurnPhase("roll");
        setTotalTurns(0);
        setFeedback(null);
        setDragLocked(false);
        setBallPos(0);
        setMarkerPos(0);
        setDiceValue(1);
        setDiceFace(1);
        setDice2Face(1);
        setDiceRolling(false);
        setPlayers({ advance: initPlayer(turnsPerRound), retreat: initPlayer(turnsPerRound) });
    };

    // ── Tick marks for line ──
    const ticks: number[] = [];
    for (let t = MIN; t <= MAX; t += 5) ticks.push(t);

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div
            className="min-h-dvh flex flex-col"
            style={{
                background: "var(--theme-bg-main, #f1f5f9)",
                color: isDark ? "#ffffff" : "#0f172a",
                fontFamily: "'Nunito',sans-serif",
                overflow: "hidden",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; }

        @keyframes diceRoll {
          from { transform: rotate(-8deg) scale(0.95); }
          to   { transform: rotate(8deg)  scale(1.08); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes popIn {
          0%   { transform:scale(0.5); opacity:0; }
          65%  { transform:scale(1.1); }
          100% { transform:scale(1);   opacity:1; }
        }
        @keyframes shake {
          0%,100% { transform:translateX(0); }
          20%     { transform:translateX(-5px); }
          40%     { transform:translateX(5px); }
          60%     { transform:translateX(-3px); }
          80%     { transform:translateX(3px); }
        }
        @keyframes pulseRing {
          0%,100% { opacity:.5; transform:translate(-50%,-50%) scale(1);    }
          50%     { opacity:.9; transform:translate(-50%,-50%) scale(1.18); }
        }
        .anim-fadeup  { animation: fadeUp .4s ease-out both; }
        .anim-popin   { animation: popIn  .3s ease-out both; }
        .anim-shake   { animation: shake  .4s ease-out; }
        .line-track   { cursor:ew-resize; user-select:none; -webkit-user-select:none; touch-action:none; }
        ::-webkit-scrollbar { display:none; }
      `}</style>

            {/* ── Header ── */}
            <header className="px-3 sm:px-4 pt-3 pb-2 shrink-0 border-b" style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1", background: isDark ? "#0a0f1d" : "#ffffff" }}>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all active:scale-95 shrink-0 border shadow-xs"
                        style={{
                            background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                            borderColor: isDark ? "rgba(255,255,255,0.12)" : "#94a3b8",
                            color: isDark ? "#ffffff" : "#0f172a",
                            cursor: "pointer",
                        }}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Volver</span>
                    </button>

                    <div className="flex-1 text-center">
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: isDark ? "rgba(255,255,255,.45)" : "#64748b" }}>Recta Numérica</p>
                        <h1 className="text-sm sm:text-base lg:text-lg font-black leading-tight" style={{ color: isDark ? "#fff" : "#0f172a" }}>
                            El Juego de{" "}
                            <span style={{ color: advColor }}>Avanzar (+)</span>{" "}&{" "}
                            <span style={{ color: retColor }}>Retroceder (−)</span>
                        </h1>
                    </div>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all active:scale-95 border shadow-xs"
                        style={{
                            background: isDark ? "rgba(255,255,255,0.06)" : "#ffffff",
                            borderColor: isDark ? "rgba(255,255,255,0.12)" : "#94a3b8",
                            color: isDark ? "#ffffff" : "#0f172a",
                            cursor: "pointer",
                        }}
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* ══════════ IDLE ══════════ */}
            {gamePhase === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                    <p className="text-sm font-semibold" style={{ color: isDark ? "rgba(255,255,255,.6)" : "#475569" }}>
                        2 jugadores · {turnsPerRound} turnos cada uno · Los dados deciden cuánto te desplazas
                    </p>

                    {/* Configuration Panel */}
                    <div
                        className="w-full max-w-sm rounded-2xl p-5 anim-fadeup flex flex-col gap-4"
                        style={{
                            background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                            border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #94a3b8",
                            boxShadow: isDark ? "none" : "0 4px 14px rgba(15,23,42,0.08)",
                            animationDelay: ".07s",
                        }}
                    >
                        {/* Turns per round selection */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: isDark ? "rgba(255,255,255,.5)" : "#475569" }}>Turnos por ronda</p>
                            <div className="flex gap-2">
                                {[3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setTurnsPerRound(num)}
                                        className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                                        style={{
                                            background: turnsPerRound === num ? `${advColor}25` : (isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"),
                                            border: turnsPerRound === num ? `2px solid ${advColor}` : (isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1"),
                                            color: turnsPerRound === num ? advColor : (isDark ? "#ffffff" : "#334155"),
                                            cursor: "pointer",
                                        }}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Number of dice selection */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: isDark ? "rgba(255,255,255,.5)" : "#475569" }}>Número de dados</p>
                            <div className="flex gap-2">
                                {[1, 2].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setNumberOfDice(num)}
                                        className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
                                        style={{
                                            background: numberOfDice === num ? `${advColor}25` : (isDark ? "rgba(255,255,255,0.04)" : "#f8fafc"),
                                            border: numberOfDice === num ? `2px solid ${advColor}` : (isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1"),
                                            color: numberOfDice === num ? advColor : (isDark ? "#ffffff" : "#334155"),
                                            cursor: "pointer",
                                        }}
                                    >
                                        {num} {num === 1 ? "Dado" : "Dados"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowRules(true)}
                        className="w-full max-w-sm py-3 rounded-2xl text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2 border shadow-xs"
                        style={{
                            background: isDark ? "rgba(255,255,255,0.05)" : "#ffffff",
                            borderColor: isDark ? "rgba(255,255,255,0.15)" : "#94a3b8",
                            color: isDark ? "#ffffff" : "#0f172a",
                            cursor: "pointer",
                        }}
                    >
                        <span>📋</span> Ver Reglas del Juego
                    </button>

                    <button
                        type="button"
                        onClick={startGame}
                        className="w-full max-w-sm py-3.5 rounded-2xl font-black text-base transition-all active:scale-95 shadow-lg"
                        style={{
                            background: `linear-gradient(135deg, ${advColor}, #1d4ed8)`,
                            border: "none",
                            color: "#ffffff",
                            cursor: "pointer",
                            boxShadow: `0 8px 24px ${advColor}55`,
                        }}
                    >
                        ¡Comenzar Partida! 🎲
                    </button>
                </div>
            )}

            {/* ══════════ PLAYING / FINISHED ══════════ */}
            {(gamePhase === "playing" || gamePhase === "finished") && (
                <>
                    {/* ── Top panel: two players + dice ── */}
                    <div
                        className="shrink-0 flex items-stretch border-b shadow-xs"
                        style={{
                            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                            background: isDark ? "#0a0f1d" : "#ffffff",
                            minHeight: 125,
                        }}
                    >
                        {/* Player Retroceder — LEFT */}
                        <PlayerPanel
                            name="Retroceder"
                            color={retColor}
                            player={players.retreat}
                            isActive={currentTurn === "retreat" && gamePhase === "playing"}
                            direction="−"
                            ballPos={ballPos}
                            totalTurns={turnsPerRound}
                        />

                        {/* Center: dice */}
                        <div
                            className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-3 border-x"
                            style={{
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                                minWidth: 96,
                            }}
                        >
                            {gamePhase === "playing" ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <DiceFace
                                            value={diceFace}
                                            rolling={diceRolling}
                                            onClick={rollDice}
                                            canRoll={turnPhase === "roll" && !diceRolling}
                                            isActiveResult={turnPhase === "drag" || diceRolling}
                                            color={curColor}
                                        />
                                        {numberOfDice === 2 && (
                                            <DiceFace
                                                value={dice2Face}
                                                rolling={diceRolling}
                                                onClick={rollDice}
                                                canRoll={turnPhase === "roll" && !diceRolling}
                                                isActiveResult={turnPhase === "drag" || diceRolling}
                                                color={curColor}
                                            />
                                        )}
                                    </div>
                                    <p
                                        className="text-[10px] font-black uppercase tracking-wider text-center"
                                        style={{
                                            color: turnPhase === "roll" ? curColor : (isDark ? "rgba(255,255,255,0.7)" : "#334155")
                                        }}
                                    >
                                        {turnPhase === "roll" ? "🎲 ¡LANZA!" : turnPhase === "drag" ? `Mueve ${diceValue}` : "···"}
                                    </p>
                                    <div
                                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                                        style={{
                                            background: `${curColor}22`,
                                            border: `1px solid ${curColor}55`,
                                            color: curColor,
                                        }}
                                    >
                                        Turno {Math.floor(totalTurns / 2) + 1}/{turnsPerRound}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <div className="text-2xl">🏆</div>
                                    <p className="text-[10px] font-black mt-1" style={{ color: isDark ? "#ffffff" : "#0f172a" }}>FIN</p>
                                </div>
                            )}
                        </div>

                        {/* Player Avanzar — RIGHT */}
                        <PlayerPanel
                            name="Avanzar"
                            color={advColor}
                            player={players.advance}
                            isActive={currentTurn === "advance" && gamePhase === "playing"}
                            direction="+"
                            ballPos={ballPos}
                            totalTurns={turnsPerRound}
                        />
                    </div>

                    {/* ── Feedback / instruction bar ── */}
                    <div
                        className="shrink-0 flex items-center justify-center px-4 border-b"
                        style={{
                            height: 42,
                            borderColor: isDark ? "rgba(255,255,255,0.06)" : "#cbd5e1",
                            background: isDark ? "rgba(0,0,0,0.15)" : "#f8fafc",
                        }}
                    >
                        {feedback ? (
                            <div
                                key={feedback.msg}
                                className={`anim-popin flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black shadow-xs ${!feedback.correct ? "anim-shake" : ""}`}
                                style={{
                                    background: feedback.correct
                                        ? (isDark ? "rgba(52,211,153,0.15)" : "rgba(16,185,129,0.15)")
                                        : (isDark ? "rgba(248,113,113,0.15)" : "rgba(239,68,68,0.15)"),
                                    border: `1.5px solid ${feedback.correct ? (isDark ? "#34d399" : "#059669") : (isDark ? "#f87171" : "#dc2626")}`,
                                    color: feedback.correct
                                        ? (isDark ? "#6ee7b7" : "#047857")
                                        : (isDark ? "#fca5a5" : "#b91c1c"),
                                }}
                            >
                                <span>{feedback.correct ? "✅" : "❌"}</span>
                                {feedback.msg}
                            </div>
                        ) : gamePhase === "playing" ? (
                            <p className="text-xs font-bold" style={{ color: isDark ? "rgba(255,255,255,0.85)" : "#1e293b" }}>
                                {turnPhase === "roll"
                                    ? `${currentTurn === "advance" ? "🔵 Avanzar" : "🔴 Retroceder"} — presiona el dado para lanzar`
                                    : <>
                                        {numberOfDice === 2
                                            ? `Mueve ${diceValue} lugares (${diceFace} + ${dice2Face}) hacia la ${currentTurn === "advance" ? "derecha ▶ (+)" : "izquierda ◀ (−)"}`
                                            : `Mueve ${diceValue} lugar${diceValue > 1 ? "es" : ""} hacia la ${currentTurn === "advance" ? "derecha ▶ (+)" : "izquierda ◀ (−)"}`}
                                    </>
                                }
                            </p>
                        ) : null}
                    </div>

                    {/* ════════ NUMBER LINE — full width ════════ */}
                    <div
                        className="flex-1 flex flex-col justify-center"
                        style={{
                            background: isDark ? "transparent" : "#f8fafc",
                            overflow: "hidden",
                        }}
                    >
                        <div className="relative w-full" style={{ height: 148, paddingLeft: 16, paddingRight: 16 }}>

                            {/* Negative zone fill — ROJO (retroceder) */}
                            <div className="absolute" style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: 16, width: `${linePct(0)}%`, height: 6,
                                background: isDark
                                    ? "linear-gradient(to right, rgba(248,113,113,0.1), rgba(248,113,113,0.35))"
                                    : "linear-gradient(to right, rgba(239,68,68,0.1), rgba(239,68,68,0.25))",
                                borderRadius: "4px 0 0 4px",
                            }} />
                            {/* Positive zone fill — AZUL (avanzar) */}
                            <div className="absolute" style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: `calc(${linePct(0)}% + 16px)`, right: 16, height: 6,
                                background: isDark
                                    ? "linear-gradient(to right, rgba(96,165,250,0.35), rgba(96,165,250,0.1))"
                                    : "linear-gradient(to right, rgba(37,99,235,0.25), rgba(37,99,235,0.1))",
                                borderRadius: "0 4px 4px 0",
                            }} />

                            {/* Main axis */}
                            <div className="absolute rounded-full" style={{
                                top: "50%", left: 16, right: 16, height: 3,
                                background: isDark ? "rgba(255,255,255,0.25)" : "#64748b", transform: "translateY(-50%)",
                            }} />

                            {/* Arrows */}
                            <div className="absolute" style={{ top: "50%", left: 4, transform: "translateY(-50%)" }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill={isDark ? "rgba(248,113,113,0.7)" : "#dc2626"}><polygon points="0,6 12,0 12,12" /></svg>
                            </div>
                            <div className="absolute" style={{ top: "50%", right: 4, transform: "translateY(-50%)" }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill={isDark ? "rgba(96,165,250,0.7)" : "#2563eb"}><polygon points="12,6 0,0 0,12" /></svg>
                            </div>

                            {/* Ticks */}
                            {ticks.map(t => {
                                const isBig = t % 10 === 0;
                                const isZero = t === 0;
                                return (
                                    <div
                                        key={t}
                                        className="absolute flex flex-col items-center"
                                        style={{ left: `calc(${linePct(t)}% + 16px)`, top: "50%", transform: "translate(-50%,-50%)" }}
                                    >
                                        <div style={{
                                            width: isZero ? 3 : isBig ? 2 : 1.5,
                                            height: isZero ? 28 : isBig ? 18 : 10,
                                            background: isDark
                                                ? (isZero ? "#ffffff" : isBig ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)")
                                                : (isZero ? "#0f172a" : isBig ? "#334155" : "#94a3b8"),
                                            borderRadius: 2,
                                        }} />
                                        {(isBig || isZero) && (
                                            <span
                                                className="absolute select-none"
                                                style={{
                                                    top: "calc(50% + 20px)",
                                                    fontFamily: "'JetBrains Mono',monospace",
                                                    fontSize: isZero ? 14 : 11,
                                                    fontWeight: isZero ? 900 : 700,
                                                    color: isDark
                                                        ? (isZero ? "#ffffff" : "rgba(255,255,255,.75)")
                                                        : (isZero ? "#0f172a" : "#334155"),
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                {t > 0 ? `+${t}` : t}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Active draggable marker (single shared ball) ── */}
                            <div
                                className="absolute pointer-events-none"
                                style={{
                                    left: `calc(${linePct(markerPos)}% + 16px)`,
                                    top: "50%",
                                    transition: dragging ? "none" : "left .2s ease",
                                    zIndex: 10,
                                }}
                            >
                                {/* Pulse ring */}
                                {turnPhase === "drag" && !dragLocked && (
                                    <div style={{
                                        position: "absolute",
                                        width: 42,
                                        height: 42,
                                        borderRadius: "50%",
                                        top: "50%", left: "50%",
                                        transform: "translate(-50%,-50%)",
                                        border: `2.5px solid ${curColor}`,
                                        opacity: 0.5,
                                        animation: "pulseRing 1.3s ease-in-out infinite",
                                    }} />
                                )}
                                {/* Outer ring */}
                                <div style={{
                                    position: "absolute",
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: `${curColor}25`,
                                    border: `2px solid ${curColor}88`,
                                    boxShadow: `0 0 18px ${curColor}55`,
                                    transition: "background .4s, border-color .4s, box-shadow .4s",
                                }} />
                                {/* Inner dot */}
                                <div style={{
                                    position: "absolute",
                                    width: 18,
                                    height: 18,
                                    borderRadius: "50%",
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: curColor,
                                    boxShadow: `0 0 14px ${curColor}`,
                                    border: isDark ? "2.5px solid rgba(255,255,255,.9)" : "2.5px solid #ffffff",
                                    transition: "background .4s, box-shadow .4s",
                                }} />
                                {/* Value label above — crisp badge */}
                                <span
                                    className="absolute font-black select-none px-2 py-0.5 rounded-lg border shadow-sm"
                                    style={{
                                        bottom: "calc(100% + 14px)",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        fontFamily: "'JetBrains Mono',monospace",
                                        fontSize: 20,
                                        lineHeight: 1,
                                        color: curColor,
                                        whiteSpace: "nowrap",
                                        background: isDark ? "#0a1020" : "#ffffff",
                                        borderColor: isDark ? `${curColor}66` : `${curColor}88`,
                                        boxShadow: isDark ? `0 0 12px ${curColor}44` : "0 2px 6px rgba(0,0,0,0.08)",
                                    }}
                                >
                                    {markerPos > 0 ? `+${markerPos}` : markerPos}
                                </span>
                            </div>

                            {/* Drag capture overlay */}
                            {turnPhase === "drag" && !dragLocked && (
                                <div
                                    ref={lineRef}
                                    className="line-track absolute inset-0"
                                    style={{ zIndex: 20 }}
                                    onMouseDown={handleMouseDown}
                                    onTouchStart={handleTouchStart}
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Final results ── */}
                    {gamePhase === "finished" && (
                        <div
                            className="shrink-0 px-4 pb-6 pt-4 flex flex-col gap-3 border-t"
                            style={{
                                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                                background: isDark ? "#0a0f1d" : "#ffffff",
                            }}
                        >
                            <p className="text-center text-[10px] font-black uppercase tracking-widest" style={{ color: isDark ? "rgba(255,255,255,.45)" : "#64748b" }}>
                                Resultados Finales
                            </p>
                            <div className="flex gap-3">
                                {(["retreat", "advance"] as PlayerKey[]).map(pk => {
                                    const p = players[pk];
                                    const col = pk === "advance" ? advColor : retColor;
                                    const accuracy = Math.round((p.correct / turnsPerRound) * 100);
                                    return (
                                        <div
                                            key={pk}
                                            className="flex-1 rounded-2xl p-4 text-center border shadow-xs"
                                            style={{
                                                background: isDark ? `${col}15` : `${col}08`,
                                                borderColor: `${col}40`,
                                            }}
                                        >
                                            <p className="text-xs font-black mb-1" style={{ color: col }}>
                                                {pk === "advance" ? "🔵 Avanzar" : "🔴 Retroceder"}
                                            </p>
                                            <p
                                                className="font-black"
                                                style={{
                                                    fontFamily: "'JetBrains Mono',monospace",
                                                    fontSize: 28,
                                                    lineHeight: 1,
                                                    color: isDark ? "#ffffff" : "#0f172a",
                                                }}
                                            >
                                                {p.correct}/{turnsPerRound}
                                            </p>
                                            <p className="text-[10px] font-semibold mt-1" style={{ color: isDark ? "rgba(255,255,255,.6)" : "#475569" }}>
                                                {accuracy}% precisión · {p.errors} error{p.errors !== 1 ? "es" : ""}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div
                                className="rounded-2xl p-3 text-center border shadow-xs"
                                style={{
                                    background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
                                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
                                }}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: isDark ? "rgba(255,255,255,.45)" : "#64748b" }}>
                                    Posición final de la bolita
                                </p>
                                <p
                                    className="font-black"
                                    style={{
                                        fontFamily: "'JetBrains Mono',monospace",
                                        fontSize: 26,
                                        color: isDark ? "#ffffff" : "#0f172a",
                                    }}
                                >
                                    {ballPos > 0 ? `+${ballPos}` : ballPos}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={startGame}
                                className="w-full py-3.5 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-md"
                                style={{
                                    background: `linear-gradient(135deg, ${advColor}, #1d4ed8)`,
                                    border: "none",
                                    color: "#ffffff",
                                    cursor: "pointer",
                                }}
                            >
                                🔄 Jugar de nuevo
                            </button>
                        </div>
                    )}
                </>
            )}

            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo jugar en la Recta Numérica?"
                bgColor="#080c18"
                buttonColor="bg-blue-500 hover:bg-blue-400"
            >
                <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Configuración</p>
                        <ol className="space-y-2 list-decimal list-inside">
                            <li>Elige los <strong className="text-white">turnos por ronda</strong> (3, 4 o 5) y el <strong className="text-white">número de dados</strong> (1 o 2).</li>
                            <li>Presiona <strong className="text-white">¡Comenzar!</strong> para iniciar la partida.</li>
                        </ol>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Durante el juego</p>
                        <ol className="space-y-2 list-decimal list-inside" start={3}>
                            <li>Siempre empieza <strong style={{ color: advColor }}>Avanzar</strong>. Los turnos se alternan.</li>
                            <li>Pulsa el <strong className="text-white">dado</strong> para lanzarlo. El número indica cuántos lugares mover.</li>
                            <li><strong style={{ color: advColor }}>Avanzar</strong> mueve la bolita a la <strong className="text-white">derecha (+)</strong> sumando el dado.</li>
                            <li><strong style={{ color: retColor }}>Retroceder</strong> mueve la bolita a la <strong className="text-white">izquierda (−)</strong> restando el dado.</li>
                            <li><strong className="text-white">Arrastra la bolita</strong> hasta la posición correcta en la recta numérica.</li>
                            <li>Si aciertas suma un <span className="text-emerald-400 font-bold">✓</span>, si fallas un <span className="text-red-400 font-bold">✗</span>. En ambos casos la bolita se acomoda en el lugar correcto.</li>
                        </ol>
                    </div>

                    <div className="h-px" style={{ background: "rgba(255,255,255,.08)" }} />

                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Fin del juego</p>
                        <ul className="space-y-2 list-disc list-inside">
                            <li>Al terminar todos los turnos se muestran los <strong className="text-white">resultados</strong> con aciertos, errores y precisión de cada jugador.</li>
                            <li>Presiona <strong className="text-white">🔄 Jugar de nuevo</strong> para iniciar una nueva partida.</li>
                        </ul>
                    </div>

                    <div className="rounded-xl p-3" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
                        <p className="text-xs font-bold mb-1" style={{ color: advColor }}>💡 Recuerda</p>
                        <p className="text-xs text-white/60">Los números a la derecha del cero son <strong style={{ color: advColor }}>positivos (+)</strong> y los de la izquierda son <strong style={{ color: retColor }}>negativos (−)</strong>. El cero es el punto de partida.</p>
                    </div>
                </div>
            </ModalHelp>

            <ModalHelp
                open={showRules}
                onClose={() => setShowRules(false)}
                title="Reglas del Juego"
                bgColor="#080c18"
                buttonColor="bg-blue-500 hover:bg-blue-400"
            >
                <div className="space-y-4 text-white/80 text-sm leading-relaxed">
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🎲</span>
                        <p>Lanza{numberOfDice === 2 ? " los" : " el"} dado{numberOfDice === 2 ? "s" : ""} para conocer cuántos lugares debes mover la bolita.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">👆</span>
                        <p>Arrastra la bolita al número correcto en la recta numérica según el resultado del dado.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🔵</span>
                        <p><strong style={{ color: advColor }}>Jugador Avanzar</strong>: suma el dado (+) y mueve la bolita hacia la <strong className="text-white">derecha</strong>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🔴</span>
                        <p><strong style={{ color: retColor }}>Jugador Retroceder</strong>: resta el dado (−) y mueve la bolita hacia la <strong className="text-white">izquierda</strong>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">🔄</span>
                        <p>Los turnos se alternan. Siempre empieza <strong style={{ color: advColor }}>Avanzar</strong>.</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">✓✗</span>
                        <p>Cada acierto suma un <span className="text-emerald-400 font-bold">✓</span> y cada error un <span className="text-red-400 font-bold">✗</span>. Al final gana el jugador con más aciertos.</p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
