import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

// Create tray icon based on status
function createTrayIcon(isOnline: boolean): nativeImage {
  // Create a simple colored circle as tray icon
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

export function createTray(mainWindow: BrowserWindow): void {
  const icon = createTrayIcon(false)
  tray = new Tray(icon)
  tray.setToolTip('Didi Driver - Offline')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    {
      label: 'Go Online',
      id: 'toggle-online',
      click: () => {
        mainWindow.show()
        mainWindow.webContents.send('tray-toggle-online')
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        mainWindow.destroy()
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  tray.on('click', () => {
    mainWindow.webContents.send('tray-click')
  })
}

export function updateTrayStatus(isOnline: boolean, orderCount: number): void {
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

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
