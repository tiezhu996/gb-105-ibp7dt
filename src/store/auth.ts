import { create } from 'zustand'
import { authAPI } from '../lib/api'

interface User {
  id: number
  username: string
  email: string
  avatar?: string
  rating: number
  review_count: number
  created_at?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,

  login: async (username: string, password: string) => {
    set({ loading: true })
    try {
      const res = await authAPI.login({ username, password })
      const { token, user } = res.data.data
      localStorage.setItem('token', token)
      set({ user, token, isAuthenticated: true, loading: false })
    } catch (error: any) {
      set({ loading: false })
      throw error.response?.data?.error || '登录失败'
    }
  },

  register: async (username: string, email: string, password: string) => {
    set({ loading: true })
    try {
      const res = await authAPI.register({ username, email, password })
      const { token, user } = res.data.data
      localStorage.setItem('token', token)
      set({ user, token, isAuthenticated: true, loading: false })
    } catch (error: any) {
      set({ loading: false })
      throw error.response?.data?.error || '注册失败'
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isAuthenticated: false })
      return
    }

    try {
      const res = await authAPI.getProfile()
      set({ user: res.data.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
