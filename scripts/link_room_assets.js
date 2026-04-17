// Script: link_room_assets.js
// For each screen in levels/level_labyrinth_full.json create a bg_near_{id}_{variant}.png

const fs = require('fs')
const path = require('path')

const levelsPath = path.resolve(__dirname, '..', 'levels', 'level_labyrinth_full.json')
const roomsDir = path.resolve(__dirname, '..', 'public', 'assets', 'rooms')
const outDir = path.resolve(__dirname, '..', 'public', 'assets')

if (!fs.existsSync(levelsPath)) {
  console.error('levels file not found:', levelsPath)
  process.exit(1)
}

const data = JSON.parse(fs.readFileSync(levelsPath, 'utf8'))
const screens = data.screens || {}
let created = 0
for (const id of Object.keys(screens)) {
  const s = screens[id]
  const variant = s.variant || 'day'
  const roomFile = path.join(roomsDir, `${id}.png`)
  if (!fs.existsSync(roomFile)) continue
  const target = path.join(outDir, `bg_near_${id}_${variant}.png`)
  try {
    fs.copyFileSync(roomFile, target)
    console.log('wrote', target)
    created++
  } catch (e) {
    console.error('failed to copy', roomFile, e.message)
  }
}
console.log('Done. created', created, 'bg_near_* files')
