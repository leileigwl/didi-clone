import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import authRoutes from './routes/auth'
import driverAuthRoutes from './routes/driverAuth'
import orderRoutes, { setSocketServerForOrders } from './routes/orders'
import driverRoutes, { setSocketServer } from './routes/drivers'
import adminRoutes from './routes/admin'
import { setupSocket } from './socket'
import { initMockData } from './store'

// 高德地图 REST API Key（Web服务类型）
const AMAP_REST_KEY = process.env.AMAP_REST_KEY || 'fadd42f67d5cc584808b19e95b0a485a'

const app = express()
const httpServer = createServer(app)

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}))
app.use(express.json())

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  next()
})

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    },
    message: 'Server is healthy'
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/driver/auth', driverAuthRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/admin', adminRoutes)

// 高德地图 REST API 代理（避免前端跨域，使用 JSONP）
app.get('/api/amap/distance', async (req, res) => {
  try {
    const { origins, destination, type } = req.query
    if (!origins || !destination) {
      return res.status(400).json({ code: 1, message: 'Missing origins or destination' })
    }
    const resp = await fetch(
      `https://restapi.amap.com/v3/distance?key=${AMAP_REST_KEY}&origins=${origins}&destination=${destination}&type=${type || '1'}&output=JSON`
    )
    const data = await resp.json()
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ code: 1, message: e.message })
  }
})

app.get('/api/amap/direction/driving', async (req, res) => {
  try {
    const { origin, destination, strategy } = req.query
    if (!origin || !destination) {
      return res.status(400).json({ code: 1, message: 'Missing origin or destination' })
    }
    const resp = await fetch(
      `https://restapi.amap.com/v3/direction/driving?key=${AMAP_REST_KEY}&origin=${origin}&destination=${destination}&strategy=${strategy || '0'}&extensions=all&output=JSON`
    )
    const data = await resp.json()
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ code: 1, message: e.message })
  }
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    data: null,
    message: 'Not found'
  })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
 res.status(500).json({
    code: 500,
    data: null,
    message: err.message
  })
})

// Initialize
initMockData()
setSocketServer(io)
setSocketServerForOrders(io)
setupSocket(io)

// Start server
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`
  ========================================
    Didi Clone Server
    Running on http://localhost:${PORT}
    Environment: ${process.env.NODE_ENV || 'development'}
  ========================================
  `)
})

export { app, httpServer, io }
