import { io, Socket } from 'socket.io-client'

// Types
export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message: string
}

export interface User {
  id: string
  phone: string
  name: string
  avatar?: string
}

export interface Driver {
  id: string
  name: string
  phone: string
  avatar?: string
  carModel: string
  carPlate: string
  rating: number
  location: Location
  distance?: number
}

export interface Location {
  address: string
  lat: number
  lng: number
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'driver_arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

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
  driver?: Driver | null
  createdAt: string
  updatedAt: string
}

export interface CreateOrderInput {
  pickup: Location
  destination: Location
  price: number
  distance: number
  duration: number
}

export interface AuthResult {
  user: User
  token: string
}

// Socket event types
export interface DriverLocationEvent {
  orderId: string
  location: { lat: number; lng: number }
  timestamp: string
}

export interface OrderStatusEvent {
  orderId: string
  status: OrderStatus
  driver?: Driver
  timestamp: string
}

// API Client class
export class APIClient {
  private baseURL: string
  private token: string | null = null
  private socket: Socket | null = null

  constructor(baseURL: string = 'http://localhost:3000') {
    this.baseURL = baseURL
  }

  // Set auth token
  setToken(token: string | null) {
    this.token = token
    if (token && this.socket) {
      this.socket.auth = { token }
    }
  }

  // Get current token
  getToken(): string | null {
    return this.token
  }

  // Generic request method
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers
    })

    const data = await response.json()
    return data as ApiResponse<T>
  }

  // Auth API
  async sendVerificationCode(phone: string): Promise<ApiResponse<{ phone: string }>> {
    return this.request('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone })
    })
  }

  async verifyCode(phone: string, code: string): Promise<ApiResponse<AuthResult>> {
    const response = await this.request<AuthResult>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code })
    })
    if (response.code === 0 && response.data.token) {
      this.setToken(response.data.token)
    }
    return response
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/api/auth/me')
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.request<null>('/api/auth/logout', {
      method: 'POST'
    })
    this.setToken(null)
    return response
  }

  // Orders API
  async createOrder(input: CreateOrderInput): Promise<ApiResponse<Order>> {
    return this.request<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  async getOrders(): Promise<ApiResponse<Order[]>> {
    return this.request<Order[]>('/api/orders')
  }

  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/orders/${id}`)
  }

  async cancelOrder(id: string): Promise<ApiResponse<Order>> {
    return this.request<Order>(`/api/orders/${id}/cancel`, {
      method: 'PUT'
    })
  }

  async trackOrder(id: string): Promise<ApiResponse<{
    orderId: string
    status: OrderStatus
    driverLocation: Location | null
    pickup: Location
    destination: Location
  }>> {
    return this.request(`/api/orders/${id}/track`)
  }

  // Drivers API
  async getNearbyDrivers(
    lat: number,
    lng: number,
    radius?: number
  ): Promise<ApiResponse<Driver[]>> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      ...(radius && { radius: radius.toString() })
    })
    return this.request<Driver[]>(`/api/drivers/nearby?${params}`)
  }

  async getDriver(id: string): Promise<ApiResponse<Driver>> {
    return this.request<Driver>(`/api/drivers/${id}`)
  }

  // Socket connection
  connectSocket(orderId?: string): void {
    if (this.socket?.connected) {
      if (orderId) {
        this.socket.emit('join:order', orderId)
      }
      return
    }

    this.socket = io(this.baseURL, {
      auth: this.token ? { token: this.token } : undefined,
      transports: ['websocket']
    })

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id)
      if (orderId) {
        this.socket?.emit('join:order', orderId)
      }
    })

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })
  }

  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  // Socket room management
  joinOrderRoom(orderId: string): void {
    if (!this.socket) {
      this.connectSocket(orderId)
    } else {
      this.socket.emit('join:order', orderId)
    }
  }

  leaveOrderRoom(orderId: string): void {
    this.socket?.emit('leave:order', orderId)
  }

  // Socket event listeners
  onDriverLocation(callback: (data: DriverLocationEvent) => void): () => void {
    if (!this.socket) this.connectSocket()
    this.socket?.on('driver:location', callback)
    return () => this.socket?.off('driver:location', callback)
  }

  onOrderStatus(callback: (data: OrderStatusEvent) => void): () => void {
    if (!this.socket) this.connectSocket()
    this.socket?.on('order:status', callback)
    return () => this.socket?.off('order:status', callback)
  }

  // Driver-specific socket events (for driver app)
  emitDriverLocation(driverId: string, lat: number, lng: number): void {
    if (!this.socket) this.connectSocket()
    this.socket?.emit('driver:location', { driverId, lat, lng })
  }
}

// Create default instance
export const apiClient = new APIClient()

// Export default
export default APIClient
