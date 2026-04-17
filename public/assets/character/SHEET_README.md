Spritesheet y guía de importación

Este repositorio contiene utilidades para generar un spritesheet a partir de frames individuales.

Archivos relevantes:
- `public/assets/character/` : carpeta con PNGs por frame (generados por `scripts/process_character.js` o recortados a mano).
- `public/assets/character_spritesheet.png` : spritesheet compilado (creado por `scripts/generate_spritesheet.js`).
- `public/assets/character_spritesheet.json` : JSON con coordenadas de cada frame, pivot y animaciones sugeridas.

Recomendaciones para motores (Unity / Godot / otros):

1) Tamaño de celda / slicing
- El script empaqueta en celdas iguales. El tamaño por defecto es `256x256`.
- Para usar en Unity/Godot, importa `character_spritesheet.png` y divide (slice) usando la misma celda: p.ej. `256x256`.
- Cada celda contiene 1 frame (sprite).

2) Animaciones recomendadas
- idle: 2–3 frames (loop)
- walk: 6–8 frames (loop)
- jump: 3 frames (inicio, aire, caída)

El archivo `character_spritesheet.json` incluye un bloque `meta.animations` con las listas de nombres de frames en el orden que fueron empaquetados. Puedes mapearlos fácilmente en tu editor de animaciones.

3) Pivot (ancla)
- Usar `Pivot = Center-Bottom` (centro en X, fondo en Y) — evita "saltos" verticales al cambiar animación.
- En Unity: en el Sprite Editor, establece Pivot en `Custom` y pon X=0.5, Y=0.0 (o píxeles equivalentes si se requiere).
- En Godot: al crear el SpriteFrames, ajusta `offset` o `centered = false` y usa `position.y` como pies.

4) Cómo regenerar el spritesheet
- Genera frames con `node scripts/process_character.js` (si usas la imagen source). Luego ejecuta:

```bash
node scripts/generate_spritesheet.js 256 8
```

- Opciones: primer parámetro = `cell size` (px), segundo parámetro = `columns`.

5) Integración rápida en Phaser (ejemplo)
- Cargar spritesheet y JSON (preload):
```js
this.load.image('character_spritesheet', 'assets/character_spritesheet.png');
this.load.json('character_spritesheet_json', 'assets/character_spritesheet.json');
```
- Crear animaciones leyendo `character_spritesheet_json` y usando `this.textures.addSpriteSheetFromAtlas()` o `this.textures.addSpriteSheet(...)` según necesites.

6) Notas
- Si ya tienes PNGs con fondo transparente y tamaños precisos, puedes omitir el `process_character.js` y quedarte con tus frames en `public/assets/character/`.
- Si quieres, puedo actualizar `src/scenes/MainScene.ts` para que cargue el spritesheet y cree las animaciones automáticamente (con `setOrigin(0.5,1)`). Dime si lo hago.
