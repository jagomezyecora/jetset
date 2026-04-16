const fs = require('fs');
const path = require('path');

function writeIcon(dest, images) {
  // images: array of {width, height, buf}
  const count = images.length;
  let offset = 6 + 16 * count; // header + entries
  const parts = [];

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // count
  parts.push(header);

  const entries = Buffer.alloc(16 * count);
  for (let i = 0; i < count; i++) {
    const img = images[i];
    const entryOffset = i * 16;
    // width/height: 0 means 256
    entries.writeUInt8(img.width >= 256 ? 0 : img.width, entryOffset + 0);
    entries.writeUInt8(img.height >= 256 ? 0 : img.height, entryOffset + 1);
    entries.writeUInt8(0, entryOffset + 2); // color palette
    entries.writeUInt8(0, entryOffset + 3); // reserved
    entries.writeUInt16LE(1, entryOffset + 4); // planes
    entries.writeUInt16LE(32, entryOffset + 6); // bit count
    entries.writeUInt32LE(img.buf.length, entryOffset + 8); // bytes in res
    entries.writeUInt32LE(offset, entryOffset + 12); // image offset
    offset += img.buf.length;
  }
  parts.push(entries);

  for (let i = 0; i < count; i++) parts.push(images[i].buf);

  const out = Buffer.concat(parts);
  fs.writeFileSync(dest, out);
  console.log('Wrote', dest);
}

(async () => {
  const publicAssets = path.resolve(__dirname, '..', 'public', 'assets');
  const distAssets = path.resolve(__dirname, '..', 'dist', 'assets');
  const p16 = path.join(publicAssets, 'favicon-16.png');
  const p32 = path.join(publicAssets, 'favicon-32.png');

  const images = [];
  if (fs.existsSync(p16)) images.push({ width: 16, height: 16, buf: fs.readFileSync(p16) });
  if (fs.existsSync(p32)) images.push({ width: 32, height: 32, buf: fs.readFileSync(p32) });

  if (images.length === 0) {
    console.warn('No PNG sources found for favicon.ico. Expected favicon-16.png or favicon-32.png in public/assets')
    process.exit(0)
  }

  const dest = path.join(publicAssets, 'favicon.ico');
  writeIcon(dest, images);

  // also copy to dist if built
  try {
    if (!fs.existsSync(distAssets)) fs.mkdirSync(distAssets, { recursive: true });
    fs.copyFileSync(dest, path.join(distAssets, 'favicon.ico'));
    console.log('Copied favicon.ico to dist/assets')
  } catch (e) { /* ignore */ }
})();
