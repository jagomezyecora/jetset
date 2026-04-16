const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const publicAssets = path.resolve(__dirname, '..', 'public', 'assets');
  if (!fs.existsSync(publicAssets)) fs.mkdirSync(publicAssets, { recursive: true });

  const svg192 = path.join(publicAssets, 'icon-192.svg');
  const svg512 = path.join(publicAssets, 'icon-512.svg');

  const out192 = path.join(publicAssets, 'icon-192.png');
  const out512 = path.join(publicAssets, 'icon-512.png');
  const fav32 = path.join(publicAssets, 'favicon-32.png');
  const fav16 = path.join(publicAssets, 'favicon-16.png');

  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  async function rasterize(svgPath, width, height, outPath) {
    const html = `<!doctype html><html><body style="margin:0;background:transparent;">
      <img id="i" src="file://${svgPath.replace(/\\/g, '/')}" width="${width}" height="${height}"/>
      </body></html>`;
    await page.setViewport({ width, height });
    await page.setContent(html);
    const img = await page.$('#i');
    if (!img) throw new Error('SVG image element not found')
    await img.screenshot({ path: outPath });
    console.log('Wrote', outPath);
  }

  try {
    if (fs.existsSync(svg192)) await rasterize(svg192, 192, 192, out192);
    else console.warn('Missing', svg192);
    if (fs.existsSync(svg512)) await rasterize(svg512, 512, 512, out512);
    else console.warn('Missing', svg512);

    // create favicon sizes from the 192 svg if 512 missing
    const sourceForFav = fs.existsSync(svg192) ? svg192 : (fs.existsSync(svg512) ? svg512 : null);
    if (sourceForFav) {
      await rasterize(sourceForFav, 32, 32, fav32);
      await rasterize(sourceForFav, 16, 16, fav16);
    } else {
      console.warn('No source SVG available for favicon generation');
    }

    console.log('Done generating PNG icons.');
  } catch (err) {
    console.error('Icon generation failed:', err);
  } finally {
    await browser.close();
  }
})();
