import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIClient } from '@didi/api-client'
import { usePassengerStore } from '../store/passengerStore'
import { MapView, MapMarker, MapRoute, type Position, type RouteInfo } from '@didi/ui'
import './HomePage.css'

interface HomePageProps {
  api: APIClient
}

// 高德地图 Key
const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '7bf10417175742fc23ec515c46599e8d'
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || '2d974a0b6b5a0df9c012c82a33684e15'

interface SearchResult {
  name: string
  address: string
  lng: number
  lat: number
}

export default function HomePage({ api }: HomePageProps) {
  const navigate = useNavigate()
  const {
    user,
    pickup,
    destination,
    setPickup,
    setDestination,
    currentOrder,
    setCurrentOrder,
    loading,
    setLoading,
    error,
    setError
  } = usePassengerStore()

  const [price, setPrice] = useState(0)
  const [distance, setDistance] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentLocation, setCurrentLocation] = useState<Position | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // 搜索相关
  const [pickupKeyword, setPickupKeyword] = useState('')
  const [destKeyword, setDestKeyword] = useState('')
  const [pickupResults, setPickupResults] = useState<SearchResult[]>([])
  const [destResults, setDestResults] = useState<SearchResult[]>([])
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination' | null>(null)
  const [amapInstance, setAmapInstance] = useState<any>(null)

  const mapRef = useRef<{ map: any; AMap: any } | null>(null)
  const autoCompleteRef = useRef<any>(null)
  const searchTimerRef = useRef<any>(null)

  // 如果有进行中的订单，跳转到订单页面
  useEffect(() => {
    if (currentOrder && ['pending', 'accepted', 'driver_arriving', 'in_progress'].includes(currentOrder.status)) {
      navigate(`/order/${currentOrder.id}`)
    }
  }, [currentOrder, navigate])

  // 路线规划完成后更新价格
  useEffect(() => {
    if (routeInfo) {
      const dist = routeInfo.distance / 1000
      const dur = routeInfo.duration / 60
      const pri = Math.round(dist * 2.5 + dur * 0.5 + 10)

      setDistance(Math.round(dist * 10) / 10)
      setDuration(Math.round(dur))
      setPrice(pri)
    }
  }, [routeInfo])

  // 地图加载完成 - 初始化定位和搜索
  const handleMapReady = useCallback((map: any, AMap: any) => {
    mapRef.current = { map, AMap }
    setAmapInstance(AMap)
    setMapReady(true)

    // 初始化 AutoComplete 插件
    AMap.plugin(['AMap.AutoComplete'], () => {
      const autoComplete = new AMap.AutoComplete({
        city: '全国',
        datatype: 'poi',
        input: null, // 不绑定到具体 input，手动触发
      })
      autoCompleteRef.current = autoComplete
    })

    // 自动获取当前位置
    getCurrentLocation(map, AMap)
  }, [])

  // 搜索地点（防抖）
  const doSearch = useCallback((keyword: string, type: 'pickup' | 'destination') => {
    if (!autoCompleteRef.current || !keyword.trim()) {
      if (type === 'pickup') setPickupResults([])
      else setDestResults([])
      return
    }

    autoCompleteRef.current.search(keyword, (status: string, result: any) => {
      if (status === 'complete' && result.tips) {
        const results: SearchResult[] = result.tips
          .filter((tip: any) => tip.location)
          .map((tip: any) => ({
            name: tip.name,
            address: tip.district || '',
            lng: tip.location.getLng(),
            lat: tip.location.getLat(),
          }))
        if (type === 'pickup') setPickupResults(results)
        else setDestResults(results)
      } else {
        if (type === 'pickup') setPickupResults([])
        else setDestResults([])
      }
    })
  }, [])

  // 搜索输入变化
  const handlePickupInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPickupKeyword(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => doSearch(value, 'pickup'), 300)
  }, [doSearch])

  const handleDestInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDestKeyword(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => doSearch(value, 'destination'), 300)
  }, [doSearch])

  // 选择搜索结果
  const handlePickupSelect = useCallback((result: SearchResult) => {
    const pos: Position = { lng: result.lng, lat: result.lat, address: result.address + result.name }
    setPickup(pos)
    setPickupKeyword(result.name)
    setPickupResults([])
    setActiveInput(null)
    if (mapRef.current?.map) {
      mapRef.current.map.setCenter([pos.lng, pos.lat])
    }
  }, [setPickup])

  const handleDestSelect = useCallback((result: SearchResult) => {
    const pos: Position = { lng: result.lng, lat: result.lat, address: result.address + result.name }
    setDestination(pos)
    setDestKeyword(result.name)
    setDestResults([])
    setActiveInput(null)
    if (mapRef.current?.map) {
      mapRef.current.map.setCenter([pos.lng, pos.lat])
    }
  }, [setDestination])

  // 获取当前位置
  const getCurrentLocation = useCallback((map?: any, AMap?: any) => {
    const currentMap = map || mapRef.current?.map
    const currentAMap = AMap || mapRef.current?.AMap

    if (!currentMap || !currentAMap) return

    setIsLocating(true)

    currentAMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new currentAMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        zoomToAccuracy: false,
        GeoLocationFirst: false, // Electron中优先IP定位
      })

      geolocation.getCurrentPosition((status: string, result: any) => {
        setIsLocating(false)
        if (status === 'complete' && result.position) {
          const pos: Position = {
            lng: result.position.getLng(),
            lat: result.position.getLat(),
          }
          setCurrentLocation(pos)
          currentMap.setCenter([pos.lng, pos.lat])
          reverseGeocode(pos, currentAMap)
        } else {
          console.warn('高德定位失败，使用IP精确定位API:', status)
          locateWithIPApi(currentMap)
        }
      })
    })
  }, [reverseGeocode])

  // 高德 IP 定位 - 使用 JS API 的 CitySearch（REST API 需要 Web服务类型的 key）
  const locateWithIPApi = useCallback((map: any) => {
    const currentAMap = mapRef.current?.AMap
    if (!currentAMap) return

    setIsLocating(true)
    currentAMap.plugin(['AMap.CitySearch'], () => {
      const citySearch = new currentAMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        setIsLocating(false)
        if (status === 'complete' && result.info === 'OK') {
          const bounds = result.bounds
          if (bounds) {
            const center = bounds.getCenter()
            const pos: Position = {
              lng: center.getLng(),
              lat: center.getLat(),
              address: result.province + result.city,
            }
            setCurrentLocation(pos)
            map.setCenter([pos.lng, pos.lat])
            map.setZoom(14)
            console.log('IP定位结果:', result.city)
          }
        } else {
          console.warn('CitySearch定位失败，使用默认位置')
          setCurrentLocation({ lng: 116.397428, lat: 39.90923, address: '默认位置' })
        }
      })
    })
  }, [])

  // 逆地理编码
  const reverseGeocode = useCallback((pos: Position, AMap: any) => {
    AMap.plugin(['AMap.Geocoder'], () => {
      const geocoder = new AMap.Geocoder()
      geocoder.getAddress([pos.lng, pos.lat], (status: string, result: any) => {
        if (status === 'complete' && result.regeocode) {
          const address = result.regeocode.formattedAddress
          setCurrentLocation(prev => prev ? { ...prev, address } : { ...pos, address })
        }
      })
    })
  }, [])

  // 路线规划完成
  const handleRouteComplete = useCallback((info: RouteInfo) => {
    setRouteInfo(info)
  }, [])

  // 使用当前位置作为上车点
  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      const loc = { ...currentLocation, address: currentLocation.address || '当前位置' }
      setPickup(loc)
      setPickupKeyword(loc.address)
    }
  }

  const handleCallRide = async () => {
    if (!pickup || !destination) {
      setError('请选择上车地点和目的地')
      return
    }

    if (!user) {
      setError('请先登录')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await api.createOrder({
        pickup,
        destination,
        price,
        distance,
        duration
      })

      if (response.code === 0 && response.data) {
        setCurrentOrder(response.data)
        navigate(`/order/${response.data.id}`)
      } else {
        setError(response.message || '叫车失败，请重试')
      }
    } catch (err) {
      setError('网络错误，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  // 快速登录
  const handleQuickLogin = useCallback(async () => {
    try {
      await api.sendVerificationCode('13900138000')
      const res = await api.verifyCode('13900138000', '123456')
      if (res.code === 0 && res.data) {
        localStorage.setItem('passenger_token', res.data.token)
        window.location.reload()
      }
    } catch (err) {
      setError('登录失败，请重试')
    }
  }, [api])

  // 预设目的地选项
  const presetDestinations = [
    { name: '国贸CBD', lat: 39.9087, lng: 116.4602 },
    { name: '中关村', lat: 39.9841, lng: 116.3074 },
    { name: '北京站', lat: 39.9042, lng: 116.4273 },
    { name: '首都机场', lat: 40.0799, lng: 116.6031 },
  ]

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = () => setActiveInput(null)
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="home-page">
      {/* 地图区域 */}
      <div className="map-container">
        <MapView
          amapKey={AMAP_KEY}
          securityJsCode={AMAP_SECURITY_CODE}
          center={pickup || currentLocation || { lng: 116.397428, lat: 39.90923 }}
          zoom={14}
          onMapReady={handleMapReady}
        >
          {/* 当前位置 */}
          {currentLocation && !pickup && (
            <MapMarker
              position={currentLocation}
              type="origin"
              label="我的位置"
            />
          )}

          {/* 上车点 */}
          {pickup && (
            <MapMarker
              position={pickup}
              type="origin"
              label="上车点"
            />
          )}

          {/* 目的地 */}
          {destination && (
            <MapMarker
              position={destination}
              type="destination"
              label="目的地"
            />
          )}

          {/* 路线 */}
          {pickup && destination && (
            <MapRoute
              origin={pickup}
              destination={destination}
              onRouteComplete={handleRouteComplete}
            />
          )}
        </MapView>

        {/* 定位按钮 */}
        <button
          className="locate-button"
          onClick={() => mapRef.current && getCurrentLocation()}
          disabled={isLocating || !mapReady}
        >
          {isLocating ? '定位中...' : '📍 定位'}
        </button>
      </div>

      {/* 地点选择卡片 */}
      <div className="card">
        {/* 上车点搜索 */}
        <div className="location-input-group">
          <div className="location-input-icon pickup-icon">📍</div>
          <div className="location-input-wrapper">
            <div className="location-input-label">上车地点</div>
            <input
              type="text"
              className="location-input"
              placeholder="搜索或输入上车地点"
              value={pickupKeyword}
              onChange={handlePickupInput}
              onFocus={(e) => {
                e.stopPropagation()
                setActiveInput('pickup')
              }}
            />
          </div>
        </div>

        {/* 上车点搜索结果 */}
        {activeInput === 'pickup' && pickupResults.length > 0 && (
          <div className="search-results">
            {pickupResults.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={(e) => { e.stopPropagation(); handlePickupSelect(result) }}
              >
                <div className="search-result-name">{result.name}</div>
                <div className="search-result-address">{result.address}</div>
              </div>
            ))}
          </div>
        )}

        {/* 使用当前位置 */}
        {!pickup && currentLocation && (
          <div className="use-current-location" onClick={handleUseCurrentLocation}>
            使用当前位置
          </div>
        )}

        <div className="location-divider"></div>

        {/* 目的地搜索 */}
        <div className="location-input-group">
          <div className="location-input-icon dest-icon">🎯</div>
          <div className="location-input-wrapper">
            <div className="location-input-label">目的地</div>
            <input
              type="text"
              className="location-input"
              placeholder="搜索或输入目的地"
              value={destKeyword}
              onChange={handleDestInput}
              onFocus={(e) => {
                e.stopPropagation()
                setActiveInput('destination')
              }}
            />
          </div>
        </div>

        {/* 目的地搜索结果 */}
        {activeInput === 'destination' && destResults.length > 0 && (
          <div className="search-results">
            {destResults.map((result, index) => (
              <div
                key={index}
                className="search-result-item"
                onClick={(e) => { e.stopPropagation(); handleDestSelect(result) }}
              >
                <div className="search-result-name">{result.name}</div>
                <div className="search-result-address">{result.address}</div>
              </div>
            ))}
          </div>
        )}

        {/* 预设目的地 */}
        {!destination && (
          <div className="preset-destinations">
            <div className="preset-label">热门目的地：</div>
            <div className="preset-list">
              {presetDestinations.map(dest => (
                <button
                  key={dest.name}
                  className="preset-btn"
                  onClick={() => {
                    const pos: Position = { address: dest.name, lat: dest.lat, lng: dest.lng }
                    setDestination(pos)
                    setDestKeyword(dest.name)
                  }}
                >
                  {dest.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 价格预估 */}
      {pickup && destination && routeInfo && (
        <div className="card">
          <div className="price-display">
            <div className="price-label">预估费用</div>
            <div className="price-value">
              ¥{price}
              <span className="price-unit">.00</span>
            </div>
            <div className="price-detail">
              约 {distance} 公里 · {duration} 分钟
            </div>
          </div>
        </div>
      )}

      {/* 叫车按钮 */}
      <button
        className="btn btn-primary btn-block"
        onClick={handleCallRide}
        disabled={!pickup || !destination || loading}
      >
        {loading ? '叫车中...' : '立即叫车'}
      </button>

      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* 登录提示 */}
      {!user && (
        <div className="login-hint">
          <div className="login-hint-text">请先登录以使用叫车服务</div>
          <button className="btn btn-primary" onClick={handleQuickLogin}>
            快速登录
          </button>
        </div>
      )}
    </div>
  )
}
