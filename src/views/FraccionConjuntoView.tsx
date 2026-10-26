import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalHelp from '../components/ModalHelp';

type ObjectType = 'star' | 'circle' | 'square' | 'triangle' | 'heart';
type ViewMode = 'free' | 'exercise';

const OBJECT_TYPES: ObjectType[] = ['star', 'circle', 'square', 'triangle', 'heart'];
const QUANTITIES = [6, 8, 9, 10, 12, 15, 16, 18, 20, 24];

const COLOR_NEUTRAL = '#334155';
const COLOR_SELECTED = '#2dd4bf';
const COLOR_DEN = '#fbbf24';
const COLOR_NUM = '#2dd4bf';
const COLOR_RESULT = '#34d399';

function getDivisors(n: number): number[] {
    const d: number[] = [];
    for (let i = 1; i <= n; i++) {
        if (n % i === 0) d.push(i);
    }
    return d;
}

function bestGrid(n: number): [number, number] {
    if (n <= 1) return [1, 1];
    for (let r = Math.floor(Math.sqrt(n)); r >= 1; r--) {
        if (n % r === 0) return [n / r, r];
    }
    return [n, 1];
}

interface Exercise {
    quantity: number;
    num: number;
    den: number;
    level: number;
    targetResult?: number;
}

function generateExercise(level: number): Exercise {
    switch (level) {
        case 1: {
            const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)];
            const divs = getDivisors(q).filter(d => d > 1 && d < q);
            const den = divs[Math.floor(Math.random() * divs.length)];
            return { quantity: q, num: 1, den, level };
        }
        case 2: {
            const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)];
            const divs = getDivisors(q).filter(d => d > 1 && d < q);
            const den = divs[Math.floor(Math.random() * divs.length)];
            const num = 2 + Math.floor(Math.random() * (den - 2));
            return { quantity: q, num: den > 2 ? num : 1, den, level };
        }
        case 3: {
            const lq = QUANTITIES.filter(q => q >= 15);
            const q = lq[Math.floor(Math.random() * lq.length)];
            const divs = getDivisors(q).filter(d => d > 1 && d < q);
            const den = divs[Math.floor(Math.random() * divs.length)];
            const num = 1 + Math.floor(Math.random() * (den - 1));
            return { quantity: q, num, den, level };
        }
        case 4: {
            const q = 20;
            const den = [4, 5][Math.floor(Math.random() * 2)];
            const num = 1 + Math.floor(Math.random() * (den - 1));
            return { quantity: q, num, den, level };
        }
        case 5: {
            const q = 24;
            const divs = getDivisors(q).filter(d => d > 1 && d < q);
            const den = divs[Math.floor(Math.random() * divs.length)];
            const num = 1 + Math.floor(Math.random() * (den - 1));
            return { quantity: q, num: 0, den: 1, level, targetResult: (q / den) * num };
        }
        default:
            return generateExercise(1);
    }
}

function ObjIcon({ type, color, size = 22 }: { type: ObjectType; color: string; size?: number }) {
    switch (type) {
        case 'star':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>;
        case 'circle':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="12" cy="12" r="10" /></svg>;
        case 'square':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><rect x="2" y="2" width="20" height="20" rx="3" /></svg>;
        case 'triangle':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><polygon points="12,2 22,22 2,22" /></svg>;
        case 'heart':
            return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>;
    }
}

function Frac({ num, den, color }: { num: number; den: number; color?: string }) {
    const c = color ?? '#fff';
    return (
        <div className="inline-flex flex-col items-center min-w-[1.2rem] leading-none select-none font-bold text-xs sm:text-sm" style={{ color: c }}>
            <span>{num}</span>
            <div className="w-full h-px my-0.5" style={{ backgroundColor: c }} />
            <span>{den}</span>
        </div>
    );
}

export default function FraccionConjuntoView() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<ViewMode>('free');
    const [level, setLevel] = useState(1);
    const [objectType, setObjectType] = useState<ObjectType>('star');
    const [quantity, setQuantity] = useState(12);
    const [denominator, setDenominator] = useState(1);
    const [numerator, setNumerator] = useState(1);
    const [shake, setShake] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showMathModal, setShowMathModal] = useState(false);
    const [exercise, setExercise] = useState<Exercise | null>(null);
    const [checked, setChecked] = useState(false);

    const divisors = getDivisors(quantity);
    const groupSize = denominator > 0 ? quantity / denominator : quantity;
    const selectedCount = numerator * groupSize;
    const isExercise = mode === 'exercise' && exercise !== null;
    const locked = isExercise && exercise.level !== 5;

    const triggerShake = useCallback(() => {
        setShake(true);
        setTimeout(() => setShake(false), 400);
    }, []);

    const resetAll = useCallback((q: number) => {
        setQuantity(q);
        setDenominator(1);
        setNumerator(1);
        setChecked(false);
    }, []);

    const handleIncDen = useCallback(() => {
        const idx = divisors.indexOf(denominator);
        if (idx < divisors.length - 1) {
            setDenominator(divisors[idx + 1]);
        } else {
            triggerShake();
        }
    }, [divisors, denominator, triggerShake]);

    const handleDecDen = useCallback(() => {
        const idx = divisors.indexOf(denominator);
        if (idx > 0) {
            const next = divisors[idx - 1];
            setDenominator(next);
            setNumerator(n => Math.min(n, next));
        }
    }, [divisors, denominator]);

    const handleIncNum = useCallback(() => {
        if (denominator > 1 && numerator < denominator) {
            setNumerator(n => n + 1);
        }
    }, [denominator, numerator]);

    const handleDecNum = useCallback(() => {
        if (numerator > 0) setNumerator(n => n - 1);
    }, [numerator]);

    const handleDice = useCallback(() => {
        const q = QUANTITIES[Math.floor(Math.random() * QUANTITIES.length)];
        const divs = getDivisors(q).filter(d => d > 1 && d < q);
        const den = divs[Math.floor(Math.random() * divs.length)];
        const num = 1 + Math.floor(Math.random() * den);
        setQuantity(q);
        setDenominator(den);
        setNumerator(num);
        setChecked(false);
    }, []);

    const handleStartExercise = useCallback((lvl: number) => {
        const ex = generateExercise(lvl);
        setExercise(ex);
        setLevel(lvl);
        setQuantity(ex.quantity);
        setDenominator(ex.den);
        setNumerator(ex.num);
        setChecked(false);
    }, []);

    const toggleMode = useCallback(() => {
        if (mode === 'free') {
            setMode('exercise');
            handleStartExercise(level);
        } else {
            setMode('free');
            setExercise(null);
            setChecked(false);
        }
    }, [mode, level, handleStartExercise]);

    const [groupCols] = bestGrid(denominator);
    const [innerCols] = bestGrid(groupSize);

    const canIncDen = divisors.indexOf(denominator) < divisors.length - 1;
    const canDecDen = denominator > 1;
    const canIncNum = denominator > 1 && numerator < denominator;
    const canDecNum = numerator > 0;

    const qtyIdx = QUANTITIES.indexOf(quantity);
    const canIncQty = qtyIdx < QUANTITIES.length - 1;
    const canDecQty = qtyIdx > 0;

    const showResult = mode === 'free' || checked;
    const isLevel5 = isExercise && exercise.level === 5;

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none">
            {/* 1. Header (34-44px) */}
            <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
                <button
                    onClick={() => navigate(-1)}
                    className="flex h-7 px-2 lg:h-8 lg:px-3 items-center gap-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-bold text-white/80 active:scale-95 transition-all"
                >
                    ← <span className="hidden xs:inline">Volver</span>
                </button>

                <div className="flex items-center gap-1.5 truncate px-1">
                    <h1 className="text-[13px] lg:text-[15px] font-bold text-white truncate">
                        Fracción de un Conjunto
                    </h1>
                    <span className={[
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0",
                        mode === 'exercise'
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                            : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    ].join(" ")}>
                        {mode === 'exercise' ? `Ejercicio Nivel ${level}` : "Modo Libre"}
                    </span>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={toggleMode}
                        className="h-7 px-2 lg:h-8 lg:px-3 rounded-lg text-xs font-bold transition-all active:scale-95"
                        style={{
                            background: mode === 'free' ? 'rgba(251,191,36,0.15)' : 'rgba(45,212,191,0.15)',
                            border: mode === 'free' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(45,212,191,0.3)',
                            color: mode === 'free' ? '#fbbf24' : '#2dd4bf'
                        }}
                    >
                        {mode === 'free' ? 'Libre' : 'Ejercicio'}
                    </button>
                    <button
                        onClick={() => setShowHelp(true)}
                        className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs lg:text-sm active:scale-95 transition-all"
                        title="Ayuda"
                    >
                        ?
                    </button>
                </div>
            </header>

            {/* 2. Barra superior de modo y operación (34-40px) */}
            <div className="shrink-0 flex items-center justify-between gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 text-[11px] lg:text-xs">
                {mode === 'exercise' ? (
                    <>
                        <div className="flex items-center gap-1 shrink-0">
                            {Array.from({ length: 5 }, (_, i) => i + 1).map(l => (
                                <button
                                    key={l}
                                    onClick={() => handleStartExercise(l)}
                                    className={[
                                        'w-6 h-6 lg:w-7 lg:h-7 rounded-md font-bold text-[11px] lg:text-xs transition-all active:scale-95',
                                        l === level ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white/5 text-white/50 hover:bg-white/10'
                                    ].join(' ')}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        {/* Pregunta central en ejercicio */}
                        <div className="flex items-center px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 shrink-0">
                            {isLevel5 ? (
                                <div className="flex items-center gap-1 font-bold text-xs">
                                    <span className="text-white/60">¿Fracción de</span>
                                    <span style={{ color: COLOR_DEN }}>{quantity}</span>
                                    <span className="text-white/60">da</span>
                                    <span style={{ color: COLOR_RESULT }}>{exercise.targetResult}</span>
                                    <span className="text-white/60">?</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 font-bold text-xs">
                                    <span className="text-white/60">¿Cuánto es</span>
                                    <Frac num={numerator} den={denominator} color={COLOR_NUM} />
                                    <span className="text-white/60">de</span>
                                    <span style={{ color: COLOR_DEN }}>{quantity}</span>
                                    <span className="text-white/60">?</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleStartExercise(level)}
                            className="h-6 px-2 lg:h-7 lg:px-3 rounded-md bg-amber-500/20 border border-amber-400/30 text-amber-300 font-bold text-[10px] lg:text-xs active:scale-95 transition-all"
                        >
                            🎲 Nuevo
                        </button>
                    </>
                ) : (
                    <>
                        {/* Selector de figura en modo libre */}
                        <div className="flex gap-1 bg-white/5 rounded-lg border border-white/10 p-0.5 shrink-0">
                            {OBJECT_TYPES.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setObjectType(t)}
                                    className={[
                                        'p-1 rounded-md transition-all active:scale-95',
                                        t === objectType ? 'bg-white/20' : 'hover:bg-white/10 opacity-60'
                                    ].join(' ')}
                                >
                                    <ObjIcon type={t} color={t === objectType ? '#2dd4bf' : '#94a3b8'} size={15} />
                                </button>
                            ))}
                        </div>

                        {/* Operación libre central */}
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 font-bold text-xs shrink-0">
                            <Frac num={numerator} den={denominator} color={COLOR_NUM} />
                            <span className="text-white/60">de</span>
                            <span style={{ color: COLOR_DEN }}>{quantity}</span>
                            <span className="text-white/60">=</span>
                            <span style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                        </div>

                        {/* Cantidad total */}
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg border border-white/10 px-1.5 py-0.5 shrink-0">
                            <span className="text-white/50 text-[10px]">Total:</span>
                            <button
                                onClick={() => canDecQty && resetAll(QUANTITIES[qtyIdx - 1])}
                                disabled={!canDecQty}
                                className="w-5 h-5 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 text-xs"
                            >
                                −
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-xs text-white">{quantity}</span>
                            <button
                                onClick={() => canIncQty && resetAll(QUANTITIES[qtyIdx + 1])}
                                disabled={!canIncQty}
                                className="w-5 h-5 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 text-xs"
                            >
                                +
                            </button>
                            <button
                                onClick={handleDice}
                                className="p-1 rounded bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-amber-300 ml-0.5"
                                title="Aleatorio"
                            >
                                🎲
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* 3. Área de trabajo central (flex-1 min-h-0) */}
            <main className="flex-1 min-h-0 flex flex-col items-center justify-between p-2 sm:p-2.5 lg:p-3 overflow-hidden relative">
                {/* Cuadrícula de grupos de objetos */}
                <div className={`flex-1 min-h-0 flex items-center justify-center w-full max-w-2xl overflow-y-auto p-1 transition-all ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}>
                    <div
                        className="grid gap-2 sm:gap-2.5 transition-all duration-300 justify-center items-center"
                        style={{ gridTemplateColumns: `repeat(${groupCols}, auto)` }}
                    >
                        {Array.from({ length: denominator }, (_, gi) => {
                            const isSelected = gi < numerator;
                            return (
                                <div
                                    key={gi}
                                    className={[
                                        'grid gap-1 p-1.5 sm:p-2 rounded-xl border-2 transition-all duration-200 shadow-xs',
                                        isSelected
                                            ? 'border-teal-400 bg-teal-500/15 shadow-teal-500/10'
                                            : 'border-white/10 bg-slate-900/60'
                                    ].join(' ')}
                                    style={{ gridTemplateColumns: `repeat(${innerCols}, auto)` }}
                                >
                                    {Array.from({ length: groupSize }, (_, oi) => (
                                        <ObjIcon
                                            key={oi}
                                            type={objectType}
                                            color={isSelected ? COLOR_SELECTED : COLOR_NEUTRAL}
                                            size={groupSize > 8 ? 18 : 22}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Controles compactos de Denominador y Numerador */}
                <div className="flex items-center justify-center gap-2 sm:gap-3 w-full max-w-lg shrink-0 py-1 text-xs">
                    {/* Denominador (grupos) */}
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-2.5 py-1">
                        <span className="text-[11px] text-amber-300/80 font-semibold">¿Dividir en?</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleDecDen}
                                disabled={!canDecDen || locked}
                                className="w-6 h-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all text-xs select-none"
                            >
                                −
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-sm" style={{ color: COLOR_DEN }}>
                                {denominator}
                            </span>
                            <button
                                onClick={handleIncDen}
                                disabled={!canIncDen || locked}
                                className="w-6 h-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all text-xs select-none"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Numerador (grupos tomados) */}
                    <div className="flex items-center gap-1.5 bg-white/5 rounded-xl border border-white/10 px-2.5 py-1">
                        <span className="text-[11px] text-teal-300/80 font-semibold">¿Tomar?</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleDecNum}
                                disabled={!canDecNum || locked}
                                className="w-6 h-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all text-xs select-none"
                            >
                                −
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-sm" style={{ color: COLOR_NUM }}>
                                {numerator}
                            </span>
                            <button
                                onClick={handleIncNum}
                                disabled={!canIncNum || locked}
                                className="w-6 h-6 rounded bg-white/10 text-white font-bold flex items-center justify-center hover:bg-white/20 active:scale-95 disabled:opacity-20 transition-all text-xs select-none"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* 4. Barra inferior de acción y feedback (40-48px) */}
            <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
                {/* Feedback a la izquierda */}
                <div className="flex items-center gap-2 min-w-0">
                    {isExercise && checked ? (
                        isLevel5 ? (
                            <span className={`text-[10px] sm:text-[11px] lg:text-xs font-bold truncate ${selectedCount === exercise?.targetResult ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {selectedCount === exercise?.targetResult ? '🎉 ¡Correcto!' : `✕ Incorrecto, era ${exercise?.targetResult}`}
                            </span>
                        ) : (
                            <span className="text-[10px] sm:text-[11px] lg:text-xs font-bold text-emerald-400 truncate">
                                🎉 ¡Correcto! {selectedCount} objetos seleccionados
                            </span>
                        )
                    ) : (
                        <div className="flex items-center gap-1 text-[10px] sm:text-[11px] lg:text-xs font-semibold text-white/70 truncate">
                            <span className="font-bold" style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                            <span>objetos tomados</span>
                            {denominator > 1 && (
                                <span className="text-white/40 hidden sm:inline">({groupSize} por grupo)</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Acciones principales a la derecha */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {isExercise && !checked && (
                        <button
                            onClick={() => setChecked(true)}
                            className="h-7 px-3.5 lg:h-8 lg:px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] lg:text-xs font-bold text-white transition-all shadow-md active:scale-95"
                        >
                            Comprobar
                        </button>
                    )}

                    {showResult && denominator > 1 && numerator > 0 && (
                        <button
                            onClick={() => setShowMathModal(true)}
                            className="h-7 px-2.5 lg:h-8 lg:px-3.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] lg:text-xs font-bold text-indigo-300 border border-indigo-500/30 transition-all active:scale-95"
                        >
                            📐 Ver matemática
                        </button>
                    )}

                    {isExercise && (
                        <button
                            onClick={() => handleStartExercise(level)}
                            className="h-7 px-3 lg:h-8 lg:px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-[11px] lg:text-xs font-bold text-white transition-all active:scale-95"
                        >
                            🎲 Nuevo
                        </button>
                    )}
                </div>
            </footer>

            {/* Modal de Pasos Matemáticos */}
            {showMathModal && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="w-full max-w-md bg-[#0d1424] border border-white/20 rounded-2xl shadow-2xl p-4 flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="text-base">📐</span>
                                <h3 className="text-sm font-bold text-white">Pasos del Cálculo</h3>
                            </div>
                            <button
                                onClick={() => setShowMathModal(false)}
                                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white font-bold text-xs transition-all"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="overflow-y-auto py-4 space-y-3 flex-1 min-h-0 text-center">
                            <div className="flex items-center gap-2 justify-center text-base sm:text-lg font-bold">
                                <Frac num={numerator} den={denominator} color={COLOR_NUM} />
                                <span className="text-white/50">de</span>
                                <span style={{ color: COLOR_DEN }}>{quantity}</span>
                                <span className="text-white/50">=</span>
                                <span style={{ color: COLOR_RESULT }}>{selectedCount}</span>
                            </div>

                            <div className="bg-white/5 rounded-xl p-3 space-y-2 border border-white/10 text-xs sm:text-sm text-left">
                                <div className="flex items-center gap-1.5 text-white/80">
                                    <span className="text-amber-400 font-bold">Paso 1:</span>
                                    <span>{quantity} ÷ {denominator} = <strong className="text-white">{groupSize}</strong> (objetos por grupo)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-white/80">
                                    <span className="text-teal-400 font-bold">Paso 2:</span>
                                    <span>{groupSize} × {numerator} = <strong className="text-emerald-400">{selectedCount}</strong> (objetos tomados)</span>
                                </div>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setShowMathModal(false)}
                                className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Ayuda */}
            <ModalHelp
                open={showHelp}
                onClose={() => setShowHelp(false)}
                title="¿Cómo funciona la fracción de un conjunto?"
                bgColor="#0d1424"
                titleColor="#f8fafc"
                buttonColor="bg-indigo-600 hover:bg-indigo-500"
            >
                <div className="text-white/80 text-xs sm:text-sm space-y-3 leading-relaxed">
                    <p>Explora visualmente qué significa tomar una <strong className="text-white">fracción</strong> de un <strong className="text-white">conjunto de objetos</strong>:</p>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1 border border-white/10">
                        <p className="font-bold text-amber-400">Modo Libre</p>
                        <p className="text-white/70">
                            Elige la figura, ajusta la cantidad total con <strong>+/−</strong> o 🎲, y cambia en cuántos grupos divides (denominador) y cuántos tomas (numerador).
                        </p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-2.5 space-y-1 border border-white/10">
                        <p className="font-bold text-teal-400">Modo Ejercicio (5 niveles)</p>
                        <p className="text-white/70">
                            Resuelve ejercicios guiados paso a paso desde fracciones unitarias hasta problemas inversos donde debes descubrir la fracción.
                        </p>
                    </div>
                </div>
            </ModalHelp>
        </div>
    );
}
