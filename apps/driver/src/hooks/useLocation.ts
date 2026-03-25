import { useState, useEffect, useCallback, useRef } from 'react'
import { useDriverStore } from '../store/driverStore'

interface AMapInstance {
  map: any
  AMap: any
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

const defaultOptions: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
}

export function useLocation(options: GeolocationOptions = defaultOptions) {
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const { setLocation, setLocationTracking } = useDriverStore()
  const amapRef = useRef<AMapInstance | null>(null)
  const watchIdRef = useRef<any>(null)

  // 由地图组件调用，注入 AMap 实例
  const setAMapRef = useCallback((ref: AMapInstance) => {
    amapRef.current = ref
  }, [])

  // Start location tracking using AMap.Geolocation
  const startTracking = useCallback(() => {
    const { AMap, map } = amapRef.current || {}
    if (!AMap || !map) {
      // 地图尚未加载，尝试获取位置
      getCurrentPosition().then((pos) => {
        setLocation({ address: pos.address || '', lat: pos.lat, lng: pos.lng })
      }).catch((err) => {
        console.warn('获取位置失败:', err)
        setError('无法获取位置')
      })
      return
    }

    setIsTracking(true)
    setLocationTracking(true)

    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
        GeoLocationFirst: false,
        noGeoLocation: 2,
        noIpLocate: 0,
        extensions: 'all',
      })

      // 持续追踪位置
      geolocation.watchPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          const lat = result.position.getLat()
          const lng = result.position.getLng()
          setLocation({
            address: result.formattedAddress || '',
            lat,
            lng
          })
          setError(null)
        }
      })

      // 添加到地图上
      map.addControl(geolocation)
      watchIdRef.current = geolocation
    })

    return () => {
      if (watchIdRef.current && map) {
        map.removeControl(watchIdRef.current)
        watchIdRef.current = null
      }
      setIsTracking(false)
      setLocationTracking(false)
    }
  }, [setLocation, setLocationTracking, options])

  // Get current position once using AMap.Geolocation
  const getCurrentPosition = useCallback((): Promise<{ lat: number; lng: number; address?: string }> => {
    return new Promise((resolve, reject) => {
      // 优先使用 CoreLocation (macOS 精确定位)
      if (window.electronAPI?.getNativeLocation) {
        window.electronAPI.getNativeLocation().then((result: any) => {
          if ('lat' in result && 'lng' in result) {
            resolve({ lat: result.lat, lng: result.lng })
            return
          }
          // CoreLocation 失败，尝试 navigator.geolocation (Electron 有权限)
          resolveWithNavigator(resolve, reject)
        }).catch(() => resolveWithNavigator(resolve, reject))
      } else {
        // 没有 native location，直接用 navigator.geolocation
        resolveWithNavigator(resolve, reject)
      }
    })
  }, [])

  // 使用 navigator.geolocation (Electron 已有权限)
  const resolveWithNavigator = (
    resolve: (value: { lat: number; lng: number; address?: string }) => void,
    reject: (reason: Error) => void
  ) => {
    if (!navigator.geolocation) {
      resolveWithAMap(resolve, reject)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (err) => {
        console.warn('navigator.geolocation failed:', err.message)
        // navigator 失败，尝试 AMap
        resolveWithAMap(resolve, reject)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const resolveWithAMap = (
    resolve: (value: { lat: number; lng: number; address?: string }) => void,
    reject: (reason: Error) => void
  ) => {
    const { AMap } = amapRef.current || {}
    if (!AMap) {
      reject(new Error('地图未加载，无法定位'))
      return
    }

    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: options.timeout ?? 10000,
        GeoLocationFirst: false,
        noGeoLocation: 2,
        noIpLocate: 0,
        extensions: 'all',
      })

      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && result.position) {
          resolve({
            lat: result.position.getLat(),
            lng: result.position.getLng(),
            address: result.formattedAddress || undefined
          })
        } else {
          setError('高德定位失败')
          reject(new Error('高德定位失败'))
        }
      })
    })
  }

  return {
    error,
    isTracking,
    startTracking,
    getCurrentPosition,
    setAMapRef
  }
}

export default useLocation
