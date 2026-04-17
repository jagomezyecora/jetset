const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5174/';
  console.log('Debug labyrinth target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    // programmatically start MainScene with startScreenId
    await page.evaluate(() => {
      try {
        if (!window.game) return;
        const g = window.game;
        // lazy import: use existing loader pattern
        import('/src/scenes/MainScene.ts').then((m) => { /* noop */ }).catch(()=>{});
        // start scene
        try { g.scene.start('MainScene', { startScreenId: 'r1c1' }) } catch(e) { console.log('start error', e) }
      } catch (e) { console.log('eval err', e) }
    });
    await new Promise(r => setTimeout(r, 1200));
    const state1 = await page.evaluate(() => {
      const g = window.game;
      if (!g) return { game:false }
      const sc = g.scene.getScene('MainScene')
      const active = g.scene.isActive('MainScene')
      return { active, hasScene: !!sc, screenChanging: !!(sc && sc._screenChanging), player: !!(sc && sc.player), platformCount: sc && sc.platformBodies ? sc.platformBodies.length : 0 }
    });
    console.log('After start:', state1);
    // try change to right neighbor r1c2 via changeScreenTo
    await page.evaluate(() => {
      try {
        const g = window.game;
        const sc = g.scene.getScene('MainScene');
        if (sc && sc.changeScreenTo) {
          if (typeof sc.gotoScreen === 'function') sc.gotoScreen('r1c2'); else sc.changeScreenTo('r1c2')
        }
      } catch(e) { console.log('change err', e) }
    });
    await new Promise(r => setTimeout(r, 1000));
    const state2 = await page.evaluate(() => {
      const g = window.game;
      if (!g) return { game:false }
      const sc = g.scene.getScene('MainScene')
      return { screenChanging: !!(sc && sc._screenChanging), camAlpha: g.cameras && g.cameras.main ? g.cameras.main.alpha : null }
    });
    console.log('After changeScreenTo:', state2);
    await page.screenshot({ path: 'scripts/logs/debug_labyrinth.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/debug_labyrinth.png');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug labyrinth failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
