import { create } from 'zustand'
import { User, Order, Driver } from '@didi/api-client'

export interface Location {
  address: string
  lat: number
  lng: number
}

export interface PassengerState {
  // User state
  user: User | null
  isAuthenticated: boolean

  // Order state
  currentOrder: Order | null
  orderHistory: Order[]

  // Location state
  pickup: Location | null
  destination: Location | null

  // Driver state
  nearbyDrivers: Driver[]
  currentDriver: Driver | null

  // UI state
  loading: boolean
  error: string | null

  // Actions
  setUser: (user: User | null) => void
  logout: () => void
  setPickup: (location: Location | null) => void
  setDestination: (location: Location | null) => void
  setCurrentOrder: (order: Order | null) => void
  setNearbyDrivers: (drivers: Driver[]) => void
  setCurrentDriver: (driver: Driver | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  addOrderToHistory: (order: Order) => void
}

export const usePassengerStore = create<PassengerState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  currentOrder: null,
  orderHistory: [],
  pickup: null,
  destination: null,
  nearbyDrivers: [],
  currentDriver: null,
  loading: false,
  error: null,

  // Actions
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user
    })
  },

  logout: () => {
    localStorage.removeItem('passenger_token')
    set({
      user: null,
      isAuthenticated: false,
      currentOrder: null,
      pickup: null,
      destination: null
    })
  },

  setPickup: (location) => set({ pickup: location }),
  setDestination: (location) => set({ destination: location }),

  setCurrentOrder: (order) => {
    set({ currentOrder: order })
    if (order) {
      get().addOrderToHistory(order)
    }
  },

  setNearbyDrivers: (drivers) => set({ nearbyDrivers: drivers }),
  setCurrentDriver: (driver) => set({ currentDriver: driver }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addOrderToHistory: (order) => {
    const history = get().orderHistory
    if (!history.find(o => o.id === order.id)) {
      set({ orderHistory: [order, ...history] })
    }
  }
}))
