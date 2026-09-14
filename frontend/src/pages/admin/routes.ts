import type { FC } from 'react'
import { BatchManagementPage } from './BatchManagementPage'
import { AccountManagementPage } from './AccountManagementPage'

/** 관리자(admin) 도메인 페이지 레지스트리 */
export const adminPageRoutes: Record<string, FC> = {
  'batch-management': BatchManagementPage,
  'account-management': AccountManagementPage,
}
