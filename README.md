# 滴滴打车桌面应用 (DiDi Clone)

一个基于 Electron + React + TypeScript 的滴滴打车桌面应用克隆项目，包含乘客端、司机端和管理后台。

## 🚀 功能特性

### 乘客端 (Passenger App)
- 🗺️ 实时高德地图显示
- 📍 位置选择与路线规划
- 🚗 一键叫车
- 📱 订单状态实时追踪
- 💰 价格预估

### 司机端 (Driver App)
- 🗺️ 深色主题地图界面
- 📍 实时定位追踪
- 🚗 在线/离线状态切换
- 📋 订单接单与管理
- 💵 收入统计

### 管理后台 (Admin Dashboard)
- 📊 数据统计面板
- 👥 用户管理
- 🚗 司机管理
- 📋 订单管理

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript 5
- **桌面应用**: Electron 28 + electron-vite 2
- **地图服务**: 高德地图 JS API 2.0
- **状态管理**: Zustand
- **样式方案**: CSS Modules
- **后端服务**: Express.js + Socket.io
- **构建工具**: Turborepo + pnpm

## 📁 项目结构

```
didi-clone/
├── apps/
│   ├── passenger/          # 乘客端 Electron 应用
│   ├── driver/             # 司机端 Electron 应用
│   └── admin/              # 管理后台 Web 应用
├── packages/
│   ├── ui/                 # 共享 UI 组件库
│   └── api-client/         # API 客户端
├── server/                 # 后端服务
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 配置高德地图 Key

在 `apps/passenger/.env` 和 `apps/driver/.env` 中配置高德地图 API Key：

```env
VITE_AMAP_KEY=your_amap_key_here
VITE_AMAP_SECURITY_CODE=your_security_code_here
```

获取 Key: [高德开放平台](https://console.amap.com/dev/key/app)

### 启动开发服务器

```bash
# 启动后端服务
cd server && pnpm dev

# 启动乘客端 (新终端)
cd apps/passenger && pnpm dev

# 启动司机端 (新终端)
cd apps/driver && pnpm dev

# 启动管理后台 (新终端)
cd apps/admin && pnpm dev
```

## 📸 应用截图

### 乘客端

![乘客端首页](./screenshots/passenger-home.png)
*乘客端首页 - 地图与叫车界面*

![乘客端订单](./screenshots/passenger-order.png)
*乘客端订单 - 实时追踪司机位置*

### 司机端

![司机端首页](./screenshots/driver-home.png)
*司机端首页 - 在线状态与地图*

![司机端订单](./screenshots/driver-order.png)
*司机端订单 - 导航与订单详情*

### 管理后台

![管理后台](./screenshots/admin-dashboard.png)
*管理后台 - 数据统计面板*

## 🔧 开发说明

### 端口配置

| 服务 | 端口 |
|------|------|
| 后端 API | 3000 |
| 乘客端 | 5173 |
| 司机端 | 5174 |
| 管理后台 | 5175 |

### 环境变量

| 变量名 | 说明 |
|--------|------|
| VITE_AMAP_KEY | 高德地图 API Key |
| VITE_AMAP_SECURITY_CODE | 高德地图安全密钥 |

## 📝 License

MIT License