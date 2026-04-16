const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.TEST_URL || 'http://localhost:43150';
  console.log('Inspect starting. Target:', url);
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', r => {
    if (r.status() >= 400) console.log('RESOURCE ERROR:', r.status(), r.url())
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    await page.waitForSelector('#app canvas', { timeout: 10000 });

    const info = await page.evaluate(() => {
      const out = {};
      try { out.windowGameType = typeof window.game } catch(e) { out.windowGameTypeErr = String(e) }
      out.hasPhaser = typeof window.Phaser !== 'undefined';
      try { out.phaserVersion = window.Phaser.VERSION } catch(e){}
      const games = window.Phaser && window.Phaser.GAMES ? window.Phaser.GAMES : [];
      out.gamesCount = games.length;
      if (games.length > 0) {
        const g = games[0];
        out.renderer = g.renderer ? (g.renderer.type === 2 ? 'WebGL' : 'Canvas') : 'unknown';
        out.width = g.scale ? g.scale.width : (g.config && g.config.width) || null;
        out.height = g.scale ? g.scale.height : (g.config && g.config.height) || null;
        out.scenes = Object.keys(g.scene.keys).map(k => ({ key: k, isActive: g.scene.isActive(k) }))
        try {
          const s = g.scene.keys['MenuScene'] || g.scene.getScenes(true)[0];
          out.menuChildren = s ? (s.children ? s.children.list.length : null) : null;
          out.cameraBg = s && s.cameras && s.cameras.main ? s.cameras.main.backgroundColor && s.cameras.main.backgroundColor.rgba : null;
        } catch(e) { out.menuChildrenErr = String(e) }
      }
      const canvas = document.querySelector('#app canvas');
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        out.canvas = { clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, rect: r };
        try {
          const ctx2d = canvas.getContext('2d');
          if (ctx2d) {
            const data = ctx2d.getImageData(0,0,1,1).data;
            out.topLeftPixel = [data[0], data[1], data[2], data[3]];
          } else {
            out.topLeftPixel = null;
          }
          // try WebGL info
          try {
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
              out.webgl = { version: gl.getParameter(gl.VERSION), vendor: gl.getParameter(gl.VENDOR) };
            } else {
              out.webgl = null;
            }
          } catch (e) { out.webglError = String(e) }
        } catch(e) { out.topLeftPixelError = String(e) }
      }
      return out;
    });

    // Read details from window.game if present
    const windowGameDetails = await page.evaluate(() => {
      const out = {};
      try {
        const g = window.game;
        if (!g) return null;
        out.sceneKeys = g.scene && g.scene.keys ? Object.keys(g.scene.keys) : null;
        try { out.activeScenes = g.scene.getScenes(true).map(s=>s.sys.settings.key) } catch(e) { out.activeScenesErr = String(e) }
        out.scale = g.scale ? { width: g.scale.width, height: g.scale.height } : null;
      } catch(e) { out.err = String(e) }
      return out;
    });

    console.log('window.game details:', JSON.stringify(windowGameDetails));

    console.log('Inspection result:', JSON.stringify(info, null, 2));

    const out = 'dist/inspect-screenshot.png';
    await page.screenshot({ path: out, fullPage: true });
    console.log('Screenshot saved to', out);

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Inspect failed:', err);
    try { await browser.close(); } catch (e) {}
    process.exit(2);
  }
})();
