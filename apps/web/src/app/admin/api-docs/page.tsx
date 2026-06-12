/**
 * Admin API reference rendered via Redoc, loaded from the CDN.
 *
 * Why Redoc over Swagger UI:
 *   - Single `<script>` tag, no build-time setup
 *   - Sane default styling
 *   - Read-only by design — we don't want "try it out" buttons on
 *     the admin surface where one click could nuke a synonym entry
 *
 * Loads the spec from /api/openapi.json (engine-proxied). Local dev
 * works the same as production — the proxy hides the engine port.
 */

"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

const REDOC_CDN =
  "https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js";

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Redoc auto-initializes from <redoc> elements once the script
    // loads. The Script tag below handles that — this hook is just
    // to scroll the container into view if the user lands here from
    // a hash link.
    if (typeof window !== "undefined" && window.location.hash) {
      containerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          Admin API Reference
        </p>
        <h1 className="text-lg font-semibold text-gray-900 mt-0.5">
          Chatbot Engine — OpenAPI 3.0
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Hand-maintained spec at <code>apps/engine/openapi.json</code>.
          Served from{" "}
          <a
            href="/api/openapi.json"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            /api/openapi.json
          </a>
          . Point Postman / Bruno / Swagger UI at that URL for live inspection.
        </p>
      </header>

      {/* Redoc renders into this element via the spec-url attribute. */}
      {}
      {(() => {
        // Redocly's `<redoc>` web component takes kebab-case props.
        // Cast to ComponentType<any> so the extra `theme` attribute
        // (and any other non-standard HTML props) don't trip JSX
        // intrinsic-element type narrowing.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Element = "redoc" as unknown as React.ComponentType<any>;
        return (
          <Element
            spec-url="/api/openapi.json"
            theme='{"colors":{"primary":{"main":"#2563eb"}},"typography":{"fontSize":"14px"}}'
          />
        );
      })()}
      <Script src={REDOC_CDN} strategy="afterInteractive" />
    </div>
  );
}
