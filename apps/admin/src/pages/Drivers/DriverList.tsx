import React, { useEffect, useState } from 'react'
import { Driver } from '@didi/api-client'
import { useAdminStore } from '../../store/adminStore'
import './DriverList.css'

interface DriverWithStats extends Driver {
  todayOrders?: number
  todayRevenue?: number
  banned?: boolean
}

const DriverList: React.FC = () => {
  const { drivers, fetchDrivers, loading } = useAdminStore()
  const [sortBy, setSortBy] = useState<'rating' | 'revenue'>('revenue')
  const [filterOnline, setFilterOnline] = useState<boolean | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<DriverWithStats | null>(null)

  useEffect(() => {
    fetchDrivers()
  }, [fetchDrivers])

  // Add mock stats to drivers
  const driversWithStats: DriverWithStats[] = drivers.map(driver => ({
    ...driver,
    todayOrders: Math.floor(Math.random() * 15) + 5,
    todayRevenue: Math.floor(Math.random() * 500) + 200,
    banned: false
  }))

  const sortedDrivers = [...driversWithStats].sort((a, b) => {
    if (sortBy === 'rating') {
      return b.rating - a.rating
    }
    return (b.todayRevenue || 0) - (a.todayRevenue || 0)
  })

  const filteredDrivers = sortedDrivers.filter(driver => {
    if (filterOnline === null) return true
    return filterOnline ? driver.distance !== undefined : driver.distance === undefined
  })

  const handleToggleBan = (driverId: string, currentStatus: boolean) => {
    // In real app, this would call API
    console.log(`Toggle ban for driver ${driverId}: ${!currentStatus}`)
  }

  return (
    <div className="driver-list">
      <header className="page-header">
        <div>
          <h1>司机管理</h1>
          <p className="subtitle">共 {drivers.length} 名司机</p>
        </div>
      </header>

      {/* Controls */}
      <div className="controls-bar">
        <div className="sort-group">
          <label>排序方式</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
            <option value="revenue">今日收入</option>
            <option value="rating">评分</option>
          </select>
        </div>

        <div className="filter-group">
          <label>在线状态</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filterOnline === null ? 'active' : ''}`}
              onClick={() => setFilterOnline(null)}
            >
              全部
            </button>
            <button
              className={`filter-btn ${filterOnline === true ? 'active' : ''}`}
              onClick={() => setFilterOnline(true)}
            >
              在线
            </button>
            <button
              className={`filter-btn ${filterOnline === false ? 'active' : ''}`}
              onClick={() => setFilterOnline(false)}
            >
              离线
            </button>
          </div>
        </div>
      </div>

      {/* Driver Cards */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载司机数据...</p>
        </div>
      ) : (
        <div className="drivers-grid">
          {filteredDrivers.map((driver, index) => (
            <div
              key={driver.id}
              className={`driver-card ${driver.banned ? 'banned' : ''}`}
              onClick={() => setSelectedDriver(driver)}
            >
              <div className="card-header">
                <div className="rank">#{index + 1}</div>
                <div className={`status-indicator ${driver.distance ? 'online' : 'offline'}`}>
                  {driver.distance ? '在线' : '离线'}
                </div>
              </div>

              <div className="driver-avatar">
                {driver.name.charAt(0)}
              </div>

              <div className="driver-info">
                <h3 className="driver-name">{driver.name}</h3>
                <p className="driver-phone">{driver.phone}</p>
              </div>

              <div className="stats-row">
                <div className="stat">
                  <span className="stat-value">⭐ {driver.rating}</span>
                  <span className="stat-label">评分</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{driver.todayOrders}</span>
                  <span className="stat-label">今日订单</span>
                </div>
                <div className="stat">
                  <span className="stat-value">¥{driver.todayRevenue}</span>
                  <span className="stat-label">今日收入</span>
                </div>
              </div>

              <div className="car-info">
                <span className="car-model">{driver.carModel}</span>
                <span className="car-plate">{driver.carPlate}</span>
              </div>

              {driver.banned && (
                <div className="banned-badge">已封禁</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Driver Detail Modal */}
      {selectedDriver && (
        <div className="modal-overlay" onClick={() => setSelectedDriver(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>司机详情</h2>
              <button className="close-btn" onClick={() => setSelectedDriver(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="driver-detail-header">
                <div className="detail-avatar">
                  {selectedDriver.name.charAt(0)}
                </div>
                <div>
                  <h3>{selectedDriver.name}</h3>
                  <p>{selectedDriver.phone}</p>
                </div>
                <div className={`status-badge ${selectedDriver.distance ? 'online' : 'offline'}`}>
                  {selectedDriver.distance ? '在线' : '离线'}
                </div>
              </div>

              <div className="detail-section">
                <h4>基本信息</h4>
                <div className="detail-row">
                  <span className="detail-label">车型</span>
                  <span className="detail-value">{selectedDriver.carModel}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">车牌</span>
                  <span className="detail-value">{selectedDriver.carPlate}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">评分</span>
                  <span className="detail-value">⭐ {selectedDriver.rating}</span>
                </div>
              </div>

              <div className="detail-section">
                <h4>今日数据</h4>
                <div className="detail-row">
                  <span className="detail-label">完成订单</span>
                  <span className="detail-value">{selectedDriver.todayOrders} 单</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">今日收入</span>
                  <span className="detail-value price">¥{selectedDriver.todayRevenue}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className={`action-btn ${selectedDriver.banned ? 'unban' : 'ban'}`}
                  onClick={() => handleToggleBan(selectedDriver.id, selectedDriver.banned || false)}
                >
                  {selectedDriver.banned ? '解封司机' : '封禁司机'}
                </button>
                <button className="action-btn contact">
                  联系司机
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverList
