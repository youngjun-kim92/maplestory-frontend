import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터: JWT 토큰 + 활성 서버 프로필 자동 첨부
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const activeServerId = localStorage.getItem('activeServerId')
  if (activeServerId && !config.headers['X-Server-Profile-Id']) {
    config.headers['X-Server-Profile-Id'] = activeServerId
  }
  return config
})

// 응답 인터셉터: 401 시 로그아웃 처리
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

export default client
