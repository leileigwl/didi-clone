import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI = {
  // Driver status
  setOnline: (status: boolean) => ipcRenderer.invoke('driver:set-online', status),
  getOnline: () => ipcRenderer.invoke('driver:get-online'),
  setOrderCount: (count: number) => ipcRenderer.invoke('driver:set-order-count', count),

  // Navigation
  openNavigation: (url: string) => ipcRenderer.invoke('driver:open-navigation', url),

  // Window controls
  showWindow: () => ipcRenderer.invoke('driver:show-window'),
  hideWindow: () => ipcRenderer.invoke('driver:hide-window'),
  minimize: () => ipcRenderer.invoke('driver:minimize'),
  maximize: () => ipcRenderer.invoke('driver:maximize'),

  // Event listeners
  onNewOrder: (callback: (order: unknown) => void) => {
    ipcRenderer.on('new-order', (_event, order) => callback(order))
    return () => ipcRenderer.removeAllListeners('new-order')
  },

  onOrderCancelled: (callback: (orderId: string) => void) => {
    ipcRenderer.on('order-cancelled', (_event, orderId) => callback(orderId))
    return () => ipcRenderer.removeAllListeners('order-cancelled')
  },

  onTrayClick: (callback: () => void) => {
    ipcRenderer.on('tray-click', () => callback())
    return () => ipcRenderer.removeAllListeners('tray-click')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', electronAPI)
