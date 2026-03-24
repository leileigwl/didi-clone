declare global {
  interface Window {
    electronAPI: {
      setOnline: (status: boolean) => Promise<boolean>
      getOnline: () => Promise<boolean>
      setOrderCount: (count: number) => Promise<boolean>
      openNavigation: (url: string) => Promise<boolean>
      showWindow: () => Promise<boolean>
      hideWindow: () => Promise<boolean>
      minimize: () => Promise<boolean>
      maximize: () => Promise<boolean>
      requestLocationPermission: () => Promise<{ granted: boolean; status: string }>
      openLocationSettings: () => Promise<boolean>
      onNewOrder: (callback: (order: any) => void) => () => void
      onOrderCancelled: (callback: (orderId: string) => void) => () => void
      onTrayClick: (callback: () => void) => () => void
      onTrayToggleOnline: (callback: () => void) => () => void
    }
  }
}

export {}