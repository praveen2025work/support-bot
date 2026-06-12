"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";

/**
 * Floating "scroll to top" button that appears after scrolling down.
 * Attaches to the nearest scrollable ancestor (`overflow-auto` main) or window.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  const [scrollEl, setScrollEl] = useState<Element | null>(null);

  const refCb = useCallback((node: HTMLButtonElement | null) => {
    if (!node) return;
    // Walk up to find the scrollable container (main with overflow-auto)
    let el: Element | null = node.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (
        style.overflowY === "auto" ||
        style.overflowY === "scroll" ||
        style.overflow === "auto" ||
        style.overflow === "scroll"
      ) {
        setScrollEl(el);
        return;
      }
      el = el.parentElement;
    }
    // Fallback: use documentElement
    setScrollEl(document.documentElement);
  }, []);

  useEffect(() => {
    if (!scrollEl) return;

    const onScroll = () => {
      setVisible(scrollEl.scrollTop > 300);
    };

    // For documentElement, listen on window
    const target = scrollEl === document.documentElement ? window : scrollEl;
    target.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => target.removeEventListener("scroll", onScroll);
  }, [scrollEl]);

  const scrollToTop = () => {
    if (!scrollEl) return;
    scrollEl.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      ref={refCb}
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-300"
      style={{
        backgroundColor: "hsl(var(--primary))",
        color: "hsl(var(--primary-foreground))",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(16px)",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
