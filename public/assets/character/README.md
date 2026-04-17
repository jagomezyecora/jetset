Instrucciones para procesar la imagen del personaje

1) Copia la imagen originial que me pasaste como `character_source.png` a:

   public/assets/character_source.png

   La imagen debe tener 3 poses lado a lado (horizontal): izquierda | perfil | salto

2) Instala dependencias (si no tienes `sharp`):

   npm install --save-dev sharp

3) Ejecuta el script para generar los frames:

   node scripts/process_character.js

   Esto creará en `public/assets/character/` los PNG:
   - character_pose_left.png
   - character_pose_profile.png
   - character_pose_jump.png
   - character_idle_0..3.png
   - character_walk_0..5.png
   - character_jump_0..2.png

4) Integración en `MainScene` (ejemplo):

// Cargar dinamicamente (en `preload()` o `create()` async)
for (let i=0;i<4;i++) this.load.image(`char_idle_${i}`, `assets/character/character_idle_${i}.png`);
for (let i=0;i<6;i++) this.load.image(`char_walk_${i}`, `assets/character/character_walk_${i}.png`);
for (let i=0;i<3;i++) this.load.image(`char_jump_${i}`, `assets/character/character_jump_${i}.png`);
this.load.start();

// Crear animaciones (después de que las imágenes están listas)
this.anims.create({ key: 'player_idle', frames: Array.from({length:4}, (_,i)=>({ key: `char_idle_${i}` })), frameRate: 6, repeat: -1 });
this.anims.create({ key: 'player_walk', frames: Array.from({length:6}, (_,i)=>({ key: `char_walk_${i}` })), frameRate: 12, repeat: -1 });
this.anims.create({ key: 'player_jump', frames: Array.from({length:3}, (_,i)=>({ key: `char_jump_${i}` })), frameRate: 8, repeat: 0 });

// Crear el sprite del jugador y fijar pivote a los pies
const player = this.physics.add.sprite(x, y, 'char_idle_0');
player.setOrigin(0.5, 1); // pivote en los pies para mantener altura
player.anims.play('player_idle');

5) Notas:
- El script intenta mantener la misma altura (canvas) al centrar cada frame en un lienzo transparente del tamaño original de la columna.
- Si prefieres PNG con fondo transparente recortado a mano, puedes sustituir `character_pose_*.png` por tus PNGs recortados; el script y las animaciones funcionan igual.
- Si quieres, puedo aplicar directamente los cambios en `MainScene.ts` para que cargue estas imágenes automáticamente y use las animaciones. Dime si lo hago.
