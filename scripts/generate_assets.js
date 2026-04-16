/*
  Script helper to generate image generation commands for per-screen photoreal assets.
  It reads `levels/art_prompts.json` and prints example curl commands for several providers.

  Usage: node scripts/generate_assets.js --provider=openai --variant=day
  Set your provider API key as environment variables before running (the script will not call APIs automatically,
  it prints commands you can run manually or adapt to your own pipeline).
*/
const fs = require('fs')
const path = require('path')
const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'levels', 'art_prompts.json'), 'utf8'))
const args = require('minimist')(process.argv.slice(2))
const provider = args.provider || 'openai' // openai | replicate | stability
const variant = args.variant || 'day'

console.log('Provider:', provider)
console.log('Variant:', variant)
console.log('Will generate commands for the following screens:')
Object.keys(prompts).forEach(k => console.log('-', k, prompts[k].name))
console.log('\nCommands (examples):\n')

Object.entries(prompts).forEach(([id, info]) => {
  const p = info.variants && info.variants[variant] ? info.variants[variant] : (info.description || '')
  const outFile = `public/assets/bg_near_${id}_${variant}.png`
  if (provider === 'openai') {
    console.log(`# OpenAI Images (DALL·E) example for ${id} -> ${outFile}`)
    console.log(`curl -s -o ${outFile} \\
  -H "Authorization: Bearer $OPENAI_API_KEY" \\
  -H "Content-Type: application/json" \\
  https://api.openai.com/v1/images/generations \\
  -d '{"model":"gpt-image-1","prompt":${JSON.stringify(p)},"size":"1024x1024"}'`)
  }
  if (provider === 'replicate') {
    console.log(`# Replicate (Stable Diffusion) example for ${id} -> ${outFile}`)
    console.log(`curl -s -X POST -H "Authorization: Token $REPLICATE_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"version":"<MODEL_VERSION>","input":{"prompt":${JSON.stringify(p)},"width":1024,"height":1024}}' \\
  https://api.replicate.com/v1/predictions | jq -r '.output[0]' | xargs curl -s -o ${outFile}`)
  }
  if (provider === 'stability') {
    console.log(`# Stability.ai (REST) example for ${id} -> ${outFile}`)
    console.log(`curl -s -o ${outFile} \\
  -H "Authorization: Bearer $STABILITY_API_KEY" \\
  -H "Content-Type: application/json" \\
  https://api.stability.ai/v1/generation/stable-diffusion-512-v2-1/text-to-image \\
  -d '{"text_prompts":[{"text":${JSON.stringify(p)}}],"cfg_scale":7,"steps":30,"size":{"width":1024,"height":1024}}'`)
  }
  console.log('')
})

console.log('After generating images place them under public/assets/ and run the build.')
console.log('Recommended filenames: bg_far_<id>_<variant>.png, bg_mid_<id>_<variant>.png, bg_near_<id>_<variant>.png')
