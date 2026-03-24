import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { error } from '../types'

const JWT_SECRET = process.env.JWT_SECRET || 'didi-clone-secret-key-2024'

export interface DriverJwtPayload {
  driverId: string
  phone: string
}

declare global {
  namespace Express {
    interface Request {
      driver?: DriverJwtPayload
    }
  }
}

export function driverAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(error('Unauthorized: No token provided'))
    return
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DriverJwtPayload
    req.driver = decoded
    next()
  } catch (err) {
    res.status(401).json(error('Unauthorized: Invalid token'))
    return
  }
}

export function generateDriverToken(payload: DriverJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyDriverToken(token: string): DriverJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DriverJwtPayload
  } catch {
    return null
  }
}