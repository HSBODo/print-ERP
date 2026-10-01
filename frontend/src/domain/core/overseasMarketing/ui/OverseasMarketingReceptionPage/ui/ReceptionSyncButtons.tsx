import { RefreshCw } from 'lucide-react'

import { Button } from '#shared/ui/Button'

/** 관리자 조작임을 표시하는 페이지 내부 배지 — 사이드바 amber 배지와 톤 통일. */
function AdminBadge() {
  return (
    <span
      className="ml-1 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
      title="관리자 권한 필요 — 무거운 외부 조회 트리거"
      aria-label="관리자 전용 조작"
    >
      관리자
    </span>
  )
}

interface Props {
  onSheetSync: () => void
  onCrmSync: () => void
  sheetSyncEnabled: boolean
  crmSyncEnabled: boolean
  crmSyncBusy: boolean
  crmSyncPhase: string
  sheetSyncPending: boolean
  crmSyncPending: boolean
  fetching: boolean
}

/** 관리자 전용 [시트 동기화]·[동기화] — 필터 바 버튼 자리에 놓인다 */
export function ReceptionSyncButtons({
  onSheetSync,
  onCrmSync,
  sheetSyncEnabled,
  crmSyncEnabled,
  crmSyncBusy,
  crmSyncPhase,
  sheetSyncPending,
  crmSyncPending,
  fetching,
}: Props) {
  return (
    <>
      {sheetSyncEnabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={sheetSyncPending || crmSyncPending || fetching}
          onClick={onSheetSync}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${sheetSyncPending ? 'animate-spin' : ''}`}
          />
          시트 동기화
          <AdminBadge />
        </Button>
      )}
      {crmSyncEnabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          disabled={crmSyncBusy || sheetSyncPending}
          onClick={onCrmSync}
          title={
            crmSyncBusy
              ? `진행 단계: ${crmSyncPhase || '시작 중'}`
              : 'CRM 매칭·상태·검사비·수술비·외래 내역을 갱신합니다. 서버에서 백그라운드로 실행되며 새로 매칭·수정된 행만 다시 조회합니다.'
          }
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${crmSyncBusy ? 'animate-spin' : ''}`}
          />
          {crmSyncBusy ? crmSyncPhase || '동기화 중…' : '동기화'}
          <AdminBadge />
        </Button>
      )}
    </>
  )
}
