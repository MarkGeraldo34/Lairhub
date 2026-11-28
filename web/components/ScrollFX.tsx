"use client";

import { useEffect } from "react";

/**
 * Scroll effects for the whole site, with one scroll listener:
 *  - sets --sy (scroll distance) for the hero parallax
 *  - sets data-scrolled on <html> so the header can switch from transparent to solid
 *  - adds .in to .reveal elements when they enter the screen (also ones added later, e.g. listings)
 *  - sets --p (0 → 1) on [data-scrollprog] elements as you scroll through them
 */
export default function ScrollFX() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.classList.remove("fx");
      return;
    }
    root.classList.add("fx");

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const watch = (el: Element) => {
      if (el.classList.contains("reveal") && !el.classList.contains("in")) io.observe(el);
    };
    document.querySelectorAll(".reveal").forEach(watch);
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            watch(n);
            n.querySelectorAll(".reveal").forEach(watch);
          }
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let raf = 0;
    const update = () => {
      raf = 0;
      const y = window.scrollY;
      root.style.setProperty("--sy", String(Math.min(y, 900)));
      root.dataset.scrolled = y > 24 ? "true" : "false";
      const vh = window.innerHeight;
      document.querySelectorAll<HTMLElement>("[data-scrollprog]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (vh * 0.78 - r.top) / Math.max(r.height, 1)));
        el.style.setProperty("--p", p.toFixed(3));
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      io.disconnect();
      mo.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}
