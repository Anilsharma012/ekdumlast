// Import the existing API URL creation logic
import { createApiUrl } from "./api";
import { safeReadResponse } from "./response-utils";

// Make global fetch resilient: wrap native fetch so network failures return a safe Response-like object
if (typeof window !== "undefined" && typeof window.fetch === "function") {
  const _nativeFetch = window.fetch.bind(window);
  (window as any).fetch = (...args: any[]) => {
    try {
      const p = _nativeFetch(...args);
      return p.catch((err: any) => {
        // Normalize AbortError/timeout to a structured timeout response so callers don't crash
        const message = err?.message || String(err);
        if (
          err?.name === "AbortError" ||
          String(message).toLowerCase().includes("aborted") ||
          String(message).toLowerCase().includes("timeout")
        ) {
          console.debug("Fetch aborted/timeout (normalized):", message);
          return Promise.resolve({
            ok: false,
            status: 408,
            async json() {
              return { error: "timeout" };
            },
            async text() {
              return "";
            },
            clone() {
              return this;
            },
          } as any);
        }

        console.error("Wrapped fetch network error:", message || err);
        return {
          ok: false,
          status: 0,
          async json() {
            return { error: "Network error" };
          },
          async text() {
            return "";
          },
          clone() {
            return this;
          },
        } as any;
      });
    } catch (err) {
      // Synchronous errors while patching fetch - preserve AbortError if present
      if (
        (err as any)?.name === "AbortError" ||
        String((err as any)?.message || "").toLowerCase().includes("aborted") ||
        String((err as any)?.message || "").toLowerCase().includes("timeout")
      ) {
        return Promise.reject(err);
      }
      console.error("Wrapped fetch unexpected error:", err);
      return Promise.resolve({
        ok: false,
        status: 0,
        async json() {
          return { error: "Network error" };
        },
        async text() {
          return "";
        },
        clone() {
          return this;
        },
      } as any);
    }
  };
}

// Make API helper available globally
function api(p: string, o: any = {}) {
  const t = localStorage.getItem("token");

  // Use the existing API URL logic to construct the proper URL
  const url = createApiUrl(p);

  console.log("🚀 Global API call:", {
    endpoint: p,
    url: url,
    method: o.method || "GET",
    hasToken: !!t,
    hasBody: !!o.body,
  });

  // Handle body - if it's already a string, use it as-is, otherwise stringify
  let bodyContent;
  if (o.body) {
    if (typeof o.body === "string") {
      bodyContent = o.body;
    } else {
      bodyContent = JSON.stringify(o.body);
    }
  }

  // Add timeout and better error handling
  const controller = new AbortController();
  const timeoutMs = typeof o.timeout === "number" ? o.timeout : 15000;
  const timeoutId = setTimeout(() => {
    try {
      controller.abort();
    } catch {}
    console.warn(`⏰ API request timeout after ${timeoutMs}ms:`, url);
  }, timeoutMs);

  const method = (o.method || "GET").toUpperCase();
  const baseHeaders: Record<string, string> = {
    ...(o.headers || {}),
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
  // Only set Content-Type when we actually send a body
  if (bodyContent && !baseHeaders["Content-Type"]) {
    baseHeaders["Content-Type"] = "application/json";
  }

  // Use an explicit async wrapper so we can reliably catch fetch errors
  const doFetch = async () => {
    try {
      return await fetch(url, {
        method,
        headers: baseHeaders,
        body: bodyContent,
        signal: controller.signal,
        keepalive: !!o.keepalive,
        // Prefer include to match server cookie-based auth when available
        credentials: o.credentials || "include",
        // Omit explicit mode to allow browser default behavior for same-origin requests
        cache: o.cache || "no-store",
        referrerPolicy: "no-referrer",
      });
    } catch (e) {
      // Re-throw so outer handler can catch and attempt XHR fallback
      throw e;
    }
  };

  const xhrFallback = () =>
    new Promise<{ ok: boolean; status: number; data: any }>((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        Object.entries(baseHeaders).forEach(([k, v]) =>
          xhr.setRequestHeader(k, v),
        );
        xhr.timeout = timeoutMs;
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            let parsed: any = {};
            try {
              parsed = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            } catch {
              parsed = { raw: xhr.responseText };
            }
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              data: parsed,
            });
          }
        };
        xhr.ontimeout = () =>
          resolve({
            ok: false,
            status: 408,
            data: { error: "Request timeout" },
          });
        xhr.onerror = () =>
          resolve({ ok: false, status: 0, data: { error: "Network error" } });
        xhr.send(bodyContent || null);
      } catch (e: any) {
        resolve({
          ok: false,
          status: 0,
          data: { error: e?.message || "Network error" },
        });
      }
    });

  // Force XHR transport if requested
  if (o.transport === "xhr") {
    return xhrFallback().then(
      (res) =>
        ({
          ok: res.ok,
          status: res.status,
          success: res.ok,
          data: res.data,
          json: res.data,
        }) as any,
    );
  }

  // Single async flow: try fetch, fall back to XHR, ensure all errors are handled and timeout cleared
  return (async () => {
    try {
      const r = await doFetch();
      clearTimeout(timeoutId);

      console.log("✅ Global API response", {
        url,
        status: r.status,
        ok: r.ok,
      });

      const { ok, status, data } = await safeReadResponse(r);
      return { ok, status, success: ok, data, json: data } as any;
    } catch (error: any) {
      // Try XHR fallback
      try {
        console.warn(
          "⚠️ fetch failed, attempting XHR fallback:",
          url,
          error?.message || error,
        );
        const res = await xhrFallback();
        clearTimeout(timeoutId);
        return {
          ok: res.ok,
          status: res.status,
          success: res.ok,
          data: res.data,
          json: res.data,
        } as any;
      } catch (xhrError) {
        clearTimeout(timeoutId);
        // Map to timeout/network errors where appropriate
        if (
          error?.name === "AbortError" ||
          String(error?.message || "")
            .toLowerCase()
            .includes("aborted") ||
          String(xhrError?.message || "")
            .toLowerCase()
            .includes("timeout")
        ) {
          // Normalize timeout to structured response
          return {
            ok: false,
            status: 408,
            success: false,
            data: { error: "timeout" },
            json: { error: "timeout" },
          } as any;
        }

        // Normalize other network errors
        return {
          ok: false,
          status: 0,
          success: false,
          data: { error: "Network error" },
          json: { error: "Network error" },
        } as any;
      }
    }
  })();
}

// Make it globally available
(window as any).api = api;

export { api };
