import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { APIClient, OrderStatus, Driver } from '@didi/api-client'

interface OrderPageProps {
  api: APIClient
}

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

  const [order, setOrder] = useState<any>(null)
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟订单数据
    const mockOrder = {
      id: id || 'ORD-000001',
      userId: 'user-1',
      driverId: 'driver-1',
      status: 'driver_arriving' as OrderStatus,
      pickup: {
        address: '中关村软件园',
        lat: 39.9841,
        lng: 116.3074
      },
      destination: {
        address: '国贸CBD',
        lat: 39.9087,
        lng: 116.4602
      },
      price: 45,
      distance: 15,
      duration: 25,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const mockDriver: Driver = {
      id: 'driver-1',
      name: '张师傅',
      phone: '138****1234',
      carModel: '比亚迪秦',
      carPlate: '京A12345',
      rating: 4.9,
      location: {
        address: '北京市海淀区',
        lat: 39.98,
        lng: 116.31
      },
      distance: 2
    }

    setTimeout(() => {
      setOrder(mockOrder)
      setDriver(mockDriver)
      setLoading(false)
    }, 500)
  }, [id])

  const handleCancel = async () => {
    if (order && confirm('确定要取消订单吗？')) {
      try {
        await api.cancelOrder(order.id)
        navigate('/')
      } catch (e) {
        console.error('取消订单失败', e)
      }
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="spin" style={{ fontSize: 32 }}>⏳</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
        <div>订单不存在</div>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div className="order-page">
      {/* 订单状态 */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className={`order-status ${order.status}`}>
            {statusIcons[order.status]} {statusLabels[order.status]}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            订单号: {order.id}
          </div>
        </div>

        {/* 进度条 */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16
        }}>
          {['pending', 'accepted', 'driver_arriving', 'arrived', 'in_progress', 'completed'].map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: ['pending', 'accepted', 'driver_arriving'].includes(order.status) && i <= 2
                  ? 'var(--primary)'
                  : ['in_progress', 'completed'].includes(order.status) && i <= 4
                    ? 'var(--primary)'
                    : 'var(--border)'
              }}
            />
          ))}
        </div>

        {/* 预计到达时间 */}
        {order.status === 'driver_arriving' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>预计到达</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>
              3 分钟
            </div>
          </div>
        )}
      </div>

      {/* 地图 */}
      <div className="map-container" style={{ height: 150 }}>
        <div className="map-placeholder">
          司机正在赶来...
        </div>
      </div>

      {/* 司机信息 */}
      {driver && (
        <div className="driver-card">
          <div className="driver-avatar">👤</div>
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
    </div>
  )
}
