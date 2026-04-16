import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {
  const isProd = mode === 'production'
  return {
    server: { port: 5173 },
    base: './',
    build: {
      rollupOptions: {
        external: isProd ? ['phaser'] : [],
        output: {
          globals: isProd ? { phaser: 'Phaser' } : {},
          manualChunks(id) {
            if (id.includes('node_modules')) return 'vendor'
            if (id.includes('src/scenes/EditorScene')) return 'editor'
            if (id.includes('src/scenes/MainScene')) return 'game'
          }
        }
      },
      chunkSizeWarningLimit: 700
    }
  }
})
