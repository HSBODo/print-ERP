import { useState } from 'react'
import { toast } from 'sonner'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GROUP_META } from './smsTableModel'
import type { SmsLookup, SmsTargetRequest, SmsTemplate } from '@/api/sms'

/**
 * 발송 대상 추가/수정 팝업.
 *
 * 입력 순서가 곧 규칙이다 — **차트번호만 먼저 열어 두고** 나머지는 잠가 둔다.
 *   1) 차트번호 입력 → [조회]
 *   2) 수술 기록이 있으면: 이름·연락처·수술일·수술 구분을 CRM(마트) 값으로 채우고 **잠근 상태로 유지**한다.
 *      연락처의 정답은 CRM 이라 여기서 고치면 아무도 관리하지 않는 사본이 생기고, 오발송 위험도 있다.
 *      번호가 틀리면 CRM 에서 고친 뒤 다시 [조회]하면 받아온다(조회가 AUTO 행을 갱신한다). 메모만 우리 값이라 열어 둔다.
 *   3) 수술 기록이 없으면: 직접 등록 경로로 보고 입력칸을 연다(연락처 필수).
 *
 * 필수는 차트번호·연락처 둘뿐이다. 이름은 동명이인이 있어 사람을 특정하지 못한다.
 */

const INPUT_CLS =
  'h-8 rounded-md border border-border/80 bg-white px-2 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const INPUT_LOCKED_CLS =
  'h-8 rounded-md border border-border/60 bg-gray-100 px-2 text-xs text-gray-500 outline-none cursor-not-allowed'

/** 차트번호 조회로 채워지는 값들 — 차트번호가 바뀌면 이 값들을 통째로 버린다. */
const EMPTY_LOOKUP_FIELDS = {
  name: '', phone: '', surgeryDate: '', surgeryType: '', opType: '', surgeryR: '', surgeryL: '',
} as const

type SubFieldKey = 'name' | 'surgeryDate' | 'surgeryType' | 'surgeryR' | 'surgeryL'

/** 환자·수술 기본 정보 — 한 줄에 가로로 놓는다. */
const BASIC_FIELDS: { key: SubFieldKey; label: string; type: string; placeholder?: string }[] = [
  { key: 'name', label: '이름', type: 'text', placeholder: '조회 시 자동 입력' },
  { key: 'surgeryDate', label: '수술일', type: 'date' },
  { key: 'surgeryType', label: '수술 구분', type: 'text', placeholder: '시력교정 / 백내장' },
]

/** 실제 수술명 — 우/좌 각각. 어떤 수술을 받았는지가 발송 판단의 근거다. */
const SURGERY_FIELDS: { key: SubFieldKey; label: string }[] = [
  { key: 'surgeryR', label: '수술 (우안)' },
  { key: 'surgeryL', label: '수술 (좌안)' },
]

export function TargetFormModal({ title, initial, mode, templates, pending, lookupPending, onLookup, onSubmit, onClose }: {
  title: string
  initial: SmsTargetRequest
  /** 수술 분류 선택지의 출처 — 서버 그룹 정의가 정본이라 화면에 목록을 박아 두지 않는다. */
  templates: SmsTemplate[]
  /**
   * create — 차트번호 조회로 시작하는 신규 등록.
   * edit   — 연락처만 고치는 수정. 나머지는 CRM 원천값이라 잠근다(조회 버튼도 없다).
   */
  mode: 'create' | 'edit'
  pending: boolean
  lookupPending: boolean
  onLookup: (chartNo: string) => Promise<SmsLookup>
  onSubmit: (form: SmsTargetRequest) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<SmsTargetRequest>({ ...initial })
  const [lookup, setLookup] = useState<SmsLookup | null>(null)
  const setF = (key: keyof SmsTargetRequest) => (value: string) => setForm((p) => ({ ...p, [key]: value }))

  const editing = mode === 'edit'
  // 문구가 있는 분류만 고르게 한다 — ETC(opTypes 가 빈 그룹)는 보낼 문구가 없다.
  // 저장하는 값은 그 분류의 **대표 시술 코드**다. 분류 자체를 컬럼으로 두면 op_type 과
  // 두 벌이 되어 언젠가 어긋나므로, 기존 매핑(op_type → 그룹)을 그대로 태운다.
  const groupChoices = (templates[0]?.groups ?? [])
    .filter((g) => g.opTypes.length > 0)
    .map((g) => ({ code: g.groupCode, label: GROUP_META[g.groupCode]?.label ?? g.groupLabel, opType: g.opTypes[0] }))
  // 수정 모드에서 열리는 칸은 연락처뿐이다. 신규는 조회 결과가 없을 때만(직접 등록) 칸이 열린다.
  const unlocked = !editing && lookup !== null && !lookup.found
  const phoneOpen = editing || unlocked

  /**
   * 차트번호가 바뀌면 조회 결과와 그로부터 채워진 값들을 **즉시 버린다.**
   * 안 지우면 A 를 조회해 채운 정보가 B 차트번호로 저장돼 다른 환자 정보가 섞인다.
   */
  const handleChartNoChange = (value: string) => {
    setForm((p) => (
      p.chartNo === value ? p : { ...EMPTY_LOOKUP_FIELDS, chartNo: value }
    ))
    setLookup(null)
  }

  const handleLookup = async () => {
    const chartNo = form.chartNo.trim()
    if (!chartNo) {
      toast.error('차트번호를 입력하세요.')
      return
    }
    try {
      const found = await onLookup(chartNo)
      setLookup(found)
      if (!found.found) {
        toast.warning('수술 기록을 찾지 못했습니다', { description: '아래 항목을 직접 입력해 등록할 수 있습니다.' })
        return
      }
      setForm((p) => ({
        ...p,
        name: found.name,
        phone: found.phone,
        surgeryDate: found.surgeryDate,
        surgeryType: found.surgeryType,
        opType: found.opType,
        surgeryR: found.surgeryR,
        surgeryL: found.surgeryL,
      }))
      if (found.alreadyRegistered) {
        toast.warning('이미 등록된 대상입니다', { description: '같은 차트번호·수술일이 목록에 있습니다.' })
      }
    } catch (e) {
      toast.error('조회 실패', { description: e instanceof Error ? e.message : '' })
    }
  }

  const handleSubmit = () => {
    if (!form.chartNo.trim()) {
      toast.error('차트번호는 필수입니다.')
      return
    }
    if (!editing && lookup === null) {
      toast.error('차트번호를 조회한 뒤 저장할 수 있습니다.')
      return
    }
    if (!form.phone.trim()) {
      toast.error('연락처는 필수입니다.', {
        description: lookup?.found ? 'CRM 에 등록된 번호가 없습니다. CRM 에서 번호를 채운 뒤 다시 조회하세요.' : undefined,
      })
      return
    }
    if (!editing && !form.opType.trim()) {
      toast.error('수술 분류를 선택하세요.', { description: '분류가 없으면 보낼 문구와 시점이 정해지지 않습니다.' })
      return
    }
    onSubmit(form)
  }

  return (
    // 바깥을 눌러도 닫지 않는다 — 입력하다 옆을 잘못 건드려 내용이 날아가는 일이 잦다.
    // 닫는 길은 ✕ 와 [취소] 둘뿐이다.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between bg-blue-600 px-5 py-3.5">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button
            type="button"
            aria-label="닫기"
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5 py-4">
          {/* 차트번호 — 신규는 여기서 조회가 시작되고, 수정에서는 바꿀 수 없는 식별자다. */}
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
            <span>차트번호<span className="ml-0.5 text-red-500">*</span></span>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                aria-label="차트번호"
                value={form.chartNo}
                placeholder="2234451"
                autoFocus={!editing}
                disabled={editing}
                onChange={(e) => handleChartNoChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleLookup() } }}
                className={`w-full font-normal tabular-nums ${editing ? INPUT_LOCKED_CLS : `${INPUT_CLS} text-gray-900`}`}
              />
              {!editing && (
                <Button
                  type="button"
                  size="sm"
                  disabled={lookupPending}
                  className="shrink-0 bg-gray-900 text-xs text-white hover:bg-gray-800"
                  onClick={() => void handleLookup()}
                >
                  <Search className="h-3.5 w-3.5" />
                  {lookupPending ? '조회 중…' : '조회'}
                </Button>
              )}
            </div>
          </label>

          {/* 안내 — 신규는 조회 결과, 수정은 무엇을 고칠 수 있는지 */}
          <div className={`rounded-md border px-3 py-2 ${
            editing ? 'border-blue-200 bg-blue-50/60'
              : lookup?.found ? 'border-blue-200 bg-blue-50/60'
                : lookup ? 'border-amber-200 bg-amber-50/60'
                  : 'border-border/70 bg-gray-50/70'
          }`}>
            <p className={`text-[11px] ${editing || lookup?.found ? 'text-blue-700' : lookup ? 'text-amber-700' : 'text-muted-foreground'}`}>
              {editing
                ? '연락처만 수정할 수 있습니다. 나머지는 수술 기록(CRM)에서 온 값이라 여기서 바꾸지 않습니다.'
                : !lookup
                  ? '차트번호를 조회하면 환자 정보가 채워집니다. 그 전에는 다른 항목을 입력할 수 없습니다.'
                  : lookup.found
                    ? '수술 기록에서 가져온 정보입니다.'
                    : '수술 기록이 없습니다. 아래 항목을 직접 입력해 등록하세요.'}
            </p>
          </div>

          {/* 연락처 — 발송에 실제로 쓰이는 값이라 필수. 수정 모드에서 열리는 유일한 칸이다. */}
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
            <span>연락처<span className="ml-0.5 text-red-500">*</span></span>
            <input
              type="text"
              aria-label="연락처"
              value={form.phone}
              placeholder={phoneOpen ? '01012345678' : '조회 시 자동 입력'}
              autoFocus={editing}
              disabled={!phoneOpen}
              onChange={(e) => setF('phone')(e.target.value)}
              className={`w-full font-normal tabular-nums ${phoneOpen ? `${INPUT_CLS} text-gray-900` : INPUT_LOCKED_CLS}`}
            />
            {!editing && lookup?.found && !form.phone && (
              <span className="font-normal text-red-500">CRM 에 번호가 없습니다. CRM 에서 채운 뒤 다시 조회하세요.</span>
            )}
          </label>

          {/* 기본 정보 — 이름·수술일·수술 구분을 한 줄에 가로로 */}
          <div className="grid grid-cols-3 gap-x-3">
            {BASIC_FIELDS.map(({ key, label, type, placeholder }) => (
              <label key={key} className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-gray-500">
                <span>{label}</span>
                <input
                  type={type}
                  aria-label={label}
                  value={form[key]}
                  placeholder={placeholder}
                  disabled={!unlocked}
                  onChange={(e) => setF(key)(e.target.value)}
                  className={`w-full min-w-0 font-normal ${unlocked ? `${INPUT_CLS} text-gray-900` : INPUT_LOCKED_CLS}`}
                />
              </label>
            ))}
          </div>

          {/* 수술 분류 — 조회로 못 채웠을 때만 물어본다.
              분류가 비면 ETC 로 떨어지고 ETC 문구가 없어 **영영 발송되지 않는 행**이 된다.
              고르는 값은 그 분류의 대표 시술 코드다(분류 판정은 서버 그룹 정의가 정본). */}
          {!editing && lookup !== null && !form.opType && (
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
              <span>수술 분류<span className="ml-0.5 text-red-500">*</span></span>
              <select
                aria-label="수술 분류"
                value={form.opType}
                onChange={(e) => setF('opType')(e.target.value)}
                className={`${INPUT_CLS} w-full font-normal text-gray-900`}
              >
                <option value="">선택하세요</option>
                {groupChoices.map((g) => (
                  <option key={g.code} value={g.opType}>{g.label}</option>
                ))}
              </select>
              <span className="font-normal text-amber-600">
                어떤 문구가 언제 나갈지를 정하는 값입니다. 고르지 않으면 발송되지 않습니다.
              </span>
            </label>
          )}

          {/* 수술 정보 — 우안·좌안 */}
          <div className="grid grid-cols-2 gap-x-3">
            {SURGERY_FIELDS.map(({ key, label }) => (
              <label key={key} className="flex min-w-0 flex-col gap-1 text-[11px] font-semibold text-gray-500">
                <span>{label}</span>
                <input
                  type="text"
                  aria-label={label}
                  value={form[key]}
                  placeholder={unlocked ? '수술명' : '조회 시 자동 입력'}
                  disabled={!unlocked}
                  title={form[key] || undefined}
                  onChange={(e) => setF(key)(e.target.value)}
                  className={`w-full min-w-0 font-normal ${unlocked ? `${INPUT_CLS} text-gray-900` : INPUT_LOCKED_CLS}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border/60 bg-gray-50/70 px-5 py-3">
          <span className="text-[10.5px] text-muted-foreground">
            <span className="text-red-500">*</span> 차트번호·연락처는 필수입니다
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              className="bg-blue-600 text-xs text-white hover:bg-blue-700"
              onClick={handleSubmit}
            >
              {pending ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
