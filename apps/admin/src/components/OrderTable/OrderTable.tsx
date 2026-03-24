import React, { useState } from 'react'
import { Order, OrderStatus } from '@didi/api-client'
import './OrderTable.css'

interface OrderTableProps {
  orders: Order[]
  onStatusChange?: (orderId: string, status: OrderStatus) => void
  onViewDetails?: (order: Order) => void
}

const statusLabels: Record<OrderStatus, string> = {
  pending: '待接单',
  accepted: '已接单',
  driver_arriving: '司机赶往',
  arrived: '已到达',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消'
}

const statusColors: Record<OrderStatus, string> = {
  pending: 'warning',
  accepted: 'info',
  driver_arriving: 'info',
  arrived: 'info',
  in_progress: 'primary',
  completed: 'success',
  cancelled: 'danger'
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onStatusChange,
  onViewDetails
}) => {
  const [sortBy, setSortBy] = useState<'createdAt' | 'price' | 'distance'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const sortedOrders = [...orders].sort((a, b) => {
    let comparison = 0
    if (sortBy === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else {
      comparison = a[sortBy] - b[sortBy]
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const totalPages = Math.ceil(sortedOrders.length / pageSize)
  const paginatedOrders = sortedOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="order-table-container">
      <table className="order-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>上车地点</th>
            <th>目的地</th>
            <th
              className="sortable"
              onClick={() => handleSort('price')}
            >
              金额
              {sortBy === 'price' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th
              className="sortable"
              onClick={() => handleSort('distance')}
            >
              距离
              {sortBy === 'distance' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th>状态</th>
            <th
              className="sortable"
              onClick={() => handleSort('createdAt')}
            >
              创建时间
              {sortBy === 'createdAt' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {paginatedOrders.map(order => (
            <tr key={order.id}>
              <td className="order-id">{order.id}</td>
              <td className="address-cell" title={order.pickup.address}>
                {order.pickup.address}
              </td>
              <td className="address-cell" title={order.destination.address}>
                {order.destination.address}
              </td>
              <td className="price-cell">¥{order.price}</td>
              <td>{order.distance}km</td>
              <td>
                <span className={`status-badge ${statusColors[order.status]}`}>
                  {statusLabels[order.status]}
                </span>
              </td>
              <td className="time-cell">{formatDate(order.createdAt)}</td>
              <td className="actions-cell">
                <button
                  className="action-btn view"
                  onClick={() => onViewDetails?.(order)}
                  title="查看详情"
                >
                  查看
                </button>
                {order.status === 'pending' && (
                  <button
                    className="action-btn cancel"
                    onClick={() => onStatusChange?.(order.id, 'cancelled')}
                    title="取消订单"
                  >
                    取消
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            上一页
          </button>
          <span className="page-info">
            {currentPage} / {totalPages}
          </span>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

export default OrderTable
