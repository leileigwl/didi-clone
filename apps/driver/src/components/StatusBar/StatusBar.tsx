import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import './StatusBar.css'

const StatusBar: React.FC = () => {
  const navigate = useNavigate()
  const { isOnline, currentOrder, earnings, pendingOrders } = useDriverStore()

  const handleEarningsClick = () => {
    navigate('/earnings')
  }

  return (
    <div className="status-bar">
      {/* Online Status */}
      <div className="status-item">
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
        </div>
        <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
      </div>

      {/* Current Order Count */}
      <div className="status-item">
        <span className="status-icon">📋</span>
        <span className="status-value">
          {currentOrder ? 1 : 0}
          {pendingOrders.length > 0 && `+${pendingOrders.length}`}
        </span>
        <span className="status-label">Orders</span>
      </div>

      {/* Today's Earnings */}
      <div className="status-item earnings" onClick={handleEarningsClick}>
        <span className="status-icon">💰</span>
        <div className="earnings-info">
          <span className="earnings-value">¥{earnings.today.toFixed(2)}</span>
          <span className="earnings-label">Today</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="status-actions">
        <button
          className="quick-action-btn"
          onClick={() => window.electronAPI?.minimize()}
          title="Minimize"
        >
          −
        </button>
        <button
          className="quick-action-btn"
          onClick={() => window.electronAPI?.maximize()}
          title="Maximize"
        >
          □
        </button>
      </div>
    </div>
  )
}

export default StatusBar
