"use client";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  applyOfxEmbed,
  postToOfx,
  readOfxEmbed,
  readOfxMessage,
} from "@/lib/ofx-embed";

/**
 * When One Finance frames the widget (?ofx-embed=1), take its theme and tokens and keep them in step with the
 * console. Renders nothing; does nothing when the widget is opened on its own.
 */
export function OfxEmbedBridge() {
  const { setTheme, setSkin } = useTheme();

  useEffect(() => {
    const embed = readOfxEmbed(window.location.search);
    if (!embed) return undefined;
    applyOfxEmbed(embed);
    setTheme(embed.theme, { persist: false });
    if (embed.skin === "steps" || embed.skin === "ofx")
      setSkin(embed.skin, { persist: false });

    function onMessage(event: MessageEvent) {
      const m = readOfxMessage(event, window.parent);
      if (m?.kind === "theme") {
        applyOfxEmbed({ theme: m.theme, skin: m.skin });
        setTheme(m.theme, { persist: false });
        if (m.skin === "steps" || m.skin === "ofx")
          setSkin(m.skin, { persist: false });
      }
    }
    window.addEventListener("message", onMessage);
    postToOfx({ type: "ofx.chat.ready" });
    return () => window.removeEventListener("message", onMessage);
  }, [setTheme, setSkin]);

  return null;
}
