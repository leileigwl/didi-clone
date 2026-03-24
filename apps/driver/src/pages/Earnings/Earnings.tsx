import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import './Earnings.css'

type TimeFilter = 'today' | 'week' | 'month'

const FILTER_LABELS: Record<TimeFilter, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '等待接单',
  accepted: '已接单',
  driver_arriving: '赶往中',
  arrived: '已到达',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消',
}

const Earnings: React.FC = () => {
  const navigate = useNavigate()
  const { earnings, orderHistory } = useDriverStore()
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('today')

  const getFilteredEarnings = () => {
    switch (activeFilter) {
      case 'today': return earnings.today
      case 'week': return earnings.week
      case 'month': return earnings.month
      default: return earnings.today
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
        case 'today': return orderDate >= today
        case 'week': return orderDate >= weekAgo
        case 'month': return orderDate >= monthAgo
        default: return true
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
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="earnings-container">
      {/* 头部 */}
      <div className="earnings-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ←
        </button>
        <h1>收入</h1>
        <div className="header-spacer"></div>
      </div>

      {/* 时间筛选 */}
      <div className="time-filter">
        {(['today', 'week', 'month'] as TimeFilter[]).map(filter => (
          <button
            key={filter}
            className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter)}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      {/* 收入汇总 */}
      <div className="earnings-summary">
        <div className="summary-card">
          <div className="summary-label">总收入</div>
          <div className="summary-amount">
            <span className="currency">¥</span>
            <span className="amount">{filteredEarnings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 数据统计 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-value">{stats.trips}</div>
          <div className="stat-label">单数</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-value">{stats.hours.toFixed(1)}h</div>
          <div className="stat-label">在线时长</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">¥{stats.avgPerTrip.toFixed(0)}</div>
          <div className="stat-label">平均单价</div>
        </div>
      </div>

      {/* 行程历史 */}
      <div className="order-history-section">
        <h2>行程记录</h2>
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>暂无行程记录</p>
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
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 提示 */}
      {orderHistory.length === 0 && (
        <div className="demo-notice">
          <p>连接后端后可查看真实数据</p>
        </div>
      )}
    </div>
  )
}

export default Earnings
