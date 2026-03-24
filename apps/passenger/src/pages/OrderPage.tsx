import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APIClient, OrderStatus, Driver, type Order } from '@didi/api-client'
import { MapView, MapMarker, MapRoute, type Position } from '@didi/ui'
import { usePassengerStore } from '../store/passengerStore'
import './OrderPage.css'

interface OrderPageProps {
  api: APIClient
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

const statusLabels: Record<OrderStatus, string> = {
  pending: '等待接单',
  accepted: '司机已接单，正在赶来',
  arrived: '司机已到达上车点',
  passenger_confirmed: '行程即将开始',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusIcons: Record<OrderStatus, string> = {
  pending: '⏳',
  accepted: '🚗',
  arrived: '📍',
  passenger_confirmed: '✅',
  in_progress: '🚀',
  completed: '🎉',
  cancelled: '❌'
}

export default function OrderPage({ api }: OrderPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { setCurrentOrder, setPickup, setDestination } = usePassengerStore()

  const [order, setOrder] = useState<Order | null>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const unsubRef = useRef<(() => void)[]>([])

  // 获取订单详情
  useEffect(() => {
    if (!id) return
    api.getOrder(id).then(res => {
      if (res.code === 0 && res.data) {
        setOrder(res.data)
        if (res.data.driver) setDriver(res.data.driver)
        setLoading(false)
      } else {
        setError(res.message || '订单不存在')
        setLoading(false)
      }
    }).catch(() => {
      setError('网络错误')
      setLoading(false)
    })
  }, [id, api])

  // 连接 Socket 实时更新
  useEffect(() => {
    if (!id) return
    api.connectSocket(id)
    api.joinOrderRoom(id)

    const unsubStatus = api.onOrderStatus((data: any) => {
      if (data.orderId !== id) return
      setOrder(prev => prev ? { ...prev, status: data.status, driverId: data.driverId || prev.driverId } : prev)
      if (data.driver) {
        setDriver(data.driver)
      }
      // 乘客确认上车后，更新状态
      if (data.status === 'passenger_confirmed') {
        setOrder(prev => prev ? { ...prev, status: 'passenger_confirmed' } : prev)
      }
    })

    const unsubLocation = api.onDriverLocation((data: any) => {
      if (data.orderId !== id) return
      setDriverLocation(data.location)
    })

    unsubRef.current = [unsubStatus, unsubLocation]

    return () => {
      unsubRef.current.forEach(fn => fn())
      api.leaveOrderRoom(id || '')
      api.disconnectSocket()
    }
  }, [id, api])

  const handleCancel = async () => {
    if (!order || !confirm('确定要取消订单吗？')) return
    try {
      await api.cancelOrder(order.id)
      setOrder({ ...order, status: 'cancelled' })
    } catch (e) {
      console.error('取消订单失败', e)
    }
  }

  // 地图中心：有司机位置用司机位置，否则用上车点
  const mapCenter = driverLocation
    ? { lng: driverLocation.lng, lat: driverLocation.lat, address: '' }
    : order?.pickup
      ? { lng: order.pickup.lng, lat: order.pickup.lat, address: order.pickup.address }
      : { lng: 120.075, lat: 29.306, address: '' }

  if (loading) {
    return (
      <div className="order-loading">
        <div className="loading-content">
          <div className="spin" style={{ fontSize: 32 }}>⏳</div>
          <div style={{ marginTop: 12, color: '#999' }}>加载订单中...</div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    // 订单不存在或出错，自动返回首页
    setTimeout(() => navigate('/'), 1500)
    return (
      <div className="order-error-page">
        <div className="error-icon">❌</div>
        <div className="error-text">{error || '订单不存在'}</div>
        <div className="error-hint">正在返回首页...</div>
      </div>
    )
  }

  // 计算进度条步骤
  const statusSteps: OrderStatus[] = ['pending', 'accepted', 'arrived', 'passenger_confirmed', 'in_progress', 'completed']
  const currentStepIdx = statusSteps.indexOf(order.status)

  // 乘客确认上车
  const handleConfirmBoard = async () => {
    try {
      await api.confirmBoarding(order.id)
      setOrder({ ...order, status: 'passenger_confirmed' })
    } catch (e) {
      console.error('确认上车失败', e)
    }
  }

  return (
    <div className="order-page">
      {/* 订单状态 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className={`order-status ${order.status}`}>
            {statusIcons[order.status]} {statusLabels[order.status]}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {order.id.slice(0, 8)}
          </div>
        </div>

        {/* 进度条 */}
        <div className="order-progress">
          {statusSteps.map((s, i) => (
            <div
              key={s}
              className={`order-progress-step ${i <= currentStepIdx ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* 地图 */}
      <div className="order-map">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={mapCenter}
          zoom={14}
        >
          {/* 上车点 */}
          <MapMarker position={order.pickup} type="origin" label="上车点" />

          {/* 目的地 */}
          <MapMarker position={order.destination} type="destination" label="目的地" />

          {/* 司机位置 */}
          {driverLocation && !['completed', 'cancelled'].includes(order.status) && (
            <MapMarker
              position={{ lng: driverLocation.lng, lat: driverLocation.lat, address: '' }}
              type="driver"
              label="司机"
            />
          )}

          {/* 路线：司机到上车点 / 上车点到目的地 */}
          {['accepted', 'arrived'].includes(order.status) && driverLocation && (
            <MapRoute
              origin={{ lng: driverLocation.lng, lat: driverLocation.lat, address: '' }}
              destination={order.pickup}
              color="#1890ff"
            />
          )}

          {['passenger_confirmed', 'in_progress'].includes(order.status) && (
            <MapRoute
              origin={order.pickup}
              destination={order.destination}
              color="#52c41a"
            />
          )}
        </MapView>
      </div>

      {/* 司机正在赶来提示 */}
      {order.status === 'accepted' && driverLocation && (
        <div className="arriving-banner">
          <span className="arriving-icon">🚗</span>
          <div className="arriving-info">
            <div className="arriving-title">司机正在赶来</div>
            <div className="arriving-hint">请到上车点等候</div>
          </div>
        </div>
      )}

      {/* 司机已到达提示 + 确认上车按钮 */}
      {order.status === 'arrived' && (
        <>
          <div className="arrived-banner">
            <span className="arrived-icon">🚗</span>
            <div className="arrived-info">
              <div className="arrived-title">司机已到达上车点</div>
              <div className="arrived-hint">请确认车牌号后上车</div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 8 }}
            onClick={handleConfirmBoard}
          >
            确认上车
          </button>
        </>
      )}

      {/* 订单被取消提示 */}
      {order.status === 'cancelled' && (
        <div className="cancelled-banner">
          <span className="cancelled-icon">❌</span>
          <div className="cancelled-info">
            <div className="cancelled-title">订单已取消</div>
            <div className="cancelled-hint">司机已取消此订单</div>
          </div>
        </div>
      )}

      {/* 司机信息 */}
      {driver && !['pending', 'cancelled'].includes(order.status) && (
        <div className="driver-card">
          <div className="driver-avatar">
            <img src={driver.avatar} alt="" />
          </div>
          <div className="driver-info">
            <div className="driver-name">{driver.name}</div>
            <div className="driver-car">{driver.carModel} · {driver.carPlate}</div>
          </div>
          <div className="driver-rating">
            ⭐ {driver.rating}
          </div>
        </div>
      )}

      {/* 行程信息 */}
      <div className="card">
        <div className="location-item">
          <div className="location-icon pickup">📍</div>
          <div className="location-info">
            <div className="location-label">上车地点</div>
            <div className="location-address">{order.pickup.address}</div>
          </div>
        </div>
        <div className="location-divider" />
        <div className="location-item">
          <div className="location-icon destination">🎯</div>
          <div className="location-info">
            <div className="location-label">目的地</div>
            <div className="location-address">{order.destination.address}</div>
          </div>
        </div>
      </div>

      {/* 费用信息 */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: 'var(--text-secondary)' }}>预估费用</span>
          <span style={{ fontWeight: 600 }}>¥{order.price}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)' }}>里程/时长</span>
          <span>{order.distance}公里 · {order.duration}分钟</span>
        </div>
      </div>

      {/* 操作按钮 - 司机到达前可取消 */}
      {['pending', 'accepted'].includes(order.status) && (
        <button
          className="btn btn-block"
          style={{ background: '#fff2f0', color: 'var(--error)' }}
          onClick={handleCancel}
        >
          取消订单
        </button>
      )}

      {order.status === 'completed' && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            // 清理订单状态，返回首页
            setCurrentOrder(null)
            setPickup(null)
            setDestination(null)
            navigate('/')
          }}
        >
          完成订单
        </button>
      )}

      {order.status === 'cancelled' && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => {
            setCurrentOrder(null)
            navigate('/')
          }}
        >
          返回首页
        </button>
      )}
    </div>
  )
}
