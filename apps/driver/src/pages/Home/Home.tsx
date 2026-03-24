import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { useSocket } from '../../hooks/useSocket'
import { MapView, MapMarker, MapRoute, type Position, type RouteInfo } from '@didi/ui'
import OrderCard from '../../components/OrderCard/OrderCard'
import './Home.css'

// 高德地图 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

const STATUS_LABELS: Record<string, string> = {
  pending: '等待接单',
  accepted: '已接单',
  driver_arriving: '赶往上车点',
  arrived: '已到达',
  in_progress: '行程中',
  completed: '已完成',
  cancelled: '已取消',
}

const Home: React.FC = () => {
  const navigate = useNavigate()
  const {
    isOnline,
    setOnline,
    currentOrder,
    pendingOrders,
    earnings,
    acceptOrder,
    rejectOrder,
    setCurrentOrder
  } = useDriverStore()

  const { emitDriverOnline, emitLocation, acceptOrder: socketAcceptOrder, emitOrderCancelled } = useSocket()

  // 时间显示
  const [currentTime, setCurrentTime] = useState(new Date())

  // 义乌市中心坐标作为默认位置
  const DEFAULT_YIWU: Position = { lng: 120.075, lat: 29.306 }
  const [driverLocation, setDriverLocation] = useState<Position>(DEFAULT_YIWU)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [locationDenied, setLocationDenied] = useState(false)
  const [currentAddress, setCurrentAddress] = useState('定位中...')
  const [showLocationPicker, setShowLocationPicker] = useState(false) // 虚拟定位面板
  const mapRef = useRef<{ map: any; AMap: any } | null>(null)

  // 更新时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 预设测试位置名称（坐标通过高德API动态获取）
  const presetLocationNames = [
    '义乌市中心',
    '义乌站',
    '国际商贸城',
    '福田市场',
    '绣湖广场',
  ]

  const [presetLocations, setPresetLocations] = useState<Array<{ name: string; lng: number; lat: number }>>([])
  const placeSearchRef = useRef<any>(null)

  const handleOnlineToggle = async () => {
    const newStatus = !isOnline
    setOnline(newStatus)
    await window.electronAPI?.setOnline(newStatus)

    if (newStatus && driverLocation) {
      // 注册到服务器并开始上报位置
      console.log('司机上线，位置:', driverLocation)
      // 延迟一点确保 socket 已连接
      setTimeout(() => {
        emitDriverOnline(driverLocation.lat, driverLocation.lng)
      }, 500)
    }
  }

  // 虚拟定位 - 选择预设位置
  const handleSelectPresetLocation = (loc: typeof presetLocations[0]) => {
    const newPos = { lng: loc.lng, lat: loc.lat }
    setDriverLocation(newPos)
    setCurrentAddress(loc.name)
    setShowLocationPicker(false)
    if (mapRef.current) {
      mapRef.current.map.setCenter([loc.lng, loc.lat])
      mapRef.current.map.setZoom(16)
    }
    // 如果在线，更新服务器位置
    if (isOnline) {
      emitDriverOnline(loc.lat, loc.lng)
    }
  }

  // 点击地图选择位置
  const handleMapClick = useCallback((pos: Position) => {
    if (showLocationPicker) {
      setDriverLocation(pos)
      setCurrentAddress(`自定义位置 (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`)
      setShowLocationPicker(false)
      if (isOnline) {
        emitDriverOnline(pos.lat, pos.lng)
      }
    }
  }, [showLocationPicker, isOnline, emitDriverOnline])

  const handleAcceptOrder = (orderId: string) => {
    socketAcceptOrder(orderId)
    acceptOrder(orderId)
    navigate(`/order/${orderId}`)
  }

  const handleRejectOrder = (orderId: string) => {
    rejectOrder(orderId)
  }

  // 司机取消当前订单
  const handleCancelOrder = () => {
    if (currentOrder) {
      emitOrderCancelled(currentOrder.id)
      setCurrentOrder(null)
      console.log('司机取消订单:', currentOrder.id)
    }
  }

  const handleViewCurrentOrder = () => {
    if (currentOrder) {
      navigate(`/order/${currentOrder.id}`)
    }
  }

  // 打开系统定位设置，然后重试定位
  const handleOpenLocationSettings = async () => {
    if (window.electronAPI?.openLocationSettings) {
      await window.electronAPI.openLocationSettings()
    }
    // 等待用户开启权限后重试
    setTimeout(() => {
      if (mapRef.current) {
        const { map, AMap } = mapRef.current
        if (window.electronAPI?.getNativeLocation) {
          window.electronAPI.getNativeLocation().then((result: any) => {
            if ('lat' in result) {
              const { lat, lng } = result
              setDriverLocation({ lng, lat })
              setLocationDenied(false)
              map.setCenter([lng, lat])
              map.setZoom(18)
              reverseGeocode(lng, lat, AMap)
            }
          })
        }
      }
    }, 3000)
  }

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // 逆地理编码
  const reverseGeocode = useCallback((lng: number, lat: number, AMap: any) => {
    AMap.plugin(['AMap.Geocoder'], () => {
      const geocoder = new AMap.Geocoder()
      geocoder.getAddress([lng, lat], (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          setCurrentAddress(result.regeocode.formattedAddress)
        } else {
          setCurrentAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        }
      })
    })
  }, [])

  // 高德 IP 定位 - 使用 JS API 的 CitySearch
  const locateWithIPApi = useCallback((_AMap: any, map: any) => {
    _AMap.plugin(['AMap.CitySearch'], () => {
      const citySearch = new _AMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          const bounds = result.bounds
          if (bounds) {
            // CitySearch 返回地级市中心，但应用主要面向义乌
            // 金华市辖区较大，IP无法区分义乌/东阳/永康等，默认使用义乌
            if (result.city === '金华市') {
              setDriverLocation(DEFAULT_YIWU)
              setCurrentAddress('浙江省义乌市')
              if (map) {
                map.setCenter([DEFAULT_YIWU.lng, DEFAULT_YIWU.lat])
                map.setZoom(18)
              }
              console.log('IP定位: 金华市区域，默认使用义乌市中心', `(${DEFAULT_YIWU.lng}, ${DEFAULT_YIWU.lat})`)
            } else {
              const center = bounds.getCenter()
              const lng = center.getLng()
              const lat = center.getLat()
              setDriverLocation({ lng, lat })
              if (map) {
                map.setCenter([lng, lat])
              }
              setCurrentAddress(result.province + result.city)
              console.log('IP定位结果:', result.city, `(${lng.toFixed(4)}, ${lat.toFixed(4)})`)
            }
          }
        } else {
          console.warn('CitySearch定位失败，使用义乌默认位置')
          setDriverLocation(DEFAULT_YIWU)
          setCurrentAddress('浙江省义乌市')
        }
      })
    })
  }, [])

  // 使用高德插件定位
  const locateWithAmap = useCallback((AMap: any, map: any) => {
    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: false,     // Electron中不需要GPS
        timeout: 10000,
        zoomToAccuracy: false,
        GeoLocationFirst: false,       // 不优先HTML5定位
        noGeoLocation: 2,              // 禁用PC端浏览器定位（Electron中会超时）
        noIpLocate: 0,                 // 启用高精度IP定位
        extensions: 'all',             // 返回完整信息（含格式化地址）
      })

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          const lng = result.position.getLng()
          const lat = result.position.getLat()
          setDriverLocation({ lng, lat })
          setLocationDenied(false)
          if (map) {
            map.setCenter([lng, lat])
          }
          // 优先使用Geolocation返回的地址，避免额外逆地理编码请求
          if (result.formattedAddress) {
            setCurrentAddress(result.formattedAddress)
          } else {
            reverseGeocode(lng, lat, AMap)
          }
          console.log('定位成功:', result.formattedAddress, `(${lng.toFixed(4)}, ${lat.toFixed(4)})`, 'type:', result.location_type)
          if (map) updateRangeCircle(lng, lat, AMap, map)
        } else {
          console.warn('高德定位失败，使用CitySearch作为后备:', status)
          locateWithIPApi(AMap, map)
        }
      })

      // 如果在线，持续追踪位置
      if (isOnline && map) {
        map.addControl(geolocation)
        geolocation.watchPosition()
      }
    })
  }, [isOnline, reverseGeocode, locateWithIPApi])

  const circleRef = useRef<any>(null)

  // 添加/更新5km范围圈
  const updateRangeCircle = useCallback((lng: number, lat: number, AMap: any, map: any) => {
    if (circleRef.current) {
      map.remove(circleRef.current)
    }
    circleRef.current = new AMap.Circle({
      center: [lng, lat],
      radius: 5000, // 5km
      strokeColor: '#FF6B00',
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: '#FF6B00',
      fillOpacity: 0.05,
      strokeStyle: 'dashed',
    })
    map.add(circleRef.current)
  }, [])

  // 地图加载完成后定位
  const handleMapReady = useCallback((map: any, AMap: any) => {
    mapRef.current = { map, AMap }

    // 初始化 PlaceSearch 插件用于获取预设地点坐标
    AMap.plugin(['AMap.PlaceSearch'], () => {
      placeSearchRef.current = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 1,
      })
      console.log('[PlaceSearch] 插件初始化成功')

      // 获取预设地点坐标
      const fetchPresetLocations = async () => {
        const results: Array<{ name: string; lng: number; lat: number }> = []

        for (const name of presetLocationNames) {
          try {
            const result = await new Promise<any>((resolve) => {
              placeSearchRef.current.search(name, (status: string, res: any) => {
                resolve({ status, res })
              })
            })

            if (result.status === 'complete' && result.res.poiList?.pois?.length > 0) {
              const poi = result.res.poiList.pois[0]
              results.push({
                name,
                lat: poi.location.getLat(),
                lng: poi.location.getLng()
              })
              console.log(`[预设地点] ${name}: (${poi.location.getLng().toFixed(4)}, ${poi.location.getLat().toFixed(4)})`)
            }
          } catch (e) {
            console.warn(`[预设地点] ${name} 查询失败:`, e)
          }
        }

        if (results.length > 0) {
          setPresetLocations(results)
        }
      }

      fetchPresetLocations()
    })

    // 策略1: 使用 macOS CoreLocation 获取真实精确位置
    const tryCoreLocation = async (): Promise<boolean> => {
      if (!window.electronAPI?.getNativeLocation) return false
      try {
        const result = await window.electronAPI.getNativeLocation()
        if ('lat' in result && 'lng' in result) {
          const { lat, lng, accuracy } = result
          console.log('CoreLocation定位成功:', `(${lng.toFixed(4)}, ${lat.toFixed(4)})`, `精度: ${accuracy.toFixed(0)}m`)
          setDriverLocation({ lng, lat })
          setLocationDenied(false)
          map.setCenter([lng, lat])
          map.setZoom(18)
          updateRangeCircle(lng, lat, AMap, map)
          reverseGeocode(lng, lat, AMap)
          return true
        } else if (result.error === 'denied') {
          console.warn('CoreLocation权限被拒绝，需要在系统设置中开启')
          setLocationDenied(true)
        } else {
          console.warn('CoreLocation不可用:', result.error)
        }
      } catch (e) {
        console.warn('CoreLocation调用失败:', e)
      }
      return false
    }

    // 策略2: 使用 HTML5 navigator.geolocation（localhost 是安全上下文）
    const tryHTML5Geo = (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(false); return }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords
            console.log('HTML5定位成功:', `(${lng.toFixed(4)}, ${lat.toFixed(4)})`, `精度: ${accuracy.toFixed(0)}m`)
            setDriverLocation({ lng, lat })
            setLocationDenied(false)
            map.setCenter([lng, lat])
            map.setZoom(18)
            updateRangeCircle(lng, lat, AMap, map)
            reverseGeocode(lng, lat, AMap)
            resolve(true)
          },
          (err) => {
            console.warn('HTML5定位失败:', err.message, `(code: ${err.code})`)
            resolve(false)
          },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        )
      })
    }

    // 依次尝试：CoreLocation → HTML5 → AMap CitySearch
    tryCoreLocation()
      .then((ok) => { if (!ok) return tryHTML5Geo() })
      .then((ok) => { if (!ok) locateWithAmap(AMap, map) })
  }, [locateWithAmap, reverseGeocode])

  // 位置变化时上报给服务器 + 更新范围圈
  useEffect(() => {
    if (isOnline && driverLocation && driverLocation.lat !== DEFAULT_YIWU.lat) {
      emitLocation(driverLocation.lat, driverLocation.lng)
    }
    // 更新范围圈
    if (mapRef.current && driverLocation && driverLocation.lat !== DEFAULT_YIWU.lat) {
      updateRangeCircle(driverLocation.lng, driverLocation.lat, mapRef.current.AMap, mapRef.current.map)
    }
  }, [driverLocation, isOnline, emitLocation, updateRangeCircle])

  // 请求macOS定位权限
  useEffect(() => {
    if (window.electronAPI?.requestLocationPermission) {
      window.electronAPI.requestLocationPermission().then((result: any) => {
        console.log('Location permission:', result)
        if (result.status === 'denied') {
          setLocationDenied(true)
        }
      })
    }
  }, [])

  // 检查地图配置
  if (!AMAP_KEY || AMAP_KEY === 'your_amap_web_key_here') {
    return (
      <div className="home-container">
        <div className="map-error">
          <h3>地图配置缺失</h3>
          <p>请在 apps/driver/.env 文件中配置高德地图 API Key</p>
        </div>
      </div>
    )
  }

  return (
    <div className="home-container">
      {/* 顶部状态栏 */}
      <div className="driver-status-bar">
        <div className="status-left">
          <span className="app-logo">🚕</span>
          <span className="app-title">滴滴出行司机版</span>
        </div>
        <div className="status-right">
          <span className="time">{currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* 地图区域 */}
      <div className="map-section">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={driverLocation}
          zoom={16}
          theme="normal"
          enableClick={showLocationPicker}
          onMapClick={handleMapClick}
          onMapReady={handleMapReady}
        >
          {/* 司机位置 - 📍图标 */}
          {driverLocation && (
            <MapMarker
              position={driverLocation}
              type="myLocation"
              label="我的位置"
            />
          )}

          {/* 当前订单 - 显示乘客位置和路线 */}
          {currentOrder && driverLocation && (
            <>
              <MapMarker
                position={currentOrder.pickup}
                type="origin"
                label="乘客位置"
              />
              <MapMarker
                position={currentOrder.destination}
                type="destination"
                label="目的地"
              />
              <MapRoute
                origin={driverLocation}
                destination={currentOrder.pickup}
                onRouteComplete={handleRouteComplete}
              />
            </>
          )}
        </MapView>

        {/* 在线状态切换 */}
        <div className="map-overlay">
          <button
            className={`online-toggle-btn ${isOnline ? 'online' : 'offline'}`}
            onClick={handleOnlineToggle}
          >
            <span className={`status-dot ${isOnline ? 'online' : ''}`}></span>
            <span>{isOnline ? '在线接单' : '离线休息'}</span>
          </button>
        </div>

        {/* 虚拟定位按钮 (测试用) */}
        <button
          className="virtual-location-btn"
          onClick={() => setShowLocationPicker(!showLocationPicker)}
        >
          📍
        </button>

        {/* 虚拟定位选择面板 */}
        {showLocationPicker && (
          <div className="location-picker-panel">
            <div className="location-picker-header">
              <span>选择测试位置</span>
              <button onClick={() => setShowLocationPicker(false)}>✕</button>
            </div>
            <div className="location-picker-list">
              {presetLocations.map(loc => (
                <button
                  key={loc.name}
                  className={`location-picker-item ${driverLocation.lng === loc.lng && driverLocation.lat === loc.lat ? 'active' : ''}`}
                  onClick={() => handleSelectPresetLocation(loc)}
                >
                  <span className="loc-icon">📍</span>
                  <span className="loc-name">{loc.name}</span>
                </button>
              ))}
            </div>
            <p className="location-picker-hint">点击选择或点击地图自定义</p>
          </div>
        )}

        {/* 回到我的位置按钮 */}
        <button
          className="locate-me-btn"
          onClick={() => {
            if (mapRef.current && driverLocation) {
              mapRef.current.map.setCenter([driverLocation.lng, driverLocation.lat])
              mapRef.current.map.setZoom(18)
            }
          }}
        >
          📍
        </button>

        {/* 司机位置信息 */}
        <div className="location-info-bar">
          <span className="location-icon">📍</span>
          <span>当前位置: {currentAddress}</span>
          {routeInfo && (
            <span className="distance-info">
              距乘客 {Math.round(routeInfo.distance / 1000 * 10) / 10} 公里
            </span>
          )}
        </div>

        {/* 定位权限被拒绝提示 */}
        {locationDenied && (
          <div className="location-denied-banner">
            <span className="warning-icon">⚠️</span>
            <span>定位权限被拒绝，无法获取精确位置</span>
            <button onClick={handleOpenLocationSettings} className="open-settings-btn">
              打开设置
            </button>
          </div>
        )}
      </div>

      {/* 当前订单 */}
      {currentOrder && (
        <div className="current-order-section">
          <h2>进行中订单</h2>
          <div className="current-order-card" onClick={handleViewCurrentOrder}>
            <div className="order-route">
              <div className="route-point pickup">
                <span className="route-icon">📍</span>
                <span className="route-text">{currentOrder.pickup.address}</span>
              </div>
              <div className="route-arrow">→</div>
              <div className="route-point destination">
                <span className="route-icon">🎯</span>
                <span className="route-text">{currentOrder.destination.address}</span>
              </div>
            </div>
            <div className="order-info">
              <span className="order-status">{STATUS_LABELS[currentOrder.status] || currentOrder.status}</span>
              <span className="order-price">¥{currentOrder.price}</span>
            </div>
            <div className="order-actions-row">
              <button className="view-order-btn" onClick={(e) => { e.stopPropagation(); handleViewCurrentOrder(); }}>查看详情</button>
              <button className="cancel-order-btn" onClick={(e) => { e.stopPropagation(); handleCancelOrder(); }}>取消订单</button>
            </div>
          </div>
        </div>
      )}

      {/* 新订单 */}
      {!currentOrder && pendingOrders.length > 0 && (
        <div className="pending-orders-section">
          <h2>待接订单 <span className="order-count-badge">{pendingOrders.length}</span></h2>
          <div className="pending-orders-list">
            {pendingOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={() => handleAcceptOrder(order.id)}
                onReject={() => handleRejectOrder(order.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 等待订单 */}
      {!currentOrder && pendingOrders.length === 0 && isOnline && (
        <div className="waiting-section">
          <div className="waiting-animation">
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
            <span className="waiting-icon">🚗</span>
          </div>
          <p className="waiting-text">正在等待订单...</p>
          {routeInfo && (
            <p className="route-hint">
              距离最近乘客约 {Math.round(routeInfo.distance / 1000 * 10) / 10} 公里
            </p>
          )}
        </div>
      )}

      {/* 离线提示 */}
      {!isOnline && !currentOrder && (
        <div className="offline-message">
          <span className="offline-icon">💤</span>
          <p>当前处于离线状态</p>
          <p className="offline-hint">上线后开始接收订单</p>
        </div>
      )}

      {/* 今日收入 */}
      <div className="earnings-section">
        <h2>今日收入</h2>
        <div className="earnings-card" onClick={() => navigate('/earnings')}>
          <div className="earnings-amount">
            <span className="currency">¥</span>
            <span className="amount">{earnings.today.toFixed(2)}</span>
          </div>
          <div className="earnings-stats">
            <div className="stat">
              <span className="stat-value">{earnings.totalTrips}</span>
              <span className="stat-label">单数</span>
            </div>
            <div className="stat">
              <span className="stat-value">{earnings.totalHours.toFixed(1)}h</span>
              <span className="stat-label">在线</span>
            </div>
          </div>
          <div className="view-earnings-btn">
            <span>查看详情</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home