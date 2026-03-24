import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '../../store/driverStore'
import { MapView, MapRoute } from '@didi/ui'
import './Navigation.css'

interface NavigationInfo {
  distance: number
  duration: number
  eta: string
}

const Navigation: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { currentOrder, location, updateOrderStatus } = useDriverStore()
  const [navInfo, setNavInfo] = useState<NavigationInfo>({
    distance: 0,
    duration: 0,
    eta: ''
  })
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (!currentOrder || currentOrder.id !== orderId) {
      navigate('/')
      return
    }

    // Set initial navigation info
    setNavInfo({
      distance: currentOrder.distance,
      duration: currentOrder.duration,
      eta: calculateETA(currentOrder.duration)
    })
  }, [currentOrder, orderId, navigate])

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setNavInfo(prev => ({
        ...prev,
        distance: Math.max(0, prev.distance - 100),
        duration: Math.max(0, prev.duration - 5)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const calculateETA = (seconds: number): string => {
    const now = new Date()
    const arrival = new Date(now.getTime() + seconds * 1000)
    return arrival.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`
    }
    return `${Math.round(meters)} m`
  }

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes} min`
  }

  const handleBack = () => {
    navigate(`/order/${orderId}`)
  }

  const handleComplete = async () => {
    updateOrderStatus('completed')
    navigate(`/order/${orderId}`)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleOpenExternalNav = () => {
    if (!currentOrder) return

    const { lat, lng } = currentOrder.destination
    const navUrl = `https://uri.amap.com/navigation?to=${lng},${lat},destination&mode=car&policy=1&src=didi-driver`
    window.electronAPI?.openNavigation(navUrl)
  }

  if (!currentOrder) {
    return null
  }

  const destination = currentOrder.status === 'in_progress'
    ? currentOrder.destination
    : currentOrder.pickup

  return (
    <div className="navigation-container">
      {/* Map View */}
      <div className="map-wrapper">
        <MapView
          center={location || { lat: 39.9042, lng: 116.4074 }}
          zoom={15}
          style={{ width: '100%', height: '100%' }}
        >
          {location && (
            <MapRoute
              start={location}
              end={destination}
              color="#7AC9A8"
            />
          )}
        </MapView>
      </div>

      {/* Top Bar */}
      <div className="nav-top-bar">
        <button className="nav-back-btn" onClick={handleBack}>
          ← Back
        </button>
        <div className="nav-title">
          {currentOrder.status === 'in_progress' ? 'To Destination' : 'To Pickup'}
        </div>
        <button className="mute-btn" onClick={toggleMute}>
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Destination Card */}
      <div className="destination-card">
        <div className="destination-marker">
          {currentOrder.status === 'in_progress' ? '🎯' : '📍'}
        </div>
        <div className="destination-info">
          <span className="destination-label">
            {currentOrder.status === 'in_progress' ? 'Destination' : 'Pickup Location'}
          </span>
          <span className="destination-address">{destination.address}</span>
        </div>
      </div>

      {/* Navigation Info */}
      <div className="nav-info-panel">
        <div className="nav-stats">
          <div className="nav-stat primary">
            <span className="stat-value">{formatDistance(navInfo.distance)}</span>
            <span className="stat-label">Remaining</span>
          </div>
          <div className="nav-stat">
            <span className="stat-value">{formatDuration(navInfo.duration)}</span>
            <span className="stat-label">ETA</span>
          </div>
          <div className="nav-stat">
            <span className="stat-value">{navInfo.eta}</span>
            <span className="stat-label">Arrive At</span>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="nav-bottom-actions">
        <button className="external-nav-btn" onClick={handleOpenExternalNav}>
          <span>🗺️</span>
          <span>Open in Amap</span>
        </button>

        {currentOrder.status === 'in_progress' && (
          <button className="complete-btn" onClick={handleComplete}>
            Complete Trip
          </button>
        )}

        {/* Contact Button */}
        <div className="contact-btn-group">
          <button className="contact-action-btn call">📞</button>
          <button className="contact-action-btn message">💬</button>
        </div>
      </div>

      {/* Speed & Traffic Info */}
      <div className="traffic-info">
        <div className="speed-indicator">
          <span className="speed-value">45</span>
          <span className="speed-unit">km/h</span>
        </div>
        <div className="traffic-status">
          <span className="traffic-light green"></span>
          <span className="traffic-text">Smooth Traffic</span>
        </div>
      </div>
    </div>
  )
}

export default Navigation
