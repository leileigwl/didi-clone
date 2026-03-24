import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import authRoutes from './routes/auth'
import orderRoutes from './routes/orders'
import driverRoutes, { setSocketServer } from './routes/drivers'
import adminRoutes from './routes/admin'
import { setupSocket } from './socket'
import { initMockData } from './store'

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
app.use('/api/orders', orderRoutes)
app.use('/api/drivers', driverRoutes)
app.use('/api/admin', adminRoutes)

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
