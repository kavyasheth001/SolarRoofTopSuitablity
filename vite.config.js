import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/mumbai',
  server:{
    port:8080,
  },
  build: {
    chunkSizeWarningLimit: 15000, 
  }
})

