import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, RefreshCw } from 'lucide-react'
import type { Topic } from '../types'

export default function HomeView() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')

    const topics: Topic[] = [
        { id: 'intro', path: '/intro-enteros', title: 'Introducción a Enteros', description: 'Números positivos y negativos', available: true },
        { id: 'recta', path: '/recta-numerica', title: 'Recta Numérica', description: 'Ubicación en la recta', available: true },
        { id: 'suma', path: '/suma-enteros', title: 'Suma de Enteros', description: 'Operaciones básicas', available: true },
        { id: 'resta', path: '/resta-enteros', title: 'Resta de Enteros', description: 'Operaciones básicas', available: true },
        { id: 'producto', path: '/producto-enteros', title: 'Multiplicación', description: 'Reglas de signos', available: true },
        { id: 'tres-jarras', path: '/tres-jarras', title: 'Las Tres Jarras', description: 'Pensamiento lógico', available: true },
        { id: 'tres-pescados', path: '/tres-pescados', title: 'Los Tres Pescados', description: 'Pensamiento lógico', available: true },
        { id: 'granjero-rio', path: '/granjero-rio', title: 'El Granjero y el Río', description: 'Pensamiento lógico', available: true },
        { id: 'moneda-falsa', path: '/moneda-falsa', title: 'La Moneda Falsa', description: 'Pensamiento lógico', available: true },
        { id: 'regleta-fracciones', path: '/regleta-fracciones', title: 'Regleta de Fracciones', description: 'Fracciones interactivas', available: true },
        { id: 'suma-resta-fracciones', path: '/suma-resta-fracciones', title: 'Suma y Resta de Fracciones', description: 'Operaciones con fracciones', available: true },
        { id: 'recta-numerica-fracciones', path: '/recta-numerica-fracciones', title: 'Fracciones en la Recta', description: 'Ubica fracciones en la recta numérica', available: true },
        { id: 'multiplicar-fracciones', path: '/multiplicar-fracciones', title: 'Multiplicar Fracciones', description: 'Multiplicación visual de fracciones', available: true },
        { id: 'fractions', path: '/fracciones', title: 'Fracciones', description: 'Próximamente', available: false },
        { id: 'decimals', path: '/decimales', title: 'Decimales', description: 'Próximamente', available: false },
        { id: 'percentages', path: '/porcentajes', title: 'Porcentajes', description: 'Próximamente', available: false }
    ]

    const filteredTopics = topics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    )

    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleTopicClick = (topic: Topic) => {
        if (topic.available) navigate(topic.path)
    }

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

    return (
        <div className="min-h-dvh bg-[#080c18] text-white px-4 py-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <header className="text-center mb-8 relative">
                <button
                    onClick={handleUpdateClick}
                    className="absolute right-0 top-0 p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all"
                    title="Actualizar aplicación"
                >
                    <RefreshCw size={18} className="text-white/50" />
                </button>
                <h1 className="text-4xl font-black tracking-tight">Matemáticas</h1>
                <p className="text-white/40 mt-1 text-sm">Aprende de forma interactiva</p>
            </header>

            {/* Search */}
            <div className="relative mb-8 max-w-xl mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                    type="text"
                    placeholder="Buscar tema..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
                {filteredTopics.map(topic => (
                    <div
                        key={topic.id}
                        onClick={() => handleTopicClick(topic)}
                        className={`
              rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur
              transition-all duration-300
              ${topic.available ? 'cursor-pointer hover:scale-[1.03] hover:shadow-lg hover:shadow-teal-500/10' : 'opacity-40 cursor-not-allowed'}
            `}
                    >
                        <div className="flex items-center justify-between mb-3">
                            {!topic.available && (
                                <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white/40">
                                    Próximamente
                                </span>
                            )}
                        </div>

                        <h2 className="text-lg font-bold mb-1">
                            {topic.title}
                        </h2>

                        <p className="text-sm text-white/40">
                            {topic.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Empty state */}
            {filteredTopics.length === 0 && (
                <div className="text-center mt-10 text-white/30">
                    No se encontraron resultados
                </div>
            )}

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
