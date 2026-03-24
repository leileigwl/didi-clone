import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
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

  // 请求定位权限
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'geolocation') {
      callback(true) // 允许定位
    } else {
      callback(true) // 允许其他权限
    }
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

// 请求macOS定位权限 - 注意: Electron的systemPreferences不支持location类型
// 定位权限由浏览器geolocation API自动触发macOS系统对话框
ipcMain.handle('passenger:request-location-permission', async () => {
  // 在macOS上，当webContent请求geolocation时，系统会自动弹出权限对话框
  // Info.plist中的NSLocationWhenInUseUsageDescription已经配置
  return { granted: true, status: 'prompt' }
})

// 打开系统偏好设置的定位服务
ipcMain.handle('passenger:open-location-settings', async () => {
  if (process.platform === 'darwin') {
    await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices')
  }
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
