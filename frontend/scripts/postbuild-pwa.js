/*
 * Post-build PWA injection for `expo export --platform web`.
 *
 * Expo's Metro web export doesn't emit a manifest link, Apple install metas,
 * or service-worker registration — this script patches dist/index.html after
 * every build. Idempotent: safe to run twice.
 */
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const swPath = path.join(distDir, 'sw.js');

if (!fs.existsSync(indexPath)) {
  console.error('[pwa] dist/index.html not found — run `expo export --platform web` first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// The JS bundle's filename is content-hashed per build, so the service worker
// can't hardcode it. Without this, a device that opens the app for the very
// first time and goes offline before a *second* page load would have no
// bundle in cache at all — the SW would fall back to the cached "/" shell,
// but that shell's <script> tag would 404. Precache it explicitly here so
// even a first-ever visit is fully offline-capable after install.
const bundlePaths = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);

// Sora (the brand's display face) ships as content-hashed .ttf files
// under dist/assets — find them so the brand font actually renders offline
// instead of silently falling back to the system font.
function findFontPaths() {
  const assetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(assetsDir)) return [];
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/Sora.*\.ttf$/i.test(entry.name)) {
        found.push('/' + path.relative(distDir, full).split(path.sep).join('/'));
      }
    }
  })(assetsDir);
  return found;
}
const fontPaths = findFontPaths();

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, 'utf8');
  const baseShellMatch = sw.match(/const SHELL = \[([^\]]*)\];/);
  if (baseShellMatch) {
    const baseEntries = [...baseShellMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const merged = [...new Set([...baseEntries, ...bundlePaths, ...fontPaths])];
    sw = sw.replace(/const SHELL = \[[^\]]*\];/, `const SHELL = [${merged.map((e) => `'${e}'`).join(', ')}];`);
    fs.writeFileSync(swPath, sw);
    console.log(`[pwa] precached bundle: ${bundlePaths.join(', ')}`);
    console.log(`[pwa] precached ${fontPaths.length} brand font file(s)`);
  } else {
    console.warn('[pwa] could not find `const SHELL = [...]` in sw.js — bundle not precached.');
  }
} else {
  console.warn('[pwa] dist/sw.js not found — did the public/sw.js copy step run?');
}

if (html.includes('data-duskglen-pwa')) {
  console.log('[pwa] already injected — nothing to do.');
  process.exit(0);
}

const headSnippet = `
    <!-- data-duskglen-pwa -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Duskglen" />
    <meta name="application-name" content="Duskglen" />
    <meta name="description" content="Your private media archive: pull audio and video in from any link or Telegram chat, name any song, stream your library anywhere." />
    <style data-duskglen-boot>
      html, body, #root { min-height: 100%; margin: 0; background: #100B18; }
      #duskglen-html-splash { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: #100B18; color: #F1EDF7; font-family: system-ui, sans-serif; }
      #duskglen-html-splash .dg-core { position: relative; width: 68px; height: 68px; border-radius: 50%; background: #F1EDF7; box-shadow: 0 0 55px rgba(255,138,92,.38); animation: dg-breathe 1.8s ease-in-out infinite; overflow: hidden; }
      #duskglen-html-splash .dg-core::after { content: ''; position: absolute; width: 68px; height: 68px; border-radius: 50%; left: 25px; top: -5px; background: #100B18; }
      #duskglen-html-splash .dg-name { margin-top: 22px; font-size: 12px; font-weight: 700; letter-spacing: 6px; text-align: center; }
      #duskglen-html-splash .dg-note { margin-top: 10px; color: #AEA5C0; font-size: 11px; text-align: center; }
      @keyframes dg-breathe { 50% { transform: scale(1.06); opacity: .82; } }
      @media (prefers-reduced-motion: reduce) { #duskglen-html-splash .dg-core { animation: none; } }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
`;

// iOS: draw edge-to-edge behind the notch/home bar (the app handles safe areas).
html = html.replace(
  /<meta name="viewport"[^>]*\/?>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);
html = html.replace('</head>', `${headSnippet}</head>`);
html = html.replace(
  '<div id="root"></div>',
  '<div id="root"><div id="duskglen-html-splash" role="status" aria-label="Duskglen is loading"><div><div class="dg-core"></div><div class="dg-name">DUSKGLEN</div><div class="dg-note">Opening your hollow…</div></div></div></div>',
);

fs.writeFileSync(indexPath, html);
console.log('[pwa] manifest link, Apple metas and service worker registration injected.');
