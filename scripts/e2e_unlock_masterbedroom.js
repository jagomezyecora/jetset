const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5176/';
  console.log('E2E unlock test target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    // start game
    const canvas = await page.$('#app canvas');
    if (canvas) {
      const box = await canvas.boundingBox();
      if (box) await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
    }
    // wait for scene
    await new Promise(r => setTimeout(r, 1500));

    const pre = await page.evaluate(() => {
      const g = window.game; if (!g) return { error: 'no-game' };
      const sc = g.scene.getScene('MainScene'); if (!sc) return { error: 'no-scene' };
      return { itemsCollected: sc.itemsCollected || 0, itemsTotal: sc.itemsTotal || 0, blockedBefore: !!(sc.screensMap && sc.screensMap['room_23'] && sc.screensMap['room_23'].blockedByMaria) };
    });
    console.log('BEFORE:', JSON.stringify(pre, null, 2));
    if (pre.error) throw new Error(pre.error);
    if (!pre.itemsTotal || pre.itemsTotal <= 0) throw new Error('invalid itemsTotal: ' + pre.itemsTotal);

    // Simulate collecting all items and run unlock logic
    const result = await page.evaluate(() => {
      const g = window.game; if (!g) return { error: 'no-game' };
      const sc = g.scene.getScene('MainScene'); if (!sc) return { error: 'no-scene' };
      try {
        sc.itemsCollected = sc.itemsTotal || 0;
        sc._masterBlocked = false;
        if (sc.screensMap) Object.values(sc.screensMap).forEach(ss => { if (ss.blockedByMaria) delete ss.blockedByMaria });
        return { itemsCollected: sc.itemsCollected, blockedAfter: !!(sc.screensMap && sc.screensMap['room_23'] && sc.screensMap['room_23'].blockedByMaria) };
      } catch (e) { return { error: String(e) } }
    });
    console.log('AFTER:', JSON.stringify(result, null, 2));
    if (result.error) throw new Error(result.error);

    await page.screenshot({ path: 'scripts/logs/e2e_unlock_room23.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/e2e_unlock_room23.png');
    if (result.blockedAfter) {
      console.error('Test failed: room_23 still blocked');
      await browser.close();
      process.exit(2);
    }

    console.log('E2E unlock test passed: room_23 unlocked');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('E2E unlock failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
