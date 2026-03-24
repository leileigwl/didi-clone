import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { error } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'didi-clone-secret-key-2024'

export interface JwtPayload {
  userId: string
  phone: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(error('Unauthorized: No token provided'))
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    req.user = decoded
    next()
  } catch (err) {
    res.status(401).json(error('Unauthorized: Invalid token'))
    return
  }
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload
  } catch {
    return null
  }
}
