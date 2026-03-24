# 滴滴打车桌面应用 (DiDi Clone)

一个基于 Electron + React + TypeScript 的滴滴打车桌面应用克隆项目，实现乘客端与司机端的实时交互。

## 项目演示

![乘客端首页](./screenshots/passenger-home.png)
*乘客端 - 地图定位与叫车*

![司机端首页](./screenshots/driver-home.png)
*司机端 - 接单与地图导航*

![订单流程](./screenshots/order-flow.png)
*完整订单流程演示*

---

## 功能特性

### 乘客端
- 实时高德地图显示与定位
- 位置搜索（支持 POI 关键字搜索）
- 热门目的地一键选择（动态获取真实坐标）
- 路线规划与价格预估
- 一键叫车
- 订单状态实时追踪
- 司机位置实时显示
- 确认上车功能

### 司机端
- 实时定位追踪
- 在线/离线状态切换
- 新订单推送与通知
- 订单接单/拒单
- 订单状态管理（赶往上车点 → 已到达 → 行程中 → 已完成）
- 虚拟定位（测试用）
- 收入统计

### 后端服务
- RESTful API
- Socket.io 实时通信
- 订单状态机
- 司机位置广播
- 驾车距离计算（高德 API）

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript 5 |
| 桌面应用 | Electron 28 + electron-vite 2 |
| 地图服务 | 高德地图 JS API 2.0 |
| 状态管理 | Zustand |
| 实时通信 | Socket.io |
| 后端服务 | Express.js |
| 构建工具 | Turborepo + pnpm |

---

## 项目结构

```
didi-clone/
├── apps/
│   ├── passenger/          # 乘客端 Electron 应用
│   │   ├── src/
│   │   │   ├── pages/      # 页面组件
│   │   │   ├── store/      # Zustand 状态管理
│   │   │   └── ...
│   │   └── electron/       # Electron 主进程
│   │
│   ├── driver/             # 司机端 Electron 应用
│   │   ├── src/
│   │   │   ├── pages/      # 页面组件
│   │   │   ├── hooks/      # 自定义 Hooks (useSocket)
│   │   │   ├── store/      # Zustand 状态管理
│   │   │   └── ...
│   │   └── electron/       # Electron 主进程
│   │
│   └── admin/              # 管理后台 Web 应用
│
├── packages/
│   ├── ui/                 # 共享 UI 组件库 (MapView, MapMarker 等)
│   └── api-client/         # API 客户端
│
├── server/                 # 后端服务
│   ├── src/
│   │   ├── routes/         # REST API 路由
│   │   ├── socket/         # Socket.io 处理
│   │   └── store.ts        # 内存数据存储
│   └── ...
│
└── docs/                   # 文档
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 配置高德地图 Key

在 `apps/passenger/.env` 和 `apps/driver/.env` 中配置：

```env
VITE_AMAP_KEY=your_amap_key_here
VITE_AMAP_SECURITY_CODE=your_security_code_here
```

获取 Key: [高德开放平台](https://console.amap.com/dev/key/app)

### 启动服务

```bash
# 1. 启动后端服务
cd server && pnpm dev

# 2. 启动乘客端 (新终端)
cd apps/passenger && pnpm dev

# 3. 启动司机端 (新终端)
cd apps/driver && pnpm dev
```

### 端口配置

| 服务 | 端口 |
|------|------|
| 后端 API | 3000 |
| 乘客端 | 5173 |
| 司机端 | 5174 |

---

## 订单状态流转

```
pending (等待接单)
    ↓
accepted (司机已接单)
    ↓
driver_arriving (司机赶来)
    ↓
arrived (已到达上车点)
    ↓
passenger_confirmed (乘客确认上车)
    ↓
in_progress (行程中)
    ↓
completed (已完成)
```

---

## 技术难点与问题记录

> 本节记录开发过程中遇到的主要技术难题，适合视频讲解。

### 1. Socket.io 连接问题

#### 问题描述
司机端在乘客确认上车后，无法收到 `order:status` 事件更新。

#### 根本原因
1. **多次连接**: React 严格模式下 `useEffect` 执行两次，导致创建多个 socket 连接
2. **事件监听时机错误**: 事件监听器在 `connect` 之后才注册，错过了早期事件
3. **React 闭包陷阱**: `useEffect` 中的闭包捕获了旧的 store 状态

#### 解决方案

```typescript
// 1. 使用全局 socket 实例，确保只有一个连接
let globalSocket: Socket | null = null

// 2. 事件监听器立即注册，不需要等待 connect
socket.on('order:status', (data) => {
  // 3. 使用 getState() 获取最新状态，避免闭包问题
  const currentOrder = useDriverStore.getState().currentOrder
})

// 4. 服务端使用 Map 跟踪司机的当前 socket
const driverCurrentSocket = new Map<string, string>()
```

**关键代码**: [apps/driver/src/hooks/useSocket.ts](apps/driver/src/hooks/useSocket.ts)

---

### 2. 多端定位问题

#### 问题描述
Electron 应用无法获取真实 GPS 位置，IP 定位精度不足。

#### 解决方案
实现多级定位策略：

```typescript
// 定位优先级：
// 1. macOS CoreLocation (通过原生模块)
// 2. HTML5 navigator.geolocation
// 3. 高德 Geolocation 插件 (IP 定位)
// 4. 高德 CitySearch (城市级定位)

const tryCoreLocation = async () => {
  if (!window.electronAPI?.getNativeLocation) return false
  const result = await window.electronAPI.getNativeLocation()
  // ...
}

tryCoreLocation()
  .then((ok) => { if (!ok) return tryHTML5() })
  .then((ok) => { if (!ok) locateWithAmap() })
```

**关键代码**:
- [apps/passenger/src/pages/HomePage.tsx](apps/passenger/src/pages/HomePage.tsx) - `handleMapReady`
- [apps/driver/src/pages/Home/Home.tsx](apps/driver/src/pages/Home/Home.tsx) - `handleMapReady`

---

### 3. 预设地点坐标错误

#### 问题描述
热门目的地使用硬编码坐标，与实际位置偏差较大。

#### 解决方案
改用高德 PlaceSearch API 动态获取真实坐标：

```typescript
// 从硬编码:
const presetDestinations = [
  { name: '义乌站', lng: 120.0743, lat: 29.3063 }, // 坐标可能不准
]

// 改为动态获取:
const presetDestinationNames = ['义乌站', '义乌国际商贸城', ...]

useEffect(() => {
  for (const name of presetDestinationNames) {
    placeSearch.search(name, (status, result) => {
      if (status === 'complete') {
        const poi = result.poiList.pois[0]
        results.push({
          name,
          lat: poi.location.getLat(),
          lng: poi.location.getLng()
        })
      }
    })
  }
}, [mapReady])
```

---

### 4. 司机路线模拟

#### 问题描述
路线模拟速度过慢，测试体验不佳。

#### 解决方案
根据实际距离动态计算移动参数：

```typescript
// 模拟速度: 每秒移动 0.5km (30km/h)
const stepDist = 0.1  // km (每步 100m)
const stepInterval = 200  // ms
const totalSteps = Math.ceil(distKm / stepDist)

// 到达时间动态计算
const arrivalDelay = Math.max(3000, Math.round(distKm * 1000 / 8.3))
```

---

### 5. 时间显示不更新

#### 问题描述
状态栏时间只显示初始值，不会实时更新。

#### 原因
直接在 JSX 中调用 `new Date()`，没有触发重新渲染。

#### 解决方案

```typescript
const [currentTime, setCurrentTime] = useState(new Date())

useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date())
  }, 1000)
  return () => clearInterval(timer)
}, [])

// JSX
<span>{currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
```

---

### 6. Socket 事件广播问题

#### 问题描述
同一司机多次连接时，旧连接仍能收到事件。

#### 解决方案

```typescript
// 服务端跟踪司机的当前 socket
const driverCurrentSocket = new Map<string, string>()

socket.on('driver:online', (data) => {
  // 断开旧连接
  const oldSocketId = driverCurrentSocket.get(driverId)
  if (oldSocketId && oldSocketId !== socket.id) {
    const oldSocket = io.sockets.sockets.get(oldSocketId)
    if (oldSocket) {
      oldSocket.leave(`driver:${driverId}`)
    }
  }
  driverCurrentSocket.set(driverId, socket.id)
})
```

---

### 7. 地图组件封装

#### 问题描述
乘客端和司机端都需要地图功能，代码重复。

#### 解决方案
抽取共享 UI 组件库：

```typescript
// packages/ui/src/MapView.tsx
<MapView amapKey={key} center={center} zoom={zoom}>
  <MapMarker position={pos} type="origin" label="上车点" />
  <MapMarker position={pos} type="destination" label="目的地" />
  <MapMarker position={pos} type="driver" label="司机" />
  <MapRoute origin={from} destination={to} color="#1890ff" />
</MapView>
```

---

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Electron Apps                        │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │   乘客端 (5173)   │          │   司机端 (5174)   │        │
│  │  React + Zustand │          │  React + Zustand │        │
│  └────────┬─────────┘          └────────┬─────────┘        │
│           │                              │                  │
│           └──────────────┬───────────────┘                  │
│                          │                                  │
│                   Socket.io Client                         │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server (3000)                            │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │  REST API      │  │  Socket.io     │                    │
│  │  Express.js    │  │  实时通信       │                    │
│  └───────┬────────┘  └───────┬────────┘                    │
│          │                   │                              │
│          └─────────┬─────────┘                              │
│                    ▼                                        │
│           ┌────────────────┐                               │
│           │  Memory Store  │                               │
│           │  订单/司机数据  │                               │
│           └────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP Request
                           ▼
              ┌────────────────────────┐
              │   高德地图 Web API     │
              │   - 地理编码           │
              │   - 路线规划           │
              │   - POI 搜索          │
              └────────────────────────┘
```

---

## 未来优化方向

- [ ] 支持多司机多乘客模式
- [ ] 添加数据库持久化
- [ ] 实现真实的支付流程
- [ ] 添加消息推送服务
- [ ] 支持多城市切换

---

## License

MIT License