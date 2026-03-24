import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '../store/driverStore'
import { Order } from '@didi/api-client'

const SOCKET_URL = 'http://localhost:3000'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const {
    isOnline,
    addPendingOrder,
    removePendingOrder,
    setCurrentOrder,
    setLocation
  } = useDriverStore()

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false
    })

    const socket = socketRef.current

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
    })

    socket.on('new:order', (data: any) => {
      console.log('🎉 收到新订单:', data)
      const order: Order = {
        id: data.orderId,
        userId: '',
        status: 'pending',
        pickup: data.pickup,
        destination: data.destination,
        price: data.price,
        distance: data.distance,
        duration: data.duration,
        createdAt: new Date(data.timestamp),
        updatedAt: new Date(data.timestamp),
        distanceFromDriver: data.distanceFromDriver,
        durationFromDriver: data.durationFromDriver,
      }
      addPendingOrder(order)

      if (window.Notification) {
        const distText = data.distanceFromDriver
          ? ` · 距你${data.distanceFromDriver.toFixed(1)}km`
          : ''
        new Notification('新订单!', {
          body: `${data.pickup.address} → ${data.destination.address} · ¥${data.price}${distText}`,
        })
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [addPendingOrder])

  // Handle online/offline status - emit location to server
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    if (isOnline) {
      socket.connect()
    } else {
      socket.emit('driver:offline', { driverId: 'driver-1' })
      socket.disconnect()
    }
  }, [isOnline])

  // Listen for order accepted confirmation
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleAccepted = (data: any) => {
      console.log('Order accepted:', data)
      const order: Order = {
        id: data.orderId,
        userId: '',
        status: 'accepted',
        pickup: data.pickup,
        destination: data.destination,
        price: data.price,
        distance: 0,
        duration: 0,
        createdAt: new Date(data.timestamp),
        updatedAt: new Date(data.timestamp),
      }
      setCurrentOrder(order)
      removePendingOrder(data.orderId)
    }

    socket.on('order:accepted', handleAccepted)

    return () => {
      socket.off('order:accepted', handleAccepted)
    }
  }, [setCurrentOrder, removePendingOrder])

  // Listen for order cancelled
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleOrderCancelled = (data: { orderId: string }) => {
      console.log('Order cancelled:', data.orderId)
      removePendingOrder(data.orderId)
    }

    socket.on('order:cancelled', handleOrderCancelled)

    return () => {
      socket.off('order:cancelled', handleOrderCancelled)
    }
  }, [removePendingOrder])

  // Emit driver online with location
  const emitDriverOnline = useCallback((lat: number, lng: number) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:online', { driverId: 'driver-1', lat, lng })
      console.log('Emitted driver:online', lat, lng)
    }
  }, [])

  // Emit driver location
  const emitLocation = useCallback((lat: number, lng: number) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:location', { driverId: 'driver-1', lat, lng })
      setLocation({ address: '', lat, lng })
    }
  }, [setLocation])

  // Accept order via socket
  const acceptOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:accept', { orderId, driverId: 'driver-1' })
    }
  }, [])

  // Reject order via socket
  const rejectOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:reject', { orderId })
    }
  }, [])

  return {
    emitDriverOnline,
    emitLocation,
    acceptOrder,
    rejectOrder,
  }
}

export default useSocket
