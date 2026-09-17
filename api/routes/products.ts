import { Router, type Request, type Response } from 'express'
import db from '../db/index.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, ip, character } = req.query

    let query = `
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar, u.rating as seller_rating
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active'
    `
    const params: any[] = []

    if (search) {
      query += ' AND (p.ip_name LIKE ? OR p.character_name LIKE ? OR p.name LIKE ?)'
      const searchTerm = `%${search}%`
      params.push(searchTerm, searchTerm, searchTerm)
    }

    if (category && category !== 'all') {
      query += ' AND p.category = ?'
      params.push(category)
    }

    if (ip) {
      query += ' AND p.ip_name LIKE ?'
      params.push(`%${ip}%`)
    }

    if (character) {
      query += ' AND p.character_name LIKE ?'
      params.push(`%${character}%`)
    }

    query += ' ORDER BY p.created_at DESC'

    const products = db.prepare(query).all(...params)

    res.json({
      success: true,
      data: products.map((p: any) => ({
        ...p,
        photos: JSON.parse(p.photos),
      })),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: '获取商品列表失败' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const product: any = db
      .prepare(
        `
      SELECT p.*, u.username as seller_name, u.avatar as seller_avatar, u.rating as seller_rating, u.review_count as seller_review_count
      FROM products p
      JOIN users u ON p.seller_id = u.id
      WHERE p.id = ?
    `,
      )
      .get(id)

    if (!product) {
      res.status(404).json({ success: false, error: '商品不存在' })
      return
    }

    product.photos = JSON.parse(product.photos)

    res.json({ success: true, data: product })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: '获取商品详情失败' })
  }
})

router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        description,
        ip_name,
        character_name,
        category,
        condition,
        price,
        exchange_intent,
        photos,
      } = req.body

      if (
        !name ||
        !ip_name ||
        !category ||
        !condition ||
        !price ||
        !photos ||
        photos.length === 0
      ) {
        res.status(400).json({ success: false, error: '请填写完整信息' })
        return
      }

      const result = db
        .prepare(
          `
        INSERT INTO products (seller_id, name, description, ip_name, character_name, category, condition, price, exchange_intent, photos)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          req.user?.id,
          name,
          description || '',
          ip_name,
          character_name || '',
          category,
          condition,
          price,
          exchange_intent || '',
          JSON.stringify(photos),
        )

      const product = db
        .prepare('SELECT * FROM products WHERE id = ?')
        .get(result.lastInsertRowid)

      res.status(201).json({ success: true, data: product })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '发布商品失败' })
    }
  },
)

router.get(
  '/user/my',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const products = db
        .prepare('SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC')
        .all(req.user?.id)

      res.json({
        success: true,
        data: products.map((p: any) => ({
          ...p,
          photos: JSON.parse(p.photos),
        })),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取我的发布失败' })
    }
  },
)

router.put(
  '/:id/status',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const { status } = req.body

      const product: any = db
        .prepare('SELECT * FROM products WHERE id = ?')
        .get(id)

      if (!product) {
        res.status(404).json({ success: false, error: '商品不存在' })
        return
      }

      if (product.seller_id !== req.user?.id) {
        res.status(403).json({ success: false, error: '无权限操作' })
        return
      }

      db.prepare('UPDATE products SET status = ? WHERE id = ?').run(status, id)

      res.json({ success: true, message: '状态更新成功' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '更新状态失败' })
    }
  },
)

export default router
