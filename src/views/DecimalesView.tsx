import { useNavigate } from 'react-router-dom'

export default function DecimalesView() {
    const navigate = useNavigate()

    return (
        <div>
            <header className="mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition mb-4"
                >
                    <span className="text-2xl">←</span>
                    <span className="font-medium">Volver</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="text-3xl">0.5</span>
                    Decimales
                </h1>
            </header>

            <div className="bg-white rounded-2xl shadow-md p-8 min-h-64 flex items-center justify-center border-2 border-dashed border-gray-200">
                <p className="text-gray-500 text-lg text-center">
                    Contenido en construcción
                </p>
            </div>
        </div>
    )
}