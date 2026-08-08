import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: {
      entry: "server",
    },
  },
  vite: {
    // Keep the Lovable/TanStack configuration intact.
    // The Lovable badge is not explicitly rendered in this file.
  },
});