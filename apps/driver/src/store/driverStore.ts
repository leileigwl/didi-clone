import { create } from 'zustand'
import { Order, Driver, Location, OrderStatus } from '@didi/api-client'

export interface EarningsSummary {
  today: number
  week: number
  month: number
  totalTrips: number
  totalHours: number
}

export interface OrderHistory {
  id: string
  date: string
  pickup: string
  destination: string
  price: number
  status: OrderStatus
}

interface DriverState {
  // Driver info
  driver: Driver | null
  token: string | null
  isOnline: boolean
  isLoading: boolean
  error: string | null

  // Location
  location: Location | null
  isLocationTracking: boolean

  // Current order
  currentOrder: Order | null
  pendingOrders: Order[]

  // Earnings
  earnings: EarningsSummary
  orderHistory: OrderHistory[]

  // Actions
  setDriver: (driver: Driver | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  setOnline: (status: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Location actions
  setLocation: (location: Location) => void
  setLocationTracking: (tracking: boolean) => void

  // Order actions
  setCurrentOrder: (order: Order | null) => void
  addPendingOrder: (order: Order) => void
  removePendingOrder: (orderId: string) => void
  acceptOrder: (orderId: string) => void
  rejectOrder: (orderId: string) => void
  updateOrderStatus: (status: OrderStatus) => void

  // Earnings actions
  setEarnings: (earnings: EarningsSummary) => void
  addEarning: (amount: number) => void
  setOrderHistory: (history: OrderHistory[]) => void

  // Reset
  reset: () => void
}

const initialState = {
  driver: null,
  token: null,
  isOnline: false,
  isLoading: false,
  error: null,
  location: null,
  isLocationTracking: false,
  currentOrder: null,
  pendingOrders: [],
  earnings: {
    today: 0,
    week: 0,
    month: 0,
    totalTrips: 0,
    totalHours: 0
  },
  orderHistory: []
}

export const useDriverStore = create<DriverState>((set, get) => ({
  ...initialState,

  setDriver: (driver) => set({ driver }),
  setToken: (token) => set({ token }),
  logout: () => {
    localStorage.removeItem('driver_token')
    set({ ...initialState })
  },
  setOnline: (status) => set({ isOnline: status }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  setLocation: (location) => set({ location }),
  setLocationTracking: (tracking) => set({ isLocationTracking: tracking }),

  setCurrentOrder: (order) => set({ currentOrder: order }),

  addPendingOrder: (order) => {
    const { pendingOrders } = get()
    if (!pendingOrders.find(o => o.id === order.id)) {
      set({ pendingOrders: [...pendingOrders, order] })
    }
  },

  removePendingOrder: (orderId) => {
    const { pendingOrders } = get()
    set({ pendingOrders: pendingOrders.filter(o => o.id !== orderId) })
  },

  acceptOrder: (orderId) => {
    const { pendingOrders } = get()
    const order = pendingOrders.find(o => o.id === orderId)
    if (order) {
      set({
        currentOrder: { ...order, status: 'accepted' },
        pendingOrders: pendingOrders.filter(o => o.id !== orderId)
      })
    }
  },

  rejectOrder: (orderId) => {
    const { pendingOrders } = get()
    set({ pendingOrders: pendingOrders.filter(o => o.id !== orderId) })
  },

  updateOrderStatus: (status) => {
    const { currentOrder } = get()
    if (currentOrder) {
      set({ currentOrder: { ...currentOrder, status } })
    }
  },

  setEarnings: (earnings) => set({ earnings }),

  addEarning: (amount) => {
    const { earnings } = get()
    set({
      earnings: {
        ...earnings,
        today: earnings.today + amount,
        week: earnings.week + amount,
        month: earnings.month + amount,
        totalTrips: earnings.totalTrips + 1
      }
    })
  },

  setOrderHistory: (history) => set({ orderHistory: history }),

  reset: () => set(initialState)
}))

// Type for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      setOnline: (status: boolean) => Promise<boolean>
      getOnline: () => Promise<boolean>
      setOrderCount: (count: number) => Promise<boolean>
      openNavigation: (url: string) => Promise<boolean>
      showWindow: () => Promise<void>
      hideWindow: () => Promise<void>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      onNewOrder: (callback: (order: Order) => void) => () => void
      onOrderCancelled: (callback: (orderId: string) => void) => () => void
      onTrayClick: (callback: () => void) => () => void
    }
  }
}
