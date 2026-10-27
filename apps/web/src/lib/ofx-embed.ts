/**
 * Framed in One Finance (the host console).
 *
 * One Finance opens the widget as /widget?group=…&ofx-embed=1&theme=light|dark&skin=steps|ofx&groupUnit=…&cobDate=…
 * and then speaks a small postMessage contract:
 *   host → bot   { type: 'ofx.theme', theme, skin }                       on every theme change
 *                { type: 'ofx.context', scope: { groupUnit, cobDate, region }, page, user }
 *   bot → host   { type: 'ofx.chat.ready' }                               we are listening
 *                { type: 'ofx.chat.open', route: '/instance/…' }          ask the console to open a screen
 * Messages are accepted only from NEXT_PUBLIC_ONEFINUX_ORIGIN and only from the parent window. Without that
 * setting the widget ignores ofx-embed and behaves as before.
 *
 * The look comes from One Finance's own tokens file (<origin>/theme/onefinux-tokens.css): with
 * <html data-ofx-vars="mitr"> it maps --brand, --bg-*, --text-*, --border … onto the One Finance palette.
 */

export type OfxTheme = "light" | "dark";

export interface OfxEmbed {
  theme: OfxTheme;
  skin: string;
}

export interface OfxScope {
  groupUnit?: string;
  cobDate?: string;
  region?: string;
}

export const ONEFINUX_ORIGIN = (process.env.NEXT_PUBLIC_ONEFINUX_ORIGIN || "").replace(/\/$/, "");

const SKIN = /^[a-z][a-z0-9-]{0,20}$/;

function cleanTheme(v: unknown): OfxTheme {
  return v === "dark" ? "dark" : "light";
}

function cleanSkin(v: unknown): string {
  return typeof v === "string" && SKIN.test(v) ? v : "steps";
}

/** The embed settings from a query string, or null when not framed by One Finance. */
export function readOfxEmbed(search: string, origin: string = ONEFINUX_ORIGIN): OfxEmbed | null {
  if (!origin) return null;
  const q = new URLSearchParams(search);
  if (q.get("ofx-embed") !== "1") return null;
  return { theme: cleanTheme(q.get("theme")), skin: cleanSkin(q.get("skin")) };
}

/** Paint the page with the host's tokens: attributes on <html> plus the host's stylesheet, added once. */
export function applyOfxEmbed(embed: OfxEmbed, origin: string = ONEFINUX_ORIGIN): void {
  const html = document.documentElement;
  html.setAttribute("data-ofx-vars", "mitr");
  html.setAttribute("data-skin", embed.skin);
  html.setAttribute("data-theme", embed.theme);
  if (!document.getElementById("ofx-tokens")) {
    const link = document.createElement("link");
    link.id = "ofx-tokens";
    link.rel = "stylesheet";
    link.href = `${origin}/theme/onefinux-tokens.css`;
    document.head.appendChild(link);
  }
}

export type OfxMessage =
  | { kind: "theme"; theme: OfxTheme; skin: string }
  | { kind: "context"; scope: OfxScope; page?: string };

/** A message from the host, checked against the contract; null for anything else. */
export function readOfxMessage(
  event: { origin: string; source: unknown; data: unknown },
  parent: unknown,
  origin: string = ONEFINUX_ORIGIN,
): OfxMessage | null {
  if (!origin || event.origin !== origin || event.source !== parent) return null;
  const d = event.data as Record<string, unknown> | null;
  if (!d || typeof d !== "object" || typeof d.type !== "string") return null;
  if (d.type === "ofx.theme") return { kind: "theme", theme: cleanTheme(d.theme), skin: cleanSkin(d.skin) };
  if (d.type === "ofx.context" && d.scope && typeof d.scope === "object") {
    const s = d.scope as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);
    return {
      kind: "context",
      scope: { groupUnit: str(s.groupUnit), cobDate: str(s.cobDate), region: str(s.region) },
      page: str(d.page),
    };
  }
  return null;
}

/** Tell the host something; only ever to the configured origin. */
export function postToOfx(message: { type: string; [k: string]: unknown }, origin: string = ONEFINUX_ORIGIN): void {
  if (origin && window.parent !== window) window.parent.postMessage(message, origin);
}
