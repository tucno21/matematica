import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { accents, competencies, competencyIcons, recreativa, topics } from '../data/curriculum'
import type { Competency } from '../types'

export default function HomeView() {
    const navigate = useNavigate()
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const planCompetencies = competencies.filter((competency) => competency.id !== 'recreativa')
    const countTopics = (competency: Competency) =>
        topics.filter((topic) => topic.competency === competency.id).length

    const handleUpdateClick = () => {
        if (!navigator.onLine) {
            alert('No hay conexión a internet. Conéctate para actualizar.')
            return
        }
        setShowUpdateModal(true)
    }

    const confirmUpdate = async () => {
        setIsUpdating(true)
        try {
            // Delete all caches
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map((name) => caches.delete(name)))
            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                await Promise.all(registrations.map((reg) => reg.unregister()))
            }
            // Reload to get fresh files
            window.location.reload()
        } catch {
            setIsUpdating(false)
            setShowUpdateModal(false)
            alert('Error al actualizar. Intenta de nuevo.')
        }
    }

    const recreativaAccent = accents[recreativa.accent]
    const RecreativaIcon = competencyIcons[recreativa.id]

    return (
        <div
            className="flex min-h-dvh flex-col bg-[#080c18] text-white px-4 py-4 sm:px-6 sm:py-5"
            style={{ fontFamily: "'Nunito', sans-serif" }}
        >
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center">
                {/* Header */}
                <header className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">
                            Matemáticas
                        </h1>
                        <p className="text-[11px] sm:text-xs text-white/35 mt-1.5">
                            Elige una competencia
                        </p>
                    </div>
                    <button
                        onClick={handleUpdateClick}
                        className="shrink-0 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                        title="Actualizar aplicación"
                    >
                        <RefreshCw size={17} className="text-white/50" />
                    </button>
                </header>

                {/* Competencias */}
                <div className="grid max-h-[clamp(340px,58dvh,560px)] flex-1 grid-cols-2 auto-rows-fr gap-3 sm:gap-4">
                    {planCompetencies.map((competency) => {
                        const accent = accents[competency.accent]
                        const Icon = competencyIcons[competency.id]
                        const total = countTopics(competency)

                        return (
                            <button
                                key={competency.id}
                                type="button"
                                onClick={() => navigate(competency.path)}
                                className={`group relative flex flex-col justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg ${accent.shadow} active:scale-[0.99]`}
                            >
                                <div
                                    className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent.gradient} to-transparent blur-2xl`}
                                />
                                <Icon
                                    size={84}
                                    strokeWidth={1.25}
                                    className={`pointer-events-none absolute -right-2 bottom-1 ${accent.text} opacity-[0.07]`}
                                />

                                <div className="relative flex items-center gap-2.5">
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${accent.bg} ${accent.border}`}>
                                        <Icon size={17} className={accent.text} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white/25">
                                        {total > 0 ? `${total} temas` : 'Próximamente'}
                                    </span>
                                </div>

                                <h2 className="relative mt-2.5 text-base sm:text-lg font-black leading-tight">
                                    {competency.shortTitle}
                                </h2>
                                <p className="relative mt-0.5 text-[11px] sm:text-xs text-white/35 leading-snug line-clamp-1">
                                    {competency.cardHint}
                                </p>
                            </button>
                        )
                    })}
                </div>

                {/* Actividad recreativa */}
                <button
                    type="button"
                    onClick={() => navigate(recreativa.path)}
                    className={`group mt-3 sm:mt-4 flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border ${recreativaAccent.border} bg-gradient-to-r ${recreativaAccent.gradient} via-white/[0.03] to-transparent p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg ${recreativaAccent.shadow} active:scale-[0.99]`}
                >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${recreativaAccent.bg} ${recreativaAccent.border}`}>
                        <RecreativaIcon size={17} className={recreativaAccent.text} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm sm:text-[15px] font-black leading-tight">
                            {recreativa.title}
                        </h2>
                        <p className="mt-0.5 text-[11px] text-white/35 leading-snug line-clamp-1">
                            {recreativa.cardHint}
                        </p>
                    </div>
                    <span className={`hidden sm:inline text-[10px] font-bold ${recreativaAccent.text} opacity-60`}>
                        {countTopics(recreativa)} juegos
                    </span>
                    <ChevronRight
                        size={16}
                        className={`shrink-0 ${recreativaAccent.text} opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100`}
                    />
                </button>
            </div>

            {/* Update modal */}
            {showUpdateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="bg-[#0f1629] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-amber-500/10">
                                <RefreshCw size={22} className={`text-amber-400 ${isUpdating ? 'animate-spin' : ''}`} />
                            </div>
                            <h3 className="text-lg font-bold text-white">Actualizar aplicación</h3>
                        </div>
                        <p className="text-white/50 text-sm mb-6 leading-relaxed">
                            Se eliminarán los archivos descargados y se recargarán desde internet con la última versión disponible.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowUpdateModal(false); setIsUpdating(false); }}
                                disabled={isUpdating}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 font-semibold text-sm hover:bg-white/10 transition-all disabled:opacity-40"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmUpdate}
                                disabled={isUpdating}
                                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 active:scale-95 transition-all disabled:opacity-60"
                            >
                                {isUpdating ? 'Actualizando...' : 'Actualizar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
