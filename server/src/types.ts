// API Response format
export interface ApiResponse<T = unknown> {
  code: number
  data: T | null
  message: string
}

export const success = <T>(data: T, message = 'Success'): ApiResponse<T> => ({
  code: 0,
  data,
  message
})

export const error = (message: string, code = 1): ApiResponse<null> => ({
  code,
  data: null,
  message
})

// User types
export interface User {
  id: string
  phone: string
  name: string
  avatar?: string
  createdAt: Date
}

// Driver types
export interface Driver {
  id: string
  name: string
  phone: string
  avatar?: string
  carModel: string
  carPlate: string
  rating: number
  location: {
    lat: number
    lng: number
  }
  status: 'idle' | 'busy' | 'offline'
}

// Order types
export interface Order {
  id: string
  userId: string
  driverId?: string
  status: OrderStatus
  pickup: Location
  destination: Location
  price: number
  distance: number
  duration: number
  createdAt: Date
  updatedAt: Date
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'arrived'
  | 'passenger_confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface Location {
  address: string
  lat: number
  lng: number
}

// Auth types
export interface AuthSession {
  phone: string
  code?: string
  expiresAt: Date
}
