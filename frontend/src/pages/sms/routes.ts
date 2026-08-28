import type { FC } from 'react'
import { SmsManagementPage } from './SmsManagementPage'

/** 문자 발송 관리(sms) 도메인 페이지 레지스트리 — 메뉴는 마케팅 섹션의 '문자 발송 관리' 그룹 하위. */
export const smsPageRoutes: Record<string, FC> = {
  'sms': SmsManagementPage,
}
