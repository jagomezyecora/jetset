const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.env.TEST_URL || 'http://localhost:43150';
  console.log('E2E map test starting. Target:', url);

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    await page.waitForSelector('#app canvas', { timeout: 10000 });
    console.log('Canvas found');

    // calculate canvas center
    const rect = await page.evaluate(() => {
      const canvas = document.querySelector('#app canvas');
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, left: r.left, top: r.top, width: r.width, height: r.height };
    });
    if (!rect) throw new Error('Canvas not found');

    // click MAP button area (center +112px)
    const mapY = rect.y + 112
    await page.mouse.click(rect.x, mapY);
    console.log('Clicked MAP button (canvas) to open MapScene');
    await new Promise(r => setTimeout(r, 800));

    // wait a bit for MapScene to render
    await new Promise(r => setTimeout(r, 800));

    const out = 'dist/e2e-map.png';
    await page.screenshot({ path: out, fullPage: true });
    console.log('Map screenshot saved to', out);

    await browser.close();
    console.log('E2E map test completed');
    process.exit(0);
  } catch (err) {
    console.error('E2E map test failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
