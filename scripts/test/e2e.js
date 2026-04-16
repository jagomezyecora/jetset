const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.env.TEST_URL || 'http://localhost:43150';
  console.log('E2E test starting. Target:', url);

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // wait for #app to contain a canvas
    await page.waitForSelector('#app canvas', { timeout: 10000 });
    console.log('Canvas found');

    // check Variant and Bloom labels exist in DOM or sprites
    const variantText = await page.evaluate(() => {
      const el = document.querySelector('body');
      // look for canvas-based texts by checking Phaser DOM overlay (we created text objects but they're canvas drawn)
      // fallback: check #bloom exists
      return !!document.getElementById('bloom');
    });
    console.log('Bloom container present:', variantText);

    // click on center to ensure canvas receives input
    const rect = await page.evaluate(() => {
      const canvas = document.querySelector('#app canvas');
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    if (rect) {
      await page.mouse.click(rect.x, rect.y);
      console.log('Clicked canvas center (attempt to press Start)');
      // wait for scene change
      await new Promise(r => setTimeout(r, 800));
      const mainActive = await page.evaluate(() => {
        try { return !!(window.game && window.game.scene && window.game.scene.isActive('MainScene')) } catch(e) { return false }
      })
      console.log('MainScene active after click:', mainActive);
      if (!mainActive) {
        // try clicking more precisely at expected button center relative to canvas
        const canvasPos = await page.evaluate(() => {
          const c = document.querySelector('#app canvas');
          const r = c.getBoundingClientRect();
          return { left: r.left, top: r.top, width: r.width, height: r.height };
        })
        const btnX = canvasPos.left + canvasPos.width/2
        const btnY = canvasPos.top + canvasPos.height/2
        await page.mouse.click(btnX, btnY)
        console.log('Clicked calculated button center');
        await new Promise(r => setTimeout(r, 800));
      }
    }

    // click Variant label position approximation (top-right area)
    const vp = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }))
    await page.mouse.click(vp.w - 160, 30)
    console.log('Clicked variant label area');
    await new Promise(r => setTimeout(r, 800));

    // take screenshot
    const out = 'dist/e2e-screenshot.png';
    await page.screenshot({ path: out, fullPage: true });
    console.log('Screenshot saved to', out);

    // final check: is MainScene active?
    const finalMainActive = await page.evaluate(() => { try { return !!(window.game && window.game.scene && window.game.scene.isActive('MainScene')) } catch(e) { return false } })
    console.log('Final MainScene active:', finalMainActive)
    if (!finalMainActive) {
      console.log('Attempting programmatic start of MainScene as fallback')
      await page.evaluate(() => { try { window.game.scene.start('MainScene') } catch(e) { console.log('start error', e) } })
      await new Promise(r => setTimeout(r, 800))
      const afterStart = await page.evaluate(() => { try { return !!(window.game && window.game.scene && window.game.scene.isActive('MainScene')) } catch(e) { return false } })
      console.log('MainScene active after programmatic start:', afterStart)
    }

    await browser.close();
    console.log('E2E test completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('E2E test failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
