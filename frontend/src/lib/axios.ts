import axios from 'axios'

const TOKEN_KEY = 'access_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/** Drop the session and go to the login page. */
export function handleUnauthorized(): void {
  localStorage.removeItem(TOKEN_KEY)
  window.location.href = '/login'
}

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Redirect to login on 401 — except a failed login itself, whose error the login page shows
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && error.config?.url !== '/auth/login') handleUnauthorized()
    return Promise.reject(error)
  }
)

export default api

/** The `detail` message of a FastAPI error response, if there is one. */
export function getErrorDetail(err: unknown): string | undefined {
  return axios.isAxiosError(err) ? err.response?.data?.detail : undefined
}

/** HTTP status of a failed request, if there is one. */
export function getErrorStatus(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}
