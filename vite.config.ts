import path from "path";

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks cache across deploys and load in parallel.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/@supabase/.test(id)) return "vendor-supabase";
          if (/@stripe/.test(id)) return "vendor-stripe";
          if (/@emailjs/.test(id)) return "vendor-emailjs";
          if (/\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});
