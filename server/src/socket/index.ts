import type { Server, Socket } from 'socket.io'
import { orders, drivers, updateDriverLocation, updateDriverStatus, getNearbyDrivers, calculateDistance } from '../store'

// Track online drivers by socket id
const driverSockets = new Map<string, { driverId: string; lat: number; lng: number }>()

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    // Driver goes online with location
    socket.on('driver:online', (data: { driverId: string; lat: number; lng: number }) => {
      const { driverId, lat, lng } = data
      driverSockets.set(socket.id, { driverId, lat, lng })
      socket.join('drivers:online')
      updateDriverStatus(driverId, 'idle')
      updateDriverLocation(driverId, lat, lng)
      console.log(`Driver ${driverId} is online at ${lat}, ${lng}`)
    })

    // Driver goes offline
    socket.on('driver:offline', (data: { driverId: string }) => {
      driverSockets.delete(socket.id)
      socket.leave('drivers:online')
      updateDriverStatus(data.driverId, 'offline')
      console.log(`Driver ${data.driverId} is offline`)
    })

    // Driver location updates
    socket.on('driver:location', (data: { driverId: string; lat: number; lng: number }) => {
      const { driverId, lat, lng } = data
      updateDriverLocation(driverId, lat, lng)

      // Update tracking
      const tracked = driverSockets.get(socket.id)
      if (tracked) {
        tracked.lat = lat
        tracked.lng = lng
      }

      // Broadcast to all relevant order rooms
      for (const order of orders.values()) {
        if (order.driverId === driverId && !['completed', 'cancelled'].includes(order.status)) {
          io.to(`order:${order.id}`).emit('driver:location', {
            orderId: order.id,
            location: { lat, lng },
            timestamp: new Date().toISOString()
          })
        }
      }
    })

    // Join order room for real-time updates
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`)
      console.log(`Socket ${socket.id} joined order:${orderId}`)

      const order = orders.get(orderId)
      if (order) {
        socket.emit('order:status', {
          orderId: order.id,
          status: order.status,
          driverId: order.driverId,
          timestamp: new Date().toISOString()
        })

        if (order.driverId) {
          const driver = drivers.get(order.driverId)
          if (driver) {
            socket.emit('driver:location', {
              orderId: order.id,
              location: driver.location,
              timestamp: new Date().toISOString()
            })
          }
        }
      }
    })

    // Leave order room
    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`)
      console.log(`Socket ${socket.id} left order:${orderId}`)
    })

    // New order created - broadcast to nearby drivers (called from REST route)
    socket.on('order:created', (data: { orderId: string; pickup: { lat: number; lng: number } }) => {
      // Handled via broadcastToNearbyDrivers function below
    })

    // Driver accepts order
    socket.on('driver:accept', (data: { orderId: string; driverId: string }) => {
      const { orderId, driverId } = data
      const order = orders.get(orderId)

      if (!order) {
        socket.emit('order:error', { message: '订单不存在' })
        return
      }

      if (order.status !== 'pending') {
        socket.emit('order:error', { message: '订单已被接单' })
        return
      }

      const driver = drivers.get(driverId)
      if (!driver || driver.status !== 'idle') {
        socket.emit('order:error', { message: '司机不可用' })
        return
      }

      // Assign driver to order
      order.driverId = driverId
      order.status = 'accepted'
      order.updatedAt = new Date()
      orders.set(orderId, order)

      // Update driver status
      updateDriverStatus(driverId, 'busy')

      // Notify driver
      socket.emit('order:accepted', {
        orderId: order.id,
        status: 'accepted',
        pickup: order.pickup,
        destination: order.destination,
        price: order.price,
        timestamp: new Date().toISOString()
      })

      // Notify passenger
      io.to(`order:${orderId}`).emit('order:status', {
        orderId: order.id,
        status: 'accepted',
        driverId,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          avatar: driver.avatar,
          carModel: driver.carModel,
          carPlate: driver.carPlate,
          rating: driver.rating
        },
        timestamp: new Date().toISOString()
      })

      console.log(`Driver ${driverId} accepted order ${orderId}`)
    })

    // Driver rejects order
    socket.on('driver:reject', (data: { orderId: string }) => {
      socket.emit('order:rejected', { orderId: data.orderId })
    })

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      const tracked = driverSockets.get(socket.id)
      if (tracked) {
        updateDriverStatus(tracked.driverId, 'offline')
        driverSockets.delete(socket.id)
      }
    })
  })

  return io
}

// Broadcast new order to nearby drivers
export function broadcastToNearbyDrivers(
  io: Server,
  orderId: string,
  pickup: { lat: number; lng: number },
  orderData: {
    pickup: { address: string; lat: number; lng: number }
    destination: { address: string; lat: number; lng: number }
    price: number
    distance: number
    duration: number
  }
) {
  // Find all online drivers
  for (const [socketId, driverInfo] of driverSockets.entries()) {
    const distance = calculateDistance(
      pickup.lat, pickup.lng,
      driverInfo.lat, driverInfo.lng
    )

    // Only notify drivers within 5km
    if (distance <= 5) {
      io.to(socketId).emit('new:order', {
        orderId,
        ...orderData,
        distanceFromDriver: Math.round(distance * 10) / 10,
        timestamp: new Date().toISOString()
      })
      console.log(`Notified driver ${driverInfo.driverId} (distance: ${distance.toFixed(1)}km) about new order ${orderId}`)
    }
  }
}

// Helper to broadcast to order room
export function broadcastOrderUpdate(
  io: Server,
  orderId: string,
  event: string,
  data: Record<string, unknown>
) {
  io.to(`order:${orderId}`).emit(event, {
    orderId,
    ...data,
    timestamp: new Date().toISOString()
  })
}
