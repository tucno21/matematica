import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    disabled: boolean;
    color: string;
}

function DiceFace({ value, rolling, onClick, disabled, color }: DiceFaceProps) {
    const dots = DICE_DOTS[value] ?? DICE_DOTS[1];
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="relative select-none transition-all"
            style={{
                width: 62,
                height: 62,
                borderRadius: 14,
                background: disabled && !rolling ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)",
                border: `2px solid ${disabled && !rolling ? "rgba(255,255,255,0.1)" : color + "99"}`,
                cursor: disabled ? "default" : "pointer",
                boxShadow: disabled && !rolling ? "none" : `0 4px 20px ${color}33`,
                padding: 10,
                display: "grid",
                gridTemplate: "repeat(3,1fr) / repeat(3,1fr)",
                gap: 2,
                transition: "transform .12s ease, background .3s, border-color .3s",
                animation: rolling ? "diceRoll .1s ease-in-out infinite alternate" : "none",
                outline: "none",
            }}
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
                            background: hasDot ? (disabled && !rolling ? "rgba(255,255,255,0.3)" : "#fff") : "transparent",
                            width: "100%",
                            height: "100%",
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
    return (
        <div
            className="flex-1 flex flex-col items-center justify-center gap-1 px-3 py-3"
            style={{
                background: isActive ? `${color}0e` : "transparent",
                transition: "background .4s",
                minWidth: 0,
            }}
        >
            <div className="flex items-center gap-1.5">
                <div style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: isActive ? color : "rgba(255,255,255,.15)",
                    boxShadow: isActive ? `0 0 8px ${color}` : "none",
                    transition: "all .3s",
                    flexShrink: 0,
                }} />
                <p
                    className="text-xs font-black uppercase tracking-wider truncate"
                    style={{ color: isActive ? color : "rgba(255,255,255,.35)", transition: "color .3s" }}
                >
                    {direction}&nbsp;{name}
                </p>
            </div>

            {/* Show shared ball position */}
            <p
                className="font-black"
                style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 24,
                    color: isActive ? "#fff" : "rgba(255,255,255,.45)",
                    lineHeight: 1,
                    transition: "color .3s",
                }}
            >
                {ballPos > 0 ? `+${ballPos}` : ballPos}
            </p>

            <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-bold" style={{ color: "rgba(52,211,153,.85)" }}>✓ {player.correct}</span>
                <span className="text-[10px] font-bold" style={{ color: "rgba(248,113,113,.85)" }}>✗ {player.errors}</span>
                <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,.25)" }}>
                    {totalTurns - player.turnsLeft}/{totalTurns}
                </span>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RectaNumerica() {
    const navigate = useNavigate();

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

    const lineRef = useRef<HTMLDivElement>(null);

    // ── Derived ──
    // Avanzar → positivo → AZUL  |  Retroceder → negativo → ROJO
    const advColor = "#60a5fa";
    const retColor = "#f87171";
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

        // Update only this player's ✓/✗ stats (position field no longer drives game logic)
        setPlayers(prev => ({
            ...prev,
            [currentTurn]: {
                ...prev[currentTurn],
                position: expectedPos, // kept for display in results
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
                background: "linear-gradient(160deg,#07090f 0%,#0c1220 55%,#07090f 100%)",
                fontFamily: "'Nunito',sans-serif",
                overflow: "hidden",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }

        @keyframes diceRoll {
          from { transform: rotate(-8deg) scale(0.95); }
          to   { transform: rotate(8deg)  scale(1.05); }
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
          50%     { opacity:.9; transform:translate(-50%,-50%) scale(1.15); }
        }
        .anim-fadeup  { animation: fadeUp .4s ease-out both; }
        .anim-popin   { animation: popIn  .3s ease-out both; }
        .anim-shake   { animation: shake  .4s ease-out; }
        .line-track   { cursor:ew-resize; user-select:none; -webkit-user-select:none; touch-action:none; }
        ::-webkit-scrollbar { display:none; }
      `}</style>

            {/* ── Back ── */}
            <div className="px-4 pt-4 pb-1 shrink-0">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hidden sm:inline">Volver</span>
                </button>
            </div>

            {/* ══════════ IDLE ══════════ */}
            {gamePhase === "idle" && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
                    <div className="text-center anim-fadeup">
                        <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,.28)" }}>Recta Numérica</p>
                        <h1 className="text-3xl font-black text-white leading-tight">El Juego de<br />
                            <span style={{ color: advColor }}>Avanzar</span>{" "}&{" "}
                            <span style={{ color: retColor }}>Retroceder</span>
                        </h1>
                        <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,.38)" }}>
                            2 jugadores · {turnsPerRound} turnos cada uno · El dado decide cuánto mueves
                        </p>
                    </div>

                    {/* Configuration Panel */}
                    <div
                        className="w-full max-w-sm rounded-2xl p-5 anim-fadeup flex flex-col gap-4"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: ".07s" }}
                    >
                        {/* Turns per round selection */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.28)" }}>Turnos por ronda</p>
                            <div className="flex gap-2">
                                {[3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setTurnsPerRound(num)}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                        style={{
                                            background: turnsPerRound === num ? `${advColor}33` : "rgba(255,255,255,0.04)",
                                            border: turnsPerRound === num ? `1px solid ${advColor}66` : "1px solid rgba(255,255,255,0.1)",
                                            color: turnsPerRound === num ? "#fff" : "rgba(255,255,255,0.5)",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Number of dice selection */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.28)" }}>Número de dados</p>
                            <div className="flex gap-2">
                                {[1, 2].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setNumberOfDice(num)}
                                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                                        style={{
                                            background: numberOfDice === num ? `${advColor}33` : "rgba(255,255,255,0.04)",
                                            border: numberOfDice === num ? `1px solid ${advColor}66` : "1px solid rgba(255,255,255,0.1)",
                                            color: numberOfDice === num ? "#fff" : "rgba(255,255,255,0.5)",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Rules */}
                    <div
                        className="w-full max-w-sm rounded-2xl p-5 anim-fadeup"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: ".07s" }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,.28)" }}>Reglas</p>
                        {[
                            ["🎲", `Lanza${numberOfDice === 2 ? " los" : " el"} dado${numberOfDice === 2 ? "s" : ""} para conocer tu movimiento`],
                            ["👆", "Arrastra la bolita al número correcto en la recta"],
                            ["🔵", "Jugador AVANZAR: suma el dado (+)"],
                            ["🔴", "Jugador RETROCEDER: resta el dado (−)"],
                            ["🔄", "Se alternan; siempre empieza Avanzar"],
                        ].map(([icon, text]) => (
                            <div key={text} className="flex items-start gap-2.5 mb-2 last:mb-0">
                                <span className="text-base shrink-0">{icon}</span>
                                <span className="text-xs leading-relaxed font-medium" style={{ color: "rgba(255,255,255,.52)" }}>{text}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={startGame}
                        className="w-full max-w-sm py-4 rounded-2xl font-black text-base transition-all active:scale-95"
                        style={{ background: `linear-gradient(135deg,${advColor},#3b82f6)`, border: "none", color: "#fff", cursor: "pointer", boxShadow: `0 8px 28px ${advColor}55` }}
                    >
                        ¡Comenzar! 🎲
                    </button>
                </div>
            )}

            {/* ══════════ PLAYING / FINISHED ══════════ */}
            {(gamePhase === "playing" || gamePhase === "finished") && (
                <>
                    {/* ── Top panel: two players + dice ── */}
                    <div
                        className="shrink-0 flex items-stretch"
                        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 130 }}
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
                            className="flex flex-col items-center justify-center gap-2 shrink-0 px-3"
                            style={{ borderLeft: "1px solid rgba(255,255,255,0.07)", borderRight: "1px solid rgba(255,255,255,0.07)", minWidth: 90 }}
                        >
                            {gamePhase === "playing" ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <DiceFace
                                            value={diceRolling ? diceFace : diceFace}
                                            rolling={diceRolling}
                                            onClick={rollDice}
                                            disabled={turnPhase !== "roll" || diceRolling}
                                            color={curColor}
                                        />
                                        {numberOfDice === 2 && (
                                            <DiceFace
                                                value={diceRolling ? dice2Face : dice2Face}
                                                rolling={diceRolling}
                                                onClick={rollDice}
                                                disabled={turnPhase !== "roll" || diceRolling}
                                                color={curColor}
                                            />
                                        )}
                                    </div>
                                    <p
                                        className="text-[9px] font-black uppercase tracking-widest"
                                        style={{ color: "rgba(255,255,255,.28)" }}
                                    >
                                        {turnPhase === "roll" ? "LANZAR" : turnPhase === "drag" ? "ARRASTRA" : "···"}
                                    </p>
                                    <div
                                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase"
                                        style={{ background: `${curColor}22`, border: `1px solid ${curColor}40`, color: curColor }}
                                    >
                                        T{Math.floor(totalTurns / 2) + 1}/{turnsPerRound}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center">
                                    <div className="text-2xl">🏆</div>
                                    <p className="text-[10px] font-black text-white mt-1">FIN</p>
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
                        className="shrink-0 flex items-center justify-center px-4"
                        style={{ height: 42, borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                    >
                        {feedback ? (
                            <div
                                key={feedback.msg}
                                className={`anim-popin flex items-center gap-2 px-4 py-1 rounded-full text-xs font-black ${!feedback.correct ? "anim-shake" : ""}`}
                                style={{
                                    background: feedback.correct ? "rgba(52,211,153,0.14)" : "rgba(248,113,113,0.14)",
                                    border: `1px solid ${feedback.correct ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.4)"}`,
                                    color: feedback.correct ? "#6ee7b7" : "#fca5a5",
                                }}
                            >
                                <span>{feedback.correct ? "✅" : "❌"}</span>
                                {feedback.msg}
                            </div>
                        ) : gamePhase === "playing" ? (
                            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,.26)" }}>
                                {turnPhase === "roll"
                                    ? `${currentTurn === "advance" ? "🔵 Avanzar" : "🔴 Retroceder"} — lanza el dado`
                                    : <>
                                        {numberOfDice === 2 ? `Mueve ${diceValue} lugar${diceValue > 1 ? "es" : ""} (${diceFace} + ${dice2Face}) hacia la ${currentTurn === "advance" ? "derecha ▶" : "izquierda ◀"}`
                                            : `Mueve ${diceValue} lugar${diceValue > 1 ? "es" : ""} hacia la ${currentTurn === "advance" ? "derecha ▶" : "izquierda ◀"}`}
                                    </>
                                }
                            </p>
                        ) : null}
                    </div>

                    {/* ════════ NUMBER LINE — full width ════════ */}
                    <div className="flex-1 flex flex-col justify-center" style={{ overflow: "hidden" }}>
                        <div className="relative w-full" style={{ height: 148, paddingLeft: 16, paddingRight: 16 }}>

                            {/* Negative zone fill — ROJO (retroceder) */}
                            <div className="absolute" style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: 16, width: `${linePct(0)}%`, height: 5,
                                background: "linear-gradient(to right,rgba(248,113,113,0.1),rgba(248,113,113,0.3))",
                                borderRadius: "4px 0 0 4px",
                            }} />
                            {/* Positive zone fill — AZUL (avanzar) */}
                            <div className="absolute" style={{
                                top: "50%", transform: "translateY(-50%)",
                                left: `calc(${linePct(0)}% + 16px)`, right: 16, height: 5,
                                background: "linear-gradient(to right,rgba(96,165,250,0.3),rgba(96,165,250,0.1))",
                                borderRadius: "0 4px 4px 0",
                            }} />

                            {/* Main axis */}
                            <div className="absolute rounded-full" style={{
                                top: "50%", left: 16, right: 16, height: 2,
                                background: "rgba(255,255,255,0.13)", transform: "translateY(-50%)",
                            }} />

                            {/* Arrows */}
                            <div className="absolute" style={{ top: "50%", left: 4, transform: "translateY(-50%)" }}>
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="rgba(248,113,113,0.5)"><polygon points="0,6 12,0 12,12" /></svg>
                            </div>
                            <div className="absolute" style={{ top: "50%", right: 4, transform: "translateY(-50%)" }}>
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="rgba(96,165,250,0.5)"><polygon points="12,6 0,0 0,12" /></svg>
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
                                            width: isZero ? 2.5 : 1.5,
                                            height: isZero ? 28 : isBig ? 18 : 10,
                                            background: isZero ? "rgba(255,255,255,0.7)" : isBig ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.09)",
                                            borderRadius: 2,
                                        }} />
                                        {(isBig || isZero) && (
                                            <span
                                                className="absolute select-none font-bold"
                                                style={{
                                                    top: "calc(50% + 20px)",
                                                    fontFamily: "'JetBrains Mono',monospace",
                                                    fontSize: isZero ? 14 : 11,
                                                    color: isZero ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.5)",
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
                                        width: 38,
                                        height: 38,
                                        borderRadius: "50%",
                                        top: "50%", left: "50%",
                                        transform: "translate(-50%,-50%)",
                                        border: `2px solid ${curColor}`,
                                        opacity: 0.4,
                                        animation: "pulseRing 1.4s ease-in-out infinite",
                                    }} />
                                )}
                                {/* Outer ring */}
                                <div style={{
                                    position: "absolute",
                                    width: 30,
                                    height: 30,
                                    borderRadius: "50%",
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: `${curColor}20`,
                                    border: `2px solid ${curColor}55`,
                                    boxShadow: `0 0 18px ${curColor}44`,
                                    transition: "background .4s, border-color .4s, box-shadow .4s",
                                }} />
                                {/* Inner dot */}
                                <div style={{
                                    position: "absolute",
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    top: "50%", left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: curColor,
                                    boxShadow: `0 0 12px ${curColor}`,
                                    border: "2.5px solid rgba(255,255,255,.85)",
                                    transition: "background .4s, box-shadow .4s",
                                }} />
                                {/* Value label above — LARGE so student can clearly read the number */}
                                <span
                                    className="absolute font-black select-none"
                                    style={{
                                        bottom: "calc(100% + 14px)",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        fontFamily: "'JetBrains Mono',monospace",
                                        fontSize: 22,
                                        lineHeight: 1,
                                        color: curColor,
                                        whiteSpace: "nowrap",
                                        textShadow: `0 0 12px ${curColor}, 0 0 24px ${curColor}88`,
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

                        {/* Instruction below line */}
                        {gamePhase === "playing" && (
                            <p className="text-center text-xs font-medium mt-0" style={{ color: "rgba(255,255,255,.22)" }}>
                                {turnPhase === "drag" && !dragLocked
                                    ? <>Arrastra la bolita al{" "}
                                        <span style={{ color: curColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 700 }}>
                                            {expectedPos > 0 ? `+${expectedPos}` : expectedPos}
                                        </span>
                                    </>
                                    : turnPhase === "roll"
                                        ? "Presiona el dado para lanzar"
                                        : "···"}
                            </p>
                        )}
                    </div>

                    {/* ── Final results ── */}
                    {gamePhase === "finished" && (
                        <div
                            className="shrink-0 px-4 pb-6 pt-4 flex flex-col gap-3"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                        >
                            <p className="text-center text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,.3)" }}>
                                Resultados finales
                            </p>
                            <div className="flex gap-3">
                                {(["retreat", "advance"] as PlayerKey[]).map(pk => {
                                    const p = players[pk];
                                    const col = pk === "advance" ? advColor : retColor;
                                    const accuracy = Math.round((p.correct / turnsPerRound) * 100);
                                    return (
                                        <div
                                            key={pk}
                                            className="flex-1 rounded-2xl p-4 text-center"
                                            style={{ background: `${col}10`, border: `1px solid ${col}30` }}
                                        >
                                            <p className="text-xs font-black mb-1" style={{ color: col }}>
                                                {pk === "advance" ? "🔵 Avanzar" : "🔴 Retroceder"}
                                            </p>
                                            <p
                                                className="font-black text-white"
                                                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, lineHeight: 1 }}
                                            >
                                                {p.correct}/{turnsPerRound}
                                            </p>
                                            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,.35)" }}>
                                                {accuracy}% precisión · {p.errors} error{p.errors !== 1 ? "es" : ""}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                            <div
                                className="rounded-2xl p-3 text-center"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "rgba(255,255,255,.3)" }}>
                                    Posición final de la bolita
                                </p>
                                <p
                                    className="font-black text-white"
                                    style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 24 }}
                                >
                                    {ballPos > 0 ? `+${ballPos}` : ballPos}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={startGame}
                                className="w-full py-3 rounded-2xl text-sm font-black transition-all active:scale-95"
                                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.11)", color: "#fff", cursor: "pointer" }}
                            >
                                🔄 Jugar de nuevo
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}