import axios, { type AxiosRequestConfig } from 'axios'

/** 앱 공용 axios 인스턴스. 인증(토큰·401)은 shared 가 모르므로 앱 시작 시 support/session 이 interceptor 로 붙인다. */
export const apiClient = axios.create({ baseURL: '/api' })

const isBlank = (data: unknown) => data === undefined || data === null || (typeof data === 'string' && !data.trim())

const toError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error))
  }

  const response = error.response
  if (!response) {
    return new Error(error.message)
  }

  const body: unknown = response.data
  if (typeof body === 'string' && body.trim()) {
    return new Error(body)
  }

  if (
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string' &&
    body.message.trim()
  ) {
    return new Error(body.message)
  }

  return new Error(response.statusText || `HTTP ${response.status}`)
}

/** interceptor 를 모두 거친 뒤 body 만 돌려주고, 실패는 화면이 `e.message` 로 쓰는 서버 메시지 Error 로 바꾼다. */
async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const { data } = await apiClient.request<unknown>(config)
    return (isBlank(data) ? undefined : data) as T
  } catch (error) {
    throw toError(error)
  }
}

export const api = {
  get: <T>(url: string) => request<T>({ method: 'GET', url }),
  post: <T>(url: string, body: unknown) => request<T>({ method: 'POST', url, data: body }),
  put: <T>(url: string, body: unknown) => request<T>({ method: 'PUT', url, data: body }),
  delete: <T>(url: string) => request<T>({ method: 'DELETE', url }),
}
