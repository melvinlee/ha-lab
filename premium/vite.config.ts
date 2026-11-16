import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the build works when served from HA at /local/premium/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", sourcemap: false, chunkSizeWarningLimit: 900 },
  server: { host: true, port: 5173 },
});
