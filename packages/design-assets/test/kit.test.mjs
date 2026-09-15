import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  extractLucideImports,
  parseLucideExportMap,
  parseGlobalsSections,
  iconNodeToSvg,
  loadIconNode,
  scanLucideUsage,
  buildFontsCss,
} from "../../../scripts/extract-design-assets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..");
const ROOT = join(KIT, "../..");
const WEB_SRC = join(ROOT, "apps/web/src");

describe("lucide import scanner", () => {
  it("collects named icon exports and skips types", () => {
    const source = `
      import type { LucideIcon } from "lucide-react";
      import { MessageSquare, type LucideIcon as IconType, X } from "lucide-react";
    `;
    assert.deepEqual([...extractLucideImports(source)].sort(), [
      "MessageSquare",
      "X",
    ]);
  });

  it("finds MessageSquare usage in the real sidebar", () => {
    const usage = scanLucideUsage(WEB_SRC);
    assert.ok(usage.has("MessageSquare"));
    assert.ok(
      [...usage.get("MessageSquare")].some((f) => f.includes("Sidebar")),
    );
  });
});

describe("lucide export map + svg", () => {
  it("maps CheckCircle2 to circle-check and emits svg", () => {
    const js = readFileSync(
      join(ROOT, "apps/web/node_modules/lucide-react/dist/esm/lucide-react.js"),
      "utf8",
    );
    const map = parseLucideExportMap(js);
    assert.equal(map.get("CheckCircle2"), "circle-check");
    assert.equal(map.get("MessageSquare"), "message-square");
    assert.equal(map.get("Edit2"), "pen");
    const node = loadIconNode(
      join(ROOT, "apps/web/node_modules/lucide-react/dist/esm/icons"),
      "message-square",
    );
    const svg = iconNodeToSvg(node);
    assert.match(svg, /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(svg, /<path /);
  });
});

describe("globals.css section split", () => {
  it("finds component and vendor sections", () => {
    const globals = readFileSync(join(WEB_SRC, "app/globals.css"), "utf8");
    const parsed = parseGlobalsSections(globals);
    const titles = parsed.sections.map((s) => s.title);
    assert.ok(titles.some((t) => t.startsWith("Base styles")));
    assert.ok(titles.some((t) => t.startsWith("Typography utilities")));
    assert.ok(titles.some((t) => t.startsWith("Dark mode overrides")));
    assert.ok(titles.some((t) => t.startsWith("Scrollbar Styles")));
  });
});

describe("fonts.css builder", () => {
  it("emits @font-face for Inter 400", () => {
    const css = buildFontsCss([
      { family: "Inter", id: "inter", weight: 400, file: "inter-latin-400-normal.woff2" },
    ]);
    assert.match(css, /font-family: 'Inter'/);
    assert.match(css, /url\('\.\.\/fonts\/inter\/inter-latin-400-normal\.woff2'\)/);
  });
});

describe("extracted kit", () => {
  it("contains css, icons, fonts, and catalog", () => {
    const required = [
      "css/tokens.css",
      "css/fonts.css",
      "css/components.css",
      "css/vendor-overrides.css",
      "css/mitr.css",
      "icons/icons.json",
      "icons/sprite.svg",
      "catalog.html",
      "manifest.json",
    ];
    for (const file of required) {
      assert.equal(existsSync(join(KIT, file)), true, `missing ${file}`);
    }

    const tokens = readFileSync(join(KIT, "css/tokens.css"), "utf8");
    assert.match(tokens, /--brand:\s*#6366f1/);
    assert.match(tokens, /\.dark\s*\{/);

    const components = readFileSync(join(KIT, "css/components.css"), "utf8");
    assert.match(components, /\.btn-primary/);
    assert.match(components, /\.chip-brand/);
    assert.doesNotMatch(components, /@import "tailwindcss"/);

    const usage = scanLucideUsage(WEB_SRC);
    const inventory = JSON.parse(readFileSync(join(KIT, "icons/icons.json"), "utf8"));
    assert.equal(inventory.icons.length, usage.size);

    for (const icon of inventory.icons) {
      const svgPath = join(KIT, "icons/svg", icon.file);
      assert.equal(existsSync(svgPath), true, `missing svg ${icon.file}`);
      const svg = readFileSync(svgPath, "utf8");
      assert.match(svg, /^<svg /);
    }

    const catalog = readFileSync(join(KIT, "catalog.html"), "utf8");
    assert.match(catalog, /css\/mitr\.css/);
    assert.match(catalog, /Toggle dark/);

    const fontFiles = [
      "fonts/inter/inter-latin-400-normal.woff2",
      "fonts/sora/sora-latin-600-normal.woff2",
      "fonts/jetbrains-mono/jetbrains-mono-latin-400-normal.woff2",
    ];
    for (const file of fontFiles) {
      assert.equal(existsSync(join(KIT, file)), true, `missing ${file}`);
    }

    const woff2Count = ["inter", "sora", "jetbrains-mono"].reduce((n, id) => {
      const dir = join(KIT, "fonts", id);
      return n + readdirSync(dir).filter((f) => f.endsWith(".woff2")).length;
    }, 0);
    assert.equal(woff2Count, 4 + 5 + 3);
  });
});
