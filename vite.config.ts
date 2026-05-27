import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const devHttpsKeyPath = fileURLToPath(new URL('./.certs/localhost-key.pem', import.meta.url))
const devHttpsCertPath = fileURLToPath(new URL('./.certs/localhost-cert.pem', import.meta.url))
const devHttps =
  existsSync(devHttpsKeyPath) && existsSync(devHttpsCertPath)
    ? {
        key: readFileSync(devHttpsKeyPath),
        cert: readFileSync(devHttpsCertPath),
      }
    : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    https: devHttps,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    https: devHttps,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
