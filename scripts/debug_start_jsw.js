const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5174/';
  console.log('Debug start JSW target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    // click canvas center to trigger MenuScene Start button (lazy-loads MainScene)
    const canvasHandle = await page.$('#app canvas');
    if (canvasHandle) {
      const box = await canvasHandle.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        console.log('Clicked canvas center to trigger menu Start');
      }
    }
    // give time for dynamic import and scene start
    await new Promise(r => setTimeout(r, 900));
    await new Promise(r => setTimeout(r, 900));
    const state = await page.evaluate(() => {
      const g = window.game
      if (!g) return { game: false }
      const sc = g.scene.getScene('MainScene')
      const active = g.scene.isActive('MainScene')
      const itemsCollected = sc ? sc.itemsCollected || 0 : 0
      const itemsTotal = sc ? sc.itemsTotal || 0 : 0
      const masterBlocked = sc ? (Object.values(sc.screensMap || {}).some(ss => ss.blockedByMaria)) : null
      return { active, hasScene: !!sc, itemsCollected, itemsTotal, masterBlocked }
    })
    console.log('STATE:', JSON.stringify(state, null, 2));
    await page.screenshot({ path: 'scripts/logs/debug_start_jsw.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/debug_start_jsw.png');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug start JSW failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
