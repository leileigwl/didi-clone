import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
    minWidth: 350,
    minHeight: 600,
    maxWidth: 500,
    maxHeight: 900,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // 允许加载外部脚本（高德地图）
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FF6B00',
    show: false,
    resizable: true
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Development - use electron-vite's auto-injected URL
  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else if (process.env.NODE_ENV === 'development') {
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

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handlers
ipcMain.handle('passenger:minimize', () => {
  mainWindow?.minimize()
  return true
})

ipcMain.handle('passenger:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
  return true
})

ipcMain.handle('passenger:close', () => {
  mainWindow?.close()
  return true
})

ipcMain.handle('passenger:open-external', async (_event, url: string) => {
  await shell.openExternal(url)
  return true
})

// App lifecycle
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
