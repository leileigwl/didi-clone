import { v4 as uuidv4 } from 'uuid'
import type { User, Driver, Order, AuthSession } from './types'

// In-memory storage
export const users: Map<string, User> = new Map()
export const drivers: Map<string, Driver> = new Map()
export const orders: Map<string, Order> = new Map()
export const authSessions: Map<string, AuthSession> = new Map()

// Mock drivers data
const mockDrivers: Driver[] = [
  {
    id: 'driver-1',
    name: 'Zhang Wei',
    phone: '13800138001',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver1',
    carModel: 'Toyota Camry',
    carPlate: 'Jing A12345',
    rating: 4.9,
    location: { lat: 39.9042, lng: 116.4074 },
    status: 'idle'
  },
  {
    id: 'driver-2',
    name: 'Li Ming',
    phone: '13800138002',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver2',
    carModel: 'Honda Accord',
    carPlate: 'Jing B67890',
    rating: 4.8,
    location: { lat: 39.9142, lng: 116.4174 },
    status: 'idle'
  },
  {
    id: 'driver-3',
    name: 'Wang Qiang',
    phone: '13800138003',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver3',
    carModel: 'Audi A4',
    carPlate: 'Jing C11111',
    rating: 4.7,
    location: { lat: 39.9242, lng: 116.3974 },
    status: 'idle'
  },
  {
    id: 'driver-4',
    name: 'Liu Yang',
    phone: '13800138004',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver4',
    carModel: 'BMW 3 Series',
    carPlate: 'Jing D22222',
    rating: 4.95,
    location: { lat: 39.8942, lng: 116.4274 },
    status: 'busy'
  },
  {
    id: 'driver-5',
    name: 'Chen Jie',
    phone: '13800138005',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver5',
    carModel: 'Mercedes C-Class',
    carPlate: 'Jing E33333',
    rating: 4.85,
    location: { lat: 39.8842, lng: 116.3874 },
    status: 'offline'
  }
]

// Initialize mock data
export function initMockData() {
  mockDrivers.forEach(driver => {
    drivers.set(driver.id, driver)
  })
  console.log('Mock data initialized')
}

// Helper functions
export function createUser(phone: string, name?: string): User {
  const user: User = {
    id: uuidv4(),
    phone,
    name: name || `User_${phone.slice(-4)}`,
    createdAt: new Date()
  }
  users.set(user.id, user)
  return user
}

export function findUserByPhone(phone: string): User | undefined {
  for (const user of users.values()) {
    if (user.phone === phone) return user
  }
  return undefined
}

export function createOrder(data: {
  userId: string
  pickup: { address: string; lat: number; lng: number }
  destination: { address: string; lat: number; lng: number }
  price: number
  distance: number
  duration: number
}): Order {
  const order: Order = {
    id: uuidv4(),
    userId: data.userId,
    status: 'pending',
    pickup: data.pickup,
    destination: data.destination,
    price: data.price,
    distance: data.distance,
    duration: data.duration,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  orders.set(order.id, order)
  return order
}

export function updateOrderStatus(orderId: string, status: Order['status']): Order | undefined {
  const order = orders.get(orderId)
  if (order) {
    order.status = status
    order.updatedAt = new Date()
    orders.set(orderId, order)
  }
  return order
}

export function assignDriverToOrder(orderId: string, driverId: string): Order | undefined {
  const order = orders.get(orderId)
  if (order) {
    order.driverId = driverId
    order.updatedAt = new Date()
    orders.set(orderId, order)
  }
  return order
}

export function updateDriverLocation(driverId: string, lat: number, lng: number): Driver | undefined {
  const driver = drivers.get(driverId)
  if (driver) {
    driver.location = { lat, lng }
    drivers.set(driverId, driver)
  }
  return driver
}

export function updateDriverStatus(driverId: string, status: Driver['status']): Driver | undefined {
  const driver = drivers.get(driverId)
  if (driver) {
    driver.status = status
    drivers.set(driverId, driver)
  }
  return driver
}

export function getNearbyDrivers(lat: number, lng: number, radiusKm = 5): Driver[] {
  const nearby: Driver[] = []
  for (const driver of drivers.values()) {
    if (driver.status !== 'idle') continue
    const distance = calculateDistance(lat, lng, driver.location.lat, driver.location.lng)
    if (distance <= radiusKm) {
      nearby.push({ ...driver, distance } as Driver & { distance: number })
    }
  }
  return nearby.sort((a, b) => ((a as Driver & { distance: number }).distance - (b as Driver & { distance: number }).distance))
}

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
