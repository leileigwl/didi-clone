import { contextBridge, ipcRenderer } from 'electron'

const passengerAPI = {
  minimize: () => ipcRenderer.invoke('passenger:minimize'),
  maximize: () => ipcRenderer.invoke('passenger:maximize'),
  close: () => ipcRenderer.invoke('passenger:close'),
  openExternal: (url: string) => ipcRenderer.invoke('passenger:open-external', url),
  platform: process.platform,
  // Location permission
  requestLocationPermission: () => ipcRenderer.invoke('passenger:request-location-permission'),
  openLocationSettings: () => ipcRenderer.invoke('passenger:open-location-settings'),
  getNativeLocation: () => ipcRenderer.invoke('passenger:get-native-location')
}

contextBridge.exposeInMainWorld('passengerAPI', passengerAPI)
