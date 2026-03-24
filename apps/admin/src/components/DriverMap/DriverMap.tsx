import React, { useEffect, useRef, useState } from 'react'
import { Driver } from '@didi/api-client'
import './DriverMap.css'

interface DriverMapProps {
  drivers: Driver[]
  onDriverClick?: (driver: Driver) => void
  showLabels?: boolean
}

interface MapMarker {
  id: string
  lat: number
  lng: number
  label: string
  type: 'driver' | 'area'
}

const DriverMap: React.FC<DriverMapProps> = ({
  drivers,
  onDriverClick,
  showLabels = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [hoveredDriver, setHoveredDriver] = useState<string | null>(null)

  // Beijing center coordinates
  const centerLat = 39.95
  const centerLng = 116.35
  const zoom = 11

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = (lat: number, lng: number, canvas: HTMLCanvasElement) => {
    const scale = Math.pow(2, zoom) * 256 / 360
    const x = (lng - centerLng) * scale + canvas.width / 2
    const y = (centerLat - lat) * scale + canvas.height / 2
    return { x, y }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--map-bg') || '#1a1a2e'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    const gridSize = 50
    for (let x = 0; x < rect.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }

    // Draw roads (simplified)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 2

    // Major roads
    const roads = [
      [[0.2, 0.3], [0.8, 0.3]],
      [[0.2, 0.5], [0.8, 0.5]],
      [[0.2, 0.7], [0.8, 0.7]],
      [[0.3, 0.2], [0.3, 0.8]],
      [[0.5, 0.2], [0.5, 0.8]],
      [[0.7, 0.2], [0.7, 0.8]]
    ]

    roads.forEach(road => {
      ctx.beginPath()
      ctx.moveTo(road[0][0] * rect.width, road[0][1] * rect.height)
      ctx.lineTo(road[1][0] * rect.width, road[1][1] * rect.height)
      ctx.stroke()
    })

    // Draw driver markers
    drivers.forEach(driver => {
      const pos = latLngToCanvas(driver.location.lat, driver.location.lng, canvas)
      const isSelected = selectedDriver?.id === driver.id
      const isHovered = hoveredDriver === driver.id

      // Glow effect
      if (isSelected || isHovered) {
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 30)
        gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)')
        gradient.addColorStop(1, 'rgba(34, 197, 94, 0)')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2)
        ctx.fill()
      }

      // Marker
      ctx.fillStyle = isSelected ? '#22c55e' : '#3b82f6'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isSelected ? 10 : 8, 0, Math.PI * 2)
      ctx.fill()

      // Pulse animation effect (static representation)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2)
      ctx.stroke()

      // Label
      if (showLabels) {
        ctx.fillStyle = '#fff'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(driver.name, pos.x, pos.y - 15)
      }
    })

    // Draw legend
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(10, rect.height - 70, 150, 60)

    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'left'

    ctx.fillStyle = '#3b82f6'
    ctx.beginPath()
    ctx.arc(25, rect.height - 50, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(`在线司机: ${drivers.length}`, 40, rect.height - 46)

    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(25, rect.height - 25, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText('已选中', 40, rect.height - 21)

  }, [drivers, selectedDriver, hoveredDriver, showLabels])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Find clicked driver
    for (const driver of drivers) {
      const pos = latLngToCanvas(driver.location.lat, driver.location.lng, canvas)
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
      if (distance < 15) {
        setSelectedDriver(driver)
        onDriverClick?.(driver)
        return
      }
    }

    setSelectedDriver(null)
  }

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    let found = false
    for (const driver of drivers) {
      const pos = latLngToCanvas(driver.location.lat, driver.location.lng, canvas)
      const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2))
      if (distance < 15) {
        setHoveredDriver(driver.id)
        canvas.style.cursor = 'pointer'
        found = true
        break
      }
    }

    if (!found) {
      setHoveredDriver(null)
      canvas.style.cursor = 'default'
    }
  }

  return (
    <div className="driver-map">
      <canvas
        ref={canvasRef}
        className="map-canvas"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
      />
      {selectedDriver && (
        <div className="driver-tooltip">
          <div className="tooltip-header">
            <span className="driver-name">{selectedDriver.name}</span>
            <span className="driver-rating">⭐ {selectedDriver.rating}</span>
          </div>
          <div className="tooltip-body">
            <p>车型: {selectedDriver.carModel}</p>
            <p>车牌: {selectedDriver.carPlate}</p>
            <p>电话: {selectedDriver.phone}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DriverMap
