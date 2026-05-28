# Guía: Cómo agregar una nueva vista al proyecto

> **Para IAs y desarrolladores**: Instrucciones paso a paso para crear e integrar una nueva vista en la aplicación.

---

## Estructura relevante del proyecto

```
src/
├── routes/
│   └── AppRouter.tsx          # ← Registrar la ruta aquí
├── types/
│   └── index.ts               # ← Interface Topic (usada en HomeView)
└── views/
    └── NuevaView.tsx          # ← Crear el componente aquí
```

---

## Paso 1: Crear el archivo de la vista

Crear el archivo en `src/views/NuevaView.tsx` con esta estructura base:

```tsx
import { useNavigate } from 'react-router-dom';

const NuevaView = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-dvh bg-[#080c18] text-white">
            {/* ── Header con botón Volver ── */}
            <div className="relative flex items-center justify-center px-4 pt-4 pb-2">
                <button
                    onClick={() => navigate(-1)}
                    className="absolute left-4 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-semibold hover:bg-white/20 active:scale-95 transition-all"
                    title="Volver"
                >
                    ← Volver
                </button>
                <h1 className="text-lg font-bold">Título de la Vista</h1>
            </div>

            {/* ── Contenido principal ── */}
            <div className="px-4 py-4">
                {/* Tu contenido aquí */}
            </div>
        </div>
    );
};

export default NuevaView;
```

### ⚠️ Importante: El botón Volver

El botón "← Volver" es **obligatorio** en toda vista. Debe usar `useNavigate` de `react-router-dom`:

```tsx
import { useNavigate } from 'react-router-dom';
// ...
const navigate = useNavigate();
// ...
<button onClick={() => navigate(-1)}>← Volver</button>
```

Si la vista usa su propio layout full-screen (como `RegletaFracionesView`), el botón Volver se coloca dentro del header de la vista. Si usa el `Layout` wrapper, el Layout ya puede incluirlo.

---

## Paso 2: Registrar la ruta en AppRouter.tsx

Abrir `src/routes/AppRouter.tsx` y hacer dos cosas:

### 2a. Agregar el import

```tsx
import NuevaView from '../views/NuevaView'
```

### 2b. Agregar la ruta al array `createBrowserRouter`

```tsx
{
    path: '/nueva-ruta',
    element: <Layout><NuevaView /></Layout>
}
```

> **Nota**: Si la vista maneja su propio layout full-screen (altura `100dvh`), NO envolver con `<Layout>`:
> ```tsx
> {
>     path: '/nueva-ruta',
>     element: <NuevaView />
> }
> ```

---

## Paso 3: Agregar la tarjeta en HomeView.tsx

Abrir `src/views/HomeView.tsx` y agregar un nuevo objeto al array `topics`:

```tsx
{ id: 'nueva', path: '/nueva-ruta', title: 'Nombre de la Vista', description: 'Descripción breve', available: true },
```

- `available: true` → la tarjeta es clickeable y navega a la ruta
- `available: false` → la tarjeta muestra "Próximamente" y está deshabilitada

---

## Paso 4: Actualizar README.md

Agregar la nueva vista en 3 lugares del README:

### 4a. En la estructura de archivos (árbol de directorios)
```
└── views/
    ├── ...
    ├── NuevaView.tsx          # Descripción breve
```

### 4b. En la tabla de estado del proyecto
```
| NuevaView | ✅ Completo | ~XXX | Descripción de interactividad |
```

### 4c. En la tabla de rutas
```
| `/nueva-ruta` | `NuevaView` | Descripción breve |
```

---

## Checklist de verificación

- [ ] El archivo `src/views/NuevaView.tsx` existe y exporta default el componente
- [ ] El botón "← Volver" funciona con `useNavigate`
- [ ] La ruta está registrada en `src/routes/AppRouter.tsx`
- [ ] La tarjeta aparece en `src/views/HomeView.tsx` con `available: true`
- [ ] El `README.md` está actualizado (estructura, estado, rutas)
- [ ] `npm run build` compila sin errores

---

## Convenciones del proyecto

| Convención | Ejemplo |
|---|---|
| Nombre del archivo | `PascalCase` + `View.tsx` (ej: `SumaEnterosView.tsx`) |
| Nombre del componente | Mismo que el archivo: `SumaEnterosView` |
| Ruta URL | `kebab-case` (ej: `/suma-enteros`) |
| Export | Siempre `export default` |
| Estilos | Tailwind CSS con tema oscuro (`bg-[#080c18]`, `text-white`) |
| Estado local | `useState` + `useCallback` (no Zustand por ahora) |
| Tipado | TypeScript estricto con interfaces definidas |