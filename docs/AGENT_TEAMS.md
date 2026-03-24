# Agent Teams 并行开发方案

> 核心原则：**职责分离，文件隔离，避免冲突**

---

## 一、Agent 职责划分（4个并行Agent）

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Teams 架构图                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │   Agent 1    │  │   Agent 2    │  │   Agent 3    │  │   Agent 4    │
│  │              │  │              │  │              │  │              │
│  │  主进程架构   │  │  地图模块    │  │  订单系统    │  │  用户系统    │
│  │  Electron    │  │  Map Core    │  │  Order Sys   │  │  User Auth   │
│  │              │  │              │  │              │  │              │
│  │ electron/    │  │ src/map/     │  │ src/order/   │  │ src/user/    │
│  │ src/main/    │  │ src/geo/     │  │ src/socket/  │  │ src/auth/    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
│        │                 │                 │                 │
│        └─────────────────┴─────────────────┴─────────────────┘
│                                    │
│                          ┌─────────▼─────────┐
│                          │   共享接口层       │
│                          │   src/shared/     │
│                          │   src/types/      │
│                          │   src/hooks/      │
│                          └───────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、文件归属矩阵

| 目录/文件 | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|-----------|:-------:|:-------:|:-------:|:-------:|
| `electron/main.ts` | ✅ | ❌ | ❌ | ❌ |
| `electron/preload.ts` | ✅ | ❌ | ❌ | ❌ |
| `electron/tray.ts` | ✅ | ❌ | ❌ | ❌ |
| `electron/ipc/*.ts` | ✅ | ❌ | ❌ | ❌ |
| `src/components/Map/*` | ❌ | ✅ | ❌ | ❌ |
| `src/components/Geo/*` | ❌ | ✅ | ❌ | ❌ |
| `src/components/Order/*` | ❌ | ❌ | ✅ | ❌ |
| `src/components/Socket/*` | ❌ | ❌ | ✅ | ❌ |
| `src/components/User/*` | ❌ | ❌ | ❌ | ✅ |
| `src/components/Auth/*` | ❌ | ❌ | ❌ | ✅ |
| `src/pages/Home/*` | ❌ | ✅ | ✅ | ❌ |
| `src/pages/Login/*` | ❌ | ❌ | ❌ | ✅ |
| `src/pages/Orders/*` | ❌ | ❌ | ✅ | ❌ |
| `src/pages/Profile/*` | ❌ | ❌ | ❌ | ✅ |
| `src/store/mapStore.ts` | ❌ | ✅ | ❌ | ❌ |
| `src/store/orderStore.ts` | ❌ | ❌ | ✅ | ❌ |
| `src/store/userStore.ts` | ❌ | ❌ | ❌ | ✅ |
| `src/services/mapService.ts` | ❌ | ✅ | ❌ | ❌ |
| `src/services/orderService.ts` | ❌ | ❌ | ✅ | ❌ |
| `src/services/authService.ts` | ❌ | ❌ | ❌ | ✅ |
| `src/types/*` | ✅ | ✅ | ✅ | ✅ |
| `src/hooks/*` | ✅ | ✅ | ✅ | ✅ |
| `src/utils/*` | ✅ | ✅ | ✅ | ✅ |
| `src/styles/*` | ❌ | ❌ | ❌ | ❌ |
| `package.json` | ✅ | ❌ | ❌ | ❌ |
| `vite.config.ts` | ✅ | ❌ | ❌ | ❌ |

---

## 三、各 Agent 详细任务

### 🤖 Agent 1: 主进程架构专家

**负责目录**: `electron/`, 根配置文件

**任务清单**:
```
[ ] 1.1 创建 electron/main.ts - 主进程入口
[ ] 1.2 创建 electron/preload.ts - 预加载脚本
[ ] 1.3 创建 electron/tray.ts - 系统托盘
[ ] 1.4 创建 electron/ipc/ - IPC通信层
    ├── auth.ts     - 认证IPC
    ├── order.ts    - 订单IPC
    ├── map.ts      - 地图IPC
    └── notify.ts   - 通知IPC
[ ] 1.5 创建 electron/window.ts - 窗口管理
[ ] 1.6 创建 electron/shortcut.ts - 全局快捷键
[ ] 1.7 配置 vite.config.ts
[ ] 1.8 配置 electron-builder.yml
```

**输出文件结构**:
```
electron/
├── main.ts          # 主进程入口，创建窗口
├── preload.ts       # contextBridge 暴露API
├── tray.ts          # 托盘图标和菜单
├── window.ts        # 窗口管理（主窗口、设置窗口）
├── shortcut.ts      # 全局快捷键注册
└── ipc/
    ├── index.ts     # IPC处理器注册
    ├── auth.ts      # 用户认证IPC
    ├── order.ts     # 订单操作IPC
    ├── map.ts       # 地图相关IPC
    └── notify.ts    # 系统通知IPC
```

**Prompt 模板**:
```
你是 Electron 主进程专家。负责搭建 Electron 应用的核心架构。

【项目背景】
- 滴滴打车桌面应用
- 技术栈: Electron + Vite + React + TypeScript
- 低饱和UI风格

【你的职责】
创建 electron/ 目录下的所有文件，包括：
1. 主进程入口 (main.ts)
2. 预加载脚本 (preload.ts) - 使用 contextBridge
3. 系统托盘 (tray.ts)
4. 窗口管理 (window.ts)
5. IPC 通信层 (ipc/*.ts)
6. 全局快捷键 (shortcut.ts)

【技术要求】
- Electron 28+
- 使用 ESM 模块
- contextIsolation: true
- nodeIntegration: false
- 支持热重载开发模式

【托盘功能】
- 右键菜单: 快速叫车、我的订单、设置、退出
- 双击显示/隐藏主窗口
- 未读消息提示

【快捷键】
- Cmd/Ctrl + Shift + D: 快速叫车
- Cmd/Ctrl + Shift + O: 我的订单
- ESC: 最小化到托盘

请开始创建这些文件。
```

---

### 🗺️ Agent 2: 地图与定位专家

**负责目录**: `src/components/Map/`, `src/components/Geo/`, `src/map/`

**任务清单**:
```
[ ] 2.1 创建 src/components/Map/MapView.tsx - 主地图组件
[ ] 2.2 创建 src/components/Map/MapMarker.tsx - 地图标记
[ ] 2.3 创建 src/components/Map/MapRoute.tsx - 路线绘制
[ ] 2.4 创建 src/components/Map/MapSearch.tsx - 地点搜索
[ ] 2.5 创建 src/components/Geo/LocationPicker.tsx - 位置选择器
[ ] 2.6 创建 src/components/Geo/CurrentLocation.tsx - 当前定位
[ ] 2.7 创建 src/map/amap.ts - 高德地图初始化
[ ] 2.8 创建 src/map/geocoder.ts - 地理编码
[ ] 2.9 创建 src/store/mapStore.ts - 地图状态
[ ] 2.10 创建 src/services/mapService.ts - 地图API服务
```

**输出文件结构**:
```
src/
├── components/
│   ├── Map/
│   │   ├── MapView.tsx        # 地图容器
│   │   ├── MapMarker.tsx      # 自定义标记
│   │   ├── MapRoute.tsx       # 路线规划组件
│   │   ├── MapSearch.tsx      # POI搜索
│   │   ├── MapPanel.tsx       # 地图控制面板
│   │   └── index.ts
│   └── Geo/
│       ├── LocationPicker.tsx # 起终点选择
│       ├── CurrentLocation.tsx # 当前位置显示
│       ├── NearbyDrivers.tsx  # 附近车辆显示
│       └── index.ts
├── map/
│   ├── amap.ts               # 高德SDK加载
│   ├── geocoder.ts           # 逆地理编码
│   ├── route.ts              # 路线规划
│   └── types.ts              # 地图类型定义
├── store/
│   └── mapStore.ts           # Zustand store
└── services/
    └── mapService.ts         # 地图相关API
```

**Prompt 模板**:
```
你是地图与定位专家，负责滴滴打车桌面应用的地图模块。

【项目背景】
- 滴滴打车桌面应用
- 使用高德地图 JS API
- 低饱和UI风格

【你的职责】
创建所有地图相关组件和服务：

1. MapView - 主地图组件
   - 高德地图初始化
   - 支持拖拽、缩放
   - 定位到当前位置

2. MapMarker - 自定义标记
   - 乘客标记（蓝色）
   - 司机标记（橙色）
   - 起终点标记

3. MapRoute - 路线规划
   - 起点→终点路线
   - 距离、时间显示
   - 路线动画

4. MapSearch - 地点搜索
   - POI搜索
   - 历史记录
   - 收藏地点

5. LocationPicker - 位置选择器
   - 起点输入（自动定位）
   - 终点输入（搜索选择）
   - 地图点击选点

【技术要求】
- 使用 @amap/amap-jsapi-loader
- react-amap 组件封装
- Zustand 状态管理
- 低饱和配色

【高德API Key】
需要在环境变量配置 VITE_AMAP_KEY

请开始创建这些文件。
```

---

### 📦 Agent 3: 订单与实时通信专家

**负责目录**: `src/components/Order/`, `src/socket/`, `src/order/`

**任务清单**:
```
[ ] 3.1 创建 src/components/Order/OrderCard.tsx - 订单卡片
[ ] 3.2 创建 src/components/Order/OrderStatus.tsx - 订单状态
[ ] 3.3 创建 src/components/Order/CarTypeSelector.tsx - 车型选择
[ ] 3.4 创建 src/components/Order/FareEstimate.tsx - 费用预估
[ ] 3.5 创建 src/components/Order/DriverInfo.tsx - 司机信息
[ ] 3.6 创建 src/components/Socket/SocketProvider.tsx - Socket上下文
[ ] 3.7 创建 src/socket/client.ts - Socket.io客户端
[ ] 3.8 创建 src/socket/events.ts - 事件定义
[ ] 3.9 创建 src/store/orderStore.ts - 订单状态
[ ] 3.10 创建 src/services/orderService.ts - 订单API
```

**输出文件结构**:
```
src/
├── components/
│   ├── Order/
│   │   ├── OrderCard.tsx      # 订单卡片
│   │   ├── OrderStatus.tsx    # 状态显示
│   │   ├── OrderList.tsx      # 订单列表
│   │   ├── OrderDetail.tsx    # 订单详情
│   │   ├── CarTypeSelector.tsx # 车型选择
│   │   ├── FareEstimate.tsx   # 费用预估
│   │   ├── DriverInfo.tsx     # 司机信息卡
│   │   ├── Rating.tsx         # 评价组件
│   │   └── index.ts
│   └── Socket/
│       ├── SocketProvider.tsx # Socket Context
│       ├── useSocket.ts       # Socket Hook
│       └── index.ts
├── socket/
│   ├── client.ts              # Socket.io 客户端
│   ├── events.ts              # 事件常量定义
│   └── types.ts               # Socket类型
├── store/
│   └── orderStore.ts          # 订单状态管理
└── services/
    └── orderService.ts        # 订单API调用
```

**Prompt 模板**:
```
你是订单系统与实时通信专家，负责滴滴打车桌面应用的订单流程。

【项目背景】
- 滴滴打车桌面应用
- Socket.io 实时通信
- 低饱和UI风格

【你的职责】
创建订单相关组件和实时通信模块：

1. CarTypeSelector - 车型选择
   - 快车、专车、出租车
   - 显示预估价格
   - 低饱和图标

2. FareEstimate - 费用预估
   - 里程、时长计算
   - 动态调价显示
   - 优惠券抵扣

3. OrderStatus - 订单状态
   - 等待接单
   - 司机赶来
   - 行程中
   - 已完成

4. DriverInfo - 司机信息
   - 头像、姓名、评分
   - 车牌、车型
   - 一键拨号（加密）

5. SocketProvider - 实时通信
   - 连接管理
   - 事件订阅
   - 断线重连

【Socket事件】
```typescript
// 订单事件
ORDER_CREATE = 'order:create'
ORDER_ACCEPT = 'order:accept'      // 司机接单
ORDER_CANCEL = 'order:cancel'
ORDER_ARRIVE = 'order:arrive'      // 司机到达
ORDER_START = 'order:start'        // 行程开始
ORDER_COMPLETE = 'order:complete'  // 行程结束

// 位置事件
DRIVER_LOCATION = 'driver:location'
```

【技术要求】
- Socket.io-client 4.x
- Zustand 状态管理
- 低饱和配色

请开始创建这些文件。
```

---

### 👤 Agent 4: 用户认证与个人中心专家

**负责目录**: `src/components/User/`, `src/components/Auth/`, `src/user/`

**任务清单**:
```
[ ] 4.1 创建 src/components/Auth/LoginForm.tsx - 登录表单
[ ] 4.2 创建 src/components/Auth/SmsCode.tsx - 验证码输入
[ ] 4.3 创建 src/components/User/Profile.tsx - 个人中心
[ ] 4.4 创建 src/components/User/Wallet.tsx - 钱包
[ ] 4.5 创建 src/components/User/TripHistory.tsx - 行程记录
[ ] 4.6 创建 src/components/User/Settings.tsx - 设置页面
[ ] 4.7 创建 src/auth/token.ts - Token管理
[ ] 4.8 创建 src/auth/guard.ts - 路由守卫
[ ] 4.9 创建 src/store/userStore.ts - 用户状态
[ ] 4.10 创建 src/services/authService.ts - 认证API
```

**输出文件结构**:
```
src/
├── components/
│   ├── Auth/
│   │   ├── LoginForm.tsx      # 登录表单
│   │   ├── SmsCode.tsx        # 验证码输入
│   │   ├── WechatLogin.tsx    # 微信扫码
│   │   └── index.ts
│   └── User/
│       ├── Profile.tsx        # 个人中心
│       ├── Wallet.tsx         # 钱包余额
│       ├── TripHistory.tsx    # 行程记录
│       ├── Settings.tsx       # 设置
│       ├── Coupons.tsx        # 优惠券
│       └── index.ts
├── auth/
│   ├── token.ts               # Token存储管理
│   ├── guard.ts               # 路由守卫
│   └── types.ts               # 认证类型
├── store/
│   └── userStore.ts           # 用户状态
└── services/
    └── authService.ts         # 认证API
```

**Prompt 模板**:
```
你是用户认证与个人中心专家，负责滴滴打车桌面应用的用户模块。

【项目背景】
- 滴滴打车桌面应用
- 手机号+验证码登录
- 低饱和UI风格

【你的职责】
创建用户相关组件和服务：

1. LoginForm - 登录表单
   - 手机号输入（格式验证）
   - 验证码发送/输入
   - 微信登录入口

2. SmsCode - 验证码组件
   - 6位数字输入
   - 倒计时重发
   - 自动聚焦

3. Profile - 个人中心
   - 用户头像、昵称
   - 会员等级
   - 功能入口列表

4. Wallet - 钱包
   - 余额显示
   - 充值入口
   - 交易记录

5. TripHistory - 行程记录
   - 按日期分组
   - 订单详情入口
   - 再次呼叫

6. Settings - 设置
   - 深色模式开关
   - 通知设置
   - 关于我们

【Token管理】
- 使用 electron-store 本地存储
- 自动刷新机制
- 过期处理

【技术要求】
- React Hook Form 表单验证
- Zustand 状态管理
- 低饱和配色

请开始创建这些文件。
```

---

## 四、共享层定义（所有Agent可用）

### 类型定义 `src/types/`

```typescript
// src/types/index.ts

// 用户相关
export interface User {
  id: string
  phone: string
  nickname: string
  avatar: string
  balance: number
}

// 订单相关
export type OrderStatus =
  | 'pending'    // 等待接单
  | 'accepted'   // 已接单
  | 'arriving'   // 司机赶来
  | 'in_trip'    // 行程中
  | 'completed'  // 已完成
  | 'cancelled'  // 已取消

export interface Order {
  id: string
  status: OrderStatus
  startLocation: Location
  endLocation: Location
  carType: CarType
  fare: Fare
  driver?: Driver
  createdAt: string
}

// 地图相关
export interface Location {
  lat: number
  lng: number
  name: string
  address?: string
}

// 司机相关
export interface Driver {
  id: string
  name: string
  avatar: string
  phone: string
  rating: number
  carModel: string
  carPlate: string
  carColor: string
}

// 车型
export type CarType = 'express' | 'premium' | 'taxi'

export interface Fare {
  base: number      // 起步价
  distance: number  // 里程费
  time: number      // 时长费
  total: number     // 总价
}
```

### 通用Hooks `src/hooks/`

```typescript
// src/hooks/useNotification.ts - 系统通知
export function useNotification() {
  const show = (title: string, body: string) => {
    window.electronAPI.notification.show({ title, body })
  }
  return { show }
}

// src/hooks/useDebounce.ts - 防抖
export function useDebounce<T>(value: T, delay: number): T

// src/hooks/useLocalStorage.ts - 本地存储
export function useLocalStorage<T>(key: string, initialValue: T)
```

---

## 五、协作规则

### Git 分支策略

```
main (主分支)
  ├── feature/agent1-electron    # Agent 1 工作分支
  ├── feature/agent2-map         # Agent 2 工作分支
  ├── feature/agent3-order       # Agent 3 工作分支
  └── feature/agent4-user        # Agent 4 工作分支
```

### 合并顺序

1. **Phase 1**: Agent 1 完成主进程 → 合并到 main
2. **Phase 2**: Agent 2-4 并行开发 → 分别合并
3. **Phase 3**: 集成测试 → 修复冲突

### 冲突预防

- 共享类型文件：先由 Agent 1 创建基础类型，其他 Agent 扩展
- 样式文件：每个组件自带样式，避免全局样式冲突
- Store：各 Agent 维护自己的 store，通过 hooks 互相访问

---

## 六、启动 Agent Teams

现在启动 4 个 Agent 并行开发：

```bash
# 在 Claude Code 中执行
# 每个 Agent 使用不同的工作目录或分支
```
