const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require('electron')
const { join } = require('path')
const { execFile } = require('child_process')

let mainWindow = null
let tray = null
let isOnline = false
let currentOrderCount = 0

// Create tray icon based on status
function createTrayIcon(online) {
  const size = 22
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}"
        fill="${online ? '#FF6B00' : '#888888'}"
        stroke="${online ? '#e55d00' : '#666666'}"
        stroke-width="1"/>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(canvas))
}

function createTray(window) {
  const icon = createTrayIcon(false)
  tray = new Tray(icon)
  tray.setToolTip('Didi Driver - Offline')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (window) {
          window.show()
          window.focus()
        }
      }
    },
    {
      label: 'Go Online',
      click: () => {
        if (window) {
          window.show()
          window.webContents.send('tray-toggle-online')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (window) window.destroy()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (window) {
      window.show()
      window.focus()
    }
  })

  tray.on('click', () => {
    if (window) {
      window.webContents.send('tray-click')
    }
  })
}

function updateTrayStatus(online, orderCount) {
  if (!tray) return

  const icon = createTrayIcon(online)
  tray.setImage(icon)

  let tooltip = 'Didi Driver'
  if (online) {
    tooltip += ` - Online${orderCount > 0 ? ` (${orderCount} orders)` : ''}`
  } else {
    tooltip += ' - Offline'
  }
  tray.setToolTip(tooltip)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].show()
          windows[0].focus()
        }
      }
    },
    {
      label: online ? 'Go Offline' : 'Go Online',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].show()
          windows[0].webContents.send('tray-toggle-online')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        const windows = BrowserWindow.getAllWindows()
        if (windows.length > 0) {
          windows[0].destroy()
        }
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

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
    backgroundColor: '#f5f5f5',
    show: false
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
    if (mainWindow) mainWindow.show()
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

  mainWindow.on('close', (event) => {
    if (isOnline) {
      event.preventDefault()
      if (mainWindow) mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(() => {
  createWindow()
  if (mainWindow) createTray(mainWindow)

  // IPC handlers - 必须在 app.whenReady() 之后注册
  ipcMain.handle('driver:set-online', (event, status) => {
    isOnline = status
    updateTrayStatus(status, currentOrderCount)
    return true
  })

  ipcMain.handle('driver:get-online', () => {
    return isOnline
  })

  ipcMain.handle('driver:set-order-count', (event, count) => {
    currentOrderCount = count
    updateTrayStatus(isOnline, count)
    return true
  })

  ipcMain.handle('driver:open-navigation', async (event, url) => {
    await shell.openExternal(url)
    return true
  })

  ipcMain.handle('driver:show-window', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
    return true
  })

  ipcMain.handle('driver:hide-window', () => {
    if (mainWindow) mainWindow.hide()
    return true
  })

  ipcMain.handle('driver:minimize', () => {
    if (mainWindow) mainWindow.minimize()
    return true
  })

  ipcMain.handle('driver:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
    return true
  })

  ipcMain.handle('driver:request-location-permission', async () => {
    return { granted: true, status: 'prompt' }
  })

  ipcMain.handle('driver:open-location-settings', async () => {
    if (process.platform === 'darwin') {
      await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_LocationServices')
    }
    return true
  })

  // 通过 macOS CoreLocation 获取真实位置
  ipcMain.handle('driver:get-native-location', () => {
    return new Promise((resolve) => {
      if (process.platform !== 'darwin') {
        resolve({ error: 'not_macos' })
        return
      }
      const binPath = join(__dirname, '../bin/get-location')
      execFile(binPath, { timeout: 15000 }, (error, stdout, stderr) => {
        if (error) {
          if (stdout) {
            try { resolve(JSON.parse(stdout.trim())) } catch { resolve({ error: 'parse_error' }) }
          } else {
            resolve({ error: error.message })
          }
          return
        }
        try {
          resolve(JSON.parse(stdout.trim()))
        } catch {
          resolve({ error: 'parse_error' })
        }
      })
    })
  })

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
