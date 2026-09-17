import { Router, type Request, type Response } from 'express'
import db from '../db/index.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { product_id, type, price } = req.body

      if (!product_id || !type) {
        res.status(400).json({ success: false, error: '参数不完整' })
        return
      }

      const product: any = db
        .prepare('SELECT * FROM products WHERE id = ?')
        .get(product_id)

      if (!product || product.status !== 'active') {
        res.status(400).json({ success: false, error: '商品不可用' })
        return
      }

      if (product.seller_id === req.user?.id) {
        res.status(400).json({ success: false, error: '不能购买自己的商品' })
        return
      }

      const result = db
        .prepare(
          `
        INSERT INTO orders (product_id, buyer_id, seller_id, price, type, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
        )
        .run(
          product_id,
          req.user?.id,
          product.seller_id,
          price || product.price,
          type,
        )

      db.prepare('UPDATE products SET status = ? WHERE id = ?').run(
        'sold',
        product_id,
      )

      const order = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(result.lastInsertRowid)

      res.status(201).json({ success: true, data: order })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '创建订单失败' })
    }
  },
)

router.get(
  '/buyer',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const orders = db
        .prepare(
          `
        SELECT o.*, p.name as product_name, p.photos, u.username as seller_name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u ON o.seller_id = u.id
        WHERE o.buyer_id = ?
        ORDER BY o.created_at DESC
      `,
        )
        .all(req.user?.id)

      res.json({
        success: true,
        data: orders.map((o: any) => ({
          ...o,
          photos: JSON.parse(o.photos),
        })),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取订单失败' })
    }
  },
)

router.get(
  '/seller',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const orders = db
        .prepare(
          `
        SELECT o.*, p.name as product_name, p.photos, u.username as buyer_name
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users u ON o.buyer_id = u.id
        WHERE o.seller_id = ?
        ORDER BY o.created_at DESC
      `,
        )
        .all(req.user?.id)

      res.json({
        success: true,
        data: orders.map((o: any) => ({
          ...o,
          photos: JSON.parse(o.photos),
        })),
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取订单失败' })
    }
  },
)

router.put(
  '/:id/ship',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const order: any = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(id)

      if (!order) {
        res.status(404).json({ success: false, error: '订单不存在' })
        return
      }

      if (order.seller_id !== req.user?.id) {
        res.status(403).json({ success: false, error: '无权限操作' })
        return
      }

      if (order.status !== 'pending') {
        res.status(400).json({ success: false, error: '订单状态不正确' })
        return
      }

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(
        'shipped',
        id,
      )

      res.json({ success: true, message: '发货成功' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '发货失败' })
    }
  },
)

router.put(
  '/:id/receive',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const order: any = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(id)

      if (!order) {
        res.status(404).json({ success: false, error: '订单不存在' })
        return
      }

      if (order.buyer_id !== req.user?.id) {
        res.status(403).json({ success: false, error: '无权限操作' })
        return
      }

      if (order.status !== 'shipped') {
        res.status(400).json({ success: false, error: '订单状态不正确' })
        return
      }

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(
        'completed',
        id,
      )

      res.json({ success: true, message: '确认收货成功' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '确认收货失败' })
    }
  },
)

router.get(
  '/:id',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params

      const order: any = db
        .prepare(
          `
        SELECT o.*, p.name as product_name, p.description as product_description, 
               p.photos, p.ip_name, p.category, p.condition,
               buyer.username as buyer_name, buyer.avatar as buyer_avatar,
               seller.username as seller_name, seller.avatar as seller_avatar
        FROM orders o
        JOIN products p ON o.product_id = p.id
        JOIN users buyer ON o.buyer_id = buyer.id
        JOIN users seller ON o.seller_id = seller.id
        WHERE o.id = ?
      `,
        )
        .get(id)

      if (!order) {
        res.status(404).json({ success: false, error: '订单不存在' })
        return
      }

      if (order.buyer_id !== req.user?.id && order.seller_id !== req.user?.id) {
        res.status(403).json({ success: false, error: '无权限查看' })
        return
      }

      order.photos = JSON.parse(order.photos)

      res.json({ success: true, data: order })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取订单详情失败' })
    }
  },
)

export default router
