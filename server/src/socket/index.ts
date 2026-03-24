import type { Server, Socket } from 'socket.io'
import { orders, drivers, updateDriverLocation } from '../store'

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)

    // Join order room for real-time updates
    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`)
      console.log(`Socket ${socket.id} joined order:${orderId}`)

      // Send current order status
      const order = orders.get(orderId)
      if (order) {
        socket.emit('order:status', {
          orderId: order.id,
          status: order.status,
          driverId: order.driverId,
          timestamp: new Date().toISOString()
        })

        // Send driver location if assigned
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

    // Driver location updates (alternative to REST API)
    socket.on('driver:location', (data: { driverId: string; lat: number; lng: number }) => {
      const { driverId, lat, lng } = data
      updateDriverLocation(driverId, lat, lng)

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

    // Disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
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
