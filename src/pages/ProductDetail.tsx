import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { productAPI, orderAPI } from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  ArrowLeft,
  Star,
  User,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  RefreshCw,
  Tag,
  Package,
  Info,
} from 'lucide-react'

const conditionMap: Record<string, string> = {
  new: '全新',
  like_new: '几乎全新',
  good: '品相良好',
  fair: '一般',
}

const categoryMap: Record<string, string> = {
  figure: '手办',
  badge: '吧唧',
  card: '卡牌',
  poster: '海报',
  book: '漫画',
  clothing: '服饰',
  other: '其他',
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<any>(null)
  const [currentPhoto, setCurrentPhoto] = useState(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const res = await productAPI.getProduct(parseInt(id!))
      setProduct(res.data.data)
    } catch (error) {
      console.error('Failed to load product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBuy = async (type: 'buy' | 'exchange') => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    setBuying(true)
    try {
      await orderAPI.createOrder({
        product_id: parseInt(id!),
        type,
        price: product.price,
      })
      alert(type === 'buy' ? '下单成功！请在订单管理中查看' : '交换请求已发送！')
      navigate('/profile')
    } catch (error: any) {
      alert(error.response?.data?.error || '操作失败')
    } finally {
      setBuying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <p className="text-gray-500 mb-4">商品不存在</p>
        <Link to="/" className="text-purple-500 hover:underline">
          返回首页
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {product.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-28">
        <div className="bg-white rounded-2xl overflow-hidden mb-6">
          <div className="relative aspect-square">
            <img
              src={product.photos[currentPhoto] || 'https://picsum.photos/800/800'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {product.photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentPhoto(
                      (prev) =>
                        (prev - 1 + product.photos.length) % product.photos.length
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                  onClick={() =>
                    setCurrentPhoto(
                      (prev) => (prev + 1) % product.photos.length
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              </>
            )}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {product.photos.map((_: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setCurrentPhoto(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentPhoto ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </h2>
              <p className="text-3xl font-bold text-purple-600">
                ¥{product.price}
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-sm font-medium">
              {categoryMap[product.category] || product.category}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Tag className="w-4 h-4" />
              <span className="font-medium">IP:</span>
              <span>{product.ip_name}</span>
              {product.character_name && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="font-medium">角色:</span>
                  <span>{product.character_name}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Package className="w-4 h-4" />
              <span className="font-medium">新旧:</span>
              <span>{conditionMap[product.condition] || product.condition}</span>
            </div>
            {product.exchange_intent && (
              <div className="flex items-start gap-2 text-gray-600">
                <RefreshCw className="w-4 h-4 mt-0.5" />
                <span className="font-medium">交换意向:</span>
                <span>{product.exchange_intent}</span>
              </div>
            )}
          </div>
        </div>

        {product.description && (
          <div className="bg-white rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              商品描述
            </h3>
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6">
          <h3 className="font-bold text-gray-900 mb-3">卖家信息</h3>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{product.seller_name}</p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span>{product.seller_rating || 0}</span>
                <span className="text-gray-300">·</span>
                <span>{product.seller_review_count || 0}条评价</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex gap-3">
          <button
            onClick={() => handleBuy('exchange')}
            disabled={buying}
            className="flex-1 py-3.5 bg-pink-50 text-pink-600 rounded-xl font-medium hover:bg-pink-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            想要交换
          </button>
          <button
            onClick={() => handleBuy('buy')}
            disabled={buying}
            className="flex-1 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            立即购买
          </button>
        </div>
      </div>
    </div>
  )
}
