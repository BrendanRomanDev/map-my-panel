import { _electron as electron, ElectronApplication, Page } from 'playwright'
import path from 'path'
import { test as base } from '@playwright/test'

/**
 * Extended test fixture that provides Electron app and window
 */
export const test = base.extend<{
  electronApp: ElectronApplication
  window: Page
}>({
  electronApp: async ({}, use) => {
    // Build the app before testing
    // In CI or before first run: npm run build

    // Launch Electron with the built app
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../../../out/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    // Wait for the window to be ready
    await electronApp.firstWindow()

    await use(electronApp)

    // Cleanup
    await electronApp.close()
  },

  window: async ({ electronApp }, use) => {
    const window = await electronApp.firstWindow()

    // Wait for app to be fully loaded
    await window.waitForLoadState('domcontentloaded')

    await use(window)
  },
})

export { expect } from '@playwright/test'
