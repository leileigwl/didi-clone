import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { useDriverStore } from './store/driverStore'
import { useSocket, useLocation } from './hooks'
import Home from './pages/Home'
import OrderDetail from './pages/Order'
import Navigation from './pages/Navigation'
import Earnings from './pages/Earnings'
import Login from './pages/Login'
import './App.css'

const api = new APIClient('http://localhost:3000')

const App: React.FC = () => {
  const { driver, setDriver, setToken, isOnline, setOnline, currentOrder, pendingOrders } = useDriverStore()
  const { startTracking } = useLocation()
  useSocket()
  const [initialized, setInitialized] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  // 更新时间显示
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 自动登录检查
  useEffect(() => {
    const token = localStorage.getItem('driver_token')
    if (token) {
      api.setToken(token)
      api.getDriverInfo().then(res => {
        if (res.code === 0 && res.data) {
          setDriver(res.data)
          setToken(token)
        } else {
          localStorage.removeItem('driver_token')
        }
        setInitialized(true)
      }).catch(() => {
        localStorage.removeItem('driver_token')
        setInitialized(true)
      })
    } else {
      setInitialized(true)
    }
  }, [setDriver, setToken])

  // Start location tracking when online
  useEffect(() => {
    let cleanup: (() => void) | undefined

    if (isOnline && driver) {
      cleanup = startTracking()
    }

    return () => {
      cleanup?.()
    }
  }, [isOnline, startTracking, driver])

  // Update electron tray with order count
  useEffect(() => {
    const orderCount = currentOrder ? 1 : 0 + pendingOrders.length
    window.electronAPI?.setOrderCount(orderCount)
  }, [currentOrder, pendingOrders])

  // Listen for tray toggle online event
  useEffect(() => {
    const unsubscribe = window.electronAPI?.onTrayClick(() => {
      setOnline(!isOnline)
    })

    return () => {
      unsubscribe?.()
    }
  }, [isOnline, setOnline])

  // 加载中
  if (!initialized) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-logo">🚕</div>
          <div className="loading-text">加载中...</div>
        </div>
      </div>
    )
  }

  // 未登录显示登录页
  if (!driver) {
    return (
      <div className="app">
        <Login api={api} onLoginSuccess={() => {}} />
      </div>
    )
  }

  // 已登录显示主应用
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/order/:orderId" element={<OrderDetail />} />
          <Route path="/navigation/:orderId" element={<Navigation />} />
          <Route path="/earnings" element={<Earnings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App