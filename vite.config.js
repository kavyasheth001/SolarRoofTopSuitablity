import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// SolarSight (the GeoServer-based product, solarsight/index.html) has its own client-side routes under
// /mumbai/solarsight/. Send those page URLs to its index.html in dev and preview instead of the ArcGIS app's.
// A production web server needs the same rewrite (see docs/SOLARSIGHT_PRODUCT.md).
function solarsightRoutes() {
  const rewrite = (req, _res, next) => {
    const path = req.url.split('?')[0];
    if (/^\/mumbai\/solarsight(\/[^.]*)?$/.test(path)) req.url = '/mumbai/solarsight/index.html';
    next();
  };
  return {
    name: 'solarsight-routes',
    configureServer: (server) => { server.middlewares.use(rewrite); },
    configurePreviewServer: (server) => { server.middlewares.use(rewrite); },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), solarsightRoutes()],
  base: '/mumbai',
  server: {
    port: 8080,
  },

  // Exclude @arcgis/core from Vite's pre-bundling step.
  // It's a huge ESM package; pre-bundling it freezes the dev server startup.
  optimizeDeps: {
    exclude: ['@arcgis/core'],
  },

  build: {
    target: 'esnext',          // enables native ESM & top-level await → better tree-shaking
    chunkSizeWarningLimit: 15000,
    rollupOptions: {
      // Two independent apps: the existing ArcGIS app and SolarSight (GeoServer + CesiumJS + OpenLayers).
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        solarsight: fileURLToPath(new URL('./solarsight/index.html', import.meta.url)),
      },
      output: {
        // Split the bundle so browsers can cache each piece independently
        manualChunks(id) {
          if (id.includes('@arcgis/core')) return 'arcgis';
          if (id.includes('node_modules/cesium') || id.includes('node_modules/@cesium')) return 'cesium';
          if (id.includes('node_modules/ol/')) return 'openlayers';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
          if (id.includes('jspdf') || id.includes('exceljs') || id.includes('xlsx')) return 'export-libs';
          if (id.includes('apexcharts') || id.includes('recharts') || id.includes('react-chartjs')) return 'charts';
        },
      },
    },
  },
})

