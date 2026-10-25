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

## Diseño para tablets del gobierno (obligatorio en vistas nuevas)

La mayoría de los usuarios abre la app en tablets del gobierno de **506×809 CSS px** (vertical) y **809×506** (horizontal). La pantalla no hace scroll: el área de trabajo se maximiza y los controles van compactos pero tocables.

**Tamaños de referencia** (probados en GeoplanoView):
- **Botones**: base compacto — barra inferior `h-6` (24 px), cabecera `h-7 w-7` (28 px); tamaño grande solo con **`lg:`** (`lg:h-8` = 32 px) para escritorio ≥1024 px
- **NUNCA usar `sm:`/`md:`** para separar tablet de escritorio: la tablet en horizontal mide 809 px y caería en `md:` (768 px). Solo `lg:` (1024 px) la deja fuera
- **Letras**: título de vista 13-14 px (`text-[13px] sm:text-sm`), textos/etiquetas 10-11 px (`text-[10px]`/`text-[11px]`), pistas secundarias 9-10 px
- **Iconos** (lucide-react): 12-16 px; 14 px dentro de botones de 24 px, 16 px en cabecera
- **Barras**: cabecera y pie de **33-45 px** de alto (`px-2 py-1` + contenido); el tablero/juego va en `flex-1 min-h-0` con `overflow-hidden` y vista raíz `h-dvh … overflow-hidden`
- **Textos de etiqueta** ("Volver", "Cerrar", etc.): ocultos en tablet con `hidden sm:inline`, solo icono
- **Overlays** sobre el área de juego: evitarlos o hacerlos mínimos (chips de 10 px); la información persistente va en la cabecera/pie
- **Modales**: `max-w-sm`/`max-w-md`, texto 11-12 px, botones de `py-2` con texto `text-[11px]`

Validar siempre con las dos orientaciones de la tablet (506×809 y 809×506) antes de dar por terminada la vista.

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
