import { Router } from 'express'
import { z } from 'zod'
import { success, error } from '../types'
import { driverAuthSessions, validateDriverCredentials, findDriverByPhone, getDriverById } from '../store'
import { driverAuthMiddleware, generateDriverToken } from '../middleware/driverAuth'

const router = Router()

// Validation schemas
const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  password: z.string().min(1, 'Password is required')
})

const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number')
})

const verifyCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  code: z.string().length(6, 'Verification code must be 6 digits')
})

// POST /api/driver/auth/login - Password login
router.post('/login', (req, res) => {
  const result = loginSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { phone, password } = result.data

  // Validate credentials
  const driver = validateDriverCredentials(phone, password)
  if (!driver) {
    res.status(401).json(error('手机号或密码错误'))
    return
  }

  // Generate JWT
  const token = generateDriverToken({
    driverId: driver.id,
    phone: driver.phone
  })

  console.log(`[司机登录] ${driver.name} (${driver.id}) 登录成功`)

  res.json(success({
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      avatar: driver.avatar,
      carModel: driver.carModel,
      carPlate: driver.carPlate,
      rating: driver.rating
    },
    token
  }, '登录成功'))
})

// POST /api/driver/auth/send-code - Send verification code
router.post('/send-code', (req, res) => {
  const result = sendCodeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { phone } = result.data

  // Check if driver exists
  const driverData = findDriverByPhone(phone)
  if (!driverData) {
    res.status(404).json(error('该手机号未注册为司机'))
    return
  }

  // Generate 6-digit code (use fixed code "123456" for development)
  const code = process.env.NODE_ENV === 'production'
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456'

  // Store session (expires in 5 minutes)
  driverAuthSessions.set(phone, {
    phone,
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  })

  // In production, send SMS here
  console.log(`[SMS] 司机验证码 ${phone}: ${code}`)

  res.json(success({ phone }, '验证码已发送'))
})

// POST /api/driver/auth/verify - Verify code and login
router.post('/verify', (req, res) => {
  const result = verifyCodeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { phone, code } = result.data

  // Check session
  const session = driverAuthSessions.get(phone)
  if (!session) {
    res.status(400).json(error('请先获取验证码'))
    return
  }

  // Check expiration
  if (session.expiresAt < new Date()) {
    driverAuthSessions.delete(phone)
    res.status(400).json(error('验证码已过期'))
    return
  }

  // Verify code
  if (session.code !== code) {
    res.status(400).json(error('验证码错误'))
    return
  }

  // Clean up session
  driverAuthSessions.delete(phone)

  // Get driver
  const driverData = findDriverByPhone(phone)
  if (!driverData) {
    res.status(404).json(error('司机不存在'))
    return
  }

  const { driver } = driverData

  // Generate JWT
  const token = generateDriverToken({
    driverId: driver.id,
    phone: driver.phone
  })

  console.log(`[司机登录] ${driver.name} (${driver.id}) 验证码登录成功`)

  res.json(success({
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      avatar: driver.avatar,
      carModel: driver.carModel,
      carPlate: driver.carPlate,
      rating: driver.rating
    },
    token
  }, '登录成功'))
})

// GET /api/driver/auth/me - Get current driver
router.get('/me', driverAuthMiddleware, (req, res) => {
  const driver = getDriverById(req.driver!.driverId)
  if (!driver) {
    res.status(404).json(error('司机不存在'))
    return
  }

  res.json(success({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    avatar: driver.avatar,
    carModel: driver.carModel,
    carPlate: driver.carPlate,
    rating: driver.rating,
    location: driver.location,
    status: driver.status
  }))
})

// POST /api/driver/auth/logout - Logout
router.post('/logout', driverAuthMiddleware, (req, res) => {
  console.log(`[司机登出] ${req.driver!.driverId} 登出`)
  res.json(success(null, '登出成功'))
})

export default router