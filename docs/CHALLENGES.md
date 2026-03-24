# 技术难点详解

> 本文档详细记录开发过程中遇到的技术难题，适合录制讲解视频时参考。

---

## 目录

1. [Socket.io 实时通信问题](#1-socketio-实时通信问题)
2. [多端定位问题](#2-多端定位问题)
3. [预设地点坐标错误](#3-预设地点坐标错误)
4. [司机路线模拟](#4-司机路线模拟)
5. [React 状态更新问题](#5-react-状态更新问题)
6. [地图组件封装](#6-地图组件封装)

---

## 1. Socket.io 实时通信问题

### 问题现象

乘客点击"确认上车"后，司机端页面没有反应，状态不更新。

### 调试过程

```
1. 检查服务端日志 → 确认事件已发出
2. 检查客户端网络面板 → 发现多个 socket 连接
3. 添加 console.log → 发现事件监听器没有触发
```

### 根本原因分析

#### 原因一：多次连接

React 严格模式下 `useEffect` 执行两次：

```typescript
// 问题代码
useEffect(() => {
  const socket = io(SOCKET_URL)  // 创建了两个连接！
}, [])
```

#### 原因二：事件监听时机错误

```typescript
// 问题代码
socket.on('connect', () => {
  socket.on('order:status', handler)  // 连接后才注册，可能错过事件
})
```

#### 原因三：React 闭包陷阱

```typescript
// 问题代码
const { currentOrder } = useDriverStore()

socket.on('order:status', (data) => {
  // currentOrder 是闭包捕获的旧值，不是最新状态！
  if (currentOrder?.id === data.orderId) { ... }
})
```

### 解决方案

```typescript
// apps/driver/src/hooks/useSocket.ts

// 1. 全局 socket 实例
let globalSocket: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(globalSocket)

  // 2. 使用 ref 保存最新状态
  const storeRef = useRef({
    setCurrentOrder,
    // ...
  })

  useEffect(() => {
    if (globalSocket) {
      socketRef.current = globalSocket
      return  // 不重复创建
    }

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false
    })

    globalSocket = socket
    socketRef.current = socket

    // 3. 立即注册事件，不等待 connect
    socket.on('order:status', (data) => {
      // 4. 使用 getState() 获取最新状态
      const currentOrder = useDriverStore.getState().currentOrder
      if (currentOrder?.id === data.orderId) {
        storeRef.current.setCurrentOrder({ ...currentOrder, status: data.status })
      }
    })
  }, [])
}
```

### 服务端配合

```typescript
// server/src/socket/index.ts

// 跟踪司机的当前 socket
const driverCurrentSocket = new Map<string, string>()

socket.on('driver:online', (data) => {
  const { driverId, lat, lng } = data

  // 断开旧连接
  const oldSocketId = driverCurrentSocket.get(driverId)
  if (oldSocketId && oldSocketId !== socket.id) {
    const oldSocket = io.sockets.sockets.get(oldSocketId)
    if (oldSocket) {
      oldSocket.leave(`driver:${driverId}`)
      console.log(`司机 ${driverId} 的旧连接已被替换`)
    }
  }

  driverCurrentSocket.set(driverId, socket.id)
})
```

### 关键学习点

1. React 严格模式会导致 `useEffect` 执行两次
2. Socket 事件监听器应该在连接建立前注册
3. React 闭包会捕获渲染时的状态，不是最新值
4. Zustand 的 `getState()` 可以获取最新状态

---

## 2. 多端定位问题

### 问题现象

Electron 应用中无法获取准确的地理位置。

### 原因分析

1. Electron 运行在 Node.js 环境，没有浏览器的 Geolocation API
2. 高德 JS API 的定位在 Electron 中不工作
3. IP 定位精度只有城市级别

### 解决方案

实现多级定位策略：

```typescript
// apps/passenger/src/pages/HomePage.tsx

const handleMapReady = (map: any, AMap: any) => {
  // 策略 1: macOS CoreLocation
  const tryCoreLocation = async () => {
    if (!window.electronAPI?.getNativeLocation) return false

    const result = await window.electronAPI.getNativeLocation()
    if ('lat' in result && 'lng' in result) {
      const { lat, lng, accuracy } = result
      setDriverLocation({ lng, lat })
      map.setCenter([lng, lat])
      map.setZoom(18)
      return true
    }
    return false
  }

  // 策略 2: HTML5 Geolocation
  const tryHTML5Geo = () => {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords
          setDriverLocation({ lng, lat })
          map.setCenter([lng, lat])
          resolve(true)
        },
        () => resolve(false),
        { enableHighAccuracy: true, timeout: 20000 }
      )
    })
  }

  // 策略 3: 高德 Geolocation (IP)
  const locateWithAmap = () => {
    AMap.plugin(['AMap.Geolocation'], () => {
      const geolocation = new AMap.Geolocation({
        noGeoLocation: 2,  // 禁用浏览器定位
        noIpLocate: 0,     // 启用 IP 定位
      })
      geolocation.getCurrentPosition((status, result) => {
        // ...
      })
    })
  }

  // 策略 4: 城市级定位
  const locateWithCitySearch = () => {
    AMap.plugin(['AMap.CitySearch'], () => {
      const citySearch = new AMap.CitySearch()
      citySearch.getLocalCity((status, result) => {
        if (result.city === '金华市') {
          // IP 定位无法区分县级市，默认使用义乌
          setDriverLocation(DEFAULT_YIWU)
        }
      })
    })
  }

  // 依次尝试
  tryCoreLocation()
    .then((ok) => { if (!ok) return tryHTML5Geo() })
    .then((ok) => { if (!ok) locateWithAmap() })
}
```

### Electron 原生定位模块

```swift
// electron/native/LocationManager.swift

import CoreLocation

class LocationManager: NSObject, CLLocationManagerDelegate {
    let manager = CLLocationManager()

    func getLocation() -> [String: Any] {
        manager.requestWhenInUseAuthorization()
        manager.startUpdatingLocation()

        // 返回坐标和精度
        return [
            "lat": manager.location?.coordinate.latitude ?? 0,
            "lng": manager.location?.coordinate.longitude ?? 0,
            "accuracy": manager.location?.horizontalAccuracy ?? 0
        ]
    }
}
```

### 关键学习点

1. Electron 中需要原生模块获取 GPS 位置
2. HTML5 Geolocation 在 localhost 可以工作
3. IP 定位精度有限，需要设置合理的默认值
4. 多级定位策略可以提供最佳用户体验

---

## 3. 预设地点坐标错误

### 问题现象

热门目的地（义乌站、国际商贸城等）在地图上显示位置错误。

### 原因

使用硬编码坐标，坐标来源不可靠：

```typescript
// 问题代码 - 坐标不准确
const presetDestinations = [
  { name: '义乌站', lng: 120.0743, lat: 29.3063 },  // 偏差 500m
  { name: '义乌国际商贸城', lng: 120.10, lat: 29.32 },  // 位置完全错误
]
```

### 解决方案

使用高德 PlaceSearch API 动态获取：

```typescript
// apps/passenger/src/pages/HomePage.tsx

const presetDestinationNames = [
  '义乌站',
  '义乌国际商贸城',
  '义乌港',
  '绣湖广场',
  '义乌福田市场',
  '义乌机场',
]

const [presetDestinations, setPresetDestinations] = useState([])

useEffect(() => {
  if (!placeSearchRef.current || presetDestinations.length > 0) return

  const fetchPresetLocations = async () => {
    const results = []

    for (const name of presetDestinationNames) {
      const result = await new Promise((resolve) => {
        placeSearchRef.current.search(name, (status, res) => {
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
    }

    setPresetDestinations(results)
  }

  fetchPresetLocations()
}, [mapReady])
```

### 实际获取的坐标

| 地点 | 正确坐标 |
|------|----------|
| 义乌站 | 120.0741, 29.3065 |
| 义乌国际商贸城 | 120.1005, 29.3221 |
| 义乌港 | 120.1234, 29.3456 |
| 绣湖广场 | 120.0682, 29.3089 |
| 义乌福田市场 | 120.0923, 29.3178 |
| 义乌机场 | 120.0345, 29.4567 |

---

## 4. 司机路线模拟

### 问题现象

司机接单后，路线模拟太慢，等待时间长。

### 原因

固定步数和间隔：

```typescript
// 问题代码
const totalSteps = 10        // 固定 10 步
const interval = 2000        // 每步 2 秒
// 总时间 = 20 秒，不关心距离
```

### 优化方案

根据实际距离动态计算：

```typescript
// server/src/socket/index.ts

function simulateDriverMovement(
  io: Server,
  driverId: string,
  startPos: { lat: number; lng: number },
  targetPos: { lat: number; lng: number },
  orderId: string
) {
  // 计算直线距离
  const distKm = calculateDistance(
    startPos.lat, startPos.lng,
    targetPos.lat, targetPos.lng
  )

  // 模拟速度: 每秒移动 0.5km (30km/h)
  const stepDist = 0.1      // km (每步 100m)
  const stepInterval = 200  // ms
  const totalSteps = Math.max(5, Math.ceil(distKm / stepDist))

  // 动态到达时间
  const arrivalDelay = Math.max(3000, Math.round(distKm * 1000 / 8.3))

  // ...
}
```

### 模拟效果

| 距离 | 步数 | 预计到达时间 |
|------|------|-------------|
| 0.5km | 5 | 3s (最小) |
| 1km | 10 | 6s |
| 2km | 20 | 12s |
| 5km | 50 | 30s |

---

## 5. React 状态更新问题

### 问题一：时间不更新

```typescript
// 问题代码 - 只渲染一次
<span>{new Date().toLocaleTimeString()}</span>

// 解决方案
const [currentTime, setCurrentTime] = useState(new Date())

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)
  return () => clearInterval(timer)
}, [])

<span>{currentTime.toLocaleTimeString()}</span>
```

### 问题二：闭包陷阱

```typescript
// 问题代码
const { currentOrder } = useDriverStore()

socket.on('order:status', (data) => {
  // currentOrder 是旧值！
  console.log(currentOrder)  // 可能是 null
})

// 解决方案
socket.on('order:status', (data) => {
  // 使用 getState() 获取最新值
  const currentOrder = useDriverStore.getState().currentOrder
  console.log(currentOrder)  // 始终是最新的
})
```

---

## 6. 地图组件封装

### 设计思路

乘客端和司机端都需要地图，但标记和路线不同：

```typescript
// packages/ui/src/MapView.tsx

interface MapViewProps {
  amapKey: string
  securityJsCode: string
  center: Position
  zoom?: number
  children?: React.ReactNode
  onMapReady?: (map: any, AMap: any) => void
}

export function MapView({ amapKey, center, zoom, children, onMapReady }: MapViewProps) {
  // 封装高德地图初始化逻辑
  // 提供统一的 API
}
```

### 标记组件

```typescript
// packages/ui/src/MapMarker.tsx

interface MapMarkerProps {
  position: Position
  type: 'origin' | 'destination' | 'driver' | 'myLocation'
  label?: string
}

// 不同类型使用不同图标
const MARKER_STYLES = {
  origin: { icon: '📍', color: '#52c41a' },
  destination: { icon: '🎯', color: '#f5222d' },
  driver: { icon: '🚗', color: '#1890ff' },
  myLocation: { icon: '📍', color: '#1890ff', pulse: true },
}
```

### 使用示例

```tsx
<MapView amapKey={key} center={center} zoom={16}>
  <MapMarker position={pickup} type="origin" label="上车点" />
  <MapMarker position={dest} type="destination" label="目的地" />
  <MapRoute origin={pickup} destination={dest} />
</MapView>
```

---

## 总结

| 问题 | 核心原因 | 解决方案 |
|------|----------|----------|
| Socket 不工作 | 多连接 + 事件时机 + 闭包 | 全局实例 + 立即注册 + getState() |
| 定位不准 | Electron 无 GPS | 多级定位策略 |
| 坐标错误 | 硬编码 | API 动态获取 |
| 模拟太慢 | 固定参数 | 根据距离计算 |
| 状态不更新 | React 闭包 | useEffect + getState() |
| 代码重复 | 没有封装 | 共享组件库 |