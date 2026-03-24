import type { Server, Socket } from 'socket.io'
import { orders, drivers, updateDriverLocation, updateDriverStatus, getNearbyDrivers, calculateDistance, calculateDrivingDistance, updateOrderStatus } from '../store'

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
  console.log(`📢 广播订单 ${orderId} 到附近司机，上车点: (${pickup.lat}, ${pickup.lng})`)
  console.log(`   当前在线司机数量: ${driverSockets.size}`)

  // 先用直线距离快速筛选 5km 内的司机
  const nearbySockets: Array<{ socketId: string; driverId: string; lat: number; lng: number }> = []
  for (const [socketId, driverInfo] of driverSockets.entries()) {
    const distance = calculateDistance(
      pickup.lat, pickup.lng,
      driverInfo.lat, driverInfo.lng
    )
    console.log(`   司机 ${driverInfo.driverId} 距离: ${distance.toFixed(2)}km, 位置: (${driverInfo.lat}, ${driverInfo.lng})`)
    if (distance <= 5) {
      nearbySockets.push({ socketId, ...driverInfo })
    }
  }

  if (nearbySockets.length === 0) {
    console.log(`❌ 没有找到5km内的司机`)
    return
  }

  console.log(`✅ 找到 ${nearbySockets.length} 个附近司机`)

  // 用高德 REST API 获取真实驾车距离
  const origins = nearbySockets.map(d => ({ lat: d.lat, lng: d.lng }))
  calculateDrivingDistance(origins, pickup).then(results => {
    results.forEach((result, idx) => {
      const driverInfo = nearbySockets[idx]
      io.to(driverInfo.socketId).emit('new:order', {
        orderId,
        ...orderData,
        distanceFromDriver: Math.round(result.distance * 10) / 10,
        durationFromDriver: Math.round(result.duration),
        timestamp: new Date().toISOString()
      })
      console.log(`✅ 已推送给司机 ${driverInfo.driverId} (驾车距离: ${result.distance.toFixed(1)}km)`)
    })
  })
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

// Auto-accept order simulation
export async function simulateOrderFlow(io: Server, orderId: string) {
  const order = orders.get(orderId)
  if (!order || order.status !== 'pending') return

  // 用高德 REST API 找到驾车距离最近的空闲司机
  const idleDrivers = Array.from(drivers.entries()).filter(([, d]) => d.status === 'idle')
  if (idleDrivers.length === 0) {
    console.log(`No idle driver available for order ${orderId}`)
    return
  }

  const origins = idleDrivers.map(([, d]) => ({ lat: d.location.lat, lng: d.location.lng }))
  const results = await calculateDrivingDistance(origins, order.pickup)

  let nearestIdx = 0
  let nearestDist = Infinity
  results.forEach((r, idx) => {
    if (r.distance < nearestDist) {
      nearestDist = r.distance
      nearestIdx = idx
    }
  })

  const [driverId, driver] = idleDrivers[nearestIdx]
  console.log(`[Auto] Nearest driver ${driverId} is ${nearestDist.toFixed(1)}km away from order ${orderId}`)

  // 3秒后自动接单
  setTimeout(() => {
    const o = orders.get(orderId)
    if (!o || o.status !== 'pending') return

    o.driverId = driverId
    o.status = 'accepted'
    o.updatedAt = new Date()
    orders.set(orderId, o)
    updateDriverStatus(driverId, 'busy')

    io.to(`order:${orderId}`).emit('order:status', {
      orderId: o.id,
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
    console.log(`[Auto] Driver ${driverId} accepted order ${orderId}`)

    // 5秒后变为 driver_arriving
    setTimeout(() => {
      const o2 = orders.get(orderId)
      if (!o2 || o2.status !== 'accepted') return

      updateOrderStatus(orderId, 'driver_arriving')

      // Simulate driver moving toward pickup
      const driverData = drivers.get(driverId)
      if (driverData) {
        io.to(`order:${orderId}`).emit('driver:location', {
          orderId,
          location: { lat: driverData.location.lat, lng: driverData.location.lng },
          timestamp: new Date().toISOString()
        })
      }

      io.to(`order:${orderId}`).emit('order:status', {
        orderId,
        status: 'driver_arriving',
        timestamp: new Date().toISOString()
      })
      console.log(`[Auto] Driver ${driverId} arriving for order ${orderId}`)

      // 8秒后变为 arrived
      setTimeout(() => {
        const o3 = orders.get(orderId)
        if (!o3 || o3.status !== 'driver_arriving') return

        updateOrderStatus(orderId, 'arrived')

        // Update driver location to pickup
        if (driverData) {
          updateDriverLocation(driverId, o3.pickup.lat, o3.pickup.lng)
          io.to(`order:${orderId}`).emit('driver:location', {
            orderId,
            location: { lat: o3.pickup.lat, lng: o3.pickup.lng },
            timestamp: new Date().toISOString()
          })
        }

        io.to(`order:${orderId}`).emit('order:status', {
          orderId,
          status: 'arrived',
          timestamp: new Date().toISOString()
        })
        console.log(`[Auto] Driver ${driverId} arrived at order ${orderId}`)
      }, 8000)
    }, 5000)
  }, 3000)
}
