import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { usePassengerStore } from '../store/passengerStore'
import './HomePage.css'

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
  }, [currentOrder, navigate])

  // 模拟计算价格
  useEffect(() => {
    if (pickup && destination) {
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
        <div className="map-content">
          {/* 模拟地图背景 */}
          <div className="map-background">
            <div className="map-grid-lines"></div>
          </div>

          {/* 模拟道路 */}
          <div className="road road-horizontal" style={{ top: '30%' }}></div>
          <div className="road road-horizontal" style={{ top: '60%' }}></div>
          <div className="road road-vertical" style={{ left: '25%' }}></div>
          <div className="road road-vertical" style={{ left: '65%' }}></div>

          {/* 地图上的标记 */}
          {pickup && (
            <div className="map-marker pickup-marker">
              <div className="marker-icon">📍</div>
              <div className="marker-label">上车点</div>
            </div>
          )}

          {destination && (
            <div className="map-marker destination-marker">
              <div className="marker-icon">🎯</div>
              <div className="marker-label">目的地</div>
            </div>
          )}

          {/* 模拟车辆 */}
          <div className="map-car car-1">🚗</div>
          <div className="map-car car-2">🚕</div>
          <div className="map-car car-3">🚙</div>

          {/* 提示文字 */}
          <div className="map-hint">
            {pickup && destination
              ? `预计 ${duration} 分钟到达`
              : '点击下方选择地点'}
          </div>
        </div>
      </div>

      {/* 地点选择 */}
      <div className="card">
        <div className="location-item" onClick={() => setPickup({
          address: '中关村软件园',
          lat: 39.9841,
          lng: 116.3074
        })}>
          <div className="location-icon pickup">📍</div>
          <div className="location-info">
            <div className="location-label">上车地点</div>
            <div className="location-address">
              {pickup?.address || '点击选择上车地点'}
            </div>
          </div>
        </div>

        <div className="location-item" onClick={() => setDestination({
          address: '国贸CBD',
          lat: 39.9087,
          lng: 116.4602
        })}>
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
            <div className="price-detail">
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
        {loading ? '叫车中...' : '立即叫车'}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 登录提示 */}
      {!user && (
        <div className="login-hint">
          <div className="login-hint-text">请先登录以使用叫车服务</div>
          <button
            className="btn btn-primary"
            onClick={() => {
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