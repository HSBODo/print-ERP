import axios from 'axios'

type QueryValue = string | number | boolean | Array<string | number | boolean> | null | undefined

/** 배열은 콤마로 잇고(years=2025,2026) nullish 는 뺀다 — 백엔드가 이 형식을 받는다. */
const serializeParams = (params: Record<string, QueryValue>) => {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return
    searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })

  return searchParams.toString()
}

/** 앱 공용 axios 인스턴스. interceptor(토큰·401·에러 메시지)는 shared 가 세션을 모르므로 support/session 의 initApiClient 가 붙인다. */
export const api = axios.create({ baseURL: '/api', paramsSerializer: { serialize: serializeParams } })
