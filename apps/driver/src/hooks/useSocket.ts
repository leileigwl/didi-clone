import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useDriverStore } from '../store/driverStore'
import { Order } from '@didi/api-client'

const SOCKET_URL = 'http://localhost:3000'

// 全局 socket 实例（确保只有一个）
let globalSocket: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(globalSocket)
  const {
    isOnline,
    addPendingOrder,
    removePendingOrder,
    setCurrentOrder,
    setLocation
  } = useDriverStore()

  // 使用 ref 保存最新的 store 方法，避免闭包问题
  const storeRef = useRef({
    addPendingOrder,
    removePendingOrder,
    setCurrentOrder,
    setLocation
  })

  // 更新 ref
  useEffect(() => {
    storeRef.current = {
      addPendingOrder,
      removePendingOrder,
      setCurrentOrder,
      setLocation
    }
  }, [addPendingOrder, removePendingOrder, setCurrentOrder, setLocation])

  // 初始化 socket（只执行一次）
  useEffect(() => {
    if (globalSocket) {
      socketRef.current = globalSocket
      return
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false
    })

    globalSocket = socket
    socketRef.current = socket

    // ===== 注册所有事件监听器（立即注册，不需要等 connect）=====

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
    })

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
    })

    // 新订单
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
      storeRef.current.addPendingOrder(order)

      if (window.Notification) {
        const distText = data.distanceFromDriver
          ? ` · 距你${data.distanceFromDriver.toFixed(1)}km`
          : ''
        new Notification('新订单!', {
          body: `${data.pickup.address} → ${data.destination.address} · ¥${data.price}${distText}`,
        })
      }
    })

    // 订单已接单确认
    socket.on('order:accepted', (data: any) => {
      console.log('✅ 订单已接单:', data)
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
      storeRef.current.setCurrentOrder(order)
      storeRef.current.removePendingOrder(data.orderId)
    })

    // 订单状态更新（乘客确认上车等）- 关键！
    socket.on('order:status', (data: { orderId: string; status: string; message?: string }) => {
      console.log('📋 收到订单状态更新:', data)
      const currentOrder = useDriverStore.getState().currentOrder

      if (!currentOrder) {
        console.log('📋 当前没有订单，忽略状态更新')
        return
      }

      if (currentOrder.id !== data.orderId) {
        console.log('📋 订单ID不匹配，忽略状态更新', currentOrder.id, data.orderId)
        return
      }

      console.log('📋 更新订单状态:', currentOrder.status, '→', data.status)
      storeRef.current.setCurrentOrder({ ...currentOrder, status: data.status as any })
    })

    // 订单被取消
    socket.on('order:cancelled', (data: { orderId: string; reason?: string }) => {
      console.log('🚫 订单被取消:', data)
      storeRef.current.removePendingOrder(data.orderId)
      const currentOrderId = useDriverStore.getState().currentOrder?.id
      if (currentOrderId === data.orderId) {
        storeRef.current.setCurrentOrder(null)
      }
    })

    return () => {
      // 不在这里 disconnect，保持全局 socket
    }
  }, [])

  // 上线/下线控制
  useEffect(() => {
    const socket = socketRef.current
    if (!socket) return

    if (isOnline) {
      if (!socket.connected) {
        socket.connect()
      }
    } else {
      socket.emit('driver:offline', { driverId: 'driver-1' })
      socket.disconnect()
    }
  }, [isOnline])

  // 上报司机位置（上线时调用）
  const emitDriverOnline = useCallback((lat: number, lng: number) => {
    const socket = socketRef.current
    if (socket) {
      if (!socket.connected) {
        socket.connect()
      }
      // 等待连接后再发送
      const sendOnline = () => {
        socket.emit('driver:online', { driverId: 'driver-1', lat, lng })
        console.log('Emitted driver:online', lat, lng)
      }
      if (socket.connected) {
        sendOnline()
      } else {
        socket.once('connect', sendOnline)
      }
    }
  }, [])

  // 上报司机位置（移动时调用）
  const emitLocation = useCallback((lat: number, lng: number) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:location', { driverId: 'driver-1', lat, lng })
      storeRef.current.setLocation({ address: '', lat, lng })
    }
  }, [])

  // 接单
  const acceptOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:accept', { orderId, driverId: 'driver-1' })
    }
  }, [])

  // 拒单
  const rejectOrder = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:reject', { orderId })
    }
  }, [])

  // 取消订单
  const emitOrderCancelled = useCallback((orderId: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:cancel', { orderId, driverId: 'driver-1' })
    }
  }, [])

  // 更新订单状态
  const emitOrderStatus = useCallback((orderId: string, status: string) => {
    const socket = socketRef.current
    if (socket && socket.connected) {
      socket.emit('driver:status', { orderId, driverId: 'driver-1', status })
    }
  }, [])

  return {
    emitDriverOnline,
    emitLocation,
    acceptOrder,
    rejectOrder,
    emitOrderCancelled,
    emitOrderStatus,
  }
}

export default useSocket