#!/usr/bin/env node
/**
 * Extract CSS tokens/components, Lucide icons used by the web app, and
 * self-hosted Inter / Sora / JetBrains Mono files into packages/design-assets.
 *
 * Usage (from repo root):
 *   node scripts/extract-design-assets.mjs
 *   npm run extract:design-assets
 */

import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const WEB_SRC = join(ROOT, "apps/web/src");
const WEB_ROOT = join(ROOT, "apps/web");
const OUT_DIR = join(ROOT, "packages/design-assets");
const LUCIDE_ROOT = join(WEB_ROOT, "node_modules/lucide-react");

const FONT_SPECS = [
  {
    family: "Inter",
    id: "inter",
    cssVar: "--font-inter",
    weights: [400, 500, 600, 700],
    package: "@fontsource/inter",
  },
  {
    family: "Sora",
    id: "sora",
    cssVar: "--font-sora",
    weights: [400, 500, 600, 700, 800],
    package: "@fontsource/sora",
  },
  {
    family: "JetBrains Mono",
    id: "jetbrains-mono",
    cssVar: "--font-jetbrains",
    weights: [400, 500, 600],
    package: "@fontsource/jetbrains-mono",
  },
];

const TYPE_ONLY = new Set(["LucideIcon"]);

const COMPONENT_SECTIONS = new Set([
  "Base styles",
  "Typography utilities",
  "Glass Effects",
  "Animations",
  "Scrollbar Styles",
]);

const VENDOR_SECTIONS = new Set([
  "Dark mode overrides",
  "Charts",
  "Print Styles",
]);

export function walkFiles(dir, ext = new Set([".ts", ".tsx"])) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkFiles(full, ext));
    else if ([...ext].some((e) => entry.endsWith(e))) out.push(full);
  }
  return out;
}

export function extractLucideImports(source) {
  const names = new Set();
  const re =
    /import\s+(type\s+)?(?:\{([^}]+)\}|\*\s+as\s+\w+)\s+from\s+['"]lucide-react['"]/g;
  let match;
  while ((match = re.exec(source))) {
    if (!match[2]) continue;
    const wholeType = Boolean(match[1]);
    for (const raw of match[2].split(",")) {
      const spec = raw.trim();
      if (!spec) continue;
      const typeSpec = wholeType || spec.startsWith("type ");
      const name = spec
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)[0]
        .trim();
      if (!name || typeSpec || TYPE_ONLY.has(name)) continue;
      names.add(name);
    }
  }
  return names;
}

export function scanLucideUsage(srcDir = WEB_SRC) {
  /** @type {Map<string, Set<string>>} */
  const usage = new Map();
  for (const file of walkFiles(srcDir)) {
    const source = readFileSync(file, "utf8");
    for (const name of extractLucideImports(source)) {
      if (!usage.has(name)) usage.set(name, new Set());
      usage.get(name).add(relative(srcDir, file).replaceAll("\\", "/"));
    }
  }
  return usage;
}

export function parseLucideExportMap(lucideJsSource) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const re =
    /export\s*\{([^}]+)\}\s*from\s*['"]\.\/icons\/([^'"]+)['"]/g;
  let match;
  while ((match = re.exec(lucideJsSource))) {
    const file = match[2].replace(/\.js$/, "");
    for (const part of match[1].split(",")) {
      const asMatch = part.match(/default\s+as\s+([A-Za-z0-9_]+)/);
      if (!asMatch) continue;
      const exportName = asMatch[1];
      if (
        exportName.startsWith("Lucide") ||
        exportName.endsWith("Icon") ||
        exportName === "default"
      ) {
        continue;
      }
      map.set(exportName, file);
    }
  }
  return map;
}

function kebabAttr(name) {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

function attrsToString(attrs) {
  return Object.entries(attrs)
    .filter(([key]) => key !== "key")
    .map(([key, value]) => `${kebabAttr(key)}="${String(value)}"`)
    .join(" ");
}

export function loadIconNode(iconsDir, fileStem, seen = new Set()) {
  if (seen.has(fileStem)) {
    throw new Error(`Circular lucide re-export: ${fileStem}`);
  }
  seen.add(fileStem);
  const path = join(iconsDir, `${fileStem}.js`);
  const src = readFileSync(path, "utf8");
  const reexport = src.match(
    /export\s*\{\s*default\s*\}\s*from\s*['"]\.\/([^'"]+)['"]/,
  );
  if (reexport) {
    return loadIconNode(iconsDir, reexport[1].replace(/\.js$/, ""), seen);
  }
  const nodeMatch = src.match(/const __iconNode = (\[[\s\S]*?\]);/);
  if (!nodeMatch) {
    throw new Error(`Could not parse __iconNode in ${fileStem}.js`);
  }
  return new Function(`return ${nodeMatch[1]}`)();
}

export function iconNodeToSvg(iconNode, { size = 24, strokeWidth = 2 } = {}) {
  const children = iconNode
    .map(([tag, attrs]) => {
      const rendered = attrsToString(attrs);
      return `  <${tag}${rendered ? ` ${rendered}` : ""} />`;
    })
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
${children}
</svg>
`;
}

export function parseGlobalsSections(globalsSource) {
  const lines = globalsSource.split(/\r?\n/);
  const sections = [];
  let current = { title: "preamble", start: 0 };
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i].match(/^\s{3}([A-Za-z].+?)\s*(?:—.*)?$/);
    const fence = lines[i].includes("═══");
    if (fence && i + 1 < lines.length) {
      const next = lines[i + 1].match(/^\s{3}([A-Za-z][^\n]*?)\s*$/);
      if (next) {
        current.end = i;
        sections.push(current);
        const title = next[1].replace(/\s+—.*$/, "").trim();
        current = { title, start: i };
      }
    }
    void header;
  }
  current.end = lines.length;
  sections.push(current);
  return { lines, sections };
}

function sliceSection({ lines, sections }, predicate) {
  return sections
    .filter((s) => predicate(s.title))
    .map((s) => lines.slice(s.start, s.end).join("\n").trim())
    .filter(Boolean)
    .join("\n\n");
}

function banner(kind) {
  return `/* Extracted from apps/web — regenerate with: npm run extract:design-assets */
/* Kind: ${kind} */
`;
}

async function download(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MITR-design-assets-extractor/1.0)",
    },
  });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function downloadFontFile(spec, weight) {
  const file = `${spec.id}-latin-${weight}-normal.woff2`;
  const urls = [
    `https://cdn.jsdelivr.net/npm/${spec.package}@5/files/${file}`,
    `https://unpkg.com/${spec.package}@5.0.0/files/${file}`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      const buf = await download(url);
      if (buf.length < 1000) {
        lastError = new Error(`Tiny response from ${url} (${buf.length} bytes)`);
        continue;
      }
      return { file, buf, url };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function write(path, contents) {
  ensureDir(dirname(path));
  writeFileSync(path, contents);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

export function buildFontsCss(downloaded) {
  const blocks = downloaded.map(
    (font) => `@font-face {
  font-family: '${font.family}';
  font-style: normal;
  font-display: swap;
  font-weight: ${font.weight};
  src: url('../fonts/${font.id}/${font.file}') format('woff2');
}`,
  );
  return `${banner("self-hosted @font-face")}
:root {
  --font-inter: 'Inter', system-ui, -apple-system, sans-serif;
  --font-sora: 'Sora', 'Inter', system-ui, -apple-system, sans-serif;
  --font-jetbrains: 'JetBrains Mono', ui-monospace, monospace;
  --font-sans: var(--font-inter);
  --font-display: var(--font-sora);
  --font-mono: var(--font-jetbrains);
}

${blocks.join("\n\n")}
`;
}

function extraComponentCss() {
  return `
/* Button variants mirrored from apps/web/src/components/ui/Button.tsx */
.btn-danger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 600;
  color: #ffffff;
  background: var(--danger);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  transition: all 150ms ease;
}
.btn-danger:hover { opacity: 0.9; }

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--brand);
  background: transparent;
  border: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  stroke: currentColor;
}
`;
}

function buildCatalogHtml({ icons, fonts, tokenVars }) {
  const iconCards = icons
    .map(
      (icon) => `      <button class="icon-card" data-name="${icon.file.replace(".svg", "")}" data-export="${icon.exportName}" type="button" title="${icon.exportName} — click to copy SVG path">
        <img src="icons/svg/${icon.file}" alt="" />
        <span>${icon.exportName}</span>
      </button>`,
    )
    .join("\n");

  const fontRows = fonts
    .map(
      (f) =>
        `      <tr><td>${f.family}</td><td>${f.weight}</td><td><code>${f.file}</code></td><td>${(f.bytes / 1024).toFixed(1)} KB</td></tr>`,
    )
    .join("\n");

  const colorTokens = tokenVars.filter((t) =>
    /color|--brand|--accent|--bg-|--text-|--success|--danger|--warning|--border/.test(
      t,
    ),
  );

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MITR AI — Design Assets</title>
  <link rel="stylesheet" href="css/mitr.css" />
  <style>
    :root { --catalog-max: 1120px; }
    body {
      margin: 0;
      font-family: var(--font-sans);
      background: var(--bg-canvas);
      color: var(--text-primary);
    }
    .wrap { max-width: var(--catalog-max); margin: 0 auto; padding: 32px 24px 80px; }
    header.hero {
      display: flex; justify-content: space-between; align-items: flex-end;
      gap: 16px; margin-bottom: 32px; flex-wrap: wrap;
    }
    h1 { margin: 0; font-size: 32px; }
    .meta { color: var(--text-secondary); font-size: 14px; }
    nav.toc { display: flex; gap: 8px; flex-wrap: wrap; margin: 16px 0 28px; }
    nav.toc a { text-decoration: none; }
    section { margin: 40px 0; }
    .swatch-grid, .icon-grid, .type-stack {
      display: grid; gap: 12px;
    }
    .swatch-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    .swatch {
      border: 1px solid var(--border); border-radius: var(--radius-lg);
      overflow: hidden; background: var(--bg-elevated);
    }
    .swatch .chip-color { height: 64px; }
    .swatch figcaption { padding: 10px 12px; font-size: 12px; }
    .swatch code { color: var(--text-muted); font-size: 11px; }
    .icon-grid { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); }
    .icon-card {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 16px 8px 12px; border: 1px solid var(--border);
      border-radius: var(--radius-lg); background: var(--bg-elevated);
      color: var(--text-primary); cursor: pointer;
    }
    .icon-card:hover { border-color: var(--brand); box-shadow: var(--shadow-glow); }
    .icon-card img { width: 22px; height: 22px; }
    .icon-card span { font-size: 11px; color: var(--text-secondary); text-align: center; word-break: break-word; }
    .hidden { display: none !important; }
    .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--border); }
    th { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    .search {
      width: min(420px, 100%); padding: 8px 12px; border-radius: var(--radius-md);
      border: 1px solid var(--border); background: var(--bg-primary); color: var(--text-primary);
      font: inherit;
    }
    .preview-card { padding: 20px; }
    .type-stack p { margin: 8px 0; }
    #toast {
      position: fixed; bottom: 20px; right: 20px; padding: 10px 14px;
      border-radius: var(--radius-md); background: var(--bg-elevated);
      border: 1px solid var(--border); box-shadow: var(--shadow-md);
      opacity: 0; pointer-events: none; transition: opacity 160ms ease;
    }
    #toast.show { opacity: 1; }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <div>
        <p class="eyebrow">MITR AI</p>
        <h1 class="headline-xl">Design assets</h1>
        <p class="meta">CSS tokens, Lucide icons used in the app, and self-hosted Inter / Sora / JetBrains Mono.</p>
      </div>
      <div class="row">
        <button class="btn-secondary" id="theme-toggle" type="button">Toggle dark</button>
        <a class="btn-ghost" href="README.md">README</a>
      </div>
    </header>

    <nav class="toc">
      <a class="chip chip-brand" href="#colors">Colors</a>
      <a class="chip" href="#type">Typography</a>
      <a class="chip" href="#components">Components</a>
      <a class="chip" href="#icons">Icons (${icons.length})</a>
      <a class="chip" href="#fonts">Fonts (${fonts.length} files)</a>
    </nav>

    <section id="colors">
      <h2 class="headline-lg">Color tokens</h2>
      <p class="meta">Live values from <code>css/tokens.css</code>. Switch theme to preview dark tokens.</p>
      <div class="swatch-grid" id="swatches">
        ${colorTokens
          .map(
            (name) => `<figure class="swatch">
          <div class="chip-color" style="background: var(${name})"></div>
          <figcaption><strong>${name}</strong><br /><code data-token="${name}"></code></figcaption>
        </figure>`,
          )
          .join("\n")}
      </div>
    </section>

    <section id="type">
      <h2 class="headline-lg">Typography</h2>
      <div class="surface preview-card type-stack">
        <p class="headline-xl">Sora display — headline xl</p>
        <p class="headline-lg">Sora display — headline lg</p>
        <p class="eyebrow">Eyebrow / overline</p>
        <p style="font-family: var(--font-sans); font-size: 14px;">Inter body — The assistant answers in the business user's own words.</p>
        <p class="numerals">JetBrains Mono 0123456789  ↑ 12.3%</p>
      </div>
    </section>

    <section id="components">
      <h2 class="headline-lg">Component classes</h2>
      <div class="surface preview-card">
        <div class="row" style="margin-bottom: 16px;">
          <button class="btn-primary" type="button">Primary</button>
          <button class="btn-secondary" type="button">Secondary</button>
          <button class="btn-ghost" type="button">Ghost</button>
          <button class="btn-danger" type="button">Danger</button>
          <button class="btn-link" type="button">Link</button>
        </div>
        <div class="row" style="margin-bottom: 16px;">
          <span class="chip">Default chip</span>
          <span class="chip chip-brand">Brand</span>
          <span class="chip chip-success">Success</span>
          <span class="chip chip-warning">Warning</span>
          <span class="chip chip-danger">Danger</span>
        </div>
        <div class="row">
          <div class="surface-soft preview-card" style="flex:1;min-width:180px"><strong>surface-soft</strong><p class="meta">Secondary panel</p></div>
          <div class="surface-glow preview-card" style="flex:1;min-width:180px"><strong>surface-glow</strong><p class="meta">Elevated card</p></div>
        </div>
      </div>
    </section>

    <section id="icons">
      <div class="row" style="justify-content: space-between; margin-bottom: 12px;">
        <h2 class="headline-lg" style="margin:0">Icons</h2>
        <input class="search" id="icon-filter" type="search" placeholder="Filter icons…" />
      </div>
      <p class="meta">Lucide icons actually imported by <code>apps/web</code>. Click a tile to copy the SVG filename.</p>
      <div class="icon-grid" id="icon-grid">
${iconCards}
      </div>
    </section>

    <section id="fonts">
      <h2 class="headline-lg">Font files</h2>
      <div class="surface">
        <table>
          <thead><tr><th>Family</th><th>Weight</th><th>File</th><th>Size</th></tr></thead>
          <tbody>
${fontRows}
          </tbody>
        </table>
      </div>
    </section>
  </div>
  <div id="toast">Copied</div>
  <script>
    const root = document.documentElement;
    document.getElementById('theme-toggle').addEventListener('click', () => {
      root.classList.toggle('dark');
      fillComputed();
    });
    function fillComputed() {
      const styles = getComputedStyle(root);
      document.querySelectorAll('[data-token]').forEach((el) => {
        el.textContent = styles.getPropertyValue(el.dataset.token).trim();
      });
    }
    fillComputed();
    const filter = document.getElementById('icon-filter');
    filter.addEventListener('input', () => {
      const q = filter.value.toLowerCase();
      document.querySelectorAll('.icon-card').forEach((card) => {
        const hay = (card.dataset.name + ' ' + card.dataset.export).toLowerCase();
        card.classList.toggle('hidden', q && !hay.includes(q));
      });
    });
    const toast = document.getElementById('toast');
    document.getElementById('icon-grid').addEventListener('click', async (e) => {
      const card = e.target.closest('.icon-card');
      if (!card) return;
      const name = card.dataset.name + '.svg';
      try { await navigator.clipboard.writeText(name); } catch {}
      toast.textContent = 'Copied ' + name;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1200);
    });
  </script>
</body>
</html>
`;
}

function listTokenVars(tokensCss) {
  const names = [];
  const re = /(--[a-z0-9-]+)\s*:/gi;
  let match;
  const seen = new Set();
  while ((match = re.exec(tokensCss))) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    names.push(match[1]);
  }
  return names;
}

export async function extractDesignAssets({
  root = ROOT,
  outDir = OUT_DIR,
  downloadFonts = true,
} = {}) {
  const webSrc = join(root, "apps/web/src");
  const lucideRoot = join(root, "apps/web/node_modules/lucide-react");
  const lucideJs = join(lucideRoot, "dist/esm/lucide-react.js");
  const lucidePkg = JSON.parse(
    readFileSync(join(lucideRoot, "package.json"), "utf8"),
  );
  const iconsDir = join(lucideRoot, "dist/esm/icons");

  rmSync(join(outDir, "css"), { recursive: true, force: true });
  rmSync(join(outDir, "icons"), { recursive: true, force: true });
  if (downloadFonts) {
    rmSync(join(outDir, "fonts"), { recursive: true, force: true });
  }

  const tokensSrc = join(webSrc, "styles/tokens.css");
  const globalsSrc = join(webSrc, "app/globals.css");
  const tokensCss = readFileSync(tokensSrc, "utf8");
  const globalsCss = readFileSync(globalsSrc, "utf8");
  const parsedGlobals = parseGlobalsSections(globalsCss);

  const componentsCss =
    banner("framework-free component CSS") +
    sliceSection(parsedGlobals, (title) =>
      [...COMPONENT_SECTIONS].some((s) => title.startsWith(s)),
    ) +
    extraComponentCss();

  const vendorCss =
    banner("app vendor overrides (AG Grid, Wijmo, Recharts, print)") +
    sliceSection(parsedGlobals, (title) =>
      [...VENDOR_SECTIONS].some((s) => title.startsWith(s)),
    ) +
    "\n";

  write(join(outDir, "css/tokens.css"), banner("design tokens") + tokensCss);
  write(join(outDir, "css/components.css"), componentsCss);
  write(join(outDir, "css/vendor-overrides.css"), vendorCss);

  const usage = scanLucideUsage(webSrc);
  const exportMap = parseLucideExportMap(readFileSync(lucideJs, "utf8"));
  const missingExports = [...usage.keys()].filter((name) => !exportMap.has(name));
  if (missingExports.length) {
    throw new Error(
      `Lucide exports not found: ${missingExports.join(", ")}`,
    );
  }

  const icons = [...usage.keys()]
    .sort((a, b) => a.localeCompare(b))
    .map((exportName) => {
      const lucideFile = exportMap.get(exportName);
      const node = loadIconNode(iconsDir, lucideFile);
      const file = `${lucideFile}.svg`;
      const svg = iconNodeToSvg(node);
      write(join(outDir, "icons/svg", file), svg);
      return {
        exportName,
        file,
        lucideFile: `${lucideFile}.js`,
        usedIn: [...usage.get(exportName)].sort(),
      };
    });

  const uniqueFiles = [...new Set(icons.map((i) => i.file))];
  const spriteChildren = uniqueFiles
    .map((file) => {
      const svg = readFileSync(join(outDir, "icons/svg", file), "utf8");
      const inner = svg
        .replace(/<svg[^>]*>/, "")
        .replace("</svg>", "")
        .trim();
      const id = file.replace(/\.svg$/, "");
      return `  <symbol id="${id}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\n${inner}\n  </symbol>`;
    })
    .join("\n");
  write(
    join(outDir, "icons/sprite.svg"),
    `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\n${spriteChildren}\n</svg>\n`,
  );

  write(
    join(outDir, "icons/icons.json"),
    JSON.stringify(
      {
        source: `lucide-react@${lucidePkg.version}`,
        license: lucidePkg.license || "ISC",
        count: icons.length,
        uniqueSvgFiles: uniqueFiles.length,
        icons,
      },
      null,
      2,
    ) + "\n",
  );

  const fontRecords = [];
  if (downloadFonts) {
    for (const spec of FONT_SPECS) {
      for (const weight of spec.weights) {
        const { file, buf, url } = await downloadFontFile(spec, weight);
        const dest = join(outDir, "fonts", spec.id, file);
        write(dest, buf);
        fontRecords.push({
          family: spec.family,
          id: spec.id,
          weight,
          file,
          url,
          bytes: buf.length,
          sha256: sha256(buf),
        });
      }
    }
    try {
      const ofl = await download(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter@5/LICENSE",
      );
      write(join(outDir, "fonts/OFL-LICENSE.txt"), ofl);
    } catch {
      write(
        join(outDir, "fonts/OFL-LICENSE.txt"),
        "Inter, Sora, and JetBrains Mono are licensed under the SIL Open Font License 1.1.\n",
      );
    }
  } else {
    // Preserve existing font files when tests skip the network.
    for (const spec of FONT_SPECS) {
      const dir = join(outDir, "fonts", spec.id);
      try {
        for (const file of readdirSync(dir)) {
          const st = statSync(join(dir, file));
          const weight = Number((file.match(/-(\d+)-/) || [])[1] || 0);
          fontRecords.push({
            family: spec.family,
            id: spec.id,
            weight,
            file,
            bytes: st.size,
          });
        }
      } catch {
        // optional
      }
    }
  }

  write(join(outDir, "css/fonts.css"), buildFontsCss(fontRecords.length ? fontRecords : FONT_SPECS.flatMap((s) => s.weights.map((weight) => ({
    family: s.family,
    id: s.id,
    weight,
    file: `${s.id}-latin-${weight}-normal.woff2`,
  })))));

  write(
    join(outDir, "css/mitr.css"),
    `${banner("entry")}@import url("./fonts.css");
@import url("./tokens.css");
@import url("./components.css");
`,
  );

  const tokenVars = listTokenVars(tokensCss);
  write(
    join(outDir, "catalog.html"),
    buildCatalogHtml({
      icons,
      fonts: fontRecords,
      tokenVars,
    }),
  );

  copyFileSync(join(lucideRoot, "LICENSE"), join(outDir, "icons/LUCIDE-LICENSE"));

  const manifest = {
    extractedAt: new Date().toISOString(),
    source: {
      tokens: "apps/web/src/styles/tokens.css",
      globals: "apps/web/src/app/globals.css",
      fonts: "next/font/google via Inter, Sora, JetBrains_Mono",
      icons: `lucide-react@${lucidePkg.version}`,
    },
    counts: {
      icons: icons.length,
      uniqueSvgFiles: uniqueFiles.length,
      fontFiles: fontRecords.length,
      cssTokenVars: tokenVars.length,
    },
    fonts: fontRecords,
  };
  write(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  return manifest;
}

async function main() {
  const manifest = await extractDesignAssets();
  console.log(
    `Extracted ${manifest.counts.icons} icons, ${manifest.counts.fontFiles} font files, ${manifest.counts.cssTokenVars} CSS tokens → packages/design-assets`,
  );
}

const isDirect =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirect) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
