#!/usr/bin/env node
/**
 * Copy the One Finance design standard into the web app.
 *
 *   node scripts/sync-ofx-theme.mjs [source]
 *
 * source: a folder holding onefinux-tokens.css and onefinux-wijmo.css (e.g. ../onefinuxdemo/frontend/theme)
 * or a base URL; default: the onefinuxdemo main branch on GitHub. The files land in
 * apps/web/src/styles/ofx/ with a header naming where they came from. Edit them in One Finance, never here —
 * STEPS v3, One Finance and MITR AI all paint from the same two files.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FILES = ["onefinux-tokens.css", "onefinux-wijmo.css"];
const DEFAULT_SOURCE =
  "https://raw.githubusercontent.com/praveen2025work/onefinuxdemo/main/frontend/theme";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "apps/web/src/styles/ofx");
const source = process.argv[2] || DEFAULT_SOURCE;
const isUrl = /^https?:\/\//.test(source);

async function read(name) {
  if (!isUrl) return readFile(join(resolve(source), name), "utf8");
  const res = await fetch(`${source.replace(/\/$/, "")}/${name}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.text();
}

await mkdir(outDir, { recursive: true });
for (const name of FILES) {
  const body = await read(name);
  const header = `/* Copied from One Finance frontend/theme/${name} by scripts/sync-ofx-theme.mjs. Do not edit here. */\n`;
  await writeFile(join(outDir, name), header + body);
  console.log(`synced ${name} (${body.length} bytes)`);
}
