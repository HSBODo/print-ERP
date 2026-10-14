import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '#shared/ui/Button'

import { overseasMarketingApi } from '../../../api'
import type {
  OverseasMarketingCrmCustomer,
  OverseasMarketingReception,
} from '../../../type/api'

const INPUT_CLASS =
  'h-9 w-full rounded-md border border-border/80 bg-white px-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

interface MatchConfirmDialogProps {
  row: OverseasMarketingReception
  pending: boolean
  onSubmit: (customerNo: string) => void
  onClose: () => void
}

/** CRM 매칭 확인 팝업 — 확인필요 후보 확정과 수동 고객번호 입력을 하나로 처리한다. */
export function MatchConfirmDialog({
  row,
  pending,
  onSubmit,
  onClose,
}: MatchConfirmDialogProps) {
  const [customerNo, setCustomerNo] = useState(
    row.candidateCustomerNo || row.customerNo || '',
  )
  const [customer, setCustomer] = useState<OverseasMarketingCrmCustomer | null>(
    null,
  )
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState('')

  const lookup = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!/^\d{1,20}$/.test(trimmed)) {
      setError('고객번호는 숫자만 입력할 수 있습니다.')
      setCustomer(null)
      return
    }
    setLooking(true)
    setError('')
    try {
      setCustomer(await overseasMarketingApi.getCrmCustomer(trimmed))
    } catch (cause) {
      setCustomer(null)
      setError(
        cause instanceof Error
          ? cause.message
          : 'CRM 고객 조회에 실패했습니다.',
      )
    } finally {
      setLooking(false)
    }
  }, [])

  // 확인필요 행은 후보 번호가 미리 채워져 있으므로 열자마자 CRM 정보를 보여준다.
  useEffect(() => {
    const initial = row.candidateCustomerNo || row.customerNo
    if (!initial) return
    const timer = setTimeout(() => void lookup(initial), 0)
    return () => clearTimeout(timer)
  }, [row.candidateCustomerNo, row.customerNo, lookup])

  const verified =
    customer !== null && customer.customerNo === customerNo.trim()

  const sheetInfo: [string, string][] = [
    ['이름', row.name],
    ['생년월일', row.birthDate],
    ['연락처', row.contact],
    ['이메일', row.email],
  ]
  const crmInfo: [string, string][] = [
    ['이름', customer?.name ?? ''],
    ['생년월일', customer?.birthDate ?? ''],
    ['연락처', customer?.contact ?? ''],
    ['이메일', customer?.email ?? ''],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="CRM 매칭 확인"
    >
      <div
        className="flex max-h-[90vh] w-[38rem] flex-col rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <strong className="text-sm text-gray-900">
            CRM 매칭 확인 — {row.name}
          </strong>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-xs">
          {row.candidateReason && (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 font-semibold text-amber-800">
              자동 매칭 근거: {row.candidateReason}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <section className="rounded-md border border-border/60 p-3">
              <h3 className="mb-2 font-semibold text-gray-900">
                시트 접수 정보
              </h3>
              {sheetInfo.map(([label, value]) => (
                <div key={label} className="flex gap-2 py-0.5">
                  <span className="w-16 shrink-0 text-gray-500">{label}</span>
                  <span className="break-all text-gray-900">
                    {value?.trim() || '—'}
                  </span>
                </div>
              ))}
            </section>
            <section className="rounded-md border border-border/60 p-3">
              <h3 className="mb-2 font-semibold text-gray-900">
                CRM 고객 정보
              </h3>
              {looking && (
                <p className="py-2 text-muted-foreground">조회 중…</p>
              )}
              {!looking &&
                customer &&
                crmInfo.map(([label, value]) => (
                  <div key={label} className="flex gap-2 py-0.5">
                    <span className="w-16 shrink-0 text-gray-500">{label}</span>
                    <span className="break-all text-gray-900">
                      {value?.trim() || '—'}
                    </span>
                  </div>
                ))}
              {!looking && !customer && (
                <p className="py-2 text-muted-foreground">
                  고객번호를 입력하고 조회하세요.
                </p>
              )}
            </section>
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="font-semibold text-gray-700">CRM 고객번호</span>
            <div className="flex gap-2">
              <input
                value={customerNo}
                onChange={(event) => {
                  setCustomerNo(event.target.value)
                  setCustomer(null)
                  setError('')
                }}
                onKeyDown={(event) =>
                  event.key === 'Enter' && void lookup(customerNo)
                }
                className={INPUT_CLASS}
                placeholder="예: 2218954"
                inputMode="numeric"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs"
                disabled={looking || !customerNo.trim()}
                onClick={() => void lookup(customerNo)}
              >
                <Search className="h-3.5 w-3.5" />
                조회
              </Button>
            </div>
          </label>
          {error && <p className="mt-2 text-red-500">{error}</p>}
          {!verified && !error && customerNo.trim() && !looking && (
            <p className="mt-2 text-muted-foreground">
              번호를 조회해 CRM 고객을 확인한 뒤 완료할 수 있습니다.
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-border/60 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={onClose}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            type="button"
            size="sm"
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            disabled={pending || !verified}
            onClick={() => onSubmit(customerNo.trim())}
          >
            {pending ? '저장 중…' : '완료'}
          </Button>
        </div>
      </div>
    </div>
  )
}
