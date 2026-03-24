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
      console.log('Socket connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('Socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  // Handle online/offline status
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    if (isOnline) {
      socket.connect()
      socket.emit('driver:online')
    } else {
      socket.emit('driver:offline')
      socket.disconnect()
    }
  }, [isOnline])

  // Listen for new orders
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleNewOrder = (order: Order) => {
      console.log('New order received:', order)
      addPendingOrder(order)

      // Send notification via Electron
      if (window.electronAPI) {
        // Could trigger a system notification here
        new Notification('New Order!', {
          body: `From ${order.pickup.address} to ${order.destination.address}`,
          icon: '/icon.png'
        })
      }
    }

    socket.on('order:new', handleNewOrder)

    return () => {
      socket.off('order:new', handleNewOrder)
    }
  }, [addPendingOrder])

  // Listen for order cancellations
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleOrderCancelled = (data: { orderId: string }) => {
      console.log('Order cancelled:', data.orderId)
      removePendingOrder(data.orderId)

      // Show notification
      if (window.Notification) {
        new Notification('Order Cancelled', {
          body: 'The passenger has cancelled this order',
          icon: '/icon.png'
        })
      }
    }

    socket.on('order:cancelled', handleOrderCancelled)

    return () => {
      socket.off('order:cancelled', handleOrderCancelled)
    }
  }, [removePendingOrder])

  // Listen for order status updates
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    const handleOrderStatus = (data: { orderId: string; status: string }) => {
      console.log('Order status update:', data)
      // Handle status updates if needed
    }

    socket.on('order:status', handleOrderStatus)

    return () => {
      socket.off('order:status', handleOrderStatus)
    }
  }, [])

  // Emit driver location
  const emitLocation = useCallback((lat: number, lng: number) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:location', { lat, lng })
      setLocation({ address: '', lat, lng })
    }
  }, [setLocation])

  // Accept order
  const acceptOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('order:accept', { orderId })
    }
  }, [])

  // Reject order
  const rejectOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('order:reject', { orderId })
    }
  }, [])

  // Update order status
  const updateOrderStatus = useCallback((orderId: string, status: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('order:update-status', { orderId, status })
    }
  }, [])

  return {
    emitLocation,
    acceptOrder,
    rejectOrder,
    updateOrderStatus
  }
}

export default useSocket
