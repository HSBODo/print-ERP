import { readStoredAuthSession, clearStoredAuthSession } from '@/stores/auth-session'

const BASE_URL = '/api'

const shouldHandleUnauthorized = (url: string) => !url.startsWith('/auth/login')

const getErrorMessage = (body: unknown, response: Response) => {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string' &&
    body.message.trim()
  ) {
    return body.message
  }

  return response.statusText || `HTTP ${response.status}`
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204 || response.status === 205) {
    return undefined
  }

  const contentLength = response.headers.get('content-length')

  if (contentLength === '0') {
    return undefined
  }

  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()

  if (!text.trim()) {
    return undefined
  }

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown
    } catch {
      return undefined
    }
  }

  return text
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const { token } = readStoredAuthSession()

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  const body = await parseResponseBody(res)

  if (res.status === 401 && shouldHandleUnauthorized(url)) {
    clearStoredAuthSession()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.')
  }

  if (!res.ok) {
    throw new Error(getErrorMessage(body, res))
  }

  return body as T
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown) =>
    request<T>(url, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
