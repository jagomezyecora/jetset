const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5174/';
  console.log('Debug map->labyrinth target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    const canvasBox = await page.evaluate(() => {
      const c = document.querySelector('#app canvas');
      if (!c) return null;
      const r = c.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    });
    if (!canvasBox) throw new Error('Canvas missing');
    const centerX = canvasBox.left + canvasBox.width/2;
    const centerY = canvasBox.top + canvasBox.height/2;
    // click Map button (approx +112 vertical offset)
    await page.mouse.click(centerX, centerY + 112);
    await new Promise(r => setTimeout(r, 800));
    // click first cell in map grid (approx padding + cellW/2)
    // We'll attempt clicking near left-top quadrant
    await page.mouse.click(canvasBox.left + 80, canvasBox.top + 120);
    await new Promise(r => setTimeout(r, 900));
    // now collect state
    const state = await page.evaluate(() => {
      const g = window.game;
      if (!g) return { game:false }
      const scenes = Object.keys(g.scene.keys || {})
      const activeList = scenes.filter(k => g.scene.isActive(k))
      const sc = g.scene.getScene('MainScene')
      return { scenes, activeList, hasMain: !!sc, mainActive: g.scene.isActive('MainScene'), screenChanging: sc ? !!sc._screenChanging : null }
    })
    console.log('Map->labyrinth state:', JSON.stringify(state, null, 2));
    await page.screenshot({ path: 'scripts/logs/debug_map_to_labyrinth.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/debug_map_to_labyrinth.png');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug map->labyrinth failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
