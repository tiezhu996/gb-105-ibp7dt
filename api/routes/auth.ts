import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/index.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'anime-market-secret-key'

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body

  if (!username || !email || !password) {
    res.status(400).json({ success: false, error: '请填写完整信息' })
    return
  }

  try {
    const existingUser = db
      .prepare('SELECT * FROM users WHERE username = ? OR email = ?')
      .get(username, email)

    if (existingUser) {
      res.status(400).json({ success: false, error: '用户名或邮箱已存在' })
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const result = db
      .prepare(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      )
      .run(username, email, hashedPassword)

    const token = jwt.sign(
      {
        id: result.lastInsertRowid,
        username,
        email,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: result.lastInsertRowid,
          username,
          email,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body

  if (!username || !password) {
    res.status(400).json({ success: false, error: '请填写用户名和密码' })
    return
  }

  try {
    const user: any = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username)

    if (!user) {
      res.status(400).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      res.status(400).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    )

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          rating: user.rating,
          review_count: user.review_count,
        },
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get(
  '/profile',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user: any = db
        .prepare(
          'SELECT id, username, email, avatar, rating, review_count, created_at FROM users WHERE id = ?',
        )
        .get(req.user?.id)

      if (!user) {
        res.status(404).json({ success: false, error: '用户不存在' })
        return
      }

      res.json({ success: true, data: user })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取用户信息失败' })
    }
  },
)

router.post('/logout', (req: Request, res: Response): void => {
  res.json({ success: true, message: '退出成功' })
})

export default router

