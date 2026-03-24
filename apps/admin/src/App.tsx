import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useAdminStore } from './store/adminStore'
import Sidebar from './components/Sidebar/Sidebar'
import Dashboard from './pages/Dashboard/Dashboard'
import OrderList from './pages/Orders/OrderList'
import DriverList from './pages/Drivers/DriverList'
import MapView from './pages/Map/MapView'
import Settings from './pages/Settings/Settings'
import './App.css'

const App: React.FC = () => {
  const { theme } = useAdminStore()

  return (
    <div className={`app ${theme}`}>
      <BrowserRouter>
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/drivers" element={<DriverList />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </BrowserRouter>
    </div>
  )
}

export default App
