# JetSet - Prototype

Prototype scaffold: Phaser 3 + TypeScript + Vite.

Quick start

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` y prueba movimiento por teclado o tocando las zonas de la pantalla.

Notas:
- Los niveles están en `levels/level1.json` (formato simple: plataformas y objetos).
- El prototipo incluye control táctil y soporte PWA básico (manifest + service worker).
 - Hay un editor de niveles integrado (`Level Editor` en el menú) que permite dibujar plataformas, colocar objetos, importar/exportar JSON.
 - Optimizaciones: la configuración de Phaser usa `resolution` basada en `devicePixelRatio` y `antialias` activo para móviles; el service worker cachea assets comunes.
