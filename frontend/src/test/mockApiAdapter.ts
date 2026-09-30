import { type AxiosAdapter, AxiosError } from 'axios'

/**
 * 네트워크 없이 고정 응답을 돌려주는 axios adapter. body 는 서버가 보낸 원문 그대로 넘긴다(JSON 파싱은 axios 가 한다).
 * 내장 adapter 처럼 2xx 가 아니면 AxiosError 로 reject 한다.
 */
export const mockApiAdapter =
  (
    status: number,
    body = '',
    {
      statusText = '',
      contentType = 'application/json',
    }: { statusText?: string; contentType?: string } = {},
  ): AxiosAdapter =>
  async (config) => {
    const response = {
      data: body,
      status,
      statusText,
      headers: { 'content-type': contentType },
      config,
    }
    if (status >= 200 && status < 300) return response
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      null,
      response,
    )
  }
