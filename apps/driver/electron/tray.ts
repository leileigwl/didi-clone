const { Tray, Menu, nativeImage, BrowserWindow, app } = require('electron')
const { join } = require('path')

let tray = null

// Create tray icon based on status
function createTrayIcon(isOnline) {
  const size = 22
  const canvas = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}"
        fill="${isOnline ? '#7AC9A8' : '#888888'}"
        stroke="${isOnline ? '#5BA887' : '#666666'}"
        stroke-width="1"/>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(canvas))
}

function createTray(mainWindow) {
  const icon = createTrayIcon(false)
  tray = new Tray(icon)
  tray.setToolTip('Didi Driver - Offline')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Go Online',
      id: 'toggle-online',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.webContents.send('tray-toggle-online')
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (mainWindow) mainWindow.destroy()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.webContents.send('tray-click')
    }
  })
}

function updateTrayStatus(isOnline, orderCount) {
  if (!tray) return

  const icon = createTrayIcon(isOnline)
  tray.setImage(icon)

  let tooltip = 'Didi Driver'
  if (isOnline) {
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
      label: isOnline ? 'Go Offline' : 'Go Online',
      id: 'toggle-online',
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

module.exports = {
  createTray,
  updateTrayStatus,
  destroyTray
}
