import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { OrderStatus } from '@didi/api-client'
import './OrderDetail.css'

const STATUS_LABELS: Record<string, string> = {
  accepted: '已接单',
  driver_arriving: '赶往上车点',
  arrived: '已到达',
  in_progress: '行程中',
  completed: '已完成',
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { currentOrder, updateOrderStatus, addEarning } = useDriverStore()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!currentOrder || currentOrder.id !== orderId) {
      navigate('/')
    }
  }, [currentOrder, orderId, navigate])

  if (!currentOrder) {
    return null
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsLoading(true)
    updateOrderStatus(newStatus)

    // If order completed, add earnings
    if (newStatus === 'completed') {
      addEarning(currentOrder.price)
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoading(false)
  }

  const handleNavigate = () => {
    const { lat, lng } = currentOrder.pickup
    const destLat = currentOrder.destination.lat
    const destLng = currentOrder.destination.lng
    const navUrl = `https://uri.amap.com/navigation?from=${lng},${lat},start&to=${destLng},${destLat},end&mode=car&policy=1&src=didi-driver`
    window.electronAPI?.openNavigation(navUrl)
  }

  const handleStartNavigation = () => {
    navigate(`/navigation/${orderId}`)
  }

  const getButtonConfig = () => {
    switch (currentOrder.status) {
      case 'accepted':
        return {
          text: '我快到了',
          nextStatus: 'driver_arriving' as OrderStatus,
          color: '#FF6B00'
        }
      case 'driver_arriving':
        return {
          text: '已到达上车点',
          nextStatus: 'arrived' as OrderStatus,
          color: '#52C41A'
        }
      case 'arrived':
        return {
          text: '开始行程',
          nextStatus: 'in_progress' as OrderStatus,
          color: '#52C41A'
        }
      case 'in_progress':
        return {
          text: '完成行程',
          nextStatus: 'completed' as OrderStatus,
          color: '#52C41A'
        }
      default:
        return null
    }
  }

  const buttonConfig = getButtonConfig()

  const formatDistance = (km: number) => {
    if (km >= 1) return `${km.toFixed(1)} 公里`
    return `${Math.round(km * 1000)} 米`
  }

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60)
      const m = Math.round(minutes % 60)
      return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
    }
    return `${Math.round(minutes)} 分钟`
  }

  const steps = ['accepted', 'driver_arriving', 'arrived', 'in_progress', 'completed']
  const currentIndex = steps.indexOf(currentOrder.status)

  return (
    <div className="order-detail-container">
      {/* 头部 */}
      <div className="order-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>订单详情</h1>
        <div className="order-id">#{orderId?.slice(-6)}</div>
      </div>

      {/* 状态进度 */}
      <div className="status-progress">
        {steps.map((status, index) => (
          <div
            key={status}
            className={`progress-step ${
              currentIndex >= index ? 'active' : ''
            } ${currentOrder.status === status ? 'current' : ''}`}
          >
            <div className="step-dot"></div>
            <div className="step-label">
              {STATUS_LABELS[status] || status}
            </div>
          </div>
        ))}
      </div>

      {/* 订单信息卡片 */}
      <div className="order-info-card">
        {/* 路线 */}
        <div className="route-section">
          <div className="route-point pickup">
            <div className="point-marker pickup-marker"></div>
            <div className="point-info">
              <span className="point-label">上车点</span>
              <span className="point-address">{currentOrder.pickup.address}</span>
            </div>
          </div>
          <div className="route-line"></div>
          <div className="route-point destination">
            <div className="point-marker destination-marker"></div>
            <div className="point-info">
              <span className="point-label">目的地</span>
              <span className="point-address">{currentOrder.destination.address}</span>
            </div>
          </div>
        </div>

        {/* 行程详情 */}
        <div className="trip-details">
          <div className="detail-item">
            <span className="detail-icon">📏</span>
            <span className="detail-value">{formatDistance(currentOrder.distance)}</span>
            <span className="detail-label">距离</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">⏱️</span>
            <span className="detail-value">{formatDuration(currentOrder.duration)}</span>
            <span className="detail-label">时长</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <span className="detail-value">¥{currentOrder.price.toFixed(0)}</span>
            <span className="detail-label">收入</span>
          </div>
        </div>
      </div>

      {/* 导航按钮 */}
      <div className="navigation-section">
        <button className="nav-btn secondary" onClick={handleNavigate}>
          <span className="nav-icon">🗺️</span>
          <span>高德导航</span>
        </button>
        <button className="nav-btn primary" onClick={handleStartNavigation}>
          <span className="nav-icon">🧭</span>
          <span>应用内导航</span>
        </button>
      </div>

      {/* 乘客信息 */}
      <div className="contact-section">
        <h3>乘客信息</h3>
        <div className="contact-card">
          <div className="contact-avatar">👤</div>
          <div className="contact-info">
            <span className="contact-name">乘客 #{currentOrder.userId.slice(-4)}</span>
          </div>
          <div className="contact-actions">
            <button className="contact-btn call">📞</button>
            <button className="contact-btn message">💬</button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {buttonConfig && currentOrder.status !== 'completed' && (
        <div className="action-section">
          <button
            className="action-btn"
            style={{ backgroundColor: buttonConfig.color }}
            onClick={() => handleStatusChange(buttonConfig.nextStatus)}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : buttonConfig.text}
          </button>
        </div>
      )}

      {/* 完成状态 */}
      {currentOrder.status === 'completed' && (
        <div className="completed-section">
          <div className="completed-icon">✅</div>
          <h2>行程完成!</h2>
          <p className="completed-earnings">本单收入 ¥{currentOrder.price.toFixed(0)}</p>
          <button className="home-btn" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
