import { useState, useEffect, useCallback } from 'react'
import { useDriverStore } from '../store/driverStore'

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

  // Start location tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsTracking(true)
    setLocationTracking(true)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLocation({
          address: '',
          lat: latitude,
          lng: longitude
        })
        setError(null)
      },
      (err) => {
        setError(err.message)
        console.error('Location error:', err)
      },
      {
        ...defaultOptions,
        ...options
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      setIsTracking(false)
      setLocationTracking(false)
    }
  }, [setLocation, setLocationTracking, options])

  // Get current position once
  const getCurrentPosition = useCallback(() => {
    return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (err) => {
          setError(err.message)
          reject(err)
        },
        {
          ...defaultOptions,
          ...options
        }
      )
    })
  }, [options])

  return {
    error,
    isTracking,
    startTracking,
    getCurrentPosition
  }
}

export default useLocation
