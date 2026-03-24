import React, { useEffect, useState } from 'react'
import { Order, OrderStatus } from '@didi/api-client'
import { useAdminStore, OrderFilters } from '../../store/adminStore'
import OrderTable from '../../components/OrderTable/OrderTable'
import './OrderList.css'

const statusOptions: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待接单' },
  { value: 'accepted', label: '已接单' },
  { value: 'driver_arriving', label: '司机赶往' },
  { value: 'arrived', label: '已到达' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

const OrderList: React.FC = () => {
  const { orders, fetchOrders, updateOrderStatus, loading } = useAdminStore()
  const [filters, setFilters] = useState<OrderFilters>({})
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    fetchOrders(newFilters)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, keyword: e.target.value }))
  }

  const handleSearchSubmit = () => {
    fetchOrders(filters)
  }

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status)
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setShowModal(true)
  }

  const exportCSV = () => {
    const headers = ['订单号', '上车地点', '目的地', '金额', '距离', '状态', '创建时间']
    const rows = orders.map(order => [
      order.id,
      order.pickup.address,
      order.destination.address,
      order.price,
      order.distance,
      order.status,
      order.createdAt
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="order-list">
      <header className="page-header">
        <div>
          <h1>订单管理</h1>
          <p className="subtitle">共 {orders.length} 条订单记录</p>
        </div>
        <button className="export-btn" onClick={exportCSV}>
          导出 CSV
        </button>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>状态筛选</label>
          <select
            value={filters.status || ''}
            onChange={e => handleFilterChange('status', e.target.value)}
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group search-group">
          <label>搜索</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="订单号、地点..."
              value={filters.keyword || ''}
              onChange={handleSearch}
              onKeyPress={e => e.key === 'Enter' && handleSearchSubmit()}
            />
            <button className="search-btn" onClick={handleSearchSubmit}>
              搜索
            </button>
          </div>
        </div>

        <div className="filter-group">
          <label>日期范围</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={e => handleFilterChange('startDate', e.target.value)}
          />
          <span className="date-separator">至</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={e => handleFilterChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载订单数据...</p>
        </div>
      ) : (
        <OrderTable
          orders={orders}
          onStatusChange={handleStatusChange}
          onViewDetails={handleViewDetails}
        />
      )}

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>订单详情</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">订单号</span>
                <span className="detail-value">{selectedOrder.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">状态</span>
                <span className="detail-value">{selectedOrder.status}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">上车地点</span>
                <span className="detail-value">{selectedOrder.pickup.address}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">目的地</span>
                <span className="detail-value">{selectedOrder.destination.address}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">金额</span>
                <span className="detail-value price">¥{selectedOrder.price}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">距离</span>
                <span className="detail-value">{selectedOrder.distance} km</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">预计时长</span>
                <span className="detail-value">{selectedOrder.duration} 分钟</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">创建时间</span>
                <span className="detail-value">
                  {new Date(selectedOrder.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              {selectedOrder.driver && (
                <div className="driver-info">
                  <h3>司机信息</h3>
                  <div className="detail-row">
                    <span className="detail-label">姓名</span>
                    <span className="detail-value">{selectedOrder.driver.name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">电话</span>
                    <span className="detail-value">{selectedOrder.driver.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">车型</span>
                    <span className="detail-value">{selectedOrder.driver.carModel}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">车牌</span>
                    <span className="detail-value">{selectedOrder.driver.carPlate}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderList
