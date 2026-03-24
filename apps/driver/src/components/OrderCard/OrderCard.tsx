import React from 'react'
import { Order } from '@didi/api-client'
import './OrderCard.css'

interface OrderCardProps {
  order: Order
  onAccept: () => void
  onReject: () => void
  countdown?: number
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onAccept,
  onReject,
  countdown
}) => {
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

  const driverDist = order.distanceFromDriver
  const driverTime = order.durationFromDriver

  return (
    <div className="order-card">
      {/* 倒计时条 */}
      {countdown !== undefined && (
        <div className="countdown-bar">
          <div
            className="countdown-progress"
            style={{ width: `${(countdown / 30) * 100}%` }}
          />
        </div>
      )}

      {/* 头部：价格 + 距离 */}
      <div className="order-card-header">
        <div className="order-price-info">
          <span className="order-price">¥{order.price.toFixed(0)}</span>
          <span className="order-distance">行程 {formatDistance(order.distance)}</span>
        </div>
        <div className="order-time-info">
          <span className="order-duration">{formatDuration(order.duration)}</span>
          <span className="order-label">预计行程</span>
        </div>
      </div>

      {/* 司机距乘客距离（醒目显示） */}
      {driverDist !== undefined && driverDist > 0 && (
        <div className="driver-distance-badge">
          <span className="dd-icon">📍</span>
          <span>距你 <strong>{formatDistance(driverDist)}</strong></span>
          {driverTime !== undefined && driverTime > 0 && (
            <span className="dd-sep">·</span>
          )}
          {driverTime !== undefined && driverTime > 0 && (
            <span>约 {formatDuration(driverTime)}</span>
          )}
        </div>
      )}

      {/* 路线信息 */}
      <div className="order-route-info">
        <div className="route-point">
          <div className="point-marker pickup"></div>
          <div className="point-details">
            <span className="point-label">上车点</span>
            <span className="point-address">{order.pickup.address}</span>
          </div>
        </div>
        <div className="route-line"></div>
        <div className="route-point">
          <div className="point-marker destination"></div>
          <div className="point-details">
            <span className="point-label">目的地</span>
            <span className="point-address">{order.destination.address}</span>
          </div>
        </div>
      </div>

      {/* 行程详情 */}
      <div className="trip-details-row">
        <div className="detail-badge">
          <span className="badge-icon">📏</span>
          <span>{formatDistance(order.distance)}</span>
        </div>
        <div className="detail-badge">
          <span className="badge-icon">⏱️</span>
          <span>{formatDuration(order.duration)}</span>
        </div>
        <div className="detail-badge earnings">
          <span className="badge-icon">💰</span>
          <span>预估 ¥{order.price.toFixed(0)}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="order-actions">
        <button className="reject-btn" onClick={onReject}>
          忽略
        </button>
        <button className="accept-btn" onClick={onAccept}>
          抢单
        </button>
      </div>
    </div>
  )
}

export default OrderCard
