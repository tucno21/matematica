# Guía de Funcionalidad Offline - PWA Matemática

## 📋 Resumen de Cambios

Se ha mejorado la configuración del PWA para que la aplicación funcione completamente sin conexión a internet. Los cambios principales incluyen:

### 1. Registro del Service Worker
**Archivo:** `src/main.tsx`
- Se agregó el registro automático del Service Worker al cargar la aplicación
- El Service Worker ahora se inicializa correctamente en tiempo de ejecución

### 2. Service Worker Mejorado (Offline-First)
**Archivo:** `public/sw.js`
- **Estrategia Cache-First:** Prioriza el contenido en caché para cargar más rápido
- **Versión actualizada:** Cache renombrado de `matematica-v1` a `matematica-v2`
- **Manejo de errores robusto:** No muestra errores visibles al usuario cuando no hay conexión
- **Caché dinámico:** Los recursos se guardan en caché mientras se usan
- **Fallback inteligente:** Si no hay conexión y no hay caché, responde de forma graceful

### 3. Manifest Actualizado
**Archivo:** `public/manifest.json`
- Se agregó `"offline_enabled": true` para indicar soporte offline

## 🎯 Estrategias de Caché Implementadas

### Para Navegación (Páginas HTML)
1. **Primero:** Buscar en caché
2. **Segundo:** Si no está en caché, intentar fetch de red
3. **Tercero:** Si falla la red, servir `index.html` como fallback

### Para Activos Estáticos (JS, CSS, Imágenes, Fuentes)
1. **Primero:** Buscar en caché
2. **Segundo:** Si no está en caché, intentar fetch de red
3. **Tercero:** Si falla la red, responder con 404 graceful

### Para Otros Recursos
1. **Primero:** Intentar fetch de red
2. **Segundo:** Si falla, usar caché como fallback
3. **Tercero:** Si no hay caché, responder con 503 (offline)

## 🧪 Cómo Probar la Funcionalidad Offline

### Opción 1: Usando npm run preview
```bash
npm run build
npm run preview
```

Luego:
1. Abre http://localhost:4173 en tu navegador
2. Navega por la aplicación para que se guarde en caché
3. Abre las DevTools (F12)
4. Ve a la pestaña "Network"
5. Cambia la velocidad a "Offline" o desconecta tu internet
6. Refresca la página - ¡Debería funcionar perfectamente!

### Opción 2: Instalando el PWA en el Dispositivo
1. Ejecuta `npm run preview`
2. Abre la aplicación en un navegador moderno (Chrome, Edge, Safari)
3. Busca el ícono de instalación en la barra de URL
4. Instala la aplicación como PWA
5. Una vez instalada, desconecta el internet
6. Abre la aplicación desde el escritorio/menú - ¡Funcionará offline!

### Opción 3: Usando un Servidor Local
```bash
npm install -g serve
npm run build
npx serve dist
```

Luego sigue los pasos de la Opción 1.

## 🔍 Verificación del Service Worker

En las DevTools (F12):

1. Ve a la pestaña **Application** → **Service Workers**
2. Verás el Service Worker `sw.js` activo y en estado "activated"
3. Verás el cache `matematica-v2` en **Application** → **Cache Storage**

## 📊 Archivos Cacheados

El Service Worker cachea automáticamente:
- ✅ HTML principal (`index.html`)
- ✅ JavaScript (`.js` files)
- ✅ CSS (`.css` files)
- ✅ Imágenes (`.png`, `.jpg`, `.svg`, `.webp`)
- ✅ Fuentes (`.woff`, `.woff2`, `.ttf`, `.eot`)
- ✅ Manifest y favicon
- ✅ Cualquier recurso solicitado durante el uso

## ⚠️ Notas Importantes

1. **Primera Carga:** La primera vez que se accede a la aplicación, se necesita conexión a internet para cachear todos los recursos.

2. **Actualizaciones:** Cuando actualizas la aplicación y haces `npm run build`, el Service Worker se actualiza automáticamente y invalida el cache antiguo.

3. **Almacenamiento:** Los archivos se almacenan en el cache del navegador. El límite varía según el navegador y el dispositivo.

4. **Sin Errores Visibles:** Ahora no verás mensajes de error cuando no hay conexión. La aplicación funcionará con los recursos disponibles en caché.

## 🚀 Para Producción

Antes de desplegar a producción:

1. Asegúrate de ejecutar `npm run build`
2. Despliega el contenido de la carpeta `dist/`
3. El Service Worker funcionará automáticamente en tu servidor de producción
4. Los usuarios podrán instalar el PWA y usarlo offline

## 🐛 Solución de Problemas

### El Service Worker no se registra
- Abre la consola del navegador y verifica si hay errores
- Asegúrate de estar usando HTTPS o localhost
- Verifica que el archivo `sw.js` esté accesible en `/sw.js`

### La aplicación no funciona offline
- Asegúrate de haber navegado por la aplicación al menos una vez con conexión
- Verifica en las DevTools que el cache esté poblado
- Limpia el cache y recarga la aplicación

### Errores de CORS
- Asegúrate de que el servidor tenga las cabeceras CORS correctas
- El Service Worker solo funciona en el mismo origen

## 📝 Log de Cambios

- ✅ Registro automático del Service Worker en `main.tsx`
- ✅ Estrategia cache-first para mejor rendimiento offline
- ✅ Manejo robusto de errores sin mensajes visibles
- ✅ Soporte para más tipos de archivos (webp, ttf, eot)
- ✅ Logs en consola para debugging
- ✅ Actualización del cache para forzar recarga de recursos
- ✅ Manifest con indicador de offline support

---

**¡Tu aplicación PWA ahora funciona completamente sin conexión a internet!** 🎉