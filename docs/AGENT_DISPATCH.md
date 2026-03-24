# Agent Teams 并行开发方案

> **核心原则**：职责分离、文件隔离、避免冲突、持续提交

---

## 一、项目结构（Monorepo）

```
didi-desktop/
├── apps/                         # 三端应用
│   ├── passenger/               # 🚶 用户端 (乘客)
│   ├── driver/                  # 🚗 司机端
│   └── admin/                   # 👨‍💼 管理端
├── packages/                     # 共享包
│   ├── shared/                  # 共享类型/工具
│   ├── ui/                      # 共享 UI 组件
│   └── api-client/              # API 客户端
├── server/                       # 后端服务器
├── docs/                         # 文档
└── turbo.json                   # Turborepo 配置
```

---

## 二、Agent 职责矩阵

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Agent 职责分发矩阵                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   Agent 1       │  │   Agent 2       │  │   Agent 3       │         │
│  │   🏗️ 基础架构    │  │   🗺️ 地图核心    │  │   📦 订单系统    │         │
│  │                 │  │                 │  │                 │         │
│  │  Monorepo 搭建   │  │  高德地图集成    │  │  订单状态机      │         │
│  │  Electron 配置   │  │  定位选点       │  │  实时追踪        │         │
│  │  共享包         │  │  路线绘制       │  │  Socket 通信     │         │
│  │                 │  │  移动动画       │  │                 │         │
│  │  📁 负责目录:    │  │  📁 负责目录:    │  │  📁 负责目录:    │         │
│  │  - /            │  │  - packages/ui/ │  │  - packages/    │         │
│  │  - packages/    │  │    Map/         │  │    api-client/  │         │
│  │  - turbo.json   │  │  - apps/*/      │  │  - server/      │         │
│  │  - pnpm-workspace│  │    components/  │  │                 │         │
│  │                 │  │    Map/         │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   Agent 4       │  │   Agent 5       │  │   Agent 6       │         │
│  │   👤 用户系统    │  │   🚗 司机端      │  │   👨‍💼 管理端      │         │
│  │                 │  │                 │  │                 │         │
│  │  登录认证       │  │  司机接单       │  │  订单监控        │         │
│  │  用户信息       │  │  导航功能       │  │  数据统计        │         │
│  │  个人中心       │  │  收入管理       │  │  司机管理        │         │
│  │                 │  │                 │  │                 │         │
│  │  📁 负责目录:    │  │  📁 负责目录:    │  │  📁 负责目录:    │         │
│  │  - apps/passenger│  │  - apps/driver/ │  │  - apps/admin/  │         │
│  │    /components/ │  │                 │  │                 │         │
│  │    User/        │  │                 │  │                 │         │
│  │  - server/routes│  │                 │  │                 │         │
│  │    /auth.ts     │  │                 │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 三、Git 分支策略

```
main (主分支 - 稳定版本)
  │
  ├── develop (开发分支)
  │     │
  │     ├── feature/agent1-infrastructure   # Agent 1: 基础架构
  │     ├── feature/agent2-map              # Agent 2: 地图模块
  │     ├── feature/agent3-order            # Agent 3: 订单系统
  │     ├── feature/agent4-user             # Agent 4: 用户系统
  │     ├── feature/agent5-driver           # Agent 5: 司机端
  │     └── feature/agent6-admin            # Agent 6: 管理端
  │
  └── release/* (发布分支)
```

---

## 四、文件归属矩阵

| 目录/文件 | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 | Agent 6 |
|-----------|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|
| `package.json` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `turbo.json` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `pnpm-workspace.yaml` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `packages/shared/` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `packages/ui/Map/` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `packages/api-client/` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `server/` | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ |
| `apps/passenger/` | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `apps/driver/` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `apps/admin/` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |

---

## 五、开发阶段划分

### Phase 1: 基础架构 (Agent 1 主导)
```
Week 1 Day 1-2
├── Monorepo 初始化
├── Electron 配置
├── 共享包搭建
├── Git 工作流配置
└── CI/CD 配置
```

### Phase 2: 核心功能 (Agent 2-4 并行)
```
Week 1 Day 3-5
├── Agent 2: 地图 + 定位
├── Agent 3: 订单系统 + Socket
├── Agent 4: 用户认证
└── 每日同步合并
```

### Phase 3: 三端开发 (Agent 4-6 并行)
```
Week 2
├── Agent 4: 用户端 UI
├── Agent 5: 司机端
├── Agent 6: 管理端
└── 集成测试
```

---

## 六、提交规范

每个 Agent 提交时使用统一格式：

```
<agent-id>: <type>: <description>

Agent ID:
- a1: Agent 1 (基础架构)
- a2: Agent 2 (地图核心)
- a3: Agent 3 (订单系统)
- a4: Agent 4 (用户系统)
- a5: Agent 5 (司机端)
- a6: Agent 6 (管理端)

Type:
- feat: 新功能
- fix: 修复
- refactor: 重构
- docs: 文档
- test: 测试

示例:
a1: feat: 初始化 Monorepo 结构
a2: feat: 集成高德地图组件
a3: feat: 实现订单状态机
```

---

## 七、同步机制

### 每日同步点
```
09:00 - 各 Agent 拉取最新 develop
12:00 - 中午合并检查点
18:00 - 日终合并 + 解决冲突
```

### 冲突解决优先级
1. `packages/shared/` - Agent 1 决定
2. `packages/ui/` - Agent 2 决定
3. 其他 - 涉及 Agent 协商

---

## 八、启动命令

```bash
# 初始化项目
pnpm install

# 启动用户端
pnpm --filter @didi/passenger dev

# 启动司机端
pnpm --filter @didi/driver dev

# 启动管理端
pnpm --filter @didi/admin dev

# 启动服务器
pnpm --filter @didi/server dev

# 启动所有
pnpm dev
```
