import { Router } from 'express'
import { z } from 'zod'
import { success, error } from '../types'
import { authSessions, users, createUser, findUserByPhone } from '../store'
import { authMiddleware, generateToken } from '../middleware/auth'

const router = Router()

// Validation schemas
const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number')
})

const verifyCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, 'Invalid phone number'),
  code: z.string().length(6, 'Verification code must be 6 digits')
})

// POST /api/auth/send-code - Send verification code
router.post('/send-code', (req, res) => {
  const result = sendCodeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { phone } = result.data

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  // Store session (expires in 5 minutes)
  authSessions.set(phone, {
    phone,
    code,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000)
  })

  // In production, send SMS here
  console.log(`[SMS] Code for ${phone}: ${code}`)

  res.json(success({ phone }, 'Verification code sent'))
})

// POST /api/auth/verify - Verify code and login
router.post('/verify', (req, res) => {
  const result = verifyCodeSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json(error(result.error.errors[0].message))
    return
  }

  const { phone, code } = result.data

  // Check session
  const session = authSessions.get(phone)
  if (!session) {
    res.status(400).json(error('Please request a new verification code'))
    return
  }

  // Check expiration
  if (session.expiresAt < new Date()) {
    authSessions.delete(phone)
    res.status(400).json(error('Verification code expired'))
    return
  }

  // Verify code
  if (session.code !== code) {
    res.status(400).json(error('Invalid verification code'))
    return
  }

  // Clean up session
  authSessions.delete(phone)

  // Find or create user
  let user = findUserByPhone(phone)
  if (!user) {
    user = createUser(phone)
  }

  // Generate JWT
  const token = generateToken({
    userId: user.id,
    phone: user.phone
  })

  res.json(success({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      avatar: user.avatar
    },
    token
  }, 'Login successful'))
})

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, (req, res) => {
  const user = users.get(req.user!.userId)
  if (!user) {
    res.status(404).json(error('User not found'))
    return
  }

  res.json(success({
    id: user.id,
    phone: user.phone,
    name: user.name,
    avatar: user.avatar
  }))
})

// POST /api/auth/logout - Logout
router.post('/logout', authMiddleware, (req, res) => {
  // In production, invalidate token in Redis or similar
  res.json(success(null, 'Logged out successfully'))
})

export default router
