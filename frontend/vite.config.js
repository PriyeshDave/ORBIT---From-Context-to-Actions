import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend always makes same-origin requests (e.g. fetch("/api/login"))
// so the same build works unmodified behind any domain/IP in production,
// proxied by nginx. This dev-server proxy gives `npm run dev` the same
// behavior locally - without it, Vite's own dev server has no backend to
// forward /api/* to and falls back to serving index.html, which breaks
// every API call with a "not valid JSON" error.
const BACKEND_URL = process.env.VITE_DEV_BACKEND_URL || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        ws: true, // upgrades WebSocket connections too (Readiness's live chat)
      },
    },
  },
  preview: { host: true, port: 3000 },
});
