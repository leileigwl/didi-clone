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
    name: '张师傅',
    phone: '13800138001',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver1',
    carModel: '比亚迪秦',
    carPlate: '浙G·A12345',
    rating: 4.9,
    location: { lat: 29.308, lng: 120.072 },
    status: 'idle'
  },
  {
    id: 'driver-2',
    name: '李师傅',
    phone: '13800138002',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver2',
    carModel: '丰田卡罗拉',
    carPlate: '浙G·B67890',
    rating: 4.8,
    location: { lat: 29.312, lng: 120.085 },
    status: 'idle'
  },
  {
    id: 'driver-3',
    name: '王师傅',
    phone: '13800138003',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver3',
    carModel: '本田雅阁',
    carPlate: '浙G·C11111',
    rating: 4.7,
    location: { lat: 29.305, lng: 120.065 },
    status: 'idle'
  },
  {
    id: 'driver-4',
    name: '刘师傅',
    phone: '13800138004',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver4',
    carModel: '大众帕萨特',
    carPlate: '浙G·D22222',
    rating: 4.95,
    location: { lat: 29.320, lng: 120.095 },
    status: 'idle'
  },
  {
    id: 'driver-5',
    name: '陈师傅',
    phone: '13800138005',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=driver5',
    carModel: '奔驰C级',
    carPlate: '浙G·E33333',
    rating: 4.85,
    location: { lat: 29.298, lng: 120.058 },
    status: 'idle'
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

// 通过高德 REST API 计算驾车距离（异步，更精确）
const AMAP_REST_KEY = process.env.AMAP_REST_KEY || 'fadd42f67d5cc584808b19e95b0a485a'

export async function calculateDrivingDistance(
  origins: { lat: number; lng: number }[],
  destination: { lat: number; lng: number }
): Promise<{ distance: number; duration: number }[]> {
  try {
    const destStr = `${destination.lng},${destination.lat}`
    // 逐个查询（REST API 多 origins 分号拼接有兼容问题）
    const results = await Promise.all(origins.map(async (o) => {
      const resp = await fetch(
        `https://restapi.amap.com/v3/distance?key=${AMAP_REST_KEY}&origins=${o.lng},${o.lat}&destination=${destStr}&type=1&output=JSON`
      )
      const data = await resp.json()
      if (data.status === '1' && data.results?.length > 0) {
        return {
          distance: parseFloat(data.results[0].distance) / 1000, // km
          duration: parseFloat(data.results[0].duration) / 60,    // minutes
        }
      }
      return null
    }))
    const valid = results.filter(Boolean) as { distance: number; duration: number }[]
    if (valid.length === origins.length) return valid
  } catch (e) {
    console.warn('高德距离API调用失败，使用直线距离:', e)
  }
  // fallback: 直线距离
  return origins.map(o => ({
    distance: calculateDistance(o.lat, o.lng, destination.lat, destination.lng),
    duration: calculateDistance(o.lat, o.lng, destination.lat, destination.lng) / 40 * 60, // 假设40km/h
  }))
}

// 球面距离计算（直线距离，非驾车距离，用于快速筛选）
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
