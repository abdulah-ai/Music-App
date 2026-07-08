// Generates every raster brand asset (favicon, PWA icons, Android adaptive
// icon layers, Capacitor icon/splash sources) from one vector definition of
// the Duskglen mark, so every surface stays pixel-consistent with the
// in-app <BrandMark /> component (src/components/ui/BrandMark.tsx).
//
// Run: node scripts/generate-brand-assets.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INK = '#0A0F0D';
const MOON = '#E7EBE6';
const GLOW = '#2FBFAA';

// Mark geometry mirrors BrandMark.tsx's 0 0 100 100 viewBox exactly.
function markGroup({ moon = MOON, trees = INK, star = MOON, glow = true } = {}) {
  return `
    ${glow ? `<circle cx="50" cy="38" r="40" fill="url(#dg-glow)" />` : ''}
    <circle cx="50" cy="38" r="26" fill="${moon}" />
    <circle cx="20" cy="18" r="1.8" fill="${star}" opacity="0.85" />
    <circle cx="80" cy="24" r="1.4" fill="${star}" opacity="0.7" />
    <path d="M10,70 L25,42 L40,70 Z M32,70 L50,32 L68,70 Z M60,70 L75,42 L90,70 Z" fill="${trees}" />
    <rect x="0" y="70" width="100" height="30" fill="${trees}" />
  `;
}

const GLOW_DEFS = `<defs><radialGradient id="dg-glow" cx="50%" cy="42%" r="50%">
  <stop offset="0%" stop-color="${GLOW}" stop-opacity="0.35" />
  <stop offset="100%" stop-color="${GLOW}" stop-opacity="0" />
</radialGradient></defs>`;

/** Flat square icon: ink background, mark scaled to ~64% and centered. Used for favicon / app icon / PWA "any" icons. */
function squareIconSvg({ cornerRadius = 0 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${GLOW_DEFS}
    <rect width="1024" height="1024" rx="${cornerRadius}" fill="${INK}" />
    <g transform="translate(184 184) scale(6.56)">${markGroup()}</g>
  </svg>`;
}

/** Maskable PWA icon: same as square but mark pulled further in so OS masking (circle/squircle) never clips it. */
function maskableIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${GLOW_DEFS}
    <rect width="1024" height="1024" fill="${INK}" />
    <g transform="translate(276 276) scale(4.72)">${markGroup()}</g>
  </svg>`;
}

/** Android adaptive icon foreground layer: transparent, mark kept inside the ~66% safe zone. */
function foregroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${GLOW_DEFS}
    <g transform="translate(276 276) scale(4.72)">${markGroup()}</g>
  </svg>`;
}

/** Android adaptive icon background layer: solid ink, no mark. */
function backgroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${INK}" />
  </svg>`;
}

/** Android 13+ themed monochrome layer: single-colour silhouette, transparent bg (OS supplies the tint). */
function monochromeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <g transform="translate(276 276) scale(4.72)">${markGroup({ moon: '#FFFFFF', trees: '#FFFFFF', star: '#FFFFFF', glow: false })}</g>
  </svg>`;
}

/** Splash screen: ink canvas, mark small and centered — used for both the light and dark Capacitor splash. */
function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
    ${GLOW_DEFS}
    <rect width="2732" height="2732" fill="${INK}" />
    <g transform="translate(1166 1166) scale(4)">${markGroup()}</g>
  </svg>`;
}

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const assetsCapacitor = path.join(root, 'assets-capacitor');
const publicIcons = path.join(root, 'public', 'icons');

const jobs = [
  // App icon / favicon / splash foreground art
  [squareIconSvg({ cornerRadius: 0 }), 1024, path.join(assets, 'icon.png')],
  [squareIconSvg({ cornerRadius: 36 }), 196, path.join(assets, 'favicon.png')],
  [foregroundSvg(), 1024, path.join(assets, 'splash-icon.png')],

  // Android adaptive icon (expo prebuild + app.json android.adaptiveIcon)
  [foregroundSvg(), 1024, path.join(assets, 'android-icon-foreground.png')],
  [backgroundSvg(), 1024, path.join(assets, 'android-icon-background.png')],
  [monochromeSvg(), 1024, path.join(assets, 'android-icon-monochrome.png')],

  // Capacitor asset source set (consumed by `npx capacitor-assets generate`)
  [squareIconSvg({ cornerRadius: 0 }), 1024, path.join(assetsCapacitor, 'icon-only.png')],
  [foregroundSvg(), 1024, path.join(assetsCapacitor, 'icon-foreground.png')],
  [backgroundSvg(), 1024, path.join(assetsCapacitor, 'icon-background.png')],
  [splashSvg(), 2732, path.join(assetsCapacitor, 'splash.png')],
  [splashSvg(), 2732, path.join(assetsCapacitor, 'splash-dark.png')],

  // PWA manifest icon set
  [squareIconSvg({ cornerRadius: 0 }), 192, path.join(publicIcons, 'icon-192.png')],
  [squareIconSvg({ cornerRadius: 0 }), 512, path.join(publicIcons, 'icon-512.png')],
  [maskableIconSvg(), 192, path.join(publicIcons, 'icon-maskable-192.png')],
  [maskableIconSvg(), 512, path.join(publicIcons, 'icon-maskable-512.png')],
  [squareIconSvg({ cornerRadius: 36 }), 180, path.join(publicIcons, 'apple-touch-icon.png')],
];

async function main() {
  for (const [svg, size, outPath] of jobs) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log('wrote', path.relative(root, outPath), `${size}x${size}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
