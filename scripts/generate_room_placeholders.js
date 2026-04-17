// Script: generate_room_placeholders.js
// Generates simple PNG placeholders for interior rooms and writes to public/assets/rooms

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const outDir = path.resolve(__dirname, '..', 'public', 'assets', 'rooms')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

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
    scanlines[rowStart] = 0
    pixels.copy(scanlines, rowStart + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(scanlines)

  const sig = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0

  const ihdr = pngChunk('IHDR', ihdrData)
  const idatChunk = pngChunk('IDAT', idat)
  const iend = pngChunk('IEND', Buffer.alloc(0))
  const out = Buffer.concat([sig, ihdr, idatChunk, iend])
  fs.writeFileSync(filePath, out)
}

// Generate a set of room placeholders with different palettes and simple furnishings
const roomCount = 8
const w = 800, h = 600
const palettes = [
  { floor: [120, 90, 60], wall: [200, 185, 160], trim: [160, 120, 90] },
  { floor: [80, 80, 100], wall: [200, 210, 230], trim: [90, 110, 130] },
  { floor: [100, 60, 60], wall: [230, 220, 210], trim: [150, 90, 80] },
  { floor: [60, 80, 60], wall: [220, 235, 220], trim: [90, 130, 90] }
]

for (let i = 0; i < roomCount; i++) {
  const p = palettes[i % palettes.length]
  const name = `room_${String(i).padStart(2, '0')}.png`
  const outPath = path.join(outDir, name)
  writePNG(outPath, w, h, (x, y, W, H) => {
    // walls gradient
    const t = y / (H - 1)
    const wall = p.wall
    const r = Math.round(wall[0] * (0.85 + 0.15 * (1 - t)))
    const g = Math.round(wall[1] * (0.85 + 0.15 * (1 - t)))
    const b = Math.round(wall[2] * (0.85 + 0.15 * (1 - t)))

    // floor area at bottom
    if (y > H * 0.65) {
      const f = p.floor
      const fx = Math.floor(x / 40) % 2 === 0 ? Math.min(255, f[0] + 10) : f[0]
      const fy = Math.floor(y / 20) % 2 === 0 ? Math.min(255, f[1] + 8) : f[1]
      return { r: fx, g: fy, b: f[2], a: 255 }
    }

    // simple window or picture depending on room index
    if (i % 2 === 0) {
      // window: bright rectangle on upper-left
      if (x > 60 && x < 220 && y > 60 && y < 200) return { r: 180, g: 220, b: 255, a: 255 }
    } else {
      // painting: small dark rectangle
      if (x > W - 220 && x < W - 80 && y > 80 && y < 180) return { r: 100, g: 70, b: 60, a: 255 }
    }

    // simple furniture: rectangle couch/bed
    if (y > H * 0.45 && y < H * 0.55 && x > W * 0.25 && x < W * 0.75) {
      const tr = p.trim
      return { r: tr[0], g: tr[1], b: tr[2], a: 255 }
    }

    return { r, g, b, a: 255 }
  })
  console.log('wrote', outPath)
}

console.log('Room placeholders generated in', outDir)
