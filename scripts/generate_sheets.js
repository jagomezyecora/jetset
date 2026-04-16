/*
Generate simple 4-frame player sprite sheets from existing near-background placeholders.
Requires `sharp` installed (already in devDependencies).
Usage: node scripts/generate_sheets.js
This will create `public/assets/player_sheet_<id>_<variant>.png` for each screen in asset_manifest.json
and update `levels/asset_manifest.json` with the new filenames.
*/
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const root = path.join(__dirname, '..')
const manifestPath = path.join(root, 'levels', 'asset_manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const outDir = path.join(root, 'public', 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function makeSheet(id, variant) {
  const src = path.join(outDir, `bg_near_${id}_${variant}.png`)
  if (!fs.existsSync(src)) return null
  try {
    const frameW = 28
    const frameH = 44
    const frames = []
    for (let i = 0; i < 4; i++) {
      // resize and slightly offset crop to simulate frames
      const buf = await sharp(src).resize(frameW + i*2, frameH + i*1).toBuffer()
      // center crop to frameW x frameH
      const crop = await sharp(buf).extract({ left: 0, top: 0, width: frameW, height: frameH }).toBuffer()
      frames.push(crop)
    }
    // join horizontally
    const composite = await sharp({ create: { width: frameW * frames.length, height: frameH, channels: 4, background: { r:0, g:0, b:0, alpha:0 } } })
      .composite(frames.map((b, i) => ({ input: b, left: i * frameW, top: 0 })))
      .png()
      .toBuffer()

    const outName = `player_sheet_${id}_${variant}.png`
    const outPath = path.join(outDir, outName)
    fs.writeFileSync(outPath, composite)
    manifest.files[outName] = 'generated'
    console.log('Created', outName)
    return outName
  } catch (e) {
    console.error('Failed to create sheet for', id, variant, e.message)
    return null
  }
}

;(async () => {
  for (const id of manifest.screens) {
    for (const variant of manifest.variants) {
      const exists = manifest.files[`player_sheet_${id}_${variant}.png`]
      if (exists) { console.log('Already:', `player_sheet_${id}_${variant}.png`); continue }
      await makeSheet(id, variant)
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log('Done: updated manifest at', manifestPath)
})()
