import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import StatusBar from '../../components/StatusBar/StatusBar'
import OrderCard from '../../components/OrderCard/OrderCard'
import './Home.css'

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

  return (
    <div className="home-container">
      <StatusBar />

      {/* Online/Offline Toggle */}
      <div className="online-toggle-section">
        <button
          className={`online-toggle-btn ${isOnline ? 'online' : 'offline'}`}
          onClick={handleOnlineToggle}
        >
          <div className="toggle-indicator">
            <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
          </div>
          <span className="toggle-text">
            {isOnline ? 'Online - Accepting Orders' : 'Offline - Not Accepting Orders'}
          </span>
        </button>
      </div>

      {/* Current Order */}
      {currentOrder && (
        <div className="current-order-section">
          <h2>Current Order</h2>
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
            <button className="view-order-btn">View Details</button>
          </div>
        </div>
      )}

      {/* Pending Orders */}
      {!currentOrder && pendingOrders.length > 0 && (
        <div className="pending-orders-section">
          <h2>New Orders ({pendingOrders.length})</h2>
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

      {/* Waiting for Orders */}
      {!currentOrder && pendingOrders.length === 0 && isOnline && (
        <div className="waiting-section">
          <div className="waiting-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            <span className="waiting-icon">🚗</span>
          </div>
          <p className="waiting-text">Waiting for orders...</p>
        </div>
      )}

      {/* Offline Message */}
      {!isOnline && (
        <div className="offline-message">
          <span className="offline-icon">💤</span>
          <p>You are currently offline</p>
          <p className="offline-hint">Go online to start receiving orders</p>
        </div>
      )}

      {/* Today's Earnings */}
      <div className="earnings-section">
        <h2>Today's Earnings</h2>
        <div className="earnings-card" onClick={() => navigate('/earnings')}>
          <div className="earnings-amount">
            <span className="currency">¥</span>
            <span className="amount">{earnings.today.toFixed(2)}</span>
          </div>
          <div className="earnings-stats">
            <div className="stat">
              <span className="stat-value">{earnings.totalTrips}</span>
              <span className="stat-label">Trips</span>
            </div>
            <div className="stat">
              <span className="stat-value">{earnings.totalHours.toFixed(1)}h</span>
              <span className="stat-label">Online</span>
            </div>
          </div>
          <div className="view-earnings-btn">
            <span>View Details</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
