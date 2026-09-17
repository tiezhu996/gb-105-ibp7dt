import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { productAPI } from '../lib/api'
import { useAuthStore } from '../store/auth'
import {
  Upload,
  X,
  ArrowLeft,
  Tag,
  Package,
  Info,
  DollarSign,
  RefreshCw,
} from 'lucide-react'

const categories = [
  { id: 'figure', name: '手办' },
  { id: 'badge', name: '吧唧' },
  { id: 'card', name: '卡牌' },
  { id: 'poster', name: '海报' },
  { id: 'book', name: '漫画' },
  { id: 'clothing', name: '服饰' },
  { id: 'other', name: '其他' },
]

const conditions = [
  { id: 'new', name: '全新' },
  { id: 'like_new', name: '几乎全新' },
  { id: 'good', name: '品相良好' },
  { id: 'fair', name: '一般' },
]

export default function Publish() {
  const [photos, setPhotos] = useState<string[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ipName, setIpName] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [price, setPrice] = useState('')
  const [exchangeIntent, setExchangeIntent] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    navigate('/login')
    return null
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setPhotos((prev) => [...prev, result].slice(0, 6))
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (photos.length === 0) {
      alert('请至少上传一张照片')
      return
    }

    setLoading(true)
    try {
      await productAPI.createProduct({
        name,
        description,
        ip_name: ipName,
        character_name: characterName,
        category,
        condition,
        price: parseFloat(price),
        exchange_intent: exchangeIntent,
        photos,
      })
      navigate('/')
    } catch (error: any) {
      alert(error.response?.data?.error || '发布失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">发布闲置</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl p-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              商品照片 (最多6张)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={photo}
                    alt={`照片${index + 1}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-all"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-all">
                  <Upload className="w-8 h-8 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">点击上传</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                商品名称
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入商品名称"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Info className="w-4 h-4 inline mr-1" />
                商品描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述商品的情况..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  所属IP
                </label>
                <input
                  type="text"
                  value={ipName}
                  onChange={(e) => setIpName(e.target.value)}
                  placeholder="如：原神"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  角色名称
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="如：散兵（可选）"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  商品分类
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                  required
                >
                  <option value="">请选择分类</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新旧程度
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                  required
                >
                  <option value="">请选择新旧程度</option>
                  {conditions.map((cond) => (
                    <option key={cond.id} value={cond.id}>
                      {cond.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                售价 (元)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <RefreshCw className="w-4 h-4 inline mr-1" />
                交换意向
              </label>
              <input
                type="text"
                value={exchangeIntent}
                onChange={(e) => setExchangeIntent(e.target.value)}
                placeholder="想换什么？如：其他角色吧唧（可选）"
                className="w-full px-4 py-3 bg-gray-50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium text-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? '发布中...' : '发布商品'}
          </button>
        </form>
      </main>
    </div>
  )
}
