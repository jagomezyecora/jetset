He añadido placeholders de habitaciones y scripts de integración:

- `scripts/generate_room_placeholders.js` — genera 8 imágenes en `public/assets/rooms/`.
- `scripts/link_room_assets.js` — copia esas imágenes como `public/assets/bg_near_{roomId}_{variant}.png` para que `MainScene` las cargue.
- Archivos añadidos: `public/assets/rooms/room_00.png` … `room_07.png` y `public/assets/bg_near_room_{XX}_*.png`.

También:
- Refactor: uso de `gotoScreen` para navegación segura entre pantallas.
- Refactor partículas: evitada la creación de `ParticleEmitterManager` en Phaser 3.60, ahora hay un fallback ligero.
- Tests/E2E: añadidos y verificables (`scripts/debug_screen_transition.js`, `scripts/debug_start_jsw.js`, `scripts/e2e_unlock_masterbedroom.js`).

Resultados y artefactos:
- Capturas: `scripts/logs/debug_start_jsw.png`, `scripts/logs/debug_screen_transition.png`, `scripts/logs/e2e_unlock_room23.png`.
- Rama: `fix/dynamic-scenes-assets-20260417081634` (commits empujados).

Siguientes pasos sugeridos:
- Revisar `src/scenes/MainScene.ts` (partículas y ajustes UI).
- (Opcional) Reemplazar placeholders por arte final y considerar `git-lfs` para assets grandes.

Si quieres que publique este comentario directamente en el PR, puedo hacerlo con un token que permita comentarios en PRs.
