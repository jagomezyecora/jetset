// generate_assets_run.js
// Run this with: node scripts/generate_assets_run.js --variant=day
// Requires environment variable OPENAI_API_KEY set.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = process.argv.slice(2)
const variantArg = args.find(a => a.startsWith('--variant='))
const variant = variantArg ? variantArg.split('=')[1] : 'day'

const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', 'art_prompts.json'), 'utf8'))

if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable not set.')
  process.exit(1)
}

const outDir = path.join(__dirname, '..', 'public', 'assets')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

async function generate(id, prompt) {
  const outFile = path.join(outDir, `bg_near_${id}_${variant}.png`)
  console.log('Generating', id, '->', outFile)
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: prompt, size: '1024x1024' })
    })
    if (!res.ok) {
      const txt = await res.text()
      console.error('API error', res.status, txt)
      return
    }
    const json = await res.json()
    const b64 = (json.data && json.data[0] && json.data[0].b64_json) ? json.data[0].b64_json : null
    if (!b64) {
      console.error('No image data in response for', id)
      return
    }
    const buf = Buffer.from(b64, 'base64')
    fs.writeFileSync(outFile, buf)
    console.log('Saved', outFile)
  } catch (e) {
    console.error('Failed to generate', id, e)
  }
}

;(async () => {
  for (const [id, info] of Object.entries(prompts)) {
    const p = info.variants && info.variants[variant] ? info.variants[variant] : (info.description || '')
    await generate(id, p)
  }
  console.log('Done')
})()
