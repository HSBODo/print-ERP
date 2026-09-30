import { createFileRoute } from '@tanstack/react-router'

import { useAuthStore } from '#domain/support/session/store'

import { AppLayout } from './-internal/layout/AppLayout'
import { canAccess, type PageAccessResult } from './-internal/pageAccess'
import { requireAuth } from './-internal/requireAuth'
import { RouteGate } from './-internal/RouteGate'

// 운영 빌드(PROD)에서는 pending(미완성) 페이지를 차단한다(직접 URL 접근도 placeholder).
const isProd = !import.meta.env.DEV

// 인증이 필요한 화면의 공통 레이아웃 (경로 없는 레이아웃 라우트 — URL 에 _auth 가 붙지 않는다).
export const Route = createFileRoute('/_auth')({
  // 이동할 때마다 실행된다 — 인증 확인 후, 이동할 페이지의 staticData.page 로 접근 여부를 판정해 context 로 넘긴다.
  beforeLoad: ({ matches }): { pageAccess: PageAccessResult } => {
    requireAuth()
    const page = matches.at(-1)?.staticData?.page
    return {
      pageAccess: page
        ? canAccess(page, useAuthStore.getState().user, isProd)
        : 'ok',
    }
  },
  component: () => (
    <AppLayout>
      <RouteGate />
    </AppLayout>
  ),
})
