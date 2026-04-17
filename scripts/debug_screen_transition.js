const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5176/';
  console.log('Debug screen transition target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    const canvasHandle = await page.$('#app canvas');
    if (canvasHandle) {
      const box = await canvasHandle.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        console.log('Clicked canvas center to trigger menu Start');
      }
    }
    // wait for scene to initialize
    await new Promise(r => setTimeout(r, 1200));
    const before = await page.evaluate(() => {
      const g = window.game; if (!g) return { error: 'no-game' };
      const sc = g.scene.getScene('MainScene'); if (!sc) return { error: 'no-scene' };
      const id = sc.currentScreenId || sc.currentScreen;
      const platforms = (sc.platformBodies || []).map((b) => ({ x: b.gameObject?.x, y: b.gameObject?.y }))
      const items = (sc.itemObjects || []).map((it) => ({ x: it.x, y: it.y }))
      const neighbors = (sc.screensMap && sc.screensMap[id] && sc.screensMap[id].neighbors) || {}
      return { id, platformsCount: platforms.length, itemsCount: items.length, platforms, items, neighbors }
    })
    console.log('BEFORE:', JSON.stringify(before, null, 2));
    if (before.error) throw new Error(before.error);
    // pick a neighbor or array-screens transition to move to
    const isArrayScreens = await page.evaluate(() => {
      const sc = window.game.scene.getScene('MainScene'); if (!sc) return false;
      return Array.isArray(sc.screens) && sc.screens.length > 1;
    });
    if (isArrayScreens) {
      console.log('Detected array-based multi-screen level; using changeScreen(1)');
      await page.evaluate(() => { const sc = window.game.scene.getScene('MainScene'); try { sc.changeScreen(1); } catch(e){} });
    } else {
      const neighborId = before.neighbors && (before.neighbors.right || before.neighbors.east || before.neighbors.down || before.neighbors.south || before.neighbors.left || before.neighbors.west || before.neighbors.up || before.neighbors.north);
      if (neighborId) {
        console.log('Transitioning to neighbor:', neighborId);
        await page.evaluate((nid) => {
          const sc = window.game.scene.getScene('MainScene');
          try { sc.changeScreenTo(nid); } catch (e) { try { sc.changeScreen(nid); } catch(e){} }
        }, neighborId);
      } else {
        // fall back: pick any other screen id from screensMap and load it
        const pick = await page.evaluate((cur) => {
          const sc = window.game.scene.getScene('MainScene'); if (!sc || !sc.screensMap) return null;
          const keys = Object.keys(sc.screensMap);
          for (let k of keys) if (k !== cur) return k;
          return null;
        }, before.id);
        if (!pick) {
          console.log('No alternate screen id found — aborting test');
          await browser.close();
          process.exit(0);
        }
        console.log('Loading alternate screen id directly:', pick);
        await page.evaluate((nid) => { const sc = window.game.scene.getScene('MainScene'); try { if (typeof sc.gotoScreen === 'function') sc.gotoScreen(nid); else sc.loadScreen(nid); } catch(e){} }, pick);
      }
    }
    await new Promise(r => setTimeout(r, 1200));
    // capture after
    const after = await page.evaluate(() => {
      const g = window.game; if (!g) return { error: 'no-game' };
      const sc = g.scene.getScene('MainScene'); if (!sc) return { error: 'no-scene' };
      const id = sc.currentScreenId || sc.currentScreen;
      const platforms = (sc.platformBodies || []).map((b) => ({ x: b.gameObject?.x, y: b.gameObject?.y }))
      const items = (sc.itemObjects || []).map((it) => ({ x: it.x, y: it.y }))
      const blocked = sc.screensMap && sc.screensMap[id] && sc.screensMap[id].blockedByMaria
      return { id, platformsCount: platforms.length, itemsCount: items.length, platforms, items, blocked }
    })
    console.log('AFTER:', JSON.stringify(after, null, 2));
    await page.screenshot({ path: 'scripts/logs/debug_screen_transition.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/debug_screen_transition.png');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug screen transition failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
