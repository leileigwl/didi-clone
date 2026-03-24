import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { useSocket } from '../../hooks/useSocket'
import { MapView, MapMarker, MapRoute, DriverTracker, type Position, type RouteInfo } from '@didi/ui'
import StatusBar from '../../components/StatusBar/StatusBar'
import OrderCard from '../../components/OrderCard/OrderCard'
import './Home.css'

// 高德地图 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const {
    isOnline,
    setOnline,
    currentOrder,
    pendingOrders,
    earnings,
    acceptOrder,
    rejectOrder
  } = useDriverStore()

  const { emitDriverOnline, emitLocation, acceptOrder: socketAcceptOrder } = useSocket()

  // 义乌市中心坐标作为默认位置
  const DEFAULT_YIWU: Position = { lng: 120.075, lat: 29.306 }
  const [driverLocation, setDriverLocation] = useState<Position>(DEFAULT_YIWU)
  const [routePath, setRoutePath] = useState<Position[]>([])
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [currentAddress, setCurrentAddress] = useState('定位中...')

  const handleOnlineToggle = async () => {
    const newStatus = !isOnline
    setOnline(newStatus)
    await window.electronAPI?.setOnline(newStatus)

    if (newStatus) {
      // 注册到服务器并开始上报位置
      emitDriverOnline(driverLocation.lat, driverLocation.lng)
    }
  }

  const handleAcceptOrder = (orderId: string) => {
    socketAcceptOrder(orderId)
    acceptOrder(orderId)
    navigate(`/order/${orderId}`)
  }

  const handleRejectOrder = (orderId: string) => {
    rejectOrder(orderId)
  }

  const handleViewCurrentOrder = () => {
    if (currentOrder) {
      navigate(`/order/${currentOrder.id}`)
    }
  }

  // 打开系统定位设置
  const handleOpenLocationSettings = async () => {
    if (window.electronAPI?.openLocationSettings) {
      await window.electronAPI.openLocationSettings()
    }
  }

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // 逆地理编码
  const reverseGeocode = useCallback((lng: number, lat: number, AMap: any) => {
    AMap.plugin(['AMap.Geocoder'], () => {
      const geocoder = new AMap.Geocoder()
      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          setCurrentAddress(result.regeocode.formattedAddress)
        } else {
          setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
      })
    })
  }, [])

  // 高德 IP 定位 - 使用 JS API 的 CitySearch（REST API 需要 Web服务类型的 key）
  const locateWithIPApi = useCallback((_AMap: any, map: any) => {
    _AMap.plugin(['AMap.CitySearch'], () => {
      const citySearch = new _AMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          const bounds = result.bounds
          if (bounds) {
            const center = bounds.getCenter()
            const lng = center.getLng()
            const lat = center.getLat()
            setDriverLocation({ lng, lat })
            if (map) {
              map.setCenter([lng, lat])
            }
            setCurrentAddress(result.province + result.city)
            console.log('IP定位结果:', result.city, `(${lng.toFixed(4)}, ${lat.toFixed(4)})`)
          }
        } else {
          console.warn('CitySearch定位失败，使用默认位置')
        }
      })
    })
  }, [])

  // 使用高德插件定位
  const locateWithAmap = useCallback((AMap: any, map: any) => {
    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: false,     // Electron中不需要GPS
        timeout: 10000,
        zoomToAccuracy: false,
        GeoLocationFirst: false,       // 不优先HTML5定位
        noGeoLocation: 2,              // 禁用PC端浏览器定位（Electron中会超时）
        noIpLocate: 0,                 // 启用高精度IP定位
        extensions: 'all',             // 返回完整信息（含格式化地址）
      })

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          const lng = result.position.getLng()
          const lat = result.position.getLat()
          setDriverLocation({ lng, lat })
          setLocationDenied(false)
          if (map) {
            map.setCenter([lng, lat])
          }
          // 优先使用Geolocation返回的地址，避免额外逆地理编码请求
          if (result.formattedAddress) {
            setCurrentAddress(result.formattedAddress)
          } else {
            reverseGeocode(lng, lat, AMap)
          }
          console.log('定位成功:', result.formattedAddress, `(${lng.toFixed(4)}, ${lat.toFixed(4)})`, 'type:', result.location_type)
        } else {
          console.warn('高德定位失败，使用CitySearch作为后备:', status)
          locateWithIPApi(AMap, map)
        }
      })

      // 如果在线，持续追踪位置
      if (isOnline && map) {
        map.addControl(geolocation)
        geolocation.watchPosition()
      }
    })
  }, [isOnline, reverseGeocode, locateWithIPApi])

  // 地图加载完成后定位
  const handleMapReady = useCallback((map: any, AMap: any) => {
    locateWithAmap(AMap, map)
  }, [locateWithAmap])

  // 位置变化时上报给服务器（跳过默认位置，避免上报未定位时的坐标）
  useEffect(() => {
    if (isOnline && driverLocation.lat !== DEFAULT_YIWU.lat) {
      emitLocation(driverLocation.lat, driverLocation.lng)
    }
  }, [driverLocation, isOnline, emitLocation])

  // 请求macOS定位权限
  useEffect(() => {
    if (window.electronAPI?.requestLocationPermission) {
      window.electronAPI.requestLocationPermission().then((result: any) => {
        console.log('Location permission:', result)
        if (result.status === 'denied') {
          setLocationDenied(true)
        }
      })
    }
  }, [])

  // 检查地图配置
  if (!AMAP_KEY || AMAP_KEY === 'your_amap_web_key_here') {
    return (
      <div className="home-container">
        <StatusBar />
        <div className="map-error">
          <h3>地图配置缺失</h3>
          <p>请在 apps/driver/.env 文件中配置高德地图 API Key</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      <StatusBar />

      {/* 地图区域 */}
      <div className="map-section">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={driverLocation}
          zoom={14}
          theme="normal"
          onMapReady={handleMapReady}
        >
          {/* 司机位置 */}
          <MapMarker
            position={driverLocation}
            type="car"
            label={isOnline ? '在线' : '离线'}
          />

          {/* 当前订单 - 显示乘客位置和路线 */}
          {currentOrder && (
            <>
              <MapMarker
                position={currentOrder.pickup}
                type="origin"
                label="乘客位置"
              />
              <MapMarker
                position={currentOrder.destination}
                type="destination"
                label="目的地"
              />
              <MapRoute
                origin={driverLocation}
                destination={currentOrder.pickup}
                onRouteComplete={handleRouteComplete}
              />
            </>
          )}
        </MapView>

        {/* 在线状态切换 */}
        <div className="map-overlay">
          <button
            className={`online-toggle-btn ${isOnline ? 'online' : 'offline'}`}
            onClick={handleOnlineToggle}
          >
            <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
            <span>{isOnline ? '在线接单' : '离线休息'}</span>
          </button>
        </div>

        {/* 司机位置信息 */}
        <div className="location-info-bar">
          <span className="location-icon">📍</span>
          <span>当前位置: {currentAddress}</span>
          {routeInfo && (
            <span className="distance-info">
              距乘客 {Math.round(routeInfo.distance / 1000 * 10) / 10} 公里
            </span>
          )}
        </div>

        {/* 定位权限被拒绝提示 */}
        {locationDenied && (
          <div className="location-denied-banner">
            <span className="warning-icon">⚠️</span>
            <span>定位权限被拒绝，无法获取精确位置</span>
            <button onClick={handleOpenLocationSettings} className="open-settings-btn">
              打开设置
            </button>
          </div>
        )}
      </div>

      {/* 当前订单 */}
      {currentOrder && (
        <div className="current-order-section">
          <h2>当前订单</h2>
          <div className="current-order-card" onClick={handleViewCurrentOrder}>
            <div className="order-route">
              <div className="route-point pickup">
                <span className="route-icon">📍</span>
                <span className="route-text">{currentOrder.pickup.address}</span>
              </div>
              <div className="route-arrow">→</div>
              <div className="route-point destination">
                <span className="route-icon">🎯</span>
                <span className="route-text">{currentOrder.destination.address}</span>
              </div>
            </div>
            <div className="order-info">
              <span className="order-status">{currentOrder.status}</span>
              <span className="order-price">¥{currentOrder.price}</span>
            </div>
            <button className="view-order-btn">查看详情</button>
          </div>
        </div>
      )}

      {/* 新订单 */}
      {!currentOrder && pendingOrders.length > 0 && (
        <div className="pending-orders-section">
          <h2>新订单 ({pendingOrders.length})</h2>
          <div className="pending-orders-list">
            {pendingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => handleAcceptOrder(order.id)}
                onReject={() => handleRejectOrder(order.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 等待订单 */}
      {!currentOrder && pendingOrders.length === 0 && isOnline && (
        <div className="waiting-section">
          <div className="waiting-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            <span className="waiting-icon">🚗</span>
          </div>
          <p className="waiting-text">正在等待订单...</p>
          {routeInfo && (
            <p className="route-hint">
              距离最近乘客约 {Math.round(routeInfo.distance / 1000 * 10) / 10} 公里
            </p>
          )}
        </div>
      )}

      {/* 离线提示 */}
      {!isOnline && !currentOrder && (
        <div className="offline-message">
          <span className="offline-icon">💤</span>
          <p>当前处于离线状态</p>
          <p className="offline-hint">上线后开始接收订单</p>
        </div>
      )}

      {/* 今日收入 */}
      <div className="earnings-section">
        <h2>今日收入</h2>
        <div className="earnings-card" onClick={() => navigate('/earnings')}>
          <div className="earnings-amount">
            <span className="currency">¥</span>
            <span className="amount">{earnings.today.toFixed(2)}</span>
          </div>
          <div className="earnings-stats">
            <div className="stat">
              <span className="stat-value">{earnings.totalTrips}</span>
              <span className="stat-label">单数</span>
            </div>
            <div className="stat">
              <span className="stat-value">{earnings.totalHours.toFixed(1)}h</span>
              <span className="stat-label">在线</span>
            </div>
          </div>
          <div className="view-earnings-btn">
            <span>查看详情</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home