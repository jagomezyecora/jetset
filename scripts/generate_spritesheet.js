/*
Script: generate_spritesheet.js
- Lee los frames generados en: public/assets/character/
  (character_idle_*.png, character_walk_*.png, character_jump_*.png)
- Empaqueta los frames en un spritesheet de celdas iguales (configurable)
- Genera un JSON con el mapa de frames y metadatos (pivot center-bottom)

Usage:
  node scripts/generate_spritesheet.js [cellSize] [columns]
  e.g.: node scripts/generate_spritesheet.js 256 8

Output:
  public/assets/character_spritesheet.png
  public/assets/character_spritesheet.json

Requires: sharp (npm i --save-dev sharp)
*/

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CELL = parseInt(process.argv[2], 10) || 256;
const COLS_ARG = parseInt(process.argv[3], 10) || 8;

const FRAMES_DIR = path.join(__dirname, '..', 'public', 'assets', 'character');
const OUT_IMG = path.join(__dirname, '..', 'public', 'assets', 'character_spritesheet.png');
const OUT_JSON = path.join(__dirname, '..', 'public', 'assets', 'character_spritesheet.json');

if (!fs.existsSync(FRAMES_DIR)){
  console.error('No existe el directorio de frames:', FRAMES_DIR);
  console.error('Ejecuta primero scripts/process_character.js o coloca tus PNGs recortados en ese directorio');
  process.exit(1);
}

function collect(pattern){
  return fs.readdirSync(FRAMES_DIR).filter(f=>f.match(pattern)).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
}

const idle = collect(/^character_idle_\d+\.png$/);
const walk = collect(/^character_walk_\d+\.png$/);
const jump = collect(/^character_jump_\d+\.png$/);

const frames = [];

idle.forEach(f=>frames.push({name: `idle_${f.replace(/^character_idle_/, '').replace(/\.png$/,'')}`, file: path.join(FRAMES_DIR,f), srcName: f}));
walk.forEach(f=>frames.push({name: `walk_${f.replace(/^character_walk_/, '').replace(/\.png$/,'')}`, file: path.join(FRAMES_DIR,f), srcName: f}));
jump.forEach(f=>frames.push({name: `jump_${f.replace(/^character_jump_/, '').replace(/\.png$/,'')}`, file: path.join(FRAMES_DIR,f), srcName: f}));

if (frames.length === 0){
  console.error('No se encontraron frames en', FRAMES_DIR);
  process.exit(1);
}

const columns = Math.max(1, Math.min(COLS_ARG, frames.length));
const rows = Math.ceil(frames.length / columns);
const outWidth = columns * CELL;
const outHeight = rows * CELL;

(async ()=>{
  const canvas = sharp({ create: { width: outWidth, height: outHeight, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } });
  const composites = [];
  const json = { frames: {}, meta: { size: { w: outWidth, h: outHeight }, cell: CELL, pivot: { x:0.5, y:1.0 }, animations: {} } };

  for (let i=0;i<frames.length;i++){
    const f = frames[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = col * CELL;
    const y = row * CELL;
    const buf = fs.readFileSync(f.file);
    const m = await sharp(buf).metadata();
    const left = Math.round(x + (CELL - m.width)/2);
    const top = Math.round(y + (CELL - m.height)/2);
    composites.push({ input: buf, left, top });
    json.frames[f.name] = { frame: { x: left, y: top, w: m.width, h: m.height }, spriteSourceSize: { x:0, y:0, w: m.width, h: m.height }, sourceSize: { w: CELL, h: CELL }, pivot: { x:0.5, y:1.0 }, srcFile: f.srcName };
  }

  // animations ranges (by name order)
  const idleNames = idle.map((f,i)=>`idle_${i}`);
  const walkNames = walk.map((f,i)=>`walk_${i}`);
  const jumpNames = jump.map((f,i)=>`jump_${i}`);
  if (idleNames.length) json.meta.animations.idle = idleNames;
  if (walkNames.length) json.meta.animations.walk = walkNames;
  if (jumpNames.length) json.meta.animations.jump = jumpNames;

  await canvas.composite(composites).png().toFile(OUT_IMG);
  fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 2));

  console.log('Spritesheet generado:', OUT_IMG);
  console.log('JSON generado:', OUT_JSON);
  console.log('Detalles: frames=', frames.length, 'cell=', CELL, 'cols=', columns, 'rows=', rows);
  console.log('\nImport tips: Use cell size', CELL, 'for slicing (equal cells). Pivot recommended: center-bottom (0.5,1.0).');
})();
