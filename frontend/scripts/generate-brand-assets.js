// Generates every raster brand asset (favicon, PWA icons, Android adaptive
// icon layers, Capacitor icon/splash sources) from one vector definition of
// the Starhollow mark, so every surface stays pixel-consistent with the
// in-app <BrandMark /> component (src/components/ui/BrandMark.tsx).
//
// Run: node scripts/generate-brand-assets.js
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const INK = '#0B1411'; // midnight pine
const STAR = '#E9CD7E'; // star gold
const CORE = '#FFF7DE';
const AURORA = '#63D6B5'; // aurora teal
const RIDGE_FAR = '#0A2018';
const RIDGE_NEAR = '#04120C';

// Mark geometry mirrors BrandMark.tsx's 0 0 100 100 viewBox exactly.
function markGroup({ star = STAR, core = CORE, ridgeFar = RIDGE_FAR, ridgeNear = RIDGE_NEAR, glow = true, flat = false } = {}) {
  return `
    ${glow ? `<circle cx="50" cy="78" r="44" fill="url(#sh-pool)" />` : ''}
    <path d="M-2,74 L16,48 L30,66 L40,52 L50,68 L60,52 L70,66 L84,48 L102,74 L102,102 L-2,102 Z" fill="${ridgeFar}" ${flat ? 'opacity="0.55"' : ''} />
    <path d="M-2,88 L14,68 L28,82 L42,70 L58,70 L72,82 L86,68 L102,88 L102,102 L-2,102 Z" fill="${ridgeNear}" />
    ${glow ? `<circle cx="50" cy="36" r="32" fill="url(#sh-glow)" />` : ''}
    <path d="M50,10 L54,30 L72,36 L54,42 L50,62 L46,42 L28,36 L46,30 Z" fill="${star}" />
    ${flat ? '' : `<path d="M50,26 L51.6,34.4 L60,36 L51.6,37.6 L50,46 L48.4,37.6 L40,36 L48.4,34.4 Z" fill="${core}" opacity="0.9" />`}
    <circle cx="22" cy="20" r="1.9" fill="${star}" opacity="0.85" />
    <circle cx="79" cy="16" r="1.4" fill="${star}" opacity="0.65" />
    <circle cx="87" cy="34" r="1.2" fill="${star}" opacity="0.55" />
  `;
}

const GLOW_DEFS = `<defs>
  <radialGradient id="sh-pool" cx="50%" cy="78%" r="46%">
    <stop offset="0%" stop-color="${AURORA}" stop-opacity="0.5" />
    <stop offset="60%" stop-color="${AURORA}" stop-opacity="0.16" />
    <stop offset="100%" stop-color="${AURORA}" stop-opacity="0" />
  </radialGradient>
  <radialGradient id="sh-glow" cx="50%" cy="36%" r="40%">
    <stop offset="0%" stop-color="${STAR}" stop-opacity="0.4" />
    <stop offset="100%" stop-color="${STAR}" stop-opacity="0" />
  </radialGradient>
</defs>`;

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
    <g transform="translate(276 276) scale(4.72)">${markGroup({ star: '#FFFFFF', ridgeFar: '#FFFFFF', ridgeNear: '#FFFFFF', glow: false, flat: true })}</g>
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
