import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { OrderStatus } from '@didi/api-client'
import { useSocket } from '../../hooks/useSocket'
import './OrderDetail.css'

const STATUS_LABELS: Record<string, string> = {
  accepted: '已接单',
  arrived: '已到达上车点',
  passenger_confirmed: '乘客已上车',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消',
}

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { currentOrder, updateOrderStatus, addEarning, setCurrentOrder } = useDriverStore()
  const { emitOrderCancelled, emitOrderStatus } = useSocket()
  const [isLoading, setIsLoading] = useState(false)
  const [cancelledByPassenger, setCancelledByPassenger] = useState(false)

  useEffect(() => {
    if (!currentOrder || currentOrder.id !== orderId) {
      navigate('/')
    }
  }, [currentOrder, orderId, navigate])

  // 监听订单被乘客取消
  useEffect(() => {
    if (currentOrder?.status === 'cancelled') {
      setCancelledByPassenger(true)
      // 2秒后返回首页
      const timer = setTimeout(() => {
        setCurrentOrder(null)
        navigate('/')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentOrder?.status, setCurrentOrder, navigate])

  // 如果当前订单被清空（订单不存在），返回首页
  useEffect(() => {
    if (!currentOrder && !cancelledByPassenger) {
      const timer = setTimeout(() => {
        navigate('/')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [currentOrder, cancelledByPassenger, navigate])

  if (!currentOrder) {
    return (
      <div className="order-detail-container">
        <div className="order-loading-state">
          <div className="loading-icon">⏳</div>
          <div className="loading-text">订单已取消或不存在</div>
          <div className="loading-hint">正在返回首页...</div>
        </div>
      </div>
    )
  }

  // 被取消的订单显示
  if (cancelledByPassenger || currentOrder.status === 'cancelled') {
    return (
      <div className="order-detail-container">
        <div className="order-header">
          <button className="back-btn" onClick={() => navigate('/')}>
            ←
          </button>
          <h1>订单已取消</h1>
        </div>
        <div className="cancelled-section">
          <div className="cancelled-icon">❌</div>
          <h2>乘客已取消订单</h2>
          <p className="cancelled-hint">订单已被乘客取消，即将返回首页...</p>
        </div>
      </div>
    )
  }

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsLoading(true)
    updateOrderStatus(newStatus)
    emitOrderStatus(currentOrder.id, newStatus)

    // If order completed, add earnings and return to home immediately
    if (newStatus === 'completed') {
      addEarning(currentOrder.price)
      setIsLoading(false)
      setCurrentOrder(null)
      navigate('/')
      return
    }

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
          text: '已到达上车点',
          nextStatus: 'arrived' as OrderStatus,
          color: '#52C41A'
        }
      case 'arrived':
        return {
          text: '等待乘客上车...',
          nextStatus: null,
          color: '#999',
          disabled: true
        }
      case 'passenger_confirmed':
        return {
          text: '开始行程',
          nextStatus: 'in_progress' as OrderStatus,
          color: '#52C41A'
        }
      case 'in_progress':
        return {
          text: '完成订单',
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

  const steps = ['accepted', 'arrived', 'passenger_confirmed', 'in_progress', 'completed']
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
            onClick={() => buttonConfig.nextStatus && handleStatusChange(buttonConfig.nextStatus)}
            disabled={isLoading || buttonConfig.disabled}
          >
            {isLoading ? '处理中...' : buttonConfig.text}
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
