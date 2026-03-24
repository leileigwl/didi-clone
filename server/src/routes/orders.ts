import { Router } from 'express'
import { z } from 'zod'
import { success, error } from '../types'
import {
  orders,
  createOrder,
  updateOrderStatus,
  assignDriverToOrder,
  users,
  drivers
} from '../store'
import { authMiddleware } from '../middleware/auth'
import { broadcastToNearbyDrivers, simulateOrderFlow } from '../socket'
import type { Server } from 'socket.io'

let io: Server | null = null

export function setSocketServerForOrders(socketServer: Server) {
  io = socketServer
}

const router = Router()

// Validation schemas
const locationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

const createOrderSchema = z.object({
  pickup: locationSchema,
  destination: locationSchema,
  price: z.number().positive('Price must be positive'),
  distance: z.number().positive('Distance must be positive'),
  duration: z.number().positive('Duration must be positive')
})

// All routes require authentication
router.use(authMiddleware)

// POST /api/orders - Create a new order
router.post('/', (req, res) => {
  const result = createOrderSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const order = createOrder({
    userId: req.user!.userId,
    ...result.data
  })

  // Broadcast to nearby drivers via socket
  if (io) {
    broadcastToNearbyDrivers(io, order.id, order.pickup, {
      pickup: order.pickup,
      destination: order.destination,
      price: order.price,
      distance: order.distance,
      duration: order.duration,
    })

    // 不再自动接单，让司机手动抢单
    // simulateOrderFlow(io, order.id)
  }

  res.status(201).json(success(order, 'Order created successfully'))
})

// GET /api/orders - Get user's orders
router.get('/', (req, res) => {
  const userOrders = Array.from(orders.values())
    .filter(order => order.userId === req.user!.userId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  res.json(success(userOrders))
})

// GET /api/orders/:id - Get order by ID
router.get('/:id', (req, res) => {
  const order = orders.get(req.params.id)

  if (!order) {
    res.status(404).json(error('Order not found'))
    return
  }

  // Check ownership
  if (order.userId !== req.user!.userId) {
    res.status(403).json(error('Access denied'))
    return
  }

  // Include driver info if assigned
  let driverInfo = null
  if (order.driverId) {
    const driver = drivers.get(order.driverId)
    if (driver) {
      driverInfo = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        avatar: driver.avatar,
        carModel: driver.carModel,
        carPlate: driver.carPlate,
        rating: driver.rating
      }
    }
  }

  res.json(success({ ...order, driver: driverInfo }))
})

// PUT /api/orders/:id/cancel - Cancel an order
router.put('/:id/cancel', (req, res) => {
  const order = orders.get(req.params.id)

  if (!order) {
    res.status(404).json(error('Order not found'))
    return
  }

  // Check ownership
  if (order.userId !== req.user!.userId) {
    res.status(403).json(error('Access denied'))
    return
  }

  // Check if order can be cancelled (only before driver arrives)
  if (['arrived', 'passenger_confirmed', 'in_progress', 'completed', 'cancelled'].includes(order.status)) {
    res.status(400).json(error('当前状态无法取消订单'))
    return
  }

  const updatedOrder = updateOrderStatus(req.params.id, 'cancelled')

  // If driver was assigned, make them available again and notify them
  if (order.driverId) {
    const driver = drivers.get(order.driverId)
    if (driver) {
      driver.status = 'idle'
      drivers.set(driver.id, driver)
    }

    // Notify driver that order was cancelled by passenger
    if (io) {
      io.to(`driver:${order.driverId}`).emit('order:cancelled', {
        orderId: order.id,
        reason: 'passenger_cancelled',
        message: '乘客已取消订单'
      })
      console.log(`📢 通知司机 ${order.driverId} 订单 ${order.id} 已被乘客取消`)
    }
  }

  res.json(success(updatedOrder, 'Order cancelled'))
})

// PUT /api/orders/:id/confirm-boarding - Passenger confirms boarding
router.put('/:id/confirm-boarding', (req, res) => {
  const order = orders.get(req.params.id)

  if (!order) {
    res.status(404).json(error('Order not found'))
    return
  }

  // Check ownership
  if (order.userId !== req.user!.userId) {
    res.status(403).json(error('Access denied'))
    return
  }

  // Can only confirm if driver has arrived
  if (order.status !== 'arrived') {
    res.status(400).json(error('司机还未到达'))
    return
  }

  const updatedOrder = updateOrderStatus(req.params.id, 'passenger_confirmed')

  // Notify driver that passenger has boarded
  if (order.driverId && io) {
    console.log(`📢 乘客确认上车，通知司机 ${order.driverId}`)
    io.to(`driver:${order.driverId}`).emit('order:status', {
      orderId: order.id,
      status: 'passenger_confirmed',
      message: '乘客已上车'
    })
    console.log(`✅ 已发送 order:status 事件到 driver:${order.driverId} 房间`)
  }

  res.json(success(updatedOrder, '乘客已确认上车'))
})

// GET /api/orders/:id/track - Get order tracking info
router.get('/:id/track', (req, res) => {
  const order = orders.get(req.params.id)

  if (!order) {
    res.status(404).json(error('Order not found'))
    return
  }

  // Check ownership
  if (order.userId !== req.user!.userId) {
    res.status(403).json(error('Access denied'))
    return
  }

  let driverLocation = null
  if (order.driverId) {
    const driver = drivers.get(order.driverId)
    if (driver) {
      driverLocation = driver.location
    }
  }

  res.json(success({
    orderId: order.id,
    status: order.status,
    driverLocation,
    pickup: order.pickup,
    destination: order.destination
  }))
})

export default router
