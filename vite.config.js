import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
      // Two independent pages: the existing ArcGIS app and the standalone GeoServer map.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        geoserverMap: fileURLToPath(new URL('./geoserver-map.html', import.meta.url)),
      },
      output: {
        // Split the bundle so browsers can cache each piece independently
        manualChunks(id) {
          if (id.includes('@arcgis/core')) return 'arcgis';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'react-vendor';
          if (id.includes('lucide-react') || id.includes('react-icons')) return 'icons';
          if (id.includes('jspdf') || id.includes('exceljs') || id.includes('xlsx')) return 'export-libs';
          if (id.includes('apexcharts') || id.includes('recharts') || id.includes('react-chartjs')) return 'charts';
        },
      },
    },
  },
})

