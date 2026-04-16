// Tries to optimize PNGs using `sharp` if available. If not, prints instructions.
const fs = require('fs');
const path = require('path');
(async () => {
  const publicAssets = path.resolve(__dirname, '..', 'public', 'assets');
  const files = ['icon-192.png', 'icon-512.png', 'favicon-32.png', 'favicon-16.png'];
  try {
    const sharp = require('sharp');
    console.log('Using sharp to optimize PNGs...');
    for (const f of files) {
      const p = path.join(publicAssets, f);
      if (!fs.existsSync(p)) continue;
      const buf = await sharp(p).png({ compressionLevel: 9 }).toBuffer();
      fs.writeFileSync(p, buf);
      console.log('Optimized', f);
    }
    console.log('PNG optimization completed.');
  } catch (e) {
    console.warn('`sharp` not available. To optimize images, run:');
    console.warn('  npm install --save-dev sharp');
    console.warn('  node scripts/optimize-images.js');
  }
})();
