import { useNavigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { usePassengerStore } from '../store/passengerStore'

interface ProfilePageProps {
  api: APIClient
}

export default function ProfilePage({ api }: ProfilePageProps) {
  const navigate = useNavigate()
  const { user, orderHistory, logout } = usePassengerStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-logo">🚕</div>
        <div className="login-title">滴滴出行</div>
        <div className="login-subtitle">安全出行，值得信赖</div>
        <button
          className="btn btn-primary btn-block"
          onClick={async () => {
            await api.sendVerificationCode('13900138000')
            const res = await api.verifyCode('13900138000', '123456')
            if (res.code === 0 && res.data) {
              localStorage.setItem('passenger_token', res.data.token)
              window.location.reload()
            }
          }}
        >
          手机号快速登录
        </button>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          测试账号: 13900138000 · 验证码: 123456
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      {/* 用户信息 */}
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 12px'
        }}>
          👤
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          {user.name || '滴滴用户'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          {user.phone}
        </div>
      </div>

      {/* 订单统计 */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>订单统计</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--primary)' }}>
              {orderHistory.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>总订单</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--success)' }}>
              {orderHistory.filter(o => o.status === 'completed').length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>已完成</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--error)' }}>
              {orderHistory.filter(o => o.status === 'cancelled').length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>已取消</div>
          </div>
        </div>
      </div>

      {/* 历史订单 */}
      {orderHistory.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 12 }}>最近订单</div>
          {orderHistory.slice(0, 5).map(order => (
            <div
              key={order.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)'
              }}
            >
              <div>
                <div style={{ fontSize: 14, marginBottom: 2 }}>
                  {order.pickup.address} → {order.destination.address}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>¥{order.price}</div>
                <div className={`order-status ${order.status}`} style={{ padding: '2px 8px', fontSize: 11 }}>
                  {order.status === 'completed' ? '已完成' : '已取消'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 菜单选项 */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 12 }}>更多功能</div>
        {[
          { icon: '💳', label: '支付管理', action: () => {} },
          { icon: '🎫', label: '优惠券', action: () => {} },
          { icon: '⭐', label: '收藏地点', action: () => {} },
          { icon: '📞', label: '客服中心', action: () => {} },
          { icon: '⚙️', label: '设置', action: () => {} },
        ].map(item => (
          <div
            key={item.label}
            onClick={item.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>›</span>
          </div>
        ))}
      </div>

      {/* 退出登录 */}
      <button
        className="btn btn-block"
        style={{ background: '#fff2f0', color: 'var(--error)', marginTop: 12 }}
        onClick={handleLogout}
      >
        退出登录
      </button>
    </div>
  )
}
