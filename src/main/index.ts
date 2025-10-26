import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { getDatabase, closeDatabase } from './db/database'
import { registerAllHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

// Determine if we're in development mode
const isDev = !app.isPackaged

// Get the preload script path
const preloadPath = isDev
  ? join(__dirname, '../preload/index.mjs')
  : join(__dirname, '../preload/index.js')

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialize database and IPC handlers before app is ready
getDatabase()
registerAllHandlers()

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
