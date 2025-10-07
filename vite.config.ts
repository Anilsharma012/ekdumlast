// vite.config.ts
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import "dotenv/config";
import path from "path";
import { createServer, initializeSocket } from "./server";

// ENV toggle: set DISABLE_SOURCEMAP=true to turn off in prod without editing file
const DISABLE_SOURCEMAP = String(process.env.DISABLE_SOURCEMAP || "").toLowerCase() === "true";

export default defineConfig(({ command }) => {
  const isDev = command === "serve";

  return {
    plugins: [react(), isDev ? expressPlugin() : undefined].filter(Boolean) as Plugin[],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },

    base: "/", // correct base path for production

    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
    },

    // ---- BUILD ----
    build: {
      outDir: "client/dist",
      emptyOutDir: true,
      minify: "esbuild",
      // 🔎 Keep sourcemaps ON so browser shows real TSX lines in stack traces
      // Use env DISABLE_SOURCEMAP=true if you want to disable later
      sourcemap: isDev ? true : !DISABLE_SOURCEMAP,
      // Optional: better chunk names while debugging
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) return "vendor";
          },
        },
      },
    },

    // Helpful in dev (and okay in prod) for mapping CSS lines
    css: {
      devSourcemap: true,
    },
  };
});

// ✅ Dev plugin (Express middleware for dev)
function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(viteServer) {
      const app = createServer();

      if (viteServer.httpServer) {
        initializeSocket(viteServer.httpServer);
        console.log("🔌 Socket.io initialized in Vite dev server");
      }

      // mount express app as middleware
      viteServer.middlewares.use(app);
    },
  };
}
