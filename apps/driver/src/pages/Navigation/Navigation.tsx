import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { MapView, MapRoute } from '@didi/ui'
import './Navigation.css'

interface NavigationInfo {
  distance: number
  duration: number
  eta: string
}

const Navigation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { currentOrder, location, updateOrderStatus, addEarning } = useDriverStore()
  const [navInfo, setNavInfo] = useState<NavigationInfo>({
    distance: 0,
    duration: 0,
    eta: ''
  })
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (!currentOrder || currentOrder.id !== orderId) {
      navigate('/')
      return
    }

    setNavInfo({
      distance: currentOrder.distance,
      duration: currentOrder.duration,
      eta: calculateETA(currentOrder.duration)
    })
  }, [currentOrder, orderId, navigate])

  useEffect(() => {
    const interval = setInterval(() => {
      setNavInfo(prev => ({
        ...prev,
        distance: Math.max(0, prev.distance - 100),
        duration: Math.max(0, prev.duration - 5)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const calculateETA = (minutes: number): string => {
    const now = new Date()
    const arrival = new Date(now.getTime() + minutes * 60 * 1000)
    return arrival.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDistance = (km: number): string => {
    if (km >= 1) return `${km.toFixed(1)} 公里`
    return `${Math.round(km * 1000)} 米`
  }

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60)
      const m = Math.round(minutes % 60)
      return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
    }
    return `${Math.round(minutes)} 分钟`
  }

  const handleBack = () => {
    navigate(`/order/${orderId}`)
  }

  const handleComplete = async () => {
    if (!currentOrder) return
    updateOrderStatus('completed')
    addEarning(currentOrder.price)
    navigate(`/order/${orderId}`)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleOpenExternalNav = () => {
    if (!currentOrder) return
    const { lat, lng } = currentOrder.destination
    const navUrl = `https://uri.amap.com/navigation?to=${lng},${lat},destination&mode=car&policy=1&src=didi-driver`
    window.electronAPI?.openNavigation(navUrl)
  }

  if (!currentOrder) {
    return null
  }

  const destination = currentOrder.status === 'in_progress'
    ? currentOrder.destination
    : currentOrder.pickup

  return (
    <div className="navigation-container">
      {/* 地图 */}
      <div className="map-wrapper">
        <MapView
          center={location || { lat: 29.306, lng: 120.075 }}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
        >
          {location && (
            <MapRoute
              origin={location}
              destination={destination}
              color="#7AC9A8"
            />
          )}
        </MapView>
      </div>

      {/* 顶部栏 */}
      <div className="nav-top-bar">
        <button className="nav-back-btn" onClick={handleBack}>
          ← 返回
        </button>
        <div className="nav-title">
          {currentOrder.status === 'in_progress' ? '前往目的地' : '前往上车点'}
        </div>
        <button className="mute-btn" onClick={toggleMute}>
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* 目的地卡片 */}
      <div className="destination-card">
        <div className="destination-marker">
          {currentOrder.status === 'in_progress' ? '🎯' : '📍'}
        </div>
        <div className="destination-info">
          <span className="destination-label">
            {currentOrder.status === 'in_progress' ? '目的地' : '上车点'}
          </span>
          <span className="destination-address">{destination.address}</span>
        </div>
      </div>

      {/* 导航信息 */}
      <div className="nav-info-panel">
        <div className="nav-stats">
          <div className="nav-stat primary">
            <span className="stat-value">{formatDistance(navInfo.distance)}</span>
            <span className="stat-label">剩余距离</span>
          </div>
          <div className="nav-stat">
            <span className="stat-value">{formatDuration(navInfo.duration)}</span>
            <span className="stat-label">预计时间</span>
          </div>
          <div className="nav-stat">
            <span className="stat-value">{navInfo.eta}</span>
            <span className="stat-label">到达时间</span>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="nav-bottom-actions">
        <button className="external-nav-btn" onClick={handleOpenExternalNav}>
          <span>🗺️</span>
          <span>高德导航</span>
        </button>

        {currentOrder.status === 'in_progress' && (
          <button className="complete-btn" onClick={handleComplete}>
            完成行程
          </button>
        )}

        <div className="contact-btn-group">
          <button className="contact-action-btn call">📞</button>
          <button className="contact-action-btn message">💬</button>
        </div>
      </div>

      {/* 速度和路况 */}
      <div className="traffic-info">
        <div className="speed-indicator">
          <span className="speed-value">45</span>
          <span className="speed-unit">km/h</span>
        </div>
        <div className="traffic-status">
          <span className="traffic-light green"></span>
          <span className="traffic-text">路况畅通</span>
        </div>
      </div>
    </div>
  )
}

export default Navigation
