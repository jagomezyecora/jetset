/*
Script: process_character.js
- Input: place the provided source image at `public/assets/character_source.png` (single image with 3 poses side-by-side: left, profile, jump)
- Output: generates per-frame PNGs in `public/assets/character/`:
  - character_idle_0..3.png
  - character_walk_0..5.png
  - character_jump_0..2.png

Requires: sharp (npm i -D sharp)
Usage: node scripts/process_character.js
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC = path.join(__dirname, '..', 'public', 'assets', 'character_source.png');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'character');

if (!fs.existsSync(SRC)) {
  console.error('Error: coloca la imagen fuente en', SRC);
  console.error('La imagen debe contener 3 poses horizontales: izquierda | perfil | salto');
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async function main(){
  const img = sharp(SRC);
  const meta = await img.metadata();
  const W = meta.width;
  const H = meta.height;
  const COL = Math.floor(W / 3);
  console.log('Fuente:', SRC, 'W,H=', W, H, 'colWidth=', COL);

  // Extract 3 poses
  const poseNames = ['left','profile','jump'];
  for (let i=0;i<3;i++){
    const left = i * COL;
    const out = path.join(OUT_DIR, `character_pose_${poseNames[i]}.png`);
    await img.extract({ left, top: 0, width: COL, height: H }).png().toFile(out);
    console.log('Pose creada:', out);
  }

  // Helper: center a resized version into original canvas (W=COL, H)
  async function makeFrameFromBase(basePath, transformFn, outPath){
    const baseBuf = await fs.promises.readFile(basePath);
    const transformed = await transformFn(baseBuf, COL, H);
    const transformedMeta = await sharp(transformed).metadata();
    const canvas = sharp({ create: { width: COL, height: H, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } });
    await canvas.composite([{ input: transformed, left: Math.round((COL - transformedMeta.width)/2), top: Math.round((H - transformedMeta.height)/2) }]).png().toFile(outPath);
  }

  // IDLE: 4 frames - slight vertical scaling to simulate breathing
  const profilePath = path.join(OUT_DIR, 'character_pose_profile.png');
  const idleFrames = 4;
  for (let f=0; f<idleFrames; f++){
    const out = path.join(OUT_DIR, `character_idle_${f}.png`);
    const scale = 1 + ((f % 2 === 0) ? -0.02 : 0.02); // alternate small scale
    await makeFrameFromBase(profilePath, async (buf, w, h) => {
      const newW = Math.max(1, Math.round(w * scale));
      const newH = Math.max(1, Math.round(h * scale));
      return await sharp(buf).resize(newW, newH, { fit: 'contain' }).png().toBuffer();
    }, out);
    console.log('Idle frame:', out);
  }

  // WALK: 6 frames - horizontal shifts and small vertical variation
  const walkFrames = 6;
  for (let f=0; f<walkFrames; f++){
    const out = path.join(OUT_DIR, `character_walk_${f}.png`);
    const xShift = Math.round(Math.sin((f / walkFrames) * Math.PI * 2) * 6); // -6..6 px
    const yScale = 1 + (Math.cos((f / walkFrames) * Math.PI * 2) * 0.015);
    // create resized temporary
    const baseBuf = await fs.promises.readFile(profilePath);
    const newW = Math.max(1, Math.round(COL * yScale));
    const newH = Math.max(1, Math.round(H * yScale));
    const resized = await sharp(baseBuf).resize(newW, newH).png().toBuffer();
    // composite with shift
    const canvas = sharp({ create: { width: COL, height: H, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } });
    const left = Math.round((COL - newW)/2) + xShift;
    const top = Math.round((H - newH)/2);
    await canvas.composite([{ input: resized, left, top }]).png().toFile(out);
    console.log('Walk frame:', out, 'xShift=', xShift);
  }

  // JUMP: 3 frames - start (profile slightly up), air (jump pose), fall (jump pose slightly down)
  const jumpBase = path.join(OUT_DIR, 'character_pose_jump.png');
  // start
  const jumpStart = path.join(OUT_DIR, `character_jump_0.png`);
  await makeFrameFromBase(profilePath, async (buf,w,h)=>{
    const newH = Math.max(1, Math.round(h * 0.98));
    const newW = Math.max(1, Math.round(COL * 0.99));
    return await sharp(buf).resize(newW, newH).png().toBuffer();
  }, jumpStart);
  console.log('Jump start:', jumpStart);
  // air
  const jumpAir = path.join(OUT_DIR, `character_jump_1.png`);
  await makeFrameFromBase(jumpBase, async (buf)=>buf, jumpAir);
  console.log('Jump air:', jumpAir);
  // fall
  const jumpFall = path.join(OUT_DIR, `character_jump_2.png`);
  await makeFrameFromBase(jumpBase, async (buf,w,h)=>{
    const newH = Math.max(1, Math.round(h * 1.00));
    return await sharp(buf).resize(Math.round(COL*1.00), newH).png().toBuffer();
  }, jumpFall);
  console.log('Jump fall:', jumpFall);

  console.log('\nHecho. Frames guardados en', OUT_DIR);
  console.log('Siguientes pasos:');
  console.log('- Coloca la imagen original en public/assets/character_source.png');
  console.log('- Ejecuta: npx node scripts/process_character.js');
  console.log('- En `MainScene` o `preload` carga las imágenes resultantes y crea animaciones: idle (4 frames), walk (6 frames), jump (3 frames)');
  console.log('- Ajusta el origen del sprite a `setOrigin(0.5, 1)` para mantener pivote en los pies y misma altura entre animaciones.');
})();
