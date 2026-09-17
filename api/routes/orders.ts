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

      // 下单与占品在同一事务内完成，条件更新保证只有一个请求能把商品从在售变为售出，
      // 从而同一商品同时只存在一笔有效订单（取消闭环的前提）。
      const placeOrder = db.transaction(() => {
        const reserve = db
          .prepare(
            "UPDATE products SET status = 'sold' WHERE id = ? AND status = 'active'",
          )
          .run(product_id)

        if (reserve.changes === 0) {
          return { error: '商品已被下单或不可用' }
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

        return { orderId: result.lastInsertRowid }
      })

      const placed: any = placeOrder()

      if (placed.error) {
        res.status(400).json({ success: false, error: placed.error })
        return
      }

      const order = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(placed.orderId)

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

      // 条件原子更新：仅当订单仍为待发货时才能发货成功。
      // 若取消已抢先提交，changes 为 0，发货失败；发货成功后取消也将因状态不符而失败。
      const ship = db.transaction(() => {
        const result = db
          .prepare(
            "UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'pending'",
          )
          .run(id)

        if (result.changes === 0) {
          return false
        }

        // 发货后商品保持售出，不做任何状态变更
        return true
      })

      if (!ship()) {
        res.status(400).json({ success: false, error: '订单已取消或状态已变更，无法发货' })
        return
      }

      res.json({ success: true, message: '发货成功' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '发货失败' })
    }
  },
)

router.put(
  '/:id/cancel',
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

      if (order.buyer_id !== req.user?.id && order.seller_id !== req.user?.id) {
        res.status(403).json({ success: false, error: '无权限操作' })
        return
      }

      // 买卖双方仅可在待发货时取消；已发货/已完成/已取消都不能再取消。
      if (order.status !== 'pending') {
        const message =
          order.status === 'shipped'
            ? '订单已发货，不能取消'
            : order.status === 'completed'
              ? '订单已完成，不能取消'
              : '订单已取消，请勿重复操作'
        res.status(400).json({ success: false, error: message })
        return
      }

      // 取消闭环在同一事务内完成：
      // 1) 条件更新保证订单只有一笔待发货→已取消的迁移（取消与发货互斥、重复取消失败）；
      // 2) 仅当订单确实迁移成功才恢复商品，且条件限定商品当前为售出，
      //    因此商品至多恢复一次在售，重复取消/失败重试都不会再次释放商品。
      const cancel = db.transaction(() => {
        const orderResult = db
          .prepare(
            "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
          )
          .run(id)

        if (orderResult.changes === 0) {
          return { ok: false as const, reason: 'changed' }
        }

        const productResult = db
          .prepare(
            "UPDATE products SET status = 'active' WHERE id = ? AND status = 'sold'",
          )
          .run(order.product_id)

        return { ok: true as const, restored: productResult.changes > 0 }
      })

      const result = cancel()

      if (!result.ok) {
        res.status(400).json({
          success: false,
          error: '订单已发货或状态已变更，无法取消',
        })
        return
      }

      res.json({
        success: true,
        message: '订单已取消，商品已恢复在售',
        data: { product_restored: result.restored },
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '取消订单失败' })
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
