import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
}

export const productAPI = {
  getProducts: (params?: {
    search?: string
    category?: string
    ip?: string
    character?: string
  }) => api.get('/products', { params }),
  getProduct: (id: number) => api.get(`/products/${id}`),
  createProduct: (data: any) => api.post('/products', data),
  getMyProducts: () => api.get('/products/user/my'),
  updateProductStatus: (id: number, status: string) =>
    api.put(`/products/${id}/status`, { status }),
}

export const orderAPI = {
  createOrder: (data: { product_id: number; type: string; price?: number }) =>
    api.post('/orders', data),
  getBuyerOrders: () => api.get('/orders/buyer'),
  getSellerOrders: () => api.get('/orders/seller'),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  shipOrder: (id: number) => api.put(`/orders/${id}/ship`),
  receiveOrder: (id: number) => api.put(`/orders/${id}/receive`),
}

export const reviewAPI = {
  createReview: (data: {
    order_id: number
    reviewee_id: number
    rating: number
    comment?: string
  }) => api.post('/reviews', data),
  getUserReviews: (userId: number) => api.get(`/reviews/user/${userId}`),
  getOrderReview: (orderId: number) => api.get(`/reviews/order/${orderId}`),
}

export default api
