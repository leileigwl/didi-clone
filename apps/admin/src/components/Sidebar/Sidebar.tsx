import React from 'react'
import { NavLink } from 'react-router-dom'
import './Sidebar.css'

interface MenuItem {
  path: string
  icon: string
  label: string
}

const menuItems: MenuItem[] = [
  { path: '/', icon: '📊', label: '仪表盘' },
  { path: '/orders', icon: '📋', label: '订单管理' },
  { path: '/drivers', icon: '🚗', label: '司机管理' },
  { path: '/map', icon: '🗺️', label: '地图视图' },
  { path: '/settings', icon: '⚙️', label: '系统设置' }
]

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🚖</span>
          <span className="logo-text">滴滴管理后台</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">👤</div>
          <div className="user-details">
            <span className="user-name">管理员</span>
            <span className="user-role">超级管理员</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
