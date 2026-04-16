/*
Download photoreal placeholder images from picsum.photos for each screen, variant and layer.
Saves files to public/assets and updates levels/asset_manifest.json with generated filenames.

Run: node scripts/generate_placeholders.js
*/
const fs = require('fs')
const path = require('path')

const manifestPath = path.join(__dirname, '..', 'levels', 'asset_manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

const outDir = path.join(__dirname, '..', 'public', 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

const sizes = {
  bg_far: { w: 2048, h: 1152 },
  bg_mid: { w: 1600, h: 900 },
  bg_near: { w: 1024, h: 576 }
}

async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed ${res.status} ${url}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(dest, buf)
}

;(async () => {
  manifest.files = manifest.files || {}
  for (const id of manifest.screens) {
    for (const variant of manifest.variants) {
      for (const layer of manifest.layers) {
        const s = sizes[layer] || { w: 1024, h: 576 }
        const seed = `${id}_${variant}_${layer}`
        const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${s.w}/${s.h}`
        const fname = `${layer}_${id}_${variant}.png`
        const out = path.join(outDir, fname)
        try {
          if (fs.existsSync(out)) {
            console.log('Exists:', fname)
            manifest.files[fname] = 'exists'
            continue
          }
          console.log('Downloading', fname)
          await download(url, out)
          manifest.files[fname] = 'generated'
        } catch (e) {
          console.error('Failed', fname, e.message)
          manifest.files[fname] = 'error'
        }
      }
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  console.log('Done. Manifest updated:', manifestPath)
})().catch(e => { console.error(e); process.exit(1) })
