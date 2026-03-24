import React, { useEffect, useState } from 'react'
import { Driver, Order, OrderStatus } from '@didi/api-client'
import { useAdminStore } from '../../store/adminStore'
import DriverMap from '../../components/DriverMap/DriverMap'
import './MapView.css'

const statusLabels: Record<OrderStatus, string> = {
  pending: '待接单',
  accepted: '已接单',
  driver_arriving: '司机赶往',
  arrived: '已到达',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
}

const MapView: React.FC = () => {
  const { drivers, orders, fetchDrivers, fetchOrders } = useAdminStore()
  const [activeTab, setActiveTab] = useState<'drivers' | 'orders'>('drivers')
  const [selectedItem, setSelectedItem] = useState<Driver | Order | null>(null)

  useEffect(() => {
    fetchDrivers()
    fetchOrders()
  }, [fetchDrivers, fetchOrders])

  // Filter orders that are in progress
  const activeOrders = orders.filter(
    order => ['accepted', 'driver_arriving', 'arrived', 'in_progress'].includes(order.status)
  )

  const handleDriverClick = (driver: Driver) => {
    setSelectedItem(driver)
    setActiveTab('drivers')
  }

  return (
    <div className="map-view">
      <header className="page-header">
        <div>
          <h1>地图视图</h1>
          <p className="subtitle">实时监控司机和订单位置</p>
        </div>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            司机位置
          </button>
          <button
            className={`toggle-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            进行中订单
          </button>
        </div>
      </header>

      <div className="map-container">
        <DriverMap
          drivers={activeTab === 'drivers' ? drivers : []}
          onDriverClick={handleDriverClick}
          showLabels={true}
        />

        {/* Side Panel */}
        <div className="side-panel">
          <div className="panel-header">
            <h3>
              {activeTab === 'drivers' ? '在线司机' : '进行中订单'}
            </h3>
            <span className="count-badge">
              {activeTab === 'drivers' ? drivers.length : activeOrders.length}
            </span>
          </div>

          <div className="panel-list">
            {activeTab === 'drivers' ? (
              drivers.map(driver => (
                <div
                  key={driver.id}
                  className={`list-item ${selectedItem?.id === driver.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(driver)}
                >
                  <div className="item-avatar">
                    {driver.name.charAt(0)}
                  </div>
                  <div className="item-info">
                    <span className="item-name">{driver.name}</span>
                    <span className="item-detail">{driver.carModel} · {driver.carPlate}</span>
                  </div>
                  <div className="item-status online">
                    在线
                  </div>
                </div>
              ))
            ) : (
              activeOrders.map(order => (
                <div
                  key={order.id}
                  className={`list-item ${selectedItem?.id === order.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(order)}
                >
                  <div className="item-avatar order">
                    O
                  </div>
                  <div className="item-info">
                    <span className="item-name">{order.id}</span>
                    <span className="item-detail">
                      {order.pickup.address.substring(0, 10)}...
                    </span>
                  </div>
                  <div className={`item-status ${order.status}`}>
                    {statusLabels[order.status]}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="item-details">
              <h4>详细信息</h4>
              {'name' in selectedItem ? (
                // It's a driver
                <>
                  <div className="detail-row">
                    <span className="label">姓名</span>
                    <span className="value">{selectedItem.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">电话</span>
                    <span className="value">{selectedItem.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">车型</span>
                    <span className="value">{selectedItem.carModel}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">评分</span>
                    <span className="value">⭐ {selectedItem.rating}</span>
                  </div>
                </>
              ) : (
                // It's an order
                <>
                  <div className="detail-row">
                    <span className="label">订单号</span>
                    <span className="value">{selectedItem.id}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">状态</span>
                    <span className="value">{statusLabels[selectedItem.status]}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">上车点</span>
                    <span className="value">{selectedItem.pickup.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">目的地</span>
                    <span className="value">{selectedItem.destination.address}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">金额</span>
                    <span className="value price">¥{selectedItem.price}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapView
