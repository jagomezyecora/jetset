Guía para generar e integrar assets fotoreales por pantalla

1) Propósito
- Generar imágenes fotorealistas y modernas inspiradas en las pantallas clásicas del juego.
- Las imágenes se usarán como capas `bg_far`, `bg_mid` y `bg_near` para cada pantalla.

2) Archivos clave
- `levels/art_prompts.json` — prompts por pantalla y por variante (day/night/snow).
- `scripts/generate_assets.js` — imprimirá comandos de ejemplo para generar imágenes con distintas APIs.

3) Flujo recomendado
- Ejecuta:

```powershell
node scripts/generate_assets.js --provider=openai --variant=day
```

- Esto imprimirá comandos `curl` para cada pantalla. Sustituye la variable `$OPENAI_API_KEY` por tu clave y ejecútalos.
- Genera 3 archivos por pantalla: `bg_far_<id>_day.png`, `bg_mid_<id>_day.png`, `bg_near_<id>_day.png` (ajusta si necesitas otras resoluciones).
- Coloca los PNG resultantes en `public/assets/`.

4) Integración automática
- `src/scenes/MainScene.ts` ahora intenta aplicar texturas específicas de cada pantalla cuando detecta `s.variant` y assets con nombres como `bg_far_<variant>` o `bg_near_<id>_<variant>`.
- Para lograr el mejor resultado, nombra las versiones generales por variante además de las específicas por pantalla.

5) Recomendaciones de prompt
- Mantén la referencia al original: "inspired by the classic platformer room layout of Jet Set Willy" para guiar la composición, pero pide "photorealistic, modern, cinematic lighting, ultra-detailed".
- Prueba con varias semillas y tamaños (1024x1024 o 2048x2048 según tu generador).

6) Opciones de proveedor
- OpenAI Images (DALL·E / gpt-image-1)
- Replicate (modelos Stable Diffusion)
- Stability.ai

7) Advertencias legales
- Asegúrate de que el uso de prompts que mencionan obras protegidas cumple con las políticas del proveedor y con derechos de autor. Si necesitas, puedo ayudarte a reescribir prompts que hagan referencia "inspirado en" sin mencionar el título exacto.
