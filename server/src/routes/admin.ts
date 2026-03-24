import { Router } from 'express'
import { success, error } from '../types'
import { authMiddleware } from '../middleware/auth'
import { orders, drivers } from '../store'

import type { Server } from 'socket.io'

const router = Router()

let io: Server | null = null

export function setSocketServer(socketServer: Server) {
  io = socketServer
}

// All routes require authentication
router.use(authMiddleware)

// GET /api/admin/stats - Get dashboard stats
router.get('/stats', (req, res) => {
  const now = new Date()
  const todayOrders = orders.size
  const activeDrivers = Array.from(drivers.values()).filter(d => d.status === 'idle' || d.status === 'busy').length
  const todayRevenue = Array.from(orders.values())
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + (o.price || 0), 0)

  // Generate trend data for last 7 days
  const orderTrend = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })

    const dayOrders = Math.floor(Math.random() * 50) + 20
    const dayRevenue = dayOrders * (Math.floor(Math.random() * 20) + 25)

    orderTrend.push({
      time: dateStr,
      orders: dayOrders,
      revenue: dayRevenue
    })
  }

  // Generate driver distribution
  const areas = ['望京', '中关村', '国贸', '三里屯', '朝阳门']
  const driverDistribution = areas.map(area => ({
    area,
    count: Math.floor(Math.random() * 10) + 5,
    lat: 39.9 + Math.random() * 0.1,
    lng: 116.3 + Math.random() * 0.2
  }))

  res.json(success({
    todayOrders,
    activeDrivers,
    todayRevenue,
    avgWaitTime: 5.2,
    orderTrend,
    driverDistribution
  }))
})

export default router
