import { defineConfig } from 'vite';

// Relative paths, so the built site works from any folder or static host
// (Vercel, Netlify, GitHub Pages or a school web server).
export default defineConfig({
  base: './',
  build: {
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
    chunkSizeWarningLimit: 700,
  },
});
