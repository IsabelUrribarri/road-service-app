import React from 'react'

const TestPage: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold text-blue-600">Prueba de Tailwind</h1>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-500 text-white p-4 rounded">Rojo</div>
        <div className="bg-green-500 text-white p-4 rounded">Verde</div>
        <div className="bg-blue-500 text-white p-4 rounded">Azul</div>
      </div>

      <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
        Botón de prueba
      </button>

      <div className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-6 rounded-lg">
        Gradiente de prueba
      </div>
    </div>
  )
}

// ¡ESTA LÍNEA ES CRÍTICA!
export default TestPage