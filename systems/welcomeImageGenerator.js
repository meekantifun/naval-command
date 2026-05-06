const https = require('https');
const http = require('http');
const sharp = require('sharp');

const PRESETS = [
  // URLs filled in by project owner before deployment
  // { id: 'preset_1', url: 'https://...', label: 'Naval Blue' },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return downloadImage(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} downloading image`));
      }
      const chunks = [];
      let totalSize = 0;
      const MAX_SIZE = 20 * 1024 * 1024; // 20MB
      res.on('data', chunk => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          res.destroy();
          return reject(new Error('Image too large (max 20MB)'));
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function generateWelcomeImage(backgroundUrl, avatarUrl, username, memberCount) {
  // Download both images in parallel
  const [bgBuf, avatarBuf] = await Promise.all([
    downloadImage(backgroundUrl),
    downloadImage(avatarUrl),
  ]);

  // Background: cover-crop to 900×300
  const background = await sharp(bgBuf)
    .resize(900, 300, { fit: 'cover' })
    .toBuffer();

  // Avatar: resize to 100×100, apply circular mask
  const circMask100 = Buffer.from(
    '<svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white"/></svg>'
  );
  const circularAvatar = await sharp(avatarBuf)
    .resize(100, 100)
    .composite([{ input: circMask100, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // White border ring: 108×108 white circle, composite avatar at (4,4)
  const circleMask108 = Buffer.from(
    '<svg width="108" height="108"><circle cx="54" cy="54" r="54" fill="white"/></svg>'
  );
  const whiteCircle = await sharp({
    create: { width: 108, height: 108, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
    .composite([{ input: circleMask108, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const avatarWithBorder = await sharp(whiteCircle)
    .composite([{ input: circularAvatar, left: 4, top: 4 }])
    .png()
    .toBuffer();

  // SVG text overlay — sanitize username to prevent SVG injection
  const safeUsername = username
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .slice(0, 24);
  const textOverlay = Buffer.from(
    `<svg width="900" height="300" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="165" y="145" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">Welcome, ${safeUsername}!</text>` +
    `<text x="165" y="170" font-family="Arial,sans-serif" font-size="14" fill="white" fill-opacity="0.5">Member #${Number(memberCount) || 0}</text>` +
    `</svg>`
  );

  // Composite: border-ringed avatar at (36,96) so inner avatar aligns at (40,100)
  return sharp(background)
    .composite([
      { input: avatarWithBorder, left: 36, top: 96 },
      { input: textOverlay, left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

module.exports = { PRESETS, generateWelcomeImage };
