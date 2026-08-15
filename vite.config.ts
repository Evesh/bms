import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig({
  // GitHub Pages отдаёт сайт по пути /repo-name/.
  // VITE_BASE_PATH ставится в Actions автоматически через $GITHUB_REPOSITORY.
  // Локально переменная не задана → base = '/' (dev-сервер работает как раньше).
  base: process.env.VITE_BASE_PATH ?? '/',

  plugins: [vue(), vueDevTools()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
