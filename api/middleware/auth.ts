import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'anime-market-secret-key'

export interface AuthRequest extends Request {
  user?: {
    id: number
    username: string
    email: string
  }
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    res.status(401).json({ success: false, error: '未登录' })
    return
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as {
      id: number
      username: string
      email: string
    }
    req.user = user
    next()
  } catch (error) {
    res.status(403).json({ success: false, error: 'Token无效' })
  }
}
