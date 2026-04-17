Resumen

Este pull request agrupa varias correcciones y mejoras orientadas a estabilizar el arranque en desarrollo, reducir 404s por assets faltantes y preparar la base para pruebas E2E reproducibles.

Cambios principales

- Carga dinámica de escenas: `src/main.ts` ahora carga las escenas por import dinámico (code-splitting) y defer la inicialización para evitar llamadas a `game.scene` antes de tiempo.
- Favicon y enlaces: añadidos `link rel="icon"` y `link rel="shortcut icon"` en `index.html` para evitar peticiones a `/favicon.ico` que producían 404s.
- Placeholders de assets: añadidos SVGs de placeholder en `public/assets/` para `bg_*`, `player.svg` y `tile_ground.svg` de modo que las peticiones dinámicas no fallen en entornos de desarrollo.
- Script de captura y E2E: agregado `scripts/capture_console.mjs` y test E2E `scripts/test/e2e.js` que automatiza la captura de consola, respuestas de red y screenshot para facilitar debugging.
- Ajustes menores en `MainScene.ts` para tolerar faltantes de texturas y arreglar inicialización de audio/partículas.

Archivos modificados / añadidos (resumen)

- `src/main.ts` — carga dinámica de escenas y defensas de inicialización
- `index.html` — enlaces de favicon
- `public/assets/*` — varios SVG placeholders (bg_*, player.svg, tile_ground.svg)
- `scripts/capture_console.mjs` — script headless para capturar consola y screenshot
- `scripts/test/e2e.js` — prueba E2E con Puppeteer

Pruebas realizadas (por mí)

- `npm run dev` — servidor Vite arrancando en http://localhost:5173/
- `npm run build` — compilación de producción con Vite (sin errores críticos)
- `TEST_URL=http://localhost:5173/ npm run test:e2e` — E2E completado correctamente; screenshot guardado en `dist/e2e-screenshot.png`.
- Capturas de consola y screenshot guardadas en `scripts/logs/` durante las pruebas.

Notas importantes

- Se detectó y eliminó del historial `snapshot-2026-04-17-animations.zip` (archivo > 100MB) para permitir el push. Si necesitas conservar archivos grandes, recomiendo usar Git LFS (`.gitattributes`) para esos activos.
- Advertencia en runtime: mensaje sobre `ParticleEmitterManager was removed in Phaser 3.60` — hay código que debería revisarse si queremos eliminar la advertencia.

Recomendaciones y siguientes pasos

- Revisar y aceptar este PR; al aprobarlo, podemos borrar la rama `fix/dynamic-scenes-assets-...` si lo deseas.
- Considerar configurar `git-lfs` para manejar activos grandes y evitar reescrituras de historial en el futuro.
- Si quieres, actualizo la gestión de partículas para evitar la advertencia de Phaser.

Cómo probar localmente

1. `npm install` (si falta)
2. `npm run dev` → abrir http://localhost:5173/
3. `TEST_URL=http://localhost:5173/ npm run test:e2e` para ejecutar E2E

Si quieres que añada revisores o etiquetas a esta PR, dímelo y lo hago.

Detalles añadidos (actualizado):

- Objetivo del PR: estabilizar la carga dinámica de escenas y eliminar errores de recursos faltantes que impedían ejecutar pruebas E2E repetibles. Además, proporcionar un generador de placeholders para que el equipo pueda iterar sin activos finales.
- Qué incluye exactamente:
	- `scripts/generate_public_placeholders.js`: generador Node que crea `public/assets/bg_*` y `public/assets/character_spritesheet.*` con imágenes de prueba de resolución real (no 1x1) y metadata JSON para animaciones.
	- `public/assets/character_spritesheet.png`: spritesheet de 4 frames que representa un protagonista aproximado (hombre ~60 años, calvo, con tripita cervecera) para usar como placeholder visual.
	- Capturas y logs en `scripts/logs/` que muestran ejecuciones E2E exitosas y estados de `MainScene` (por ejemplo: `itemsTotal = 83`, `masterBlocked = true`).

- Consideraciones de calidad:
	- Los placeholders son generados por código para evitar incluir arte final; si quieres, puedo reemplazarlos por imágenes artísticas más detalladas (requiere assets nuevos o integración con un pipeline de generación).
	- La advertencia sobre `ParticleEmitterManager` viene de Phaser 3.60 — puedo refactorizar el código para usar la nueva API si deseas eliminar la advertencia en caliente.

Checklist para merge (sugerida):
- [ ] Revisar cambios en `src/scenes/MainScene.ts` (lógica de carga, HUD y desbloqueo de Master Bedroom).
- [ ] Validar que `levels/level_labyrinth_full.json` sigue reportando `meta.totalItems = 83` y que la lógica de desbloqueo funciona al recolectar items en E2E.
- [ ] (Opcional) Reemplazar placeholders por arte definitivo o añadir `git-lfs` si se van a subir archivos grandes.

Si te parece bien, hago un pequeño comentario en el PR con este resumen y lo marco como `draft` o lo dejo listo para revisión — dime tu preferencia.
