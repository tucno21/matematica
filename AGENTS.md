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
3. Add a `Topic` entry in `src/views/HomeView.tsx` `topics` array
4. Update `README.md` (file tree, status table, routes table)

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
