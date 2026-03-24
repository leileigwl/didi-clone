import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: { index: resolve(__dirname, 'electron/main.ts') }
      }
    }
  },
  preload: {
    build: {
      lib: {
        entry: { index: resolve(__dirname, 'electron/preload.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/index.html')
      }
    },
    plugins: [react()]
  }
})
