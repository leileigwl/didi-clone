import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { usePassengerStore } from '../store/passengerStore'

interface HomePageProps {
  api: APIClient
}

export default function HomePage({ api }: HomePageProps) {
  const navigate = useNavigate()
  const {
    user,
    pickup,
    destination,
    setPickup,
    setDestination,
    currentOrder,
    setCurrentOrder,
    loading,
    setLoading,
    error,
    setError
  } = usePassengerStore()

  const [price, setPrice] = useState(0)
  const [distance, setDistance] = useState(0)
  const [duration, setDuration] = useState(0)

  // 如果有进行中的订单，跳转到订单页面
  useEffect(() => {
    if (currentOrder && ['pending', 'accepted', 'driver_arriving', 'in_progress'].includes(currentOrder.status)) {
      navigate(`/order/${currentOrder.id}`)
    }
  }, [currentOrder])

  // 模拟计算价格
  useEffect(() => {
    if (pickup && destination) {
      // 模拟计算
      const dist = Math.random() * 20 + 5
      const dur = Math.random() * 30 + 10
      const pri = Math.round(dist * 2.5 + dur * 0.5 + 10)

      setDistance(Math.round(dist))
      setDuration(Math.round(dur))
      setPrice(pri)
    }
  }, [pickup, destination])

  const handleCallRide = async () => {
    if (!pickup || !destination) {
      setError('请选择上车地点和目的地')
      return
    }

    if (!user) {
      setError('请先登录')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.createOrder({
        pickup,
        destination,
        price,
        distance,
        duration
      })

      if (response.code === 0 && response.data) {
        setCurrentOrder(response.data)
        navigate(`/order/${response.data.id}`)
      } else {
        setError(response.message || '叫车失败，请重试')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="home-page">
      {/* 地图区域 */}
      <div className="map-container">
        <div className="map-placeholder">
          {pickup ? `📍 ${pickup.address}` : '点击选择上车地点'}
        </div>
      </div>

      {/* 地点选择 */}
      <div className="card">
        <div className="location-item" onClick={() => {
          // 模拟选择地点
          setPickup({
            address: '中关村软件园',
            lat: 39.9841,
            lng: 116.3074
          })
        }}>
          <div className="location-icon pickup">📍</div>
          <div className="location-info">
            <div className="location-label">上车地点</div>
            <div className="location-address">
              {pickup?.address || '点击选择上车地点'}
            </div>
          </div>
        </div>

        <div className="location-item" onClick={() => {
          // 模拟选择目的地
          setDestination({
            address: '国贸CBD',
            lat: 39.9087,
            lng: 116.4602
          })
        }}>
          <div className="location-icon destination">🎯</div>
          <div className="location-info">
            <div className="location-label">目的地</div>
            <div className="location-address">
              {destination?.address || '点击选择目的地'}
            </div>
          </div>
        </div>
      </div>

      {/* 价格预估 */}
      {pickup && destination && (
        <div className="card">
          <div className="price-display">
            <div className="price-label">预估费用</div>
            <div className="price-value">
              ¥{price}
              <span className="price-unit">.00</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              约 {distance} 公里 · {duration} 分钟
            </div>
          </div>
        </div>
      )}

      {/* 叫车按钮 */}
      <button
        className="btn btn-primary btn-block"
        onClick={handleCallRide}
        disabled={!pickup || !destination || loading}
      >
        {loading ? (
          <>
            <span className="spin">⏳</span>
            叫车中...
          </>
        ) : (
          '立即叫车'
        )}
      </button>

      {/* 错误提示 */}
      {error && (
        <div style={{
          padding: 12,
          background: '#fff2f0',
          color: 'var(--error)',
          borderRadius: 8,
          marginTop: 12,
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* 登录提示 */}
      {!user && (
        <div style={{
          padding: 16,
          background: '#fff7e6',
          borderRadius: 8,
          marginTop: 12,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: 8 }}>请先登录以使用叫车服务</div>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 24px' }}
            onClick={() => {
              // 模拟登录
              api.sendVerificationCode('13900138000')
                .then(() => api.verifyCode('13900138000', '123456'))
                .then(res => {
                  if (res.code === 0 && res.data) {
                    localStorage.setItem('passenger_token', res.data.token)
                    window.location.reload()
                  }
                })
            }}
          >
            快速登录
          </button>
        </div>
      )}
    </div>
  )
}
