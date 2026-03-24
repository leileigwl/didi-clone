import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { OrderStatus } from '@didi/api-client'
import './OrderDetail.css'

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
    // Open Amap navigation
    const { lat, lng } = currentOrder.pickup
    const destLat = currentOrder.destination.lat
    const destLng = currentOrder.destination.lng

    // Amap navigation URL
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
          text: 'I am Arriving',
          nextStatus: 'driver_arriving' as OrderStatus,
          color: '#E8A45C'
        }
      case 'driver_arriving':
        return {
          text: 'I have Arrived',
          nextStatus: 'arrived' as OrderStatus,
          color: '#7AC9A8'
        }
      case 'arrived':
        return {
          text: 'Start Trip',
          nextStatus: 'in_progress' as OrderStatus,
          color: '#7AC9A8'
        }
      case 'in_progress':
        return {
          text: 'Complete Trip',
          nextStatus: 'completed' as OrderStatus,
          color: '#7AC9A8'
        }
      default:
        return null
    }
  }

  const buttonConfig = getButtonConfig()

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${meters} m`
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes} min`
  }

  return (
    <div className="order-detail-container">
      {/* Header */}
      <div className="order-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>Order Details</h1>
        <div className="order-id">#{orderId?.slice(-6)}</div>
      </div>

      {/* Status Progress */}
      <div className="status-progress">
        {['accepted', 'driver_arriving', 'arrived', 'in_progress', 'completed'].map((status, index) => (
          <div
            key={status}
            className={`progress-step ${
              ['accepted', 'driver_arriving', 'arrived', 'in_progress', 'completed'].indexOf(currentOrder.status) >= index
                ? 'active'
                : ''
            } ${currentOrder.status === status ? 'current' : ''}`}
          >
            <div className="step-dot"></div>
            <div className="step-label">
              {status === 'accepted' && 'Accepted'}
              {status === 'driver_arriving' && 'Arriving'}
              {status === 'arrived' && 'Arrived'}
              {status === 'in_progress' && 'In Trip'}
              {status === 'completed' && 'Completed'}
            </div>
          </div>
        ))}
      </div>

      {/* Order Info Card */}
      <div className="order-info-card">
        {/* Route */}
        <div className="route-section">
          <div className="route-point pickup">
            <div className="point-marker pickup-marker"></div>
            <div className="point-info">
              <span className="point-label">Pickup</span>
              <span className="point-address">{currentOrder.pickup.address}</span>
            </div>
          </div>
          <div className="route-line"></div>
          <div className="route-point destination">
            <div className="point-marker destination-marker"></div>
            <div className="point-info">
              <span className="point-label">Destination</span>
              <span className="point-address">{currentOrder.destination.address}</span>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="trip-details">
          <div className="detail-item">
            <span className="detail-icon">📏</span>
            <span className="detail-value">{formatDistance(currentOrder.distance)}</span>
            <span className="detail-label">Distance</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">⏱️</span>
            <span className="detail-value">{formatDuration(currentOrder.duration)}</span>
            <span className="detail-label">Duration</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">💰</span>
            <span className="detail-value">¥{currentOrder.price.toFixed(2)}</span>
            <span className="detail-label">Earnings</span>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="navigation-section">
        <button className="nav-btn secondary" onClick={handleNavigate}>
          <span className="nav-icon">🗺️</span>
          <span>Open in Amap</span>
        </button>
        <button className="nav-btn primary" onClick={handleStartNavigation}>
          <span className="nav-icon">🧭</span>
          <span>In-App Navigation</span>
        </button>
      </div>

      {/* Contact Section */}
      <div className="contact-section">
        <h3>Passenger</h3>
        <div className="contact-card">
          <div className="contact-avatar">👤</div>
          <div className="contact-info">
            <span className="contact-name">Passenger #{currentOrder.userId.slice(-4)}</span>
          </div>
          <div className="contact-actions">
            <button className="contact-btn call">📞</button>
            <button className="contact-btn message">💬</button>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {buttonConfig && currentOrder.status !== 'completed' && (
        <div className="action-section">
          <button
            className="action-btn"
            style={{ backgroundColor: buttonConfig.color }}
            onClick={() => handleStatusChange(buttonConfig.nextStatus)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : buttonConfig.text}
          </button>
        </div>
      )}

      {/* Completed State */}
      {currentOrder.status === 'completed' && (
        <div className="completed-section">
          <div className="completed-icon">✅</div>
          <h2>Trip Completed!</h2>
          <p className="completed-earnings">You earned ¥{currentOrder.price.toFixed(2)}</p>
          <button className="home-btn" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderDetail
