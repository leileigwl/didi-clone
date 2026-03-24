import React from 'react'
import './StatsCard.css'

interface StatsCardProps {
  title: string
  value: string | number
  icon: string
  trend?: {
    value: number
    isUp: boolean
  }
  subtitle?: string
  onClick?: () => void
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick
}) => {
  return (
    <div
      className={`stats-card ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="stats-card-header">
        <span className="stats-icon">{icon}</span>
        <span className="stats-title">{title}</span>
      </div>

      <div className="stats-card-body">
        <div className="stats-value">{value}</div>
        {trend && (
          <div className={`stats-trend ${trend.isUp ? 'up' : 'down'}`}>
            <span className="trend-arrow">{trend.isUp ? '↑' : '↓'}</span>
            <span className="trend-value">{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div className="stats-card-footer">
          <span className="stats-subtitle">{subtitle}</span>
        </div>
      )}
    </div>
  )
}

export default StatsCard
