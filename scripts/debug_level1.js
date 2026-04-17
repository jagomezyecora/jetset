const puppeteer = require('puppeteer');
(async () => {
  const url = process.env.TEST_URL || 'http://localhost:5174/';
  console.log('Debug script target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    // click Start (center area)
    const rect = await page.evaluate(() => {
      const canvas = document.querySelector('#app canvas');
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    if (!rect) throw new Error('No canvas found')
    await page.mouse.click(rect.x, rect.y);
    await new Promise(r => setTimeout(r, 900));
    // gather game state
    const state = await page.evaluate(() => {
      const g = window.game
      if (!g) return { game: false }
      // list scenes
      const scenes = Object.keys(g.scene.keys || {})
      const activeList = scenes.filter(k => g.scene.isActive(k))
      const sc = g.scene.getScene('MainScene')
      const active = g.scene.isActive('MainScene')
      if (!sc) return { game: true, active }
      const player = sc.player || null
      const platformBodies = sc.platformBodies || []
      const hud = !!sc.hud
      const screenChanging = !!sc._screenChanging
      const cam = g.cameras && g.cameras.main ? { alpha: g.cameras.main.alpha, fading: !!g.cameras.main._fading } : null
      const playerBody = player && player.body ? { x: player.x, y: player.y, vel: player.body.velocity, blocked: player.body.blocked } : null
      return { game: true, active, hasScene: !!sc, player: !!player, playerBody, platformCount: platformBodies.length, hud, screenChanging, cam, scenes, activeList }
    });
    console.log('STATE:', JSON.stringify(state, null, 2));
    await page.screenshot({ path: 'scripts/logs/debug_level1.png', fullPage: true });
    console.log('Screenshot saved to scripts/logs/debug_level1.png');
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Debug script failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
