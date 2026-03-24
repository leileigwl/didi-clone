import React, { useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { useAdminStore } from '../../store/adminStore'
import StatsCard from '../../components/StatsCard/StatsCard'
import './Dashboard.css'

const Dashboard: React.FC = () => {
  const { stats, fetchStats, loading } = useAdminStore()

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading && !stats) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>加载数据中...</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>仪表盘</h1>
        <p className="subtitle">今日数据概览</p>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          title="今日订单"
          value={stats?.todayOrders || 0}
          icon="📋"
          trend={{ value: 12.5, isUp: true }}
          subtitle="较昨日"
        />
        <StatsCard
          title="活跃司机"
          value={stats?.activeDrivers || 0}
          icon="🚗"
          trend={{ value: 3.2, isUp: true }}
          subtitle="当前在线"
        />
        <StatsCard
          title="今日收入"
          value={`¥${(stats?.todayRevenue || 0).toLocaleString()}`}
          icon="💰"
          trend={{ value: 8.7, isUp: true }}
          subtitle="较昨日"
        />
        <StatsCard
          title="平均等待"
          value={`${stats?.avgWaitTime || 0}分钟`}
          icon="⏱️"
          trend={{ value: 5.1, isUp: false }}
          subtitle="较昨日缩短"
        />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-header">
            <h3>订单趋势</h3>
            <span className="chart-period">最近7天</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.orderTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                  name="订单数"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <h3>收入统计</h3>
            <span className="chart-period">最近7天</span>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats?.orderTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-color)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  name="收入(元)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Driver Distribution */}
      <div className="distribution-section">
        <div className="chart-card">
          <div className="chart-header">
            <h3>司机分布</h3>
            <span className="chart-period">按区域统计</span>
          </div>
          <div className="distribution-grid">
            {stats?.driverDistribution.map((area, index) => (
              <div key={index} className="distribution-item">
                <div className="area-name">{area.area}</div>
                <div className="area-count">
                  <span className="count-number">{area.count}</span>
                  <span className="count-label">名司机</span>
                </div>
                <div className="area-bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(area.count / 20) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
