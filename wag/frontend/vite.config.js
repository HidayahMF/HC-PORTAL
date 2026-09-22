import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/wag/",

  server: {
    host: true,
    allowedHosts: ["lab.bmc.co.id"],
    // Dev-only proxy: di development, frontend memakai path relatif /api
    // (tanpa fallback IP internal). Tidak berpengaruh pada production build.
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:5002",
        changeOrigin: true,
      },
    },
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}"],
  },
});
