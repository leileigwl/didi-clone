import { useNavigate } from 'react-router-dom'
import { usePassengerStore } from '../store/passengerStore'
import './OrdersPage.css'

export default function OrdersPage() {
  const navigate = useNavigate()
  const { orderHistory } = usePassengerStore()

  const statusLabels: Record<string, string> = {
    pending: '等待接单',
    accepted: '已接单',
    driver_arriving: '司机赶来',
    arrived: '已到达',
    passenger_confirmed: '已上车',
    in_progress: '行程中',
    completed: '已完成',
    cancelled: '已取消'
  }

  const statusColors: Record<string, string> = {
    pending: '#FAAD14',
    accepted: '#1890FF',
    driver_arriving: '#1890FF',
    arrived: '#1890FF',
    passenger_confirmed: '#52C41A',
    in_progress: '#52C41A',
    completed: '#52C41A',
    cancelled: '#FF4D4F'
  }

  return (
    <div className="orders-page">
      <div className="orders-header">
        <h2>我的订单</h2>
      </div>

      {orderHistory.length === 0 ? (
        <div className="empty-orders">
          <span className="empty-icon">📋</span>
          <p>暂无订单记录</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            去叫车
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orderHistory.map(order => (
            <div
              key={order.id}
              className="order-card"
              onClick={() => navigate(`/order/${order.id}`)}
            >
              <div className="order-header">
                <span
                  className="order-status-badge"
                  style={{ background: statusColors[order.status] + '20', color: statusColors[order.status] }}
                >
                  {statusLabels[order.status] || order.status}
                </span>
                <span className="order-price">¥{order.price}</span>
              </div>

              <div className="order-route">
                <div className="route-point">
                  <span className="route-icon">📍</span>
                  <span className="route-text">{order.pickup.address}</span>
                </div>
                <div className="route-arrow">↓</div>
                <div className="route-point">
                  <span className="route-icon">🎯</span>
                  <span className="route-text">{order.destination.address}</span>
                </div>
              </div>

              <div className="order-footer">
                <span className="order-time">
                  {new Date(order.createdAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <span className="order-distance">{order.distance}公里</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}