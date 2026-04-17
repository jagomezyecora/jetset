// Script: generate_public_placeholders.js
// Generates PNG placeholders for bg_* variants and a character spritesheet (4x28x44)

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const outDir = path.resolve(__dirname, '..', 'public', 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// Minimal CRC32 implementation for PNG chunk CRCs
function crc32(buf) {
  let table = crc32.table
  if (!table) {
    table = crc32.table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)) >>> 0
      table[i] = c
    }
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const chunkType = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.concat([chunkType, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcBuf), 0)
  return Buffer.concat([len, chunkType, data, crc])
}

function writePNG(filePath, width, height, drawPixel) {
  const pixels = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const px = drawPixel(x, y, width, height) || { r: 0, g: 0, b: 0, a: 0 }
      pixels[idx] = px.r
      pixels[idx + 1] = px.g
      pixels[idx + 2] = px.b
      pixels[idx + 3] = px.a
    }
  }

  const scanlines = Buffer.alloc((1 + width * 4) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4)
    scanlines[rowStart] = 0 // no filter
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(scanlines)

  const sig = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8 // bit depth
  ihdrData[9] = 6 // color type RGBA
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const ihdr = pngChunk('IHDR', ihdrData)
  const idatChunk = pngChunk('IDAT', idat)
  const iend = pngChunk('IEND', Buffer.alloc(0))
  const out = Buffer.concat([sig, ihdr, idatChunk, iend])
  fs.writeFileSync(filePath, out)
}

const variants = ['day', 'night', 'snow']
const layers = ['far', 'mid', 'near']

for (const v of variants) {
  for (const l of layers) {
    let w = 1024, h = 256
    if (l === 'near') h = 512
    const name = `bg_${l}_${v}.png`
    const p = path.join(outDir, name)
    writePNG(p, w, h, (x, y, W, H) => {
      let base = { day: [180, 220, 255], night: [24, 36, 88], snow: [230, 240, 250] }[v]
      const t = y / (H - 1)
      const r = Math.round(base[0] * (0.7 + 0.3 * (1 - t)))
      const g = Math.round(base[1] * (0.7 + 0.3 * (1 - t)))
      const b = Math.round(base[2] * (0.7 + 0.3 * (1 - t)))
      const stripe = (l === 'mid' && (Math.floor(x / 64) % 2 === 0)) ? 10 : 0
      return { r: Math.min(255, r + stripe), g: Math.min(255, g + stripe), b: Math.min(255, b + stripe), a: 255 }
    })
    console.log('wrote', p)
  }
}

// character spritesheet: 4 frames of 28x44 -> width 112 x height 44
const charW = 28 * 4
const charH = 44
const charPath = path.join(outDir, 'character_spritesheet.png')
writePNG(charPath, charW, charH, (x, y, W, H) => {
  // Draw a stylized ~60yo bald man with slight beer belly per frame
  const frame = Math.floor(x / 28)
  const fx = x % 28
  const fy = y
  // skin, shirt, pants colors
  const skin = { r: 241, g: 194, b: 125 }
  const shirt = { r: 153, g: 76, b: 46 } // brownish
  const pants = { r: 60, g: 60, b: 80 }

  // head circle
  const hx = 14
  const hy = 10
  const hr = 7
  const dx = fx - hx
  const dy = fy - hy
  if (dx*dx + dy*dy <= hr*hr) {
    return { r: skin.r, g: skin.g, b: skin.b, a: 255 }
  }

  // glasses (small dark circles) and eyes
  if (fy >= 9 && fy <= 13) {
    if ((Math.abs(fx - 10) <= 1) || (Math.abs(fx - 18) <= 1)) return { r: 34, g: 34, b: 34, a: 255 }
  }

  // slight stubble under chin
  if (fy >= 14 && fy <= 16 && Math.abs(fx - 14) <= 4) return { r: 100, g: 70, b: 60, a: 255 }

  // torso / shirt with belly ellipse
  const bx = 14
  const by = 34
  const brx = 9
  const bry = 11
  const dx2 = fx - bx
  const dy2 = fy - by
  if ((dx2*dx2)/(brx*brx) + (dy2*dy2)/(bry*bry) <= 1) {
    // highlight for belly center
    const dist = Math.sqrt(dx2*dx2 + dy2*dy2)
    const shade = Math.max(0, 30 - Math.floor(dist))
    return { r: Math.min(255, shirt.r + shade), g: Math.min(255, shirt.g + shade), b: Math.min(255, shirt.b + shade), a: 255 }
  }

  // collar and upper shirt rectangle
  if (fy >= 22 && fy <= 30 && fx >= 6 && fx <= 22) return { r: shirt.r, g: shirt.g, b: shirt.b, a: 255 }

  // pants
  if (fy >= 36 && fx >= 6 && fx <= 22) return { r: pants.r, g: pants.g, b: pants.b, a: 255 }

  // transparent elsewhere
  return { r: 0, g: 0, b: 0, a: 0 }
})
console.log('wrote', charPath)

const meta = {
  meta: {
    cell: 28,
    animations: {
      idle: ["frame_0"],
      walk: ["frame_0","frame_1","frame_2","frame_3"],
      jump: ["frame_2"]
    }
  },
  frames: {
    frame_0: { frame: { x:0, y:0, w:28, h:44 } },
    frame_1: { frame: { x:28, y:0, w:28, h:44 } },
    frame_2: { frame: { x:56, y:0, w:28, h:44 } },
    frame_3: { frame: { x:84, y:0, w:28, h:44 } }
  }
}
fs.writeFileSync(path.join(outDir, 'character_spritesheet.json'), JSON.stringify(meta, null, 2))
console.log('wrote character_spritesheet.json')

console.log('Placeholder assets generated in', outDir)
