import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/AppLayout'
import { requireAuth } from './-internal/requireAuth'
import { RouteGate } from './-internal/RouteGate'

// 인증이 필요한 화면의 공통 레이아웃 (경로 없는 레이아웃 라우트 — URL 에 _auth 가 붙지 않는다).
export const Route = createFileRoute('/_auth')({
  beforeLoad: requireAuth,
  component: () => (
    <AppLayout>
      <RouteGate />
    </AppLayout>
  ),
})
