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
  distance?: string
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
  // 义乌市中心坐标作为默认位置
  const DEFAULT_YIWU: Position = { lng: 120.075, lat: 29.306, address: '义乌市' }
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
  const placeSearchRef = useRef<any>(null)
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

  // 地图加载完成 - 初始化定位和搜索
  const handleMapReady = useCallback((map: any, AMap: any) => {
    mapRef.current = { map, AMap }
    setAmapInstance(AMap)
    setMapReady(true)

    // 初始化 PlaceSearch 插件（搜索所有类型地点，结果一定有坐标）
    AMap.plugin(['AMap.PlaceSearch'], () => {
      const placeSearch = new AMap.PlaceSearch({
        city: '全国',
        citylimit: false,
        pageSize: 10,
        pageIndex: 1,
        extensions: 'base',
      })
      placeSearchRef.current = placeSearch
    })

    // 优先使用 CoreLocation 获取真实位置
    const tryCoreLocation = async (): Promise<boolean> => {
      if (!window.passengerAPI?.getNativeLocation) return false
      try {
        const result = await window.passengerAPI.getNativeLocation()
        if ('lat' in result && 'lng' in result) {
          const pos: Position = {
            lng: result.lng,
            lat: result.lat,
            address: ''
          }
          setCurrentLocation(pos)
          map.setCenter([pos.lng, pos.lat])
          map.setZoom(16)
          reverseGeocode(pos, AMap)
          console.log('CoreLocation定位成功:', `(${pos.lng.toFixed(4)}, ${pos.lat.toFixed(4)})`)
          return true
        } else {
          console.warn('CoreLocation不可用:', result.error)
        }
      } catch (e) {
        console.warn('CoreLocation调用失败:', e)
      }
      return false
    }

    tryCoreLocation().then((ok) => {
      if (!ok) {
        // 回退到 AMap 定位
        getCurrentLocation(map, AMap)
      }
    })
  }, [reverseGeocode])

  // 搜索地点（防抖）
  const doSearch = useCallback((keyword: string, type: 'pickup' | 'destination') => {
    if (!placeSearchRef.current || !keyword.trim()) {
      if (type === 'pickup') setPickupResults([])
      else setDestResults([])
      return
    }

    placeSearchRef.current.search(keyword, (status: string, result: any) => {
      if (status === 'complete' && result.poiList?.pois?.length > 0) {
        const results: SearchResult[] = result.poiList.pois.map((poi: any) => ({
          name: poi.name,
          address: [poi.pname, poi.cityname, poi.adname, poi.address].filter(Boolean).join(''),
          lng: poi.location.getLng(),
          lat: poi.location.getLat(),
        }))

        // 用 AMap.GeometryUtil.distance 即时计算直线距离（同步，无需网络）
        const refPoint = type === 'destination'
          ? (pickup || currentLocation)
          : currentLocation
        if (refPoint && results.length > 0 && mapRef.current?.AMap) {
          const AMap = mapRef.current.AMap
          results.forEach(item => {
            const p1 = new AMap.LngLat(refPoint.lng, refPoint.lat)
            const p2 = new AMap.LngLat(item.lng, item.lat)
            const dist = AMap.GeometryUtil.distance(p1, p2) // 米
            item.distance = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`
          })
        }

        // 设置带直线距离的结果
        if (type === 'pickup') setPickupResults(results)
        else setDestResults(results)

        // 再用 AMap.Driving 异步获取精确驾车距离（覆盖直线距离）
        if (refPoint && results.length > 0 && mapRef.current?.AMap) {
          const AMap = mapRef.current.AMap
          AMap.plugin(['AMap.Driving'], () => {
            results.forEach((item, idx) => {
              const driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME })
              driving.search(
                new AMap.LngLat(refPoint.lng, refPoint.lat),
                new AMap.LngLat(item.lng, item.lat),
                (s: string, r: any) => {
                  if (s === 'complete' && r.routes?.length > 0) {
                    const d = r.routes[0].distance
                    const dur = Math.ceil(r.routes[0].time / 60)
                    const distStr = d >= 1000 ? `${(d / 1000).toFixed(1)}km · ${dur}min` : `${Math.round(d)}m · ${dur}min`
                    if (type === 'pickup') {
                      setPickupResults(prev => {
                        const updated = [...prev]
                        if (updated[idx]) updated[idx] = { ...updated[idx], distance: distStr }
                        return updated
                      })
                    } else {
                      setDestResults(prev => {
                        const updated = [...prev]
                        if (updated[idx]) updated[idx] = { ...updated[idx], distance: distStr }
                        return updated
                      })
                    }
                  }
                }
              )
            })
          })
        }
      } else {
        if (type === 'pickup') setPickupResults([])
        else setDestResults([])
      }
    })
  }, [pickup, currentLocation])

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
    const pos: Position = { lng: result.lng, lat: result.lat, address: result.address ? `${result.address}${result.name}` : result.name }
    setPickup(pos)
    setPickupKeyword(result.name)
    setPickupResults([])
    setActiveInput(null)
    if (mapRef.current?.map) {
      mapRef.current.map.setCenter([pos.lng, pos.lat])
    }
  }, [setPickup])

  const handleDestSelect = useCallback((result: SearchResult) => {
    const pos: Position = { lng: result.lng, lat: result.lat, address: result.address ? `${result.address}${result.name}` : result.name }
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
        enableHighAccuracy: false,     // Electron中不需要GPS
        timeout: 10000,
        zoomToAccuracy: false,
        GeoLocationFirst: false,       // 不优先HTML5定位
        noGeoLocation: 2,              // 禁用PC端浏览器定位（Electron中会超时）
        noIpLocate: 0,                 // 启用高精度IP定位
        extensions: 'all',             // 返回完整信息（含格式化地址）
      })

      geolocation.getCurrentPosition((status: string, result: any) => {
        setIsLocating(false)
        if (status === 'complete' && result.position) {
          const pos: Position = {
            lng: result.position.getLng(),
            lat: result.position.getLat(),
            address: result.formattedAddress || '',
          }
          setCurrentLocation(pos)
          currentMap.setCenter([pos.lng, pos.lat])
          if (result.formattedAddress) {
            // 已有地址，无需额外逆地理编码
          } else {
            reverseGeocode(pos, currentAMap)
          }
          console.log('定位成功:', pos.address, `(${pos.lng.toFixed(4)}, ${pos.lat.toFixed(4)})`, 'type:', result.location_type)
        } else {
          console.warn('高德定位失败，使用CitySearch作为后备:', status)
          locateWithIPApi(currentMap)
        }
      })
    })
  }, [reverseGeocode])

  // 高德 IP 定位 - 使用 JS API 的 CitySearch
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
            // 金华市区域默认使用义乌（IP无法区分地级市下的县级市）
            if (result.city === '金华市') {
              setCurrentLocation(DEFAULT_YIWU)
              map.setCenter([DEFAULT_YIWU.lng, DEFAULT_YIWU.lat])
              map.setZoom(14)
              console.log('IP定位: 金华市区域，默认使用义乌市中心')
            } else {
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
          }
        } else {
          console.warn('CitySearch定位失败，使用义乌默认位置')
          setCurrentLocation(DEFAULT_YIWU)
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

  // 义乌热门地标
  const presetDestinations = [
    { name: '义乌站', lat: 29.3063, lng: 120.0743 },
    { name: '国际博览中心', lat: 29.3215, lng: 120.0965 },
    { name: '义乌港', lat: 29.3156, lng: 120.0812 },
    { name: '绣湖广场', lat: 29.3082, lng: 120.0685 },
    { name: '福田市场', lat: 29.3180, lng: 120.0930 },
    { name: '义乌机场', lat: 29.3445, lng: 120.0295 },
  ]

  // 预设距离缓存
  const [presetDistances, setPresetDistances] = useState<Record<string, string>>({})

  // 用高德 GeometryUtil 即时显示直线距离，再异步用 Driving 获取驾车距离
  useEffect(() => {
    if (!currentLocation || !mapRef.current?.AMap) return
    const AMap = mapRef.current.AMap

    // 1. 同步计算直线距离（即时显示）
    const straightDistances: Record<string, string> = {}
    presetDestinations.forEach(dest => {
      const p1 = new AMap.LngLat(currentLocation.lng, currentLocation.lat)
      const p2 = new AMap.LngLat(dest.lng, dest.lat)
      const dist = AMap.GeometryUtil.distance(p1, p2)
      straightDistances[dest.name] = dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${Math.round(dist)}m`
    })
    setPresetDistances(straightDistances)

    // 2. 异步用 AMap.Driving 获取驾车距离+时间（覆盖直线距离）
    AMap.plugin(['AMap.Driving'], () => {
      presetDestinations.forEach(dest => {
        const driving = new AMap.Driving({ policy: AMap.DrivingPolicy.LEAST_TIME })
        driving.search(
          new AMap.LngLat(currentLocation.lng, currentLocation.lat),
          new AMap.LngLat(dest.lng, dest.lat),
          (status: string, result: any) => {
            if (status === 'complete' && result.routes?.length > 0) {
              const route = result.routes[0]
              const dist = route.distance >= 1000
                ? `${(route.distance / 1000).toFixed(1)}km`
                : `${Math.round(route.distance)}m`
              const dur = Math.ceil(route.time / 60)
              setPresetDistances(prev => ({ ...prev, [dest.name]: `${dist} · ${dur}min` }))
            }
          }
        )
      })
    })
  }, [currentLocation])

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
          center={pickup || currentLocation || DEFAULT_YIWU}
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
                <div className="search-result-address">{result.address}{result.distance && ` · ${result.distance}`}</div>
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
                <div className="search-result-address">{result.address}{result.distance && ` · ${result.distance}`}</div>
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
                  {presetDistances[dest.name] && (
                    <span className="preset-distance">{presetDistances[dest.name]}</span>
                  )}
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
