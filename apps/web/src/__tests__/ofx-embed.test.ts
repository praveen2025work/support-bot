import { readOfxEmbed, readOfxMessage } from "@/lib/ofx-embed";

const HOST = "https://onefinance.example.com";

describe("readOfxEmbed", () => {
  it("is off unless the host origin is configured and the flag is set", () => {
    expect(readOfxEmbed("?ofx-embed=1&theme=dark", "")).toBeNull();
    expect(readOfxEmbed("?theme=dark", HOST)).toBeNull();
  });

  it("reads theme and skin, falling back to light / steps", () => {
    expect(readOfxEmbed("?ofx-embed=1&theme=dark&skin=ofx", HOST)).toEqual({ theme: "dark", skin: "ofx" });
    expect(readOfxEmbed("?ofx-embed=1&theme=pink&skin=<b>", HOST)).toEqual({ theme: "light", skin: "steps" });
  });
});

describe("readOfxMessage", () => {
  const parent = {};

  it("accepts theme and context from the host's origin and parent window only", () => {
    expect(readOfxMessage({ origin: HOST, source: parent, data: { type: "ofx.theme", theme: "dark", skin: "steps" } }, parent, HOST))
      .toEqual({ kind: "theme", theme: "dark", skin: "steps" });
    expect(readOfxMessage({ origin: HOST, source: parent, data: { type: "ofx.context", scope: { groupUnit: "REV-ACC", cobDate: "2026-09-12" }, page: "home" } }, parent, HOST))
      .toEqual({ kind: "context", scope: { groupUnit: "REV-ACC", cobDate: "2026-09-12", region: undefined }, page: "home" });
  });

  it("ignores other origins, other windows and unknown types", () => {
    const data = { type: "ofx.theme", theme: "dark" };
    expect(readOfxMessage({ origin: "https://evil.example", source: parent, data }, parent, HOST)).toBeNull();
    expect(readOfxMessage({ origin: HOST, source: {}, data }, parent, HOST)).toBeNull();
    expect(readOfxMessage({ origin: HOST, source: parent, data: { type: "chatbot-close" } }, parent, HOST)).toBeNull();
    expect(readOfxMessage({ origin: HOST, source: parent, data }, parent, "")).toBeNull();
  });
});
