import { MessageSquareText } from 'lucide-react'
import { useMemo } from 'react'

import { useSolapiTemplates } from '../../../hooks/useSmsManagement'
import type {
  SmsSolapiTemplate,
  SmsTarget,
  SmsTemplate,
} from '../../../type/api'
import {
  groupOf,
  groupSlotOf,
  offsetOf,
  OP_TYPE_META,
  tierCellOf,
} from '../utils/smsTableModel'

/**
 * 오른쪽 문구 미리보기 — 고른 사람에게 **1·2·3차로 무엇이 나가는지**를 한 화면에 세워 보여준다.
 *
 * 셋을 모두 펼쳐 둔다(접지 않는다). 차수별 문구는 서로 이어지는 안내라
 * 하나씩 열어 보면 흐름이 끊기고, 무엇이 빠졌는지도 눈에 안 들어온다.
 *
 * 문구의 #{name}·#{surgeryDate} 은 **실제 값으로 치환해** 보여준다 — 미리보기는 나갈 문장 그대로여야
 * 검수가 된다. 발송 시에는 서버(문자)나 솔라피(알림톡)가 같은 자리를 채운다.
 *
 * <p>기본 본문은 <b>솔라피 API 조회</b>로 가져온다(useSolapiTemplates).
 * 지연 본문은 백엔드 `/templates` 응답의 slot.smsTextDelayed 를 그대로 쓴다 —
 * .env 의 `SOLAPI_TPL_*_SMS_DELAYED` 가 원천이다.
 */
export function SmsMessagePreview({
  target,
  templates,
  selectedTier,
  today,
}: {
  target: SmsTarget | null
  templates: SmsTemplate[]
  /** 표에서 클릭한 차수 — 그 박스를 강조한다. */
  selectedTier: string | null
  today: string
}) {
  const tiers = templates.length > 0 ? templates : ([] as SmsTemplate[]) // 템플릿을 못 받으면 차수를 지어내지 않는다 — 잘못된 예정일을 보여주느니 비운다
  const group = target ? groupOf(templates, target.opType) : null

  // 승인 알림톡 본문 — 솔라피 API 캐시(5분). 15콜/캐시라 부담 없음.
  // 조회 실패(found=false) 나 상태 !== APPROVED 인 슬롯은 본문이 없을 수 있어 fallback 처리.
  const solapi = useSolapiTemplates(true)
  const solapiByKey = useMemo(
    () => indexByGroupTier(solapi.data ?? []),
    [solapi.data],
  )

  return (
    // 표와 같은 높이를 처음부터 차지한다 — 내용 길이에 따라 패널이 짧아졌다 길어지면
    // 옆 표와 아래선이 어긋나 화면이 들쭉날쭉해 보인다.
    <aside className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden rounded-lg border border-border/70 bg-white shadow-sm">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border/60 bg-gray-50/70 px-3 py-2">
        <MessageSquareText className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-[13px] font-bold text-gray-900">발송 문구</span>
        <span className="text-[11.5px] text-muted-foreground">1~3차</span>
      </div>

      {!target ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center text-[12px] leading-relaxed text-muted-foreground">
          표에서 이름이나 차수 날짜를 클릭하면
          <br />그 환자에게 나갈 문구가 여기에 표시됩니다.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* 누구에게 나가는 문구인지 — 문구만 보면 대상이 헷갈린다. */}
          <div className="shrink-0 border-b border-border/60 px-3 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[14px] font-bold text-gray-900">
                {target.name || '이름 없음'}
              </span>
              <span className="text-[12px] tabular-nums text-gray-500">
                {target.chartNo}
              </span>
              {/* 분류가 문구를 정한다 — 배지는 분류, 정확한 시술명은 옆에 작게. */}
              {group && (
                <span
                  className={`rounded px-1.5 py-0.5 text-[11.5px] font-semibold ${group.className}`}
                >
                  {group.label}
                </span>
              )}
              {target.opType && (
                <span className="text-[11.5px] text-gray-500">
                  {OP_TYPE_META[target.opType]?.full ?? target.opType}
                </span>
              )}
            </div>
            {/* 수술일·연락처는 왼쪽 표에 이미 있다 — 여기서는 문구 검수가 목적이라 뺀다.
                기준일은 예외 상태(재조정)일 때만 보여준다. 왜 예정일 간격이 다른지가
                이 패널에서 바로 읽혀야 하기 때문이다. */}
            {target.rebased && (
              <>
                <dl className="mt-1.5 grid grid-cols-[3.6rem_1fr] gap-y-0.5 text-[12px]">
                  <dt className="text-gray-400">기준일</dt>
                  <dd className="tabular-nums text-blue-600">
                    {target.scheduleBase} (재조정)
                  </dd>
                </dl>
                {/* 왜 문구가 팝업의 표와 다른지 알려준다 — 안 적어 두면 오류로 읽힌다. */}
                <p className="mt-1 rounded bg-blue-50/70 px-2 py-1 text-[11px] leading-relaxed text-blue-700">
                  발송이 밀린 대상이라{' '}
                  <b className="font-semibold">경과 문장을 뺀 문구</b>가{' '}
                  <b className="font-semibold">문자</b>로 나갑니다.
                </p>
              </>
            )}
          </div>

          {/* 1·2·3차 — 세로로 쌓되 각 박스가 남은 높이를 균등하게 나눠 갖는다(접지 않는다). */}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
            {tiers.map((tier, index) => {
              const cell = tierCellOf(
                target,
                offsetOf(tier, target.opType),
                tier.code,
                today,
              )
              const active = selectedTier === tier.code
              // 문구는 op_type 이 아니라 **그룹**이 갖는다 — 스마일프로·스마일라식이 같은 문구를 쓴다.
              const slot = groupSlotOf(tier, target.opType)
              const groupCode = slot?.groupCode ?? ''
              // 기준일이 밀린 대상에게는 경과 문장을 뺀 문구가 나간다 — 미리보기도 그걸 보여야 검수가 된다.
              // 1차는 지연 파생본이 없어(경과 선언이 없음) 지연도 API 승인본을 그대로 쓴다.
              const rawText =
                target.rebased && index > 0
                  ? (slot?.smsTextDelayed ?? '')
                  : (solapiByKey.get(keyOf(groupCode, index + 1))?.content ??
                    '')
              const text = fillTemplate(rawText, target)
              return (
                <section
                  key={tier.code}
                  className={`flex min-h-[7.5rem] flex-1 flex-col overflow-hidden rounded-md border transition-colors ${
                    active
                      ? 'border-blue-300 bg-blue-50/40 ring-1 ring-blue-200'
                      : 'border-border/70 bg-white'
                  }`}
                >
                  <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1.5">
                    <span className="text-[12.5px] font-bold text-gray-800">
                      {tier.label.replace('수술 후 안내 ', '')}
                      <span className="ml-1 font-normal text-gray-400">
                        +{offsetOf(tier, target.opType)}일
                      </span>
                    </span>
                    <span
                      className={`text-[12px] tabular-nums ${cell.className}`}
                      title={cell.title}
                    >
                      {cell.text}
                      {cell.label && (
                        <span className="ml-1 text-[11px] font-normal opacity-70">
                          {cell.label}
                        </span>
                      )}
                    </span>
                  </header>
                  <p
                    className={`min-h-0 flex-1 overflow-auto whitespace-pre-line px-2.5 py-2 text-[12.5px] leading-relaxed ${text ? 'text-gray-700' : 'text-amber-600'}`}
                  >
                    {text ||
                      `${slot?.groupLabel ?? '이 수술'} 문구가 아직 확정되지 않았습니다.`}
                  </p>
                </section>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}

/** `${groupCode}-${tier}` 로 인덱싱 — Preview 렌더 시 O(1) 조회. */
const keyOf = (groupCode: string, tier: number) => `${groupCode}-${tier}`

const indexByGroupTier = (
  rows: SmsSolapiTemplate[],
): Map<string, SmsSolapiTemplate> => {
  const map = new Map<string, SmsSolapiTemplate>()
  for (const row of rows) map.set(keyOf(row.groupCode, row.tier), row)
  return map
}

const koreanDate = (iso: string): string => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${y}년 ${m}월 ${d}일`
}

/**
 * 치환자를 실제 값으로 바꾼다 — 미리보기는 **나갈 문장 그대로** 보여야 검수가 된다.
 * 발송 시에는 서버(문자)나 솔라피(알림톡)가 같은 자리를 채운다.
 */
const fillTemplate = (text: string, target: SmsTarget): string =>
  text
    .replaceAll('#{name}', target.name || '고객')
    .replaceAll('#{surgeryDate}', koreanDate(target.surgeryDate))
