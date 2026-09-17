import { Router, type Request, type Response } from 'express'
import db from '../db/index.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post(
  '/',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { order_id, reviewee_id, rating, comment } = req.body

      if (!order_id || !reviewee_id || !rating) {
        res.status(400).json({ success: false, error: '参数不完整' })
        return
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ success: false, error: '评分范围1-5' })
        return
      }

      const order: any = db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .get(order_id)

      if (!order) {
        res.status(404).json({ success: false, error: '订单不存在' })
        return
      }

      if (order.status !== 'completed') {
        res.status(400).json({ success: false, error: '订单未完成' })
        return
      }

      if (
        order.buyer_id !== req.user?.id && order.seller_id !== req.user?.id
      ) {
        res.status(403).json({ success: false, error: '无权限评价' })
        return
      }

      const existingReview = db
        .prepare(
          'SELECT * FROM reviews WHERE order_id = ? AND reviewer_id = ?',
        )
        .get(order_id, req.user?.id)

      if (existingReview) {
        res.status(400).json({ success: false, error: '已评价过此订单' })
        return
      }

      db.prepare(
        'INSERT INTO reviews (order_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      ).run(order_id, req.user?.id, reviewee_id, rating, comment || '')

      const reviews: any[] = db
        .prepare('SELECT * FROM reviews WHERE reviewee_id = ?')
        .all(reviewee_id) as any[]

      const totalRating = reviews.reduce((sum: number, r: any) => {
        return sum + Number(r.rating || 0)
      }, 0)
      const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0

      db.prepare(
        'UPDATE users SET rating = ?, review_count = ? WHERE id = ?',
      ).run(avgRating.toFixed(1), reviews.length, reviewee_id)

      res.status(201).json({ success: true, message: '评价成功' })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '评价失败' })
    }
  },
)

router.get(
  '/user/:userId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params

      const reviews = db
        .prepare(
          `
        SELECT r.*, u.username as reviewer_name, u.avatar as reviewer_avatar
        FROM reviews r
        JOIN users u ON r.reviewer_id = u.id
        WHERE r.reviewee_id = ?
        ORDER BY r.created_at DESC
      `,
        )
        .all(userId)

      res.json({ success: true, data: reviews })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取评价失败' })
    }
  },
)

router.get(
  '/order/:orderId',
  authenticateToken,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params

      const review = db
        .prepare('SELECT * FROM reviews WHERE order_id = ? AND reviewer_id = ?')
        .get(orderId, req.user?.id)

      res.json({ success: true, data: review || null })
    } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, error: '获取评价失败' })
    }
  },
)

export default router
