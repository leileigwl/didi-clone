import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import './StatusBar.css'

const StatusBar: React.FC = () => {
  const navigate = useNavigate()
  const { earnings } = useDriverStore()

  const handleEarningsClick = () => {
    navigate('/earnings')
  }

  return (
    <div className="status-bar">
      {/* 今日收入 */}
      <div className="status-item earnings" onClick={handleEarningsClick}>
        <span className="status-icon">💰</span>
        <div className="earnings-info">
          <span className="earnings-value">¥{earnings.today.toFixed(2)}</span>
          <span className="earnings-label">今日收入</span>
        </div>
      </div>

      {/* 窗口控制按钮 */}
      <div className="status-actions">
        <button
          className="quick-action-btn"
          onClick={() => window.electronAPI?.minimize()}
          title="最小化"
        >
          −
        </button>
        <button
          className="quick-action-btn"
          onClick={() => window.electronAPI?.maximize()}
          title="最大化"
        >
          □
        </button>
      </div>
    </div>
  )
}

export default StatusBar
