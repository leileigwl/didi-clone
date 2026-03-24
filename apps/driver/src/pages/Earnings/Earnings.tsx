import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore, OrderHistory } from '../../store/driverStore'
import './Earnings.css'

type TimeFilter = 'today' | 'week' | 'month'

const Earnings: React.FC = () => {
  const navigate = useNavigate()
  const { earnings, orderHistory } = useDriverStore()
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today')

  const getFilteredEarnings = () => {
    switch (activeFilter) {
      case 'today':
        return earnings.today
      case 'week':
        return earnings.week
      case 'month':
        return earnings.month
      default:
        return earnings.today
    }
  }

  const getFilteredOrders = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    return orderHistory.filter(order => {
      const orderDate = new Date(order.date)
      switch (activeFilter) {
        case 'today':
          return orderDate >= today
        case 'week':
          return orderDate >= weekAgo
        case 'month':
          return orderDate >= monthAgo
        default:
          return true
      }
    })
  }

  const filteredOrders = getFilteredOrders()
  const filteredEarnings = getFilteredEarnings()

  const stats = {
    trips: activeFilter === 'today' ? earnings.totalTrips : filteredOrders.length,
    hours: earnings.totalHours,
    avgPerTrip: filteredOrders.length > 0
      ? filteredOrders.reduce((sum, o) => sum + o.price, 0) / filteredOrders.length
      : 0
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="earnings-container">
      {/* Header */}
      <div className="earnings-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>Earnings</h1>
        <div className="header-spacer"></div>
      </div>

      {/* Time Filter */}
      <div className="time-filter">
        {(['today', 'week', 'month'] as TimeFilter[]).map(filter => (
          <button
            key={filter}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter === 'today' && 'Today'}
            {filter === 'week' && 'This Week'}
            {filter === 'month' && 'This Month'}
          </button>
        ))}
      </div>

      {/* Earnings Summary */}
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="summary-label">Total Earnings</div>
          <div className="summary-amount">
            <span className="currency">¥</span>
            <span className="amount">{filteredEarnings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-value">{stats.trips}</div>
          <div className="stat-label">Trips</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{stats.hours.toFixed(1)}h</div>
          <div className="stat-label">Online</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">¥{stats.avgPerTrip.toFixed(0)}</div>
          <div className="stat-label">Avg/Trip</div>
        </div>
      </div>

      {/* Order History */}
      <div className="order-history-section">
        <h2>Trip History</h2>
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No trips for this period</p>
          </div>
        ) : (
          <div className="order-list">
            {filteredOrders.map(order => (
              <div key={order.id} className="order-item">
                <div className="order-item-header">
                  <span className="order-date">{formatDate(order.date)}</span>
                  <span className="order-earnings">+¥{order.price.toFixed(2)}</span>
                </div>
                <div className="order-route">
                  <span className="route-from">{order.pickup}</span>
                  <span className="route-arrow">→</span>
                  <span className="route-to">{order.destination}</span>
                </div>
                <div className="order-item-footer">
                  <span className={`order-status ${order.status}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demo Data Notice */}
      {orderHistory.length === 0 && (
        <div className="demo-notice">
          <p>This is a demo. Connect to the backend to see real data.</p>
        </div>
      )}
    </div>
  )
}

export default Earnings
