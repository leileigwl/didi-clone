import { contextBridge, ipcRenderer } from 'electron'

const passengerAPI = {
  minimize: () => ipcRenderer.invoke('passenger:minimize'),
  maximize: () => ipcRenderer.invoke('passenger:maximize'),
  close: () => ipcRenderer.invoke('passenger:close'),
  openExternal: (url: string) => ipcRenderer.invoke('passenger:open-external', url),
  platform: process.platform
}

contextBridge.exposeInMainWorld('passengerAPI', passengerAPI)
