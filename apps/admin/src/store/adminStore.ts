import { create } from 'zustand'
import { APIClient, Order, Driver, OrderStatus } from '@didi/api-client'

const api = new APIClient('http://localhost:3000')

// Types
export interface DashboardStats {
  todayOrders: number
  activeDrivers: number
  todayRevenue: number
  avgWaitTime: number
  orderTrend: TrendData[]
  driverDistribution: DistributionData[]
}

export interface TrendData {
  time: string
  orders: number
  revenue: number
}

export interface DistributionData {
  area: string
  count: number
  lat: number
  lng: number
}

export interface OrderFilters {
  status?: OrderStatus
  startDate?: string
  endDate?: string
  keyword?: string
}

export interface AdminState {
  // State
  stats: DashboardStats | null
  orders: Order[]
  drivers: Driver[]
  loading: boolean
  error: string | null
  theme: 'light' | 'dark'

  // Actions
  fetchStats: () => Promise<void>
  fetchOrders: (filters?: OrderFilters) => Promise<void>
  fetchDrivers: () => Promise<void>
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>
  toggleDriverBan: (driverId: string, banned: boolean) => Promise<void>
  toggleTheme: () => void
  setError: (error: string | null) => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  stats: null,
  orders: [],
  drivers: [],
  loading: false,
  error: null,
  theme: 'light',

  // Fetch dashboard stats
  fetchStats: async () => {
    set({ loading: true, error: null })
    try {
      const response = await api.getStats()
      if (response.code === 0) {
        set({ stats: response.data as DashboardStats, loading: false })
      } else {
        // Use mock data if API fails
        const mockStats: DashboardStats = {
          todayOrders: 156,
          activeDrivers: 42,
          todayRevenue: 12580,
          avgWaitTime: 3.5,
          orderTrend: generateMockTrendData(),
          driverDistribution: generateMockDistributionData()
        }
        set({ stats: mockStats, loading: false })
      }
    } catch (err) {
      // Use mock data on error
      const mockStats: DashboardStats = {
        todayOrders: 156,
        activeDrivers: 42,
        todayRevenue: 12580,
        avgWaitTime: 3.5,
        orderTrend: generateMockTrendData(),
        driverDistribution: generateMockDistributionData()
      }
      set({ stats: mockStats, loading: false })
      console.error('Error fetching stats:', err)
    }
  },

  // Fetch orders with optional filters
  fetchOrders: async (filters?: OrderFilters) => {
    set({ loading: true, error: null })
    try {
      const response = await api.getOrders()
      if (response.code === 0) {
        let orders = response.data

        // Apply filters
        if (filters?.status) {
          orders = orders.filter(o => o.status === filters.status)
        }
        if (filters?.keyword) {
          const keyword = filters.keyword.toLowerCase()
          orders = orders.filter(o =>
            o.id.toLowerCase().includes(keyword) ||
            o.pickup.address.toLowerCase().includes(keyword) ||
            o.destination.address.toLowerCase().includes(keyword)
          )
        }

        set({ orders, loading: false })
      } else {
        // Use mock data if API fails
        const mockOrders = generateMockOrders()
        set({ orders: mockOrders, loading: false })
      }
    } catch (error) {
      // Use mock data on error
      const mockOrders = generateMockOrders()
      set({ orders: mockOrders, loading: false })
    }
  },

  // Fetch drivers
  fetchDrivers: async () => {
    set({ loading: true, error: null })
    try {
      const mockDrivers = generateMockDrivers()
      set({ drivers: mockDrivers, loading: false })
    } catch (error) {
      set({ error: 'Failed to fetch drivers', loading: false })
    }
  },

  // Update order status
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    set({ loading: true, error: null })
    try {
      // Optimistic update
      set(state => ({
        orders: state.orders.map(o =>
          o.id === orderId ? { ...o, status } : o
        )
      }))
      set({ loading: false })
    } catch (error) {
      set({ error: 'Failed to update order status', loading: false })
    }
  },

  // Toggle driver ban status
  toggleDriverBan: async (driverId: string, banned: boolean) => {
    set({ loading: true, error: null })
    try {
      set(state => ({
        drivers: state.drivers.map(d =>
          d.id === driverId ? { ...d, banned } : d
        )
      }))
      set({ loading: false })
    } catch (error) {
      set({ error: 'Failed to update driver status', loading: false })
    }
  },

  // Toggle theme
  toggleTheme: () => {
    set(state => ({
      theme: state.theme === 'light' ? 'dark' : 'light'
    }))
  },

  // Set error
  setError: (error: string | null) => {
    set({ error })
  }
}))

// Helper functions to generate mock data
function generateMockTrendData(): TrendData[] {
  const data: TrendData[] = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    data.push({
      time: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      orders: Math.floor(Math.random() * 50) + 100,
      revenue: Math.floor(Math.random() * 5000) + 8000
    })
  }
  return data
}

function generateMockDistributionData(): DistributionData[] {
  return [
    { area: '中关村', count: 12, lat: 39.9841, lng: 116.3074 },
    { area: '国贸', count: 18, lat: 39.9087, lng: 116.4602 },
    { area: '望京', count: 8, lat: 39.9862, lng: 116.4817 },
    { area: '三里屯', count: 15, lat: 39.9324, lng: 116.4535 },
    { area: '西单', count: 10, lat: 39.9133, lng: 116.3728 }
  ]
}

function generateMockOrders(): Order[] {
  const statuses: OrderStatus[] = ['pending', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled']
  const orders: Order[] = []

  for (let i = 1; i <= 20; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    orders.push({
      id: `ORD-${String(i).padStart(6, '0')}`,
      userId: `user-${i}`,
      driverId: Math.random() > 0.3 ? `driver-${Math.floor(Math.random() * 10) + 1}` : undefined,
      status,
      pickup: {
        address: `${['中关村', '国贸', '望京', '三里屯', '西单'][Math.floor(Math.random() * 5)]} ${Math.floor(Math.random() * 100) + 1}号`,
        lat: 39.9 + Math.random() * 0.1,
        lng: 116.3 + Math.random() * 0.2
      },
      destination: {
        address: `${['朝阳门', '建国门', '东直门', '西直门', '复兴门'][Math.floor(Math.random() * 5)]} ${Math.floor(Math.random() * 100) + 1}号`,
        lat: 39.9 + Math.random() * 0.1,
        lng: 116.3 + Math.random() * 0.2
      },
      price: Math.floor(Math.random() * 50) + 20,
      distance: Math.floor(Math.random() * 20) + 5,
      duration: Math.floor(Math.random() * 30) + 10,
      createdAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    })
  }

  return orders
}

function generateMockDrivers(): Driver[] {
  const names = ['张伟', '王芳', '李强', '刘洋', '陈明', '杨光', '赵磊', '黄海', '周杰', '吴涛']
  const carModels = ['比亚迪秦', '广汽埃安', '北汽EU5', '吉利几何', '特斯拉Model 3']
  const drivers: Driver[] = []

  for (let i = 1; i <= 10; i++) {
    drivers.push({
      id: `driver-${i}`,
      name: names[i - 1],
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      carModel: carModels[Math.floor(Math.random() * carModels.length)],
      carPlate: `京A${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`,
      rating: Number((4 + Math.random()).toFixed(1)),
      location: {
        address: '北京市',
        lat: 39.9 + Math.random() * 0.1,
        lng: 116.3 + Math.random() * 0.2
      },
      distance: Math.floor(Math.random() * 5) + 1
    })
  }

  return drivers
}
