const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.env.TEST_URL || 'http://localhost:43150';
  console.log('Interactive E2E starting. Target:', url);

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    await page.waitForSelector('#app canvas', { timeout: 10000 });
    console.log('Canvas found');

    // Start game by clicking center
    const rect = await page.evaluate(() => {
      const canvas = document.querySelector('#app canvas');
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2, left: r.left, top: r.top, width: r.width, height: r.height };
    });
    if (!rect) throw new Error('Canvas not found');
    await page.mouse.click(rect.x, rect.y);
    console.log('Clicked canvas center to start');
    await new Promise(r => setTimeout(r, 700));

    // Press right for 600ms, then jump, then left
    await page.keyboard.down('ArrowRight');
    console.log('Holding ArrowRight');
    await new Promise(r => setTimeout(r, 600));
    await page.keyboard.up('ArrowRight');
    console.log('Released ArrowRight');

    // Jump using space
    await page.keyboard.down(' ');
    await new Promise(r => setTimeout(r, 80));
    await page.keyboard.up(' ');
    console.log('Pressed Space (jump)');
    await new Promise(r => setTimeout(r, 500));

    // Move left
    await page.keyboard.down('ArrowLeft');
    await new Promise(r => setTimeout(r, 400));
    await page.keyboard.up('ArrowLeft');
    console.log('Moved left');

    // Open audio settings (click persistent Audio button if exists)
    const hasAudioBtn = await page.evaluate(() => !!document.getElementById('audio-settings-open'));
    if (hasAudioBtn) {
      await page.click('#audio-settings-open');
      console.log('Opened audio settings');
      await new Promise(r => setTimeout(r, 300));
      // reduce SFX slider value to 0.4
      await page.evaluate(() => {
        const inputs = document.querySelectorAll('#audio-settings input');
        if (inputs && inputs[1]) {
          inputs[1].value = '0.4';
          const ev = new Event('input', { bubbles: true });
          inputs[1].dispatchEvent(ev);
        }
      });
      console.log('Adjusted SFX slider to 0.4');
      await new Promise(r => setTimeout(r, 200));
      // close panel
      await page.click('#audio-settings-open');
      console.log('Closed audio settings');
    } else {
      console.log('No audio settings button found');
    }

    // click to collect an item if present near center
    await page.mouse.click(rect.left + 120, rect.top + rect.height - 160);
    console.log('Clicked near ground to attempt collect/interaction');
    await new Promise(r => setTimeout(r, 500));

    // final screenshot
    const out = 'dist/e2e-interactive.png';
    await page.screenshot({ path: out, fullPage: true });
    console.log('Screenshot saved to', out);

    await browser.close();
    console.log('Interactive E2E completed');
    process.exit(0);
  } catch (err) {
    console.error('Interactive E2E failed:', err);
    try { await browser.close(); } catch(e){}
    process.exit(2);
  }
})();
