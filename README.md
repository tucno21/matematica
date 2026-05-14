# Resumen Ejecutivo — Matemática

## 📋 Descripción General

**Matemática** es una aplicación web educativa e interactiva diseñada para enseñar matemáticas de forma visual y lúdica, con un enfoque pedagógico en números enteros. La aplicación está construida como una SPA (Single Page Application) con una interfaz oscura moderna, animaciones fluidas y soporte táctil para dispositivos móviles.

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Propósito |
|---|---|---|
| **React** | 19.2.4 | Biblioteca UI (componentes funcionales + hooks) |
| **TypeScript** | 5.9.3 | Tipado estático |
| **Vite** | 8.0.1 | Bundler y servidor de desarrollo |
| **Tailwind CSS** | 4.2.2 | Framework de estilos utilitarios |
| **React Router DOM** | 7.13.2 | Enrutamiento del lado del cliente (createBrowserRouter) |
| **Zustand** | 5.0.12 | Gestión de estado global (preparado para uso futuro) |
| **Lucide React** | 1.6.0 | Iconos SVG |
| **Vercel** | — | Despliegue y hosting |
| **Sharp** | 0.34.5 | Procesamiento de imágenes (generación de iconos PWA) |

---

## 🏗️ Arquitectura del Proyecto

```
src/
├── App.tsx                    # Componente raíz (renderiza AppRouter)
├── main.tsx                   # Punto de entrada
├── index.css                  # Estilos globales
├── assets/                    # Recursos estáticos
│   ├── hero.png              # Imagen hero de la aplicación
│   ├── react.svg             # Logo React (por defecto)
│   └── vite.svg              # Logo Vite (por defecto)
├── components/
│   └── Layout.tsx             # Layout wrapper (min-h-screen)
├── routes/
│   └── AppRouter.tsx          # Definición de rutas (createBrowserRouter)
├── store/
│   └── useAppStore.ts         # Store Zustand (vacío, preparado para uso futuro)
├── types/
│   └── index.ts               # Interfaz Topic
└── views/
    ├── HomeView.tsx           # Página principal (grilla de temas)
    ├── IntroEnterosView.tsx   # Termómetro interactivo
    ├── RectaNumericaView.tsx   # Juego de recta numérica con dados
    ├── SumaEnterosView.tsx    # Suma con fichas de cancelación
    ├── RestaEnterosView.tsx   # Resta como "sumar el opuesto"
    ├── ProductoEnteroView.tsx # Multiplicación como agrupación
    ├── TresJarrasView.tsx    # Juego de lógica con tres jarras de agua
    ├── TresPescadosView.tsx  # Juego de optimización de tiempo con tres pescados
    ├── GranjeroRioView.tsx    # Juego de lógica del granjero cruzando el río
    ├── FraccionesView.tsx     # 🚧 Placeholder
    ├── DecimalesView.tsx      # 🚧 Placeholder
    └── PorcentajesView.tsx    # 🚧 Placeholder

scripts/
└── generate-pwa-icons.mjs     # Script para generar iconos PWA (Sharp)

public/
├── favicon.svg                # Favicon del sitio
├── icons.svg                  # Iconos SVG
├── manifest.json              # Manifiesto PWA
├── sw.js                      # Service Worker (offline support)
└── pwa-icons/                 # Iconos PWA generados (8 tamaños)
    ├── apple-touch-icon.png  # 180x180 para iOS
    ├── icon-72x72.png        # Android pequeño
    ├── icon-96x96.png        # Android medio
    ├── icon-128x128.png      # Android grande
    ├── icon-144x144.png      # Android extra grande
    ├── icon-152x152.png      # Android XXL
    ├── icon-192x192.png      # Android XXXL
    ├── icon-384x384.png      # Android XXXXL
    ├── icon-512x512.png      # Android XXXXXL + maskable
    └── logoBase.png          # Imagen base para generación
```

---

## 📚 Módulos Implementados

### 1. 🏠 Página Principal (`HomeView`)
- Grilla de 8 temas matemáticos con búsqueda en tiempo real
- 5 temas activos y 3 marcados como "Próximamente"
- Navegación fluida con `react-router-dom`
- Diseño oscuro con efecto glassmorphism

### 2. 🌡️ Introducción a Enteros (`IntroEnterosView`)
- **Termómetro interactivo** arrastrable (rango: -20°C a 30°C)
- Cambio de color dinámico: rojo (positivo), azul (negativo), gris (cero)
- Mini recta numérica sincronizada con el termómetro
- Datos curiosos rotativos según el signo del número
- Botones ▲▼ para ajuste fino + arrastre directo
- Soporte táctil completo

### 3. 🎲 Recta Numérica (`RectaNumericaView`)
- **Juego de 2 jugadores**: Avanzar (azul, +) vs. Retroceder (rojo, −)
- Dados animados con 1 o 2 dados (configurable)
- Rango de la recta: −30 a +30
- Fases del juego: lanzar → arrastrar → resultado
- Configuración de turnos por ronda (3, 4 o 5)
- Estadísticas de aciertos y errores por jugador
- Pantalla de resultados finales con precisión porcentual
- Animaciones CSS: dados giratorios, pulso, sacudida en error

### 4. ➕ Suma de Enteros (`SumaEnterosView`)
- **Fichas azules (+1) y rojas (−1)** con sistema de cancelación de pares
- 3 fases: configuración → juego (arrastrar para cancelar) → resultado
- Arrastrar una ficha +1 sobre una −1 las cancela con animación de explosión
- Botón de cancelación automática de pares
- Vista previa de la ecuación antes de generar fichas
- Conteo en vivo de fichas positivas/negativas restantes

### 5. ➖ Resta de Enteros (`RestaEnterosView`)
- Enseña que **restar = sumar el opuesto**
- 4 fases: configuración → voltear fichas del sustraendo → cancelar pares → resultado
- Fichas del sustraendo marcadas con "S"; se voltean con doble clic o botón
- División visual del área: minuendo (izquierda) | sustraendo (derecha)
- Animación de volteo de fichas (flip) con cambio de color
- Resumen pedagógico mostrando la transformación de la resta en suma

### 6. ✖️ Multiplicación de Enteros (`ProductoEnteroView`)
- Enseña **a × b como "a veces el b"** (agrupación y conteo)
- 5 fases: configuración → construir grupos (arrastrar a columnas) → voltear (si a < 0) → contar → resultado
- Grilla de 9 columnas donde el estudiante organiza las fichas
- Validación en tiempo real de si los grupos están correctamente formados
- Si el primer factor es negativo, las fichas se invierten de color
- Regla de signos: iguales → positivo, diferentes → negativo

### 7. 🫙 Las Tres Jarras (`TresJarrasView`)
- **Juego de lógica matemática**: Problema clásico de trasvase de agua
- 3 jarras interactivas con SVG animados: 8L (llena), 5L y 3L (vacías)
- Sistema drag & drop completo para trasvasar agua entre jarras
- Soporte táctil completo para dispositivos móviles y tablets
- Registro automático de pasos con tabla en tiempo real
- Contador de movimientos para optimizar la solución
- Solución paso a paso disponible como referencia
- Validaciones: jarra vacía, jarra llena
- Mensaje de éxito al lograr el objetivo (4L en Jarra A y Jarra B)
- Layout responsivo optimizado: 60% juego / 40% registro (pantalla grande)
- Animaciones suaves de agua con transiciones CSS
- Efectos visuales de arrastre: escala, brillo, sombra
- Jarras 20% más grandes para mejor visibilidad

### 8. 🐟 Los Tres Pescados (`TresPescadosView`)
- **Juego de optimización de tiempo**: Fríe 3 pescados en el menor tiempo posible
- 3 pescados con SVG animados, cada uno con 2 caras (A y B)
- Sistema drag & drop completo para mover pescados entre platos y sartén
- Soporte táctil completo para dispositivos móviles y tablets
- Timer en tiempo real con conteo de minutos y segundos
- Límite de 2 pescados en la sartén simultáneamente
- Tiempo mínimo requerido: 1 minuto por cara (3 minutos óptimo)
- Doble clic para voltear pescados en la sartén
- Auto-cocción de caras después de 1 minuto
- Barra de progreso mostrando caras fritas (0/6)
- Validaciones: espacio ocupado, pescado sin cocinar completamente
- Mensaje de victoria con tiempo y verificación de óptimo
- Animaciones de vapor cuando el juego está en curso
- Puntos de estado (dots) indicando caras cocinadas (marrón = frita, naranja = cruda)
- Layout responsivo optimizado para tablets, móviles y pantallas grandes

### 9. 🌾 El Granjero y el Río (`GranjeroRioView`)
- **Juego de lógica matemática**: Problema clásico del granjero y el río
- 3 personajes interactivos: Zorro, Gallina y Maíz
- Bote animado con SVG que se mueve entre orillas
- Sistema drag & drop completo para mover personajes
- Soporte táctil completo para dispositivos móviles y tablets
- Reglas de seguridad: Zorro + Gallina = 💀, Gallina + Maíz = 💀
- Contador de viajes para optimizar la solución (óptimo: 7 viajes)
- Registro automático de pasos con timeline en tiempo real
- Panel de pistas disponible con solución paso a paso
- Modal de victoria/derrota con feedback detallado
- Animaciones suaves: olas en el río, bote flotando
- Layout responsivo optimizado para tablets, móviles y pantallas grandes

### 10-12. 🚧 Módulos Pendientes
- **Fracciones** — Placeholder
- **Decimales** — Placeholder
- **Porcentajes** — Placeholder

---

## 🎨 Diseño y UX

- **Tema oscuro** con fondo `#080c18` y acentos de color (azul, rojo, teal, ámbar)
- **Tipografías**: Nunito (UI), JetBrains Mono (números), Space Mono (termómetro), Outfit (alternativa)
- **Animaciones CSS personalizadas**: `diceRoll`, `fadeUp`, `popIn`, `shake`, `pulseRing`, `explode`, `particle`, `floatChip`, `flipChip`, `pulse-hint`
- **Glassmorphism**: fondos semi-transparentes con `backdrop-blur`
- **Responsive**: diseño adaptativo con `clamp()`, `sm:` breakpoints y flexbox
- **Soporte táctil**: `touch-action: none`, eventos `onTouchStart/Move/End`, `onPointerDown/Move/Up`
- **Accesibilidad**: feedback visual inmediato (✅/❌), etiquetas claras, instrucciones contextuales

---

## 📊 Estado del Proyecto

| Módulo | Estado | Líneas de código | Interactividad |
|---|---|---|---|
| HomeView | ✅ Completo | ~89 | Búsqueda, navegación |
| IntroEnterosView | ✅ Completo | ~671 | Arrastre, botones |
| RectaNumericaView | ✅ Completo | ~843 | Dados, arrastre, juego por turnos |
| SumaEnterosView | ✅ Completo | ~673 | Fichas arrastrables, cancelación |
| RestaEnterosView | ✅ Completo | ~839 | Fichas, volteo, cancelación |
| ProductoEnteroView | ✅ Completo | ~851 | Fichas, columnas, volteo, conteo |
| TresJarrasView | ✅ Completo | ~640 | Drag & drop, jarras SVG, registro |
| TresPescadosView | ✅ Completo | ~780 | Timer, drag & drop, pescados SVG |
| GranjeroRioView | ✅ Completo | ~580 | Drag & drop, bote SVG, lógica |
| FraccionesView | 🚧 Placeholder | ~29 | — |
| DecimalesView | 🚧 Placeholder | ~29 | — |
| PorcentajesView | 🚧 Placeholder | ~29 | — |

**Total de líneas de código (vistas activas):** ~5,966

---

## 🔑 Características Destacadas

1. **Aprendizaje kinestésico**: Los estudiantes arrastran fichas, mueven bolitas y voltean cartas para internalizar conceptos abstractos
2. **Feedback inmediato**: Animaciones de explosión al cancelar pares, sacudida en errores, pulso en elementos interactivos
3. **Progresión pedagógica**: De lo concreto (termómetro) a lo abstracto (recta numérica) a lo operatorio (suma, resta, multiplicación)
4. **Configurabilidad**: Número de dados, turnos por ronda, cantidad de fichas
5. **Sin dependencias externas de estado**: Toda la lógica es local a cada vista con `useState` y `useCallback`
6. **Despliegue continuo**: Configurado para Vercel (`vercel.json` incluido)

---

## 📱 Configuración PWA

La aplicación está completamente configurada como una **Progressive Web App (PWA)**:

### Manifiesto (`manifest.json`)
- **Nombre**: Matemática - Aprende de forma interactiva
- **Modo de visualización**: `standalone` (sin barra de navegador)
- **Colores**: Fondo `#080c18`, Tema `#863bff`
- **Orientación**: `portrait-primary` (optimizado para móviles)
- **Categorías**: education, utilities
- **Idioma**: español (es)

### Iconos PWA
- **8 tamaños generados**: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
- **Soporte iOS**: apple-touch-icon.png (180x180)
- **Iconos maskable**: Adaptables a diferentes formas de dispositivos
- **Script de generación**: `scripts/generate-pwa-icons.mjs` usando Sharp

### Service Worker
- **Archivo**: `public/sw.js` (offline support)
- **Cache**: Estrategia de caché para recursos estáticos
- **Funcionamiento**: Permite usar la aplicación sin conexión a internet

### Scripts npm
```bash
npm run dev      # Servidor de desarrollo con hot reload (--host)
npm run build    # Compilación TypeScript + build de Vite
npm run lint     # Ejecución de ESLint
npm run preview  # Previsualización del build de producción
```

---

## 📚 Documentación Técnica

### Archivos de Documentación
- **`DICE_LOGIC.md`**: Documentación detallada (316 líneas) sobre la lógica aleatoria de los dados
  - Explicación del componente `DiceFace`
  - Algoritmo de generación de números aleatorios con `Math.random()`
  - Distribución de probabilidad para 1 y 2 dados
  - Flujo completo de animación (14 ticks × 80ms = 1.12 segundos)
  - Visualización de mensajes de feedback
  - Tabla comparativa de funcionalidades

### Archivos de Configuración
- **`vercel.json`**: Configuración de despliegue en Vercel con SPA routing
- **`eslint.config.js`**: Configuración de ESLint con reglas de React
- **`tsconfig.json`**: Configuración TypeScript (compilador)
- **`tsconfig.app.json`**: Configuración TypeScript para código de aplicación
- **`tsconfig.node.json`**: Configuración TypeScript para código de Node
- **`vite.config.ts`**: Configuración de Vite con plugin React

### Estructura de Rutas
La aplicación usa **React Router DOM v7** con `createBrowserRouter`:

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/` | `HomeView` | Página principal con grilla de temas |
| `/intro-enteros` | `IntroEnterosView` | Termómetro interactivo de enteros |
| `/recta-numerica` | `RectaNumericaView` | Juego de recta numérica con dados |
| `/suma-enteros` | `SumaEnterosView` | Suma de enteros con fichas |
| `/resta-enteros` | `RestaEnterosView` | Resta como suma del opuesto |
| `/producto-enteros` | `ProductoEnteroView` | Multiplicación por agrupación |
| `/tres-jarras` | `TresJarrasView` | Juego de lógica con tres jarras |
| `/tres-pescados` | `TresPescadosView` | Juego de optimización de tiempo con tres pescados |
| `/granjero-rio` | `GranjeroRioView` | Juego de lógica del granjero y el río |
| `/fracciones` | `FraccionesView` | 🚧 Próximamente |
| `/decimales` | `DecimalesView` | 🚧 Próximamente |
| `/porcentajes` | `PorcentajesView` | 🚧 Próximamente |

Todas las rutas están envueltas en el componente `Layout` que proporciona la estructura base de la aplicación.

---

## 📈 Oportunidades de Mejora

- **Completar módulos pendientes**: Fracciones, Decimales, Porcentajes
- **Integrar Zustand**: El store global está vacío; podría usarse para progreso del estudiante, configuraciones o persistencia
- **Tests unitarios**: No hay tests configurados actualmente (Vitest, Jest, React Testing Library)
- **Internacionalización (i18n)**: La UI está completamente en español; podría agregarse soporte multiidioma
- **Accesibilidad mejorada**: Mejorar soporte de lectores de pantalla (ARIA), navegación por teclado y contraste WCAG
- **Persistencia de progreso**: Guardar progreso, estadísticas y configuraciones en `localStorage` o base de datos
- **Sistema de logros/medallas**: Gamificación adicional para motivar el aprendizaje
- **Modo multijugador online**: Extender el juego de recta numérica para jugadores en línea (WebSocket, Firebase)
- **Dashboard de progreso**: Vista para estudiantes/maestros para ver estadísticas detalladas
- **Exportación de reportes**: Generación de reportes PDF de progreso del estudiante

---

## 🔗 Recursos Externos y Enlaces

### Dependencias Clave
- **React Docs**: https://react.dev
- **React Router DOM**: https://reactrouter.com
- **Tailwind CSS**: https://tailwindcss.com
- **Zustand**: https://zustand-demo.pmnd.rs
- **Vite**: https://vitejs.dev

### Herramientas de Desarrollo
- **TypeScript**: https://www.typescriptlang.org
- **ESLint**: https://eslint.org
- **Sharp**: https://sharp.pixelplumbing.com
- **Lucide Icons**: https://lucide.dev

---

*Documento actualizado el 13 de mayo de 2026*
</task_progress>
</write_to_file>