import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APIClient, OrderStatus, Driver, type Order } from '@didi/api-client'
import { MapView, MapMarker, MapRoute, type Position } from '@didi/ui'
import './OrderPage.css'

interface OrderPageProps {
  api: APIClient
}

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

const statusLabels: Record<OrderStatus, string> = {
  pending: '等待接单',
  accepted: '司机已接单',
  driver_arriving: '司机正在赶来',
  arrived: '司机已到达',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusIcons: Record<OrderStatus, string> = {
  pending: '⏳',
  accepted: '✅',
  driver_arriving: '🚗',
  arrived: '📍',
  in_progress: '🚀',
  completed: '🎉',
  cancelled: '❌'
}

export default function OrderPage({ api }: OrderPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

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
        <div className="spin" style={{ fontSize: 32 }}>⏳</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div>{error || '订单不存在'}</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  // 计算进度条步骤
  const statusSteps: OrderStatus[] = ['pending', 'accepted', 'driver_arriving', 'arrived', 'in_progress', 'completed']
  const currentStepIdx = statusSteps.indexOf(order.status)

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
          {!['completed', 'cancelled', 'pending'].includes(order.status) && driverLocation && (
            <MapRoute
              origin={{ lng: driverLocation.lng, lat: driverLocation.lat, address: '' }}
              destination={order.pickup}
              color="#1890ff"
            />
          )}

          {['in_progress'].includes(order.status) && (
            <MapRoute
              origin={order.pickup}
              destination={order.destination}
              color="#52c41a"
            />
          )}
        </MapView>
      </div>

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

      {/* 操作按钮 */}
      {['pending', 'accepted', 'driver_arriving'].includes(order.status) && (
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
          onClick={() => navigate('/')}
        >
          再来一单
        </button>
      )}

      {order.status === 'cancelled' && (
        <button
          className="btn btn-primary btn-block"
          onClick={() => navigate('/')}
        >
          返回首页
        </button>
      )}
    </div>
  )
}
