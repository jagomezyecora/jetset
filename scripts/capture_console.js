const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')

(async () => {
  const outDir = path.resolve(__dirname, 'logs')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const url = process.argv[2] || 'http://localhost:5173/'
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  const logs = []

  page.on('console', msg => {
    const text = msg.text()
    const type = msg.type()
    const entry = { kind: 'console', type, text, timestamp: Date.now() }
    logs.push(entry)
    console.log('[PAGE]', type, text)
  })

  page.on('pageerror', err => {
    const entry = { kind: 'pageerror', message: err.message, stack: err.stack, timestamp: Date.now() }
    logs.push(entry)
    console.error('[PAGE ERROR]', err.message)
  })

  page.on('requestfailed', req => {
    const entry = { kind: 'requestfailed', url: req.url(), method: req.method(), timestamp: Date.now(), failure: req.failure() }
    logs.push(entry)
    console.error('[REQUEST FAILED]', req.url(), req.failure())
  })

  page.on('response', async res => {
    try {
      const status = res.status()
      if (status >= 400) {
        const entry = { kind: 'response_error', url: res.url(), status, timestamp: Date.now() }
        logs.push(entry)
        console.error('[RESPONSE]', status, res.url())
      }
    } catch (e) {}
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 10000 })
  } catch (e) {
    console.error('Goto error:', e.message)
  }

  // wait a bit to capture runtime logs
  await page.waitForTimeout(4000)

  const screenshotPath = path.join(outDir, 'page.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log('Screenshot saved to', screenshotPath)

  const logPath = path.join(outDir, 'console_logs.json')
  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2))
  console.log('Logs saved to', logPath)

  await browser.close()
  process.exit(0)
})().catch(err => { console.error(err); process.exit(1) })
