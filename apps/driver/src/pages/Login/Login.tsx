import React, { useState } from 'react'
import { APIClient } from '@didi/api-client'
import { useDriverStore } from '../../store/driverStore'
import './Login.css'

interface LoginProps {
  api: APIClient
  onLoginSuccess: () => void
}

const Login: React.FC<LoginProps> = ({ api, onLoginSuccess }) => {
  const { setDriver, setToken } = useDriverStore()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!phone || !password) {
      setError('请输入手机号和密码')
      return
    }

    setLoading(true)

    try {
      const response = await api.driverLogin(phone, password)

      if (response.code === 0 && response.data) {
        const { driver, token } = response.data
        localStorage.setItem('driver_token', token)
        setDriver(driver)
        setToken(token)
        onLoginSuccess()
      } else {
        setError(response.message || '登录失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🚕</span>
          <h1>滴滴出行司机版</h1>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="phone">手机号</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              maxLength={11}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="login-hint">
          <p>测试账号：</p>
          <ul>
            <li><code>13800138001</code> - 张师傅</li>
            <li><code>13800138002</code> - 李师傅</li>
            <li><code>13800138003</code> - 王师傅</li>
            <li><code>13800138004</code> - 刘师傅</li>
            <li><code>13800138005</code> - 陈师傅</li>
          </ul>
          <p>密码：<code>123456</code></p>
        </div>
      </div>
    </div>
  )
}

export default Login