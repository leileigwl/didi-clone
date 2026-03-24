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
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${meters} m`
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} min`
  }

  return (
    <div className="order-card">
      {/* Countdown Timer */}
      {countdown !== undefined && (
        <div className="countdown-bar">
          <div
            className="countdown-progress"
            style={{ width: `${(countdown / 30) * 100}%` }}
          />
        </div>
      )}

      {/* Order Header */}
      <div className="order-card-header">
        <div className="order-price-info">
          <span className="order-price">¥{order.price.toFixed(2)}</span>
          <span className="order-distance">{formatDistance(order.distance)}</span>
        </div>
        <div className="order-time-info">
          <span className="order-duration">{formatDuration(order.duration)}</span>
          <span className="order-label">est. trip</span>
        </div>
      </div>

      {/* Route Info */}
      <div className="order-route-info">
        <div className="route-point">
          <div className="point-marker pickup"></div>
          <div className="point-details">
            <span className="point-label">Pickup</span>
            <span className="point-address">{order.pickup.address}</span>
          </div>
        </div>
        <div className="route-line"></div>
        <div className="route-point">
          <div className="point-marker destination"></div>
          <div className="point-details">
            <span className="point-label">Destination</span>
            <span className="point-address">{order.destination.address}</span>
          </div>
        </div>
      </div>

      {/* Trip Details */}
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
          <span>¥{order.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="order-actions">
        <button className="reject-btn" onClick={onReject}>
          Reject
        </button>
        <button className="accept-btn" onClick={onAccept}>
          Accept
        </button>
      </div>
    </div>
  )
}

export default OrderCard
