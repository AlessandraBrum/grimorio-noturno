import { defineConfig, devices } from '@playwright/test'

const PORTA = 5199

export default defineConfig({
  testDir: './testes',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'computador',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'celular',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    timeout: 180_000,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    env: { BROWSER: 'none' },
  },
})
