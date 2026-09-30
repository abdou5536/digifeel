import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Plugin} from 'vite';

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));

const pwaPrecachePlugin: Plugin = {
  name: 'pwa-precache-assets',
  generateBundle(_options, bundle) {
    const assetUrls = Object.keys(bundle)
      .filter(fileName => /\.(js|css|woff2?|png|jpe?g|svg|webp)$/i.test(fileName))
      .map(fileName => `/${fileName}`);

    this.emitFile({
      type: 'asset',
      fileName: 'precache-assets.json',
      source: JSON.stringify(assetUrls)
    });
  }
};

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), pwaPrecachePlugin],
    resolve: {
      alias: {
        '@': path.resolve(workspaceRoot, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: false
        }
      },
    },
  };
});
