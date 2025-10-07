import { useEffect } from "react";

/**
 * Global image watermarking hook.
 * - Attempts to bake a large, semi-transparent text watermark into the image via canvas (so Save As keeps it)
 * - Falls back to a CSS overlay if the image is CORS-tainted
 * - Targets property hero/gallery images and any <img data-wm="1"> across the app
 * - Skips tiny images to avoid icons/logos
 */
export function useWatermark() {
  useEffect(() => {
    const TEXT = "ashishproperties.in"; // watermark text (small, side, repeated)
    const FONT_WEIGHT = 800;

    const selectors = [
      '[data-role="property-hero"] img',
      ".property-hero img",
      ".property-gallery img",
      ".lightbox img",
      '[role="dialog"] img',
      'img[data-wm="1"]',
    ];

    const exclude = (img: HTMLImageElement) => {
      if (!img || img.dataset.noWm === "true") return true;
      if (img.classList.contains("no-wm")) return true;
      const w = img.naturalWidth || img.width || 0;
      const h = img.naturalHeight || img.height || 0;
      if (w < 120 || h < 120) return true; // ignore small images/icons
      return false;
    };

    const alreadyProcessed = (img: HTMLImageElement) =>
      img.dataset.wmProcessed === "1";
    const markProcessed = (img: HTMLImageElement) => {
      img.dataset.wmProcessed = "1";
    };

    const ensureLoaded = (img: HTMLImageElement) =>
      new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) return resolve();
        const onLoad = () => {
          cleanup();
          resolve();
        };
        const onError = () => {
          cleanup();
          reject(new Error("img-error"));
        };
        const cleanup = () => {
          img.removeEventListener("load", onLoad);
          img.removeEventListener("error", onError);
        };
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onError);
      });

    const measureTextWithSpacing = (
      ctx: CanvasRenderingContext2D,
      text: string,
      letterSpacing: number,
    ) => {
      let w = 0;
      const upper = text.toUpperCase();
      for (let i = 0; i < upper.length; i++) {
        const m = ctx.measureText(upper[i]);
        w += m.width;
        if (i !== upper.length - 1) w += letterSpacing;
      }
      return w;
    };

    // Draws a big watermark text in the bottom-right corner
    const bakeWatermark = async (img: HTMLImageElement) => {
      await ensureLoaded(img);

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) throw new Error("no-size");

      // Try to load with CORS enabled
      const src = img.currentSrc || img.src;
      const off = new Image();
      off.crossOrigin = "anonymous";
      off.decoding = "async";
      off.loading = "eager";
      const loadPromise = new Promise<void>((resolve, reject) => {
        off.onload = () => resolve();
        off.onerror = () => reject(new Error("cors-blocked"));
      });
      off.src = src;
      await loadPromise;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("ctx");

      // Paint original
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, w, h);

      // Compute font size relative to how large the image is displayed to keep consistency
      const rect = img.getBoundingClientRect();
      const dispW = Math.max(1, rect.width || img.width || w);
      const dispH = Math.max(1, rect.height || img.height || h);
      const base = Math.min(dispW, dispH);

      // Font sizing and spacing
      let fontPx = Math.max(24, Math.round(base * 0.16)); // ~16% of shorter side
      const letterSpacingPx = Math.round(fontPx * 0.06);

      ctx.font = `${FONT_WEIGHT} ${fontPx}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
      const text = TEXT.toUpperCase();
      let textW = measureTextWithSpacing(ctx, text, letterSpacingPx);

      // Constrain width to 70% of image width
      const maxW = w * 0.7;
      if (textW > maxW) {
        const s = maxW / textW;
        fontPx = Math.max(18, Math.floor(fontPx * s));
        ctx.font = `${FONT_WEIGHT} ${fontPx}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
        textW = measureTextWithSpacing(ctx, text, Math.round(fontPx * 0.06));
      }

      const margin = Math.max(12, Math.round(Math.min(w, h) * 0.035));
      const xStart = Math.max(0, w - textW - margin);
      const y = Math.max(fontPx + margin, h - margin);

      // Draw subtle shadow/outline for readability
      ctx.save();
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = Math.max(1, Math.round(fontPx * 0.06));

      // Manual draw to apply letter spacing
      let x = xStart;
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        ctx.strokeText(ch, x, y);
        ctx.fillText(ch, x, y);
        x += ctx.measureText(ch).width + Math.round(fontPx * 0.06);
      }
      ctx.restore();

      // Export as blob/URL
      return await new Promise<string>((resolve, reject) => {
        try {
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                resolve(url);
              } else {
                try {
                  const data = canvas.toDataURL();
                  resolve(data);
                } catch (e) {
                  reject(new Error("toDataURL"));
                }
              }
            },
            "image/png",
            0.92,
          );
        } catch (e) {
          reject(new Error("tainted"));
        }
      });
    };

    // CSS fallback overlay (when canvas is tainted)
    const setOverlay = (img: HTMLImageElement) => {
      const parent =
        img.closest(
          "[data-role=property-hero], .property-hero, .lightbox, [role=dialog], [role='dialog']",
        ) || img.parentElement;
      if (!parent) return;

      const host = parent as HTMLElement;
      const prev = host.querySelector<HTMLElement>("[data-wm-overlay='1']");
      if (prev) return;

      const rect = img.getBoundingClientRect();
      const dispW = Math.max(1, rect.width || img.width);
      const dispH = Math.max(1, rect.height || img.height);

      if (getComputedStyle(host).position === "static")
        host.style.position = "relative";

      const overlay = document.createElement("div");
      overlay.setAttribute("data-wm-overlay", "1");
      overlay.setAttribute("aria-hidden", "true");
      // Make overlay cover the entire host and tile the watermark text across it
      overlay.style.position = "absolute";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "60";
      overlay.style.display = "flex";
      overlay.style.flexWrap = "wrap";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.gap = "2rem";
      overlay.style.opacity = "0.18";

      // Create multiple watermark nodes tiled across the area
      const tileCountX = Math.max(3, Math.round(dispW / 160));
      const tileCountY = Math.max(2, Math.round(dispH / 120));
      const fontPx = Math.max(12, Math.round(Math.min(dispW, dispH) * 0.06));

      for (let y = 0; y < tileCountY; y++) {
        for (let x = 0; x < tileCountX; x++) {
          const text = document.createElement("div");
          text.textContent = TEXT;
          text.style.font = `${FONT_WEIGHT} ${fontPx}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
          text.style.textTransform = "lowercase";
          text.style.color = "rgba(0,0,0,0.24)";
          text.style.transform = "rotate(-25deg)";
          text.style.userSelect = "none";
          text.style.pointerEvents = "none";
          text.style.whiteSpace = "nowrap";
          text.style.letterSpacing = "1px";
          overlay.appendChild(text);
        }
      }

      host.appendChild(overlay);
    };

    const process = async (img: HTMLImageElement) => {
      if (alreadyProcessed(img) || exclude(img)) return;
      try {
        const url = await bakeWatermark(img);
        if (url) {
          const prev = img.dataset.wmUrl;
          img.src = url;
          img.dataset.wmUrl = url;
          if (prev && prev.startsWith("blob:")) {
            try {
              URL.revokeObjectURL(prev);
            } catch {}
          }
          markProcessed(img);
          return;
        }
      } catch {
        // Fall back to CSS overlay
      }
      setOverlay(img);
      markProcessed(img);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.target instanceof HTMLImageElement) {
            process(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { root: null, rootMargin: "0px", threshold: 0.1 },
    );

    const observeExisting = () => {
      const nodes = document.querySelectorAll<HTMLImageElement>(
        selectors.join(","),
      );
      nodes.forEach((img) => {
        if (!alreadyProcessed(img) && !exclude(img)) io.observe(img);
      });
    };

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLImageElement) {
              if (!alreadyProcessed(n) && !exclude(n)) io.observe(n);
            } else if (n instanceof HTMLElement) {
              const imgs = n.querySelectorAll<HTMLImageElement>(
                selectors.join(","),
              );
              imgs.forEach((img) => {
                if (!alreadyProcessed(img) && !exclude(img)) io.observe(img);
              });
            }
          });
        } else if (
          m.type === "attributes" &&
          m.target instanceof HTMLImageElement &&
          m.attributeName === "src"
        ) {
          const img = m.target as HTMLImageElement;
          img.dataset.wmProcessed = ""; // reset so it can reprocess on new src
          if (!exclude(img)) io.observe(img);
        }
      }
    });

    observeExisting();
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"],
    });

    return () => {
      try {
        io.disconnect();
      } catch {}
      try {
        mo.disconnect();
      } catch {}
      document
        .querySelectorAll<HTMLElement>("[data-wm-overlay='1']")
        .forEach((el) => el.remove());
    };
  }, []);
}
