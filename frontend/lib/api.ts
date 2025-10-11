import axios from 'axios'

// Ensure HTTPS in production, fallback for local development
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // If on production domain, use HTTPS
    if (window.location.hostname === 'qquadro.com') {
      return 'https://qquadro.com'
    }
    // If on IP address, use IP backend
    if (window.location.hostname === '104.131.93.55') {
      return 'http://104.131.93.55:4000'
    }
  }
  // Fallback to environment variable or localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
}

const API_URL = getApiUrl()

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 600000, // Increased timeout to 600 seconds (10 minutes) for large CSV uploads
})

// Add logging for debugging
console.log('🌐 API configured with baseURL:', `${API_URL}/api`)

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refreshToken,
          })
          
          const { token } = response.data
          localStorage.setItem('token', token)
          
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api
