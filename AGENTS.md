# AGENTS.md — Matemática

## Commands

```bash
npm run dev       # Dev server with --host (LAN access)
npm run build     # tsc -b && vite build  — typecheck runs as part of build
npm run lint      # eslint .
npm run preview   # Preview production build
```

No test runner is configured.

## Architecture

- **Entry**: `src/main.tsx` → `App.tsx` → `AppRouter.tsx`
- **Routing**: React Router v7 with `createBrowserRouter` in `src/routes/AppRouter.tsx`
- **Views**: One file per view in `src/views/`, each a default-exported component
- **Layout**: Most routes wrap in `<Layout>`, but full-screen views (e.g. `RegletaFracionesView`) skip it
- **State**: All view logic uses `useState`/`useCallback` locally. Zustand store exists but is unused.
- **Types**: `src/types/index.ts` — `Topic` interface for HomeView cards

## Adding a new view

Follow `AddView.md` at the repo root. Checklist:
1. Create `src/views/NameView.tsx` with `export default` and a "← Volver" button using `useNavigate`
2. Register route in `src/routes/AppRouter.tsx` — wrap with `<Layout>` unless the view is full-screen
3. Add a `Topic` entry in `src/data/curriculum.ts` (assign it a `competency`), not in `HomeView`
4. Update `README.md` (file tree, status table, routes table)

## Receta de Diseño Responsive Multi-Pantalla (Tablets del gobierno, Celular y Laptop)

La mayoría de los usuarios abre la app en tablets del gobierno de **506×809 CSS px** (vertical) y **809×506** (horizontal), pero la aplicación también debe verse óptima y proporcionada en laptops/escritorio (≥1024 px) y celulares (<640 px).

### ⚠️ Reglas fundamentales
1. **CERO SCROLL en tablets y laptops**: La pantalla no debe hacer scroll vertical ni horizontal bajo ninguna circunstancia. Toda la actividad debe estar contenida en el viewport (`h-dvh overflow-hidden flex flex-col`). Las vistas a pantalla completa deben registrarse en `AppRouter.tsx` sin el wrapper `<Layout>`.
2. **NUNCA usar `sm:` o `md:` para separar tablet de laptop**: La tablet en orientación horizontal mide **809 px**, por lo que caería en `md:` (768 px). **Solo el prefijo `lg:` (≥1024 px)** aísla limpiamente laptops y monitores de escritorio sin alterar tablets ni celulares.
3. **Estrategia Mobile-First/Tablet-First**: La clase base (sin prefijo) es siempre la medida compacta y perfecta para la tablet (y móvil). Con `lg:` se incrementa el tamaño **solo un poco** para laptop.

---

### 📋 Tabla de Referencia de Componentes

| Componente | Tablet / Celular (Base) | Laptop / Escritorio (`lg:` ≥ 1024 px) | Notas / Buenas Prácticas |
|---|---|---|---|
| **Contenedor raíz** | `flex h-dvh flex-col overflow-hidden select-none` | (Mismo comportamiento) | Sin `<Layout>` wrapper |
| **Cabecera** | `h-9 px-2` (34-36 px) | `lg:h-11 lg:px-4` (44 px) | Botón Volver y Ayuda siempre en esquinas |
| **Botones de cabecera** | `h-7 w-7 rounded-lg` (28 px), icono 15 px | `lg:h-8 lg:w-8`, icono 17 px | En tablet ocultar textos largos |
| **Título de vista** | `text-[13px] font-bold` | `lg:text-[15px]` | Truncar si es muy largo |
| **Barra de herramientas/inputs** | `py-1 text-[11px]`, inputs `h-7 min-w-[64px]` | `lg:py-1.5 lg:text-xs`, inputs `lg:h-8 lg:min-w-[80px]` | Compacta en una sola línea horizontal |
| **Botón de acción en barra** | `h-7 px-2.5 text-[11px] font-bold` | `lg:h-8 lg:px-3.5 lg:text-xs` | E.g. "Generar", "Reiniciar" |
| **Estantes / Paneles laterales** | `w-[52px]` o `w-[60px]`, botones `w-10 h-10` | `lg:w-[68px]` a `lg:w-[72px]`, botones `lg:w-12 lg:h-11` | Fichas, números u operaciones arrastrables |
| **Área central (Tablero/Balanza)**| `max-w-[540px] max-h-[min(56vh,320px)]` | `lg:max-w-[760px] xl:max-w-[880px] lg:max-h-[min(65vh,480px)]` | En tablet pegar a la base (`items-end`); en laptop crece para no dejar vacíos |
| **Zonas de arrastre (*Drop zones*)** | Porcentajes relativos (`left: 2%`, `width: 34%`, `height: 70%`) | (Escalan automáticamente con el contenedor) | Resaltar con borde punteado `#38bdf8` al arrastrar sobre ellas |
| **Barra inferior (Acción y Feedback)** | `h-10 px-2 sm:px-3` (40 px) | `lg:h-12 lg:px-4` (48 px) | Feedback + botón principal juntos |
| **Botón de acción principal** | `h-7 px-3.5 text-[11px] font-bold` | `lg:h-8 lg:px-5 lg:text-xs font-bold` | E.g. "Operar", "Comprobar", "Jugar" |
| **Mensaje de feedback / badges** | `text-[10px] truncate max-w-full` | `lg:text-[11px] lg:py-1 lg:px-3` | Si hay victoria, resaltar con verde y animación |
| **Teclados virtuales / Editores** | **Popover flotante** (`absolute z-50 w-[270px]`) | `lg:w-[320px]`, teclas `lg:h-8 lg:text-xs` | **Nunca** empujar el layout hacia abajo; usar overlay con backdrop |
| **Modales (`ModalHelp`)** | `max-w-sm` o `max-w-md`, texto `text-xs`, botón `py-2` | (Mismo modal centrado con `max-w-md`) | Con `overflow-y-auto` interno |

---

### 🏗️ Estructura Esquemática Estándar (Plantilla)

```tsx
<div className="flex h-dvh flex-col overflow-hidden bg-[#080c18] text-white select-none">
  {/* 1. Header (34-44px) */}
  <header className="flex h-9 lg:h-11 shrink-0 items-center justify-between border-b border-white/10 px-2 lg:px-4 bg-[#0a0f1d]">
    {/* Botón volver, título, chips de estado, botón ayuda */}
  </header>

  {/* 2. Barra de entrada o control superior (36-42px) */}
  <div className="relative shrink-0 flex items-center justify-between gap-2 border-b border-white/5 bg-[#0d1424] px-2 lg:px-4 py-1 lg:py-1.5 text-[11px] lg:text-xs">
    {/* Inputs compactos, botón Generar, status pill, popover de teclado virtual si está activo */}
  </div>

  {/* 3. Área de trabajo central (flex-1 min-h-0) */}
  <div className="flex-1 min-h-0 flex items-stretch overflow-hidden px-1 sm:px-2 lg:px-4 py-1 lg:py-2 gap-1 sm:gap-2 lg:gap-3" style={{ touchAction: 'none' }}>
    {/* Panel izquierdo compacto (Fichas/Opciones): w-[52px] sm:w-[60px] lg:w-[68px] */}
    <aside className="w-[52px] sm:w-[60px] lg:w-[68px] shrink-0 ...">...</aside>

    {/* Espacio central de juego: flex-1 min-w-0 */}
    <main className="flex-1 min-w-0 flex flex-col items-center justify-between relative ...">
      {/* Contenedor responsivo del tablero/balanza/canvas */}
      <div className="relative w-full max-w-[540px] lg:max-w-[760px] xl:max-w-[880px] flex-1 min-h-0 flex items-end justify-center">
        {/* SVG o Canvas con drop zones en porcentaje */}
      </div>
      {/* Micro-leyenda compacta al pie del tablero */}
    </main>

    {/* Panel derecho compacto (Operaciones/Herramientas): w-[52px] sm:w-[60px] lg:w-[68px] */}
    <aside className="w-[52px] sm:w-[60px] lg:w-[68px] shrink-0 ...">...</aside>
  </div>

  {/* 4. Barra inferior de acción y feedback (40-48px) */}
  <footer className="h-10 lg:h-12 shrink-0 border-t border-white/10 px-2 sm:px-3 lg:px-4 bg-[#0a0f1d] flex items-center justify-between gap-2">
    {/* Mensaje de feedback / estado a la izquierda | Botón principal de acción a la derecha */}
  </footer>
</div>
```

Validar siempre con las dos orientaciones de la tablet (**506×809** y **809×506**) y en pantalla de laptop (**≥1024 px**) antes de dar por terminada una vista.

## Conventions

- **File naming**: `PascalCaseView.tsx` for views, matching component name
- **URL paths**: `kebab-case` (e.g. `/suma-enteros`)
- **Styling**: Tailwind CSS v4 with dark theme (`bg-[#080c18]`, `text-white`). No custom CSS files except `index.css`
- **Exports**: Always `export default`
- **TypeScript**: Strict mode (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`)
- **ESLint**: Flat config, React Hooks + React Refresh plugins. `dist/` is globally ignored
- **Fonts**: Nunito (UI), JetBrains Mono (numbers), Space Mono (thermometer)

## Deploy

- Vercel with SPA rewrites (`vercel.json`). No special build command — uses default `npm run build`
- PWA configured: `public/manifest.json`, `public/sw.js`, icons in `public/pwa-icons/`
- Regenerate PWA icons: `node scripts/generate-pwa-icons.mjs` (requires Sharp)
