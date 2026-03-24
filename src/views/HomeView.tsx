import { useNavigate } from 'react-router-dom'
import type { Topic } from '../types'

export default function HomeView() {
    const navigate = useNavigate()

    const topics: Topic[] = [
        {
            id: 'integers',
            path: '/suma-enteros',
            title: 'Suma de Enteros',
            description: 'Aprende a operar con números positivos y negativos',
            icon: '➕',
            color: 'blue',
            available: true
        },
        {
            id: 'integers',
            path: '/resta-enteros',
            title: 'Resta de Enteros',
            description: 'Aprende a operar con números positivos y negativos',
            icon: '➕',
            color: 'blue',
            available: true
        },
        {
            id: 'fractions',
            path: '/fracciones',
            title: 'Fracciones',
            description: 'Domina el mundo de las fracciones',
            icon: '½',
            color: 'purple',
            available: false
        },
        {
            id: 'decimals',
            path: '/decimales',
            title: 'Decimales',
            description: 'Trabaja con números decimales',
            icon: '0.5',
            color: 'green',
            available: false
        },
        {
            id: 'percentages',
            path: '/porcentajes',
            title: 'Porcentajes',
            description: 'Calcula porcentajes fácilmente',
            icon: '%',
            color: 'orange',
            available: false
        }
    ]

    const colorClasses = {
        blue: 'bg-blue-500 hover:bg-blue-600',
        purple: 'bg-purple-500 hover:bg-purple-600',
        green: 'bg-green-500 hover:bg-green-600',
        orange: 'bg-orange-500 hover:bg-orange-600'
    }

    const handleTopicClick = (topic: Topic) => {
        if (topic.available) {
            navigate(topic.path)
        }
    }

    return (
        <div>
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Matemáticas Fáciles</h1>
                <p className="text-gray-600">Aprende matemáticas de forma divertida</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                {topics.map((topic) => (
                    <button
                        key={topic.id}
                        onClick={() => handleTopicClick(topic)}
                        disabled={!topic.available}
                        className={`
              ${topic.available ? colorClasses[topic.color as keyof typeof colorClasses] : 'bg-gray-300'}
              ${!topic.available ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer shadow-lg transform transition hover:scale-105 active:scale-95'}
              rounded-2xl p-6 text-left text-white
            `}
                    >
                        <div className="text-4xl mb-3">{topic.icon}</div>
                        <h2 className="text-lg font-bold mb-2">{topic.title}</h2>
                        <p className="text-sm opacity-90 mb-3">{topic.description}</p>
                        {!topic.available && (
                            <span className="inline-block bg-gray-800 bg-opacity-50 text-xs px-2 py-1 rounded-full">
                                Próximamente
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </div>
    )
}