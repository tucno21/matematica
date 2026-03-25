import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
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
        { id: 'fractions', path: '/fracciones', title: 'Fracciones', description: 'Próximamente', available: false },
        { id: 'decimals', path: '/decimales', title: 'Decimales', description: 'Próximamente', available: false },
        { id: 'percentages', path: '/porcentajes', title: 'Porcentajes', description: 'Próximamente', available: false }
    ]

    const filteredTopics = topics.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
    )

    const handleTopicClick = (topic: Topic) => {
        if (topic.available) navigate(topic.path)
    }

    return (
        <div className="min-h-dvh bg-[#080c18] text-white px-4 py-8" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {/* Header */}
            <header className="text-center mb-8">
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
        </div>
    )
}
