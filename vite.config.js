import { defineConfig } from 'vite';

// Vite configuration for Nebula Runner.
// - `base: './'` keeps asset paths relative so the production build works when
//   deployed to a subpath (GitHub Pages, itch.io) as well as a domain root.
// - Three.js is split into its own chunk to keep the app code cache-friendly.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    open: false,
  },
  preview: {
    port: 4173,
  },
});
