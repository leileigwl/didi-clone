import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDriverStore } from './store/driverStore'
import { useSocket, useLocation } from './hooks'
import Home from './pages/Home'
import OrderDetail from './pages/Order'
import Navigation from './pages/Navigation'
import Earnings from './pages/Earnings'
import './App.css'

const App: React.FC = () => {
  const { isOnline, setOnline, currentOrder, pendingOrders } = useDriverStore()
  const { startTracking } = useLocation()
  useSocket()

  // Start location tracking when online
  useEffect(() => {
    let cleanup: (() => void) | undefined

    if (isOnline) {
      cleanup = startTracking()
    }

    return () => {
      cleanup?.()
    }
  }, [isOnline, startTracking])

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
