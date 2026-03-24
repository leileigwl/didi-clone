declare global {
  interface Window {
    passengerAPI: {
      minimize: () => Promise<boolean>
      maximize: () => Promise<boolean>
      close: () => Promise<boolean>
      openExternal: (url: string) => Promise<boolean>
      platform: string
      requestLocationPermission: () => Promise<{ granted: boolean; status: string }>
      openLocationSettings: () => Promise<boolean>
    }
  }
}

export {}