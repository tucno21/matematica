import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Search } from 'lucide-react'
import { accents, competencyIcons, getCompetency, topics } from '../data/curriculum'
import type { Topic } from '../types'

export default function CompetenciaView() {
    const { competencyId } = useParams<{ competencyId: string }>()
    const navigate = useNavigate()
    const [search, setSearch] = useState('')

    const competency = getCompetency(competencyId)

    const competencyTopics = useMemo(
        () => (competency ? topics.filter((topic) => topic.competency === competency.id) : []),
        [competency],
    )

    const filteredTopics = useMemo(() => {
        const term = search.trim().toLowerCase()
        if (!term) return competencyTopics
        return competencyTopics.filter(
            (topic) =>
                topic.title.toLowerCase().includes(term) ||
                topic.description.toLowerCase().includes(term),
        )
    }, [competencyTopics, search])

    const handleTopicClick = (topic: Topic) => {
        if (topic.available) navigate(topic.path)
    }

    if (!competency) {
        return (
            <div className="min-h-dvh bg-[#080c18] text-white px-4 py-8 flex flex-col items-center justify-center gap-4">
                <p className="text-white/50 text-sm">No encontramos esa competencia.</p>
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/70 hover:bg-white/10 transition-all"
                >
                    Volver al inicio
                </button>
            </div>
        )
    }

    const accent = accents[competency.accent]
    const Icon = competencyIcons[competency.id]
    const isRecreativa = competency.id === 'recreativa'

    return (
        <div
            className="flex min-h-dvh flex-col bg-[#080c18] text-white px-4 py-4 sm:px-6 sm:py-5"
            style={{ fontFamily: "'Nunito', sans-serif" }}
        >
            {/* Header */}
            <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 mb-4">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-bold text-white/60 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
                >
                    <ArrowLeft size={14} />
                    Inicio
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent.bg} ${accent.border}`}>
                        <Icon size={17} className={accent.text} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-xl font-black leading-tight truncate">
                            {competency.shortTitle}
                        </h1>
                        <p className="text-[10px] sm:text-[11px] text-white/30 truncate">
                            {competency.cardHint}
                        </p>
                    </div>
                </div>

                <div className="relative order-last w-full sm:order-none sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" size={15} />
                    <input
                        type="text"
                        placeholder="Buscar tema..."
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className={`w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-3 text-[13px] text-white placeholder-white/30 focus:outline-none focus:ring-2 ${accent.ring}`}
                    />
                </div>

                <span className={`hidden md:inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${accent.bg} ${accent.border} ${accent.text}`}>
                    {competencyTopics.length} {isRecreativa ? 'juegos' : competencyTopics.length === 1 ? 'tema' : 'temas'}
                </span>
            </header>

            {/* Topics */}
            {filteredTopics.length > 0 ? (
                <div className="mx-auto grid w-full max-w-6xl grid-cols-2 content-start gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {filteredTopics.map((topic) => (
                        <div
                            key={topic.id}
                            onClick={() => handleTopicClick(topic)}
                            className={`
                                group flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3
                                transition-all duration-200
                                ${topic.available
                                    ? `cursor-pointer hover:border-white/20 hover:bg-white/[0.08] hover:shadow-lg ${accent.shadow}`
                                    : 'opacity-40 cursor-not-allowed'
                                }
                            `}
                        >
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[13px] sm:text-sm font-bold leading-snug line-clamp-2">
                                    {topic.title}
                                </h2>
                                <p className="mt-0.5 text-[10px] sm:text-[11px] text-white/30 leading-snug line-clamp-1">
                                    {topic.description}
                                </p>
                            </div>

                            {topic.available ? (
                                <ChevronRight
                                    size={15}
                                    className={`shrink-0 ${accent.text} opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100`}
                                />
                            ) : (
                                <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
                                    Pronto
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            ) : competencyTopics.length === 0 ? (
                <div className="mx-auto w-full max-w-6xl rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
                    <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border ${accent.bg} ${accent.border}`}>
                        <Icon size={19} className={`${accent.text} opacity-70`} />
                    </div>
                    <h2 className="text-sm font-bold text-white/70">
                        Todavía no hay actividades aquí
                    </h2>
                    <p className="mx-auto mt-1.5 max-w-xs text-xs text-white/35 leading-relaxed">
                        Estamos preparando nuevos temas. Mientras tanto, explora otra competencia.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/70 transition-all hover:bg-white/10 active:scale-95"
                    >
                        Ver competencias
                    </button>
                </div>
            ) : (
                <div className="mx-auto w-full max-w-6xl py-10 text-center text-xs text-white/30">
                    <p>No se encontraron resultados para “{search.trim()}”.</p>
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="mt-2 font-bold text-white/50 underline underline-offset-4 hover:text-white"
                    >
                        Limpiar búsqueda
                    </button>
                </div>
            )}
        </div>
    )
}
