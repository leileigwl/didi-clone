import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { usePassengerStore } from '../store/passengerStore'
import { MapView, MapMarker, MapRoute, type Position, type RouteInfo } from '@didi/ui'
import './HomePage.css'

interface HomePageProps {
  api: APIClient
}

// 高德地图 Key - 请在 .env 文件中配置
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || ''

// Debug: 输出 key 状态（不输出完整 key）
console.log('Amap Key loaded:', AMAP_KEY ? `${AMAP_KEY.substring(0, 8)}...` : 'NOT LOADED')
console.log('Security Code loaded:', AMAP_SECURITY_CODE ? 'YES' : 'NO')

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
  const [currentLocation, setCurrentLocation] = useState<Position | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  // 如果有进行中的订单，跳转到订单页面
  useEffect(() => {
    if (currentOrder && ['pending', 'accepted', 'driver_arriving', 'in_progress'].includes(currentOrder.status)) {
      navigate(`/order/${currentOrder.id}`)
    }
  }, [currentOrder, navigate])

  // 路线规划完成后更新价格
  useEffect(() => {
    if (routeInfo) {
      const dist = routeInfo.distance / 1000 // 转换为公里
      const dur = routeInfo.duration / 60 // 转换为分钟
      const pri = Math.round(dist * 2.5 + dur * 0.5 + 10)

      setDistance(Math.round(dist * 10) / 10)
      setDuration(Math.round(dur))
      setPrice(pri)
    }
  }, [routeInfo])

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

  // 地图加载完成
  const handleMapReady = useCallback(() => {
    setMapReady(true)
  }, [])

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // 快速登录
  const handleQuickLogin = useCallback(async () => {
    try {
      await api.sendVerificationCode('13900138000')
      const res = await api.verifyCode('13900138000', '123456')
      if (res.code === 0 && res.data) {
        localStorage.setItem('passenger_token', res.data.token)
        window.location.reload()
      }
    } catch (err) {
      setError('登录失败，请重试')
    }
  }, [api])

  // 检查是否有地图 Key
  if (!AMAP_KEY || AMAP_KEY === 'your_amap_key_here') {
    return (
      <div className="home-page">
        <div className="map-container">
          <div className="map-error-message">
            <h3>地图配置缺失</h3>
            <p>请在 apps/passenger/.env 文件中配置高德地图 API Key</p>
            <ol>
              <li>访问 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener">高德开放平台</a></li>
              <li>创建应用并获取 Web端(JS API) Key</li>
              <li>将 Key 填入 .env 文件中的 VITE_AMAP_KEY</li>
              <li>重启应用</li>
            </ol>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-page">
      {/* 地图区域 */}
      <div className="map-container">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={pickup || currentLocation || { lng: 116.397428, lat: 39.90923 }}
          zoom={14}
          onMapReady={handleMapReady}
        >
          {/* 当前位置 */}
          {currentLocation && (
            <MapMarker
              position={currentLocation}
              type="origin"
              label="我的位置"
            />
          )}

          {/* 上车点 */}
          {pickup && (
            <MapMarker
              position={pickup}
              type="origin"
              label="上车点"
            />
          )}

          {/* 目的地 */}
          {destination && (
            <MapMarker
              position={destination}
              type="destination"
              label="目的地"
            />
          )}

          {/* 路线 */}
          {pickup && destination && (
            <MapRoute
              origin={pickup}
              destination={destination}
              onRouteComplete={handleRouteComplete}
            />
          )}
        </MapView>
      </div>

      {/* 地点选择 */}
      <div className="card">
        <div className="location-item" onClick={() => {
          // 使用当前位置作为上车点
          if (currentLocation) {
            setPickup({
              ...currentLocation,
              address: '当前位置'
            })
          } else {
            setPickup({
              address: '中关村软件园',
              lat: 39.9841,
              lng: 116.3074
            })
          }
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
      {pickup && destination && routeInfo && (
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
          <button className="btn btn-primary" onClick={handleQuickLogin}>
            快速登录
          </button>
        </div>
      )}
    </div>
  )
}