import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { APIClient, Order, Driver } from '@didi/api-client'
import { usePassengerStore } from './store/passengerStore'

const api = new APIClient('http://localhost:3000')

// 页面组件
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  const location = useLocation()
  const { user, setUser } = usePassengerStore()
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null)

  // 自动登录
  useEffect(() => {
    const autoLogin = async () => {
      const token = localStorage.getItem('passenger_token')
      if (token && !user) {
        api.setToken(token)
        try {
          const res = await api.getCurrentUser()
          if (res.code === 0 && res.data) {
            setUser(res.data)
          } else {
            // token 无效，重新登录
            await loginWithTestPhone()
          }
        } catch (e) {
          await loginWithTestPhone()
        }
      } else if (!token) {
        // 没有 token，自动使用测试手机号登录
        await loginWithTestPhone()
      }
    }

    const loginWithTestPhone = async () => {
      try {
        // 1. 发送验证码
        await api.sendVerificationCode('13800138000')
        // 2. 验证码登录 (开发环境固定验证码 123456)
        const res = await api.verifyCode('13800138000', '123456')
        if (res.code === 0 && res.data.token) {
          localStorage.setItem('passenger_token', res.data.token)
          // verifyCode 已经自动设置了 token，但为了保险再设置一次
          api.setToken(res.data.token)
          setUser(res.data.user)
          console.log('自动登录成功:', res.data.user, 'token:', res.data.token.substring(0, 20) + '...')
        }
      } catch (e) {
        console.error('自动登录失败:', e)
      }
    }

    autoLogin()
  }, [])

  return (
    <div className="app">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="status-left">
          <span className="app-logo">🚕</span>
          <span className="app-title">滴滴出行</span>
        </div>
        <div className="status-right">
          <span className="time">{new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 主内容区 */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage api={api} />} />
          <Route path="/order/:id" element={<OrderPage api={api} />} />
          <Route path="/profile" element={<ProfilePage api={api} />} />
        </Routes>
      </main>

      {/* 底部导航 */}
      <nav className="bottom-nav">
        <Link to="/" className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">首页</span>
        </Link>
        <Link to="/orders" className={`nav-item ${location.pathname.startsWith('/order') ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">订单</span>
        </Link>
        <Link to="/profile" className={`nav-item ${location.pathname === '/profile' ? 'active' : ''}`}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">我的</span>
        </Link>
      </nav>
    </div>
  )
}

export default App
