import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { MapView, MapMarker, MapRoute, DriverTracker, type Position, type RouteInfo } from '@didi/ui'
import StatusBar from '../../components/StatusBar/StatusBar'
import OrderCard from '../../components/OrderCard/OrderCard'
import './Home.css'

// 高德地图 Key - 直接配置测试
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

// Debug: 输出 key 状态（不输出完整 key）
console.log('Driver Amap Key loaded:', AMAP_KEY ? `${AMAP_KEY.substring(0, 8)}...` : 'NOT LOADED')
console.log('Driver Security Code loaded:', AMAP_SECURITY_CODE ? 'YES' : 'NO')

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

  const [driverLocation, setDriverLocation] = useState<Position>({ lng: 116.397428, lat: 39.90923 })
  const [routePath, setRoutePath] = useState<Position[]>([])
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)

  const handleOnlineToggle = async () => {
    const newStatus = !isOnline
    setOnline(newStatus)
    await window.electronAPI?.setOnline(newStatus)
  }

  const handleAcceptOrder = (orderId: string) => {
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

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // 模拟获取司机位置
  useEffect(() => {
    if (isOnline && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setDriverLocation({
            lng: position.coords.longitude,
            lat: position.coords.latitude
          })
        },
        (error) => {
          console.warn('定位失败，使用模拟位置')
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline])

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

      {/* 调试信息 */}
      <div style={{ padding: '10px', background: '#2d2d44', color: '#fff', fontSize: '12px' }}>
        <div>AMAP_KEY: {AMAP_KEY ? `${AMAP_KEY.substring(0, 8)}...` : 'NOT LOADED'}</div>
        <div>AMAP_SECURITY: {AMAP_SECURITY_CODE ? 'YES' : 'NO'}</div>
      </div>

      {/* 地图区域 */}
      <div className="map-section">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={driverLocation}
          zoom={14}
          theme="dark"
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
          <span>当前位置: 北京市中心</span>
          {routeInfo && (
            <span className="distance-info">
              距乘客 {Math.round(routeInfo.distance / 1000 * 10) / 10} 公里
            </span>
          )}
        </div>
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