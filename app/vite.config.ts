import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  // Base relative: build deployable dans n'importe quel sous-dossier sans config serveur.
  base: './',
  // Dev en HTTP simple: un certificat auto-signe casse l'enregistrement du Service Worker
  // (SecurityError sur le fetch de sw.js), meme quand la page elle-meme se charge.
  // Pour tester Wake Lock/SW depuis un telephone sur le reseau local (contexte securise requis),
  // activer chrome://flags/#unsafely-treat-insecure-origin-as-secure avec l'URL LAN, sur le telephone.
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: {
    host: true,
  },
});
