import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { createTray, updateTrayStatus, destroyTray } from './tray'

let mainWindow: BrowserWindow | null = null
let isOnline = false
let currentOrderCount = 0

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a2e',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.on('close', (event) => {
    if (isOnline) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handlers
ipcMain.handle('driver:set-online', (_event, status: boolean) => {
  isOnline = status
  updateTrayStatus(status, currentOrderCount)
  return true
})

ipcMain.handle('driver:get-online', () => {
  return isOnline
})

ipcMain.handle('driver:set-order-count', (_event, count: number) => {
  currentOrderCount = count
  updateTrayStatus(isOnline, count)
  return true
})

ipcMain.handle('driver:open-navigation', async (_event, url: string) => {
  await shell.openExternal(url)
  return true
})

ipcMain.handle('driver:show-window', () => {
  mainWindow?.show()
  mainWindow?.focus()
  return true
})

ipcMain.handle('driver:hide-window', () => {
  mainWindow?.hide()
  return true
})

ipcMain.handle('driver:minimize', () => {
  mainWindow?.minimize()
  return true
})

ipcMain.handle('driver:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
  return true
})

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  createTray(mainWindow!)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    destroyTray()
    app.quit()
  }
})

app.on('before-quit', () => {
  isOnline = false
  destroyTray()
})
