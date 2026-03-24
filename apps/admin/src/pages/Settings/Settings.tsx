import React, { useState } from 'react'
import { useAdminStore } from '../../store/adminStore'
import './Settings.css'

interface PricingRule {
  id: string
  name: string
  basePrice: number
  pricePerKm: number
  pricePerMin: number
  minPrice: number
  enabled: boolean
}

interface Region {
  id: string
  name: string
  center: { lat: number; lng: number }
  radius: number
  active: boolean
}

const Settings: React.FC = () => {
  const { theme, toggleTheme } = useAdminStore()
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([
    {
      id: '1',
      name: '快车',
      basePrice: 12,
      pricePerKm: 2.5,
      pricePerMin: 0.5,
      minPrice: 10,
      enabled: true
    },
    {
      id: '2',
      name: '优享',
      basePrice: 15,
      pricePerKm: 3.0,
      pricePerMin: 0.6,
      minPrice: 15,
      enabled: true
    },
    {
      id: '3',
      name: '专车',
      basePrice: 20,
      pricePerKm: 4.0,
      pricePerMin: 0.8,
      minPrice: 20,
      enabled: false
    }
  ])

  const [regions, setRegions] = useState<Region[]>([
    { id: '1', name: '北京市区', center: { lat: 39.9042, lng: 116.4074 }, radius: 20, active: true },
    { id: '2', name: '朝阳区', center: { lat: 39.9219, lng: 116.4431 }, radius: 10, active: true },
    { id: '3', name: '海淀区', center: { lat: 39.9561, lng: 116.3103 }, radius: 10, active: true }
  ])

  const [systemConfig, setSystemConfig] = useState({
    maxWaitTime: 5,
    driverTimeout: 30,
    orderTimeout: 60,
    cancellationFee: 5,
    serviceFee: 0.1
  })

  const handlePricingChange = (id: string, field: keyof PricingRule, value: number | boolean) => {
    setPricingRules(rules =>
      rules.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    )
  }

  const handleRegionToggle = (id: string) => {
    setRegions(regions =>
      regions.map(region =>
        region.id === id ? { ...region, active: !region.active } : region
      )
    )
  }

  const handleConfigChange = (field: keyof typeof systemConfig, value: number) => {
    setSystemConfig(config => ({ ...config, [field]: value }))
  }

  const handleSave = () => {
    // In real app, this would save to backend
    alert('设置已保存!')
  }

  return (
    <div className="settings">
      <header className="page-header">
        <div>
          <h1>系统设置</h1>
          <p className="subtitle">管理平台配置和参数</p>
        </div>
        <button className="save-btn" onClick={handleSave}>
          保存设置
        </button>
      </header>

      <div className="settings-grid">
        {/* Theme Settings */}
        <section className="settings-card">
          <h3>外观设置</h3>
          <div className="setting-item">
            <div className="setting-info">
              <span className="setting-label">主题模式</span>
              <span className="setting-desc">切换浅色/深色主题</span>
            </div>
            <div className="theme-toggle" onClick={toggleTheme}>
              <div className={`toggle-slider ${theme}`}>
                <span className="toggle-icon">{theme === 'light' ? '☀️' : '🌙'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Settings */}
        <section className="settings-card">
          <h3>价格设置</h3>
          <div className="pricing-rules">
            {pricingRules.map(rule => (
              <div key={rule.id} className={`pricing-rule ${rule.enabled ? '' : 'disabled'}`}>
                <div className="rule-header">
                  <span className="rule-name">{rule.name}</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={e => handlePricingChange(rule.id, 'enabled', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="rule-fields">
                  <div className="field">
                    <label>起步价</label>
                    <input
                      type="number"
                      value={rule.basePrice}
                      onChange={e => handlePricingChange(rule.id, 'basePrice', Number(e.target.value))}
                      disabled={!rule.enabled}
                    />
                  </div>
                  <div className="field">
                    <label>每公里</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.pricePerKm}
                      onChange={e => handlePricingChange(rule.id, 'pricePerKm', Number(e.target.value))}
                      disabled={!rule.enabled}
                    />
                  </div>
                  <div className="field">
                    <label>每分钟</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.pricePerMin}
                      onChange={e => handlePricingChange(rule.id, 'pricePerMin', Number(e.target.value))}
                      disabled={!rule.enabled}
                    />
                  </div>
                  <div className="field">
                    <label>最低价</label>
                    <input
                      type="number"
                      value={rule.minPrice}
                      onChange={e => handlePricingChange(rule.id, 'minPrice', Number(e.target.value))}
                      disabled={!rule.enabled}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Region Settings */}
        <section className="settings-card">
          <h3>区域管理</h3>
          <div className="regions-list">
            {regions.map(region => (
              <div key={region.id} className="region-item">
                <div className="region-info">
                  <span className="region-name">{region.name}</span>
                  <span className="region-detail">
                    半径: {region.radius}km
                  </span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={region.active}
                    onChange={() => handleRegionToggle(region.id)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            ))}
          </div>
          <button className="add-region-btn">+ 添加区域</button>
        </section>

        {/* System Config */}
        <section className="settings-card">
          <h3>系统参数</h3>
          <div className="config-list">
            <div className="config-item">
              <div className="config-info">
                <span className="config-label">最大等待时间</span>
                <span className="config-unit">分钟</span>
              </div>
              <input
                type="number"
                value={systemConfig.maxWaitTime}
                onChange={e => handleConfigChange('maxWaitTime', Number(e.target.value))}
              />
            </div>
            <div className="config-item">
              <div className="config-info">
                <span className="config-label">司机接单超时</span>
                <span className="config-unit">秒</span>
              </div>
              <input
                type="number"
                value={systemConfig.driverTimeout}
                onChange={e => handleConfigChange('driverTimeout', Number(e.target.value))}
              />
            </div>
            <div className="config-item">
              <div className="config-info">
                <span className="config-label">订单超时</span>
                <span className="config-unit">分钟</span>
              </div>
              <input
                type="number"
                value={systemConfig.orderTimeout}
                onChange={e => handleConfigChange('orderTimeout', Number(e.target.value))}
              />
            </div>
            <div className="config-item">
              <div className="config-info">
                <span className="config-label">取消费用</span>
                <span className="config-unit">元</span>
              </div>
              <input
                type="number"
                value={systemConfig.cancellationFee}
                onChange={e => handleConfigChange('cancellationFee', Number(e.target.value))}
              />
            </div>
            <div className="config-item">
              <div className="config-info">
                <span className="config-label">服务费比例</span>
                <span className="config-unit">%</span>
              </div>
              <input
                type="number"
                step="0.01"
                value={systemConfig.serviceFee * 100}
                onChange={e => handleConfigChange('serviceFee', Number(e.target.value) / 100)}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Settings
