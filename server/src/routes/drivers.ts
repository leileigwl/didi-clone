import { Router } from 'express'
import { z } from 'zod'
import { success, error } from '../types'
import {
  drivers,
  orders,
  getNearbyDrivers,
  updateDriverLocation,
  updateDriverStatus,
  updateOrderStatus,
  assignDriverToOrder
} from '../store'
import { authMiddleware } from '../middleware/auth'
import type { Server } from 'socket.io'

const router = Router()

// Validation schemas
const nearbySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(50).optional()
})

const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

let io: Server | null = null

export function setSocketServer(socketServer: Server) {
  io = socketServer
}

// All routes require authentication
router.use(authMiddleware)

// GET /api/drivers/nearby - Get nearby drivers
router.get('/nearby', (req, res) => {
  const result = nearbySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { lat, lng, radius = 5 } = result.data!
  const nearby = getNearbyDrivers(lat, lng, radius)

  res.json(success(nearby.map(d => ({
    id: d.id,
    name: d.name,
    avatar: d.avatar,
    carModel: d.carModel,
    carPlate: d.carPlate,
    rating: d.rating,
    location: d.location,
    distance: (d as typeof d & { distance: number }).distance
  }))))
})

// PUT /api/drivers/:id/location - Update driver location (for driver app)
router.put('/:id/location', (req, res) => {
  const result = locationUpdateSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { lat, lng } = result.data
  const driver = updateDriverLocation(req.params.id, lat, lng)

  if (!driver) {
    res.status(404).json(error('Driver not found'))
    return
  }

  // Broadcast location update to relevant order rooms
  if (io) {
    // Find orders this driver is handling
    for (const order of orders.values()) {
      if (order.driverId === driver.id && !['completed', 'cancelled'].includes(order.status)) {
        io.to(`order:${order.id}`).emit('driver:location', {
          orderId: order.id,
          location: { lat, lng },
          timestamp: new Date().toISOString()
        })
      }
    }
  }

  res.json(success({ lat, lng }, 'Location updated'))
})

// POST /api/drivers/:id/accept - Driver accepts an order
router.post('/:id/accept', (req, res) => {
  const { orderId } = req.body
  if (!orderId) {
    res.status(400).json(error('Order ID is required'))
    return
  }

  const order = orders.get(orderId)
  if (!order) {
    res.status(404).json(error('Order not found'))
    return
  }

  if (order.status !== 'pending') {
    res.status(400).json(error('Order is no longer available'))
    return
  }

  const driver = drivers.get(req.params.id)
  if (!driver) {
    res.status(404).json(error('Driver not found'))
    return
  }

  if (driver.status !== 'idle') {
    res.status(400).json(error('Driver is not available'))
    return
  }

  // Assign driver to order
  assignDriverToOrder(orderId, driver.id)
  updateOrderStatus(orderId, 'accepted')
  updateDriverStatus(driver.id, 'busy')

  // Broadcast to order room
  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'accepted',
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        avatar: driver.avatar,
        carModel: driver.carModel,
        carPlate: driver.carPlate,
        rating: driver.rating,
        location: driver.location
      },
      timestamp: new Date().toISOString()
    })
  }

  res.json(success({
    order: orders.get(orderId),
    driver: drivers.get(driver.id)
  }, 'Order accepted'))
})

// POST /api/drivers/:id/arrive - Driver arrives at pickup
router.post('/:id/arrive', (req, res) => {
  const { orderId } = req.body
  if (!orderId) {
    res.status(400).json(error('Order ID is required'))
    return
  }

  const order = orders.get(orderId)
  if (!order || order.driverId !== req.params.id) {
    res.status(404).json(error('Order not found'))
    return
  }

  updateOrderStatus(orderId, 'arrived')

  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'arrived',
      timestamp: new Date().toISOString()
    })
  }

  res.json(success({ status: 'arrived' }, 'Arrived at pickup'))
})

// POST /api/drivers/:id/start - Start the trip
router.post('/:id/start', (req, res) => {
  const { orderId } = req.body
  if (!orderId) {
    res.status(400).json(error('Order ID is required'))
    return
  }

  const order = orders.get(orderId)
  if (!order || order.driverId !== req.params.id) {
    res.status(404).json(error('Order not found'))
    return
  }

  updateOrderStatus(orderId, 'in_progress')

  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'in_progress',
      timestamp: new Date().toISOString()
    })
  }

  res.json(success({ status: 'in_progress' }, 'Trip started'))
})

// POST /api/drivers/:id/complete - Complete the trip
router.post('/:id/complete', (req, res) => {
  const { orderId } = req.body
  if (!orderId) {
    res.status(400).json(error('Order ID is required'))
    return
  }

  const order = orders.get(orderId)
  if (!order || order.driverId !== req.params.id) {
    res.status(404).json(error('Order not found'))
    return
  }

  updateOrderStatus(orderId, 'completed')
  updateDriverStatus(req.params.id, 'idle')

  if (io) {
    io.to(`order:${orderId}`).emit('order:status', {
      orderId,
      status: 'completed',
      timestamp: new Date().toISOString()
    })
  }

  res.json(success({ status: 'completed' }, 'Trip completed'))
})

// GET /api/drivers/:id - Get driver info
router.get('/:id', (req, res) => {
  const driver = drivers.get(req.params.id)
  if (!driver) {
    res.status(404).json(error('Driver not found'))
    return
  }

  res.json(success({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    avatar: driver.avatar,
    carModel: driver.carModel,
    carPlate: driver.carPlate,
    rating: driver.rating,
    status: driver.status
  }))
})

export default router
