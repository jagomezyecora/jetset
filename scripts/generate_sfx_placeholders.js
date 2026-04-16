// Generate tiny silent WAVs for sfx_hit and sfx_collect if missing
const fs = require('fs')
const path = require('path')

const outDir = path.join(__dirname, '..', 'public', 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

function makeToneWav(filename, opts) {
  const sampleRate = opts.sampleRate || 22050
  const durationMs = opts.durationMs || 120
  const freqStart = typeof opts.freqStart === 'number' ? opts.freqStart : (typeof opts.freq === 'number' ? opts.freq : 440)
  const freqEnd = typeof opts.freqEnd === 'number' ? opts.freqEnd : freqStart
  const volume = typeof opts.volume === 'number' ? opts.volume : 0.6
  const numSamples = Math.floor(sampleRate * (durationMs / 1000))
  const bytesPerSample = 2
  const dataSize = numSamples * bytesPerSample
  const buffer = Buffer.alloc(44 + dataSize)
  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // channels
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28)
  buffer.writeUInt16LE(bytesPerSample, 32)
  buffer.writeUInt16LE(8 * bytesPerSample, 34)
  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // fill samples with sine wave + simple envelope
  const maxAmp = Math.floor(32767 * Math.min(1, Math.max(0, volume)))
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate
    const frac = i / Math.max(1, numSamples - 1)
    const f = freqStart + (freqEnd - freqStart) * frac
    // basic linear fade-in/out envelope (shorter attack)
    const envIn = Math.min(1, (i / Math.max(1, Math.floor(sampleRate * 0.01))))
    const envOut = Math.min(1, ((numSamples - i) / Math.max(1, Math.floor(sampleRate * 0.06))))
    const env = envIn * envOut
    const sample = Math.floor(maxAmp * Math.sin(2 * Math.PI * f * t) * env)
    buffer.writeInt16LE(sample, 44 + i * 2)
  }
  fs.writeFileSync(path.join(outDir, filename), buffer)
}

const hit = 'sfx_hit.wav'
const collect = 'sfx_collect.wav'
const jump = 'sfx_jump.wav'
// overwrite with simple tonal SFX
makeToneWav(hit, { freq: 220, durationMs: 110, volume: 0.9 })
console.log('Created SFX', hit)
makeToneWav(collect, { freq: 980, durationMs: 180, volume: 0.9 })
console.log('Created SFX', collect)
// jump: whoosh-ish frequency sweep (higher -> lower)
makeToneWav(jump, { freqStart: 900, freqEnd: 260, durationMs: 220, volume: 0.85 })
console.log('Created SFX', jump)
console.log('SFX placeholders ready in', outDir)
