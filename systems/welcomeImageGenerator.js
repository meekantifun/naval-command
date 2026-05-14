const https = require('https');
const http = require('http');
const sharp = require('sharp');

const PRESETS = [
  { id: 'preset_1',  url: 'https://naval-command.com/api/welcome-bg/newUserBG1.jpg',  label: 'Background 1'  },
  { id: 'preset_2',  url: 'https://naval-command.com/api/welcome-bg/newUserBG2.jpg',  label: 'Background 2'  },
  { id: 'preset_3',  url: 'https://naval-command.com/api/welcome-bg/newUserBG3.jpg',  label: 'Background 3'  },
  { id: 'preset_4',  url: 'https://naval-command.com/api/welcome-bg/newUserBG4.jpg',  label: 'Background 4'  },
  { id: 'preset_5',  url: 'https://naval-command.com/api/welcome-bg/newUserBG5.jpg',  label: 'Background 5'  },
  { id: 'preset_6',  url: 'https://naval-command.com/api/welcome-bg/newUserBG6.jpg',  label: 'Background 6'  },
  { id: 'preset_7',  url: 'https://naval-command.com/api/welcome-bg/newUserBG7.jpg',  label: 'Background 7'  },
  { id: 'preset_8',  url: 'https://naval-command.com/api/welcome-bg/newUserBG8.jpg',  label: 'Background 8'  },
  { id: 'preset_9',  url: 'https://naval-command.com/api/welcome-bg/newUserBG9.jpg',  label: 'Background 9'  },
  { id: 'preset_10', url: 'https://naval-command.com/api/welcome-bg/newUserBG10.jpg', label: 'Background 10' },
];

function downloadImage(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https://') ? https : http;
    const request = client.get(url, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects === 0) {
          res.resume();
          return reject(new Error('Too many redirects downloading image'));
        }
        res.resume();
        return downloadImage(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} downloading image`));
      }
      const contentType = res.headers['content-type'] || '';
      if (!contentType.startsWith('image/')) {
        res.resume();
        return reject(new Error(`Expected image, got ${contentType}`));
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
  // Download avatar (required) and background (optional — fall back to solid color)
  const [bgResult, avatarBuf] = await Promise.allSettled([
    downloadImage(backgroundUrl),
    downloadImage(avatarUrl),
  ]);

  if (avatarBuf.status === 'rejected') throw avatarBuf.reason;

  // Background: cover-crop to 900×300, or solid navy if download failed
  let background;
  if (bgResult.status === 'fulfilled') {
    try {
      background = await sharp(bgResult.value).resize(900, 300, { fit: 'cover' }).toBuffer();
    } catch {
      background = null;
    }
  }
  if (!background) {
    console.warn(`Welcome: background unavailable for ${backgroundUrl}, using solid color`);
    background = await sharp({
      create: { width: 900, height: 300, channels: 3, background: { r: 23, g: 33, b: 48 } }
    }).png().toBuffer();
  }

  // Avatar: resize to 100×100, apply circular mask
  const circMask100 = Buffer.from(
    '<svg width="100" height="100"><circle cx="50" cy="50" r="50" fill="white"/></svg>'
  );
  const circularAvatar = await sharp(avatarBuf.value)
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
