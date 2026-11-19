import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

function versaoDoCodigo() {
  const daVercel = process.env.VERCEL_GIT_COMMIT_SHA
  if (daVercel) return daVercel.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'local'
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __VERSAO__: JSON.stringify(versaoDoCodigo()),
  },
  server: {
    open: true,
  },
})
