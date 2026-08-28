import { X } from 'lucide-react'
import { GROUP_META, OP_TYPE_META } from './smsTableModel'
import { DELAYED_TEXTS, TEMPLATE_TEXTS } from './smsTemplateTexts'
import type { SmsTemplate } from '@/api/sms'

/**
 * 발송 템플릿 안내 — **수술 분류 × 차수(1~3차)** 로 어떤 문구가 나가는지 보여주는 읽기 전용 표.
 *
 * 문구는 **분류마다 따로 쓴다.** 회복 과정이 분류마다 다르기 때문이다 —
 * 라섹은 상피가 아무는 동안 보호렌즈를 끼고, 라식은 절편 때문에 충격을 피해야 하고,
 * 렌즈삽입은 안압을, 백내장은 초점 적응을 본다. 같은 문구를 돌려쓰면 틀린 안내가 된다.
 *
 * ⚠️ 여기 문구는 **카카오 심사 제출본의 사본**이다(고객케어 TF 확정안 v5).
 *    실제로 나가는 건 솔라피에 등록된 알림톡 템플릿(SOLAPI_TPL_{그룹}_{차수}_ID)과
 *    문자 본문(_SMS)이며 이 화면은 그 값을 읽지 않는다. 승인 문구가 바뀌면
 *    smsTemplateTexts.ts 도 같이 고쳐야 한다 — 지금은 편집 기능을 두지 않는다.
 */

/**
 * 표의 행 = **수술 그룹**이다(예전에는 op_type 15종이었다).
 * 스마일프로·스마일라식이 같은 문구를 쓰고, ICL·KPL·VIVA 도 한 문구를 공유하므로
 * 15줄로 펼치면 같은 문구가 여러 번 반복돼 무엇이 다른지 오히려 안 보인다.
 *
 * 그룹 정의는 서버가 내려준 templates[].groups 를 그대로 쓴다 —
 * 화면에 그룹 목록을 박아 두면 서버가 그룹을 늘렸을 때 표만 옛 상태로 남는다.
 */
const buildRows = (tiers: SmsTemplate[]) => {
  const groups = tiers[0]?.groups ?? []
  return groups.map((g) => ({
    code: g.groupCode,
    // 표의 「수술 분류」 컬럼과 같은 말을 쓴다 — 여기만 '스마일수술'이면 같은 것으로 안 읽힌다.
    label: GROUP_META[g.groupCode]?.label ?? g.groupLabel,
    // 이 그룹에 속한 수술 종류를 배지로 보여준다 — 어떤 환자가 이 문구를 받는지가 보여야 한다.
    members: g.opTypes.map((t) => OP_TYPE_META[t]?.short ?? t),
    offsets: tiers.map((t) => t.groups.find((x) => x.groupCode === g.groupCode)?.offsetDays ?? 0),
    texts: TEMPLATE_TEXTS[g.groupCode] ?? ['', '', ''],
    // 발송이 밀린 대상에게 나가는 2·3차 변형. 1차는 경과 선언이 없어 변형이 없다.
    delayed: DELAYED_TEXTS[g.groupCode] ?? ['', ''],
  }))
}

export function SmsTemplateGuideModal({ templates, onClose }: {
  templates: SmsTemplate[]
  onClose: () => void
}) {
  // 차수 머리글은 설정에서 가져온다 — 간격을 바꾸면 이 표도 따라온다.
  const tiers = templates.length > 0
    ? templates
    : ([] as SmsTemplate[])
  const rows = buildRows(tiers)

  return (
    // 바깥을 눌러도 닫지 않는다 — 표를 훑다가 잘못 눌러 닫히면 성가시다. ✕ 로만 닫는다.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="발송 템플릿"
    >
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between bg-blue-600 px-5 py-3.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[15px] font-bold text-white">발송 템플릿</h2>
            <span className="text-[12px] text-blue-100">수술 분류 × 차수</span>
          </div>
          <button
            type="button"
            aria-label="닫기"
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="shrink-0 border-b border-border/60 bg-amber-50/60 px-5 py-2 text-[12px] text-amber-700">
          ⚠️ 아래 문구는 <b className="font-semibold">예시</b>입니다. 파란 칸은 <b className="font-semibold">발송이 밀린 대상</b>에게
          나가는 변형(경과 문장 제외, 문자로만)입니다. 실제 발송 문구는 솔라피에 등록된 알림톡 템플릿·문자 본문이며,
          이 화면에서는 수정하지 않습니다. <code className="rounded bg-white px-1">#{'{이름}'}</code>·
          <code className="rounded bg-white px-1">#{'{수술일}'}</code>은 발송 시 치환됩니다.
        </p>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[920px] border-collapse text-[13px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="sticky left-0 top-0 z-20 w-[8.5rem] border-b border-r border-border/60 bg-gray-50 px-3 py-2 text-left font-semibold">
                  수술 분류
                </th>
                {tiers.map((t) => (
                  <th key={t.code} className="sticky top-0 z-10 border-b border-border/60 bg-gray-50 px-3 py-2 text-left font-semibold">
                    {t.label.replace('수술 후 안내 ', '')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.code} className="border-b border-border/40 align-top">
                  <td className="sticky left-0 z-10 border-r border-border/60 bg-white px-3 py-2">
                    <div className="text-[12.5px] font-bold text-gray-900">{row.label}</div>
                    {/* 이 문구를 받는 수술 종류 — 어떤 환자에게 나가는지가 보여야 한다. */}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.members.length > 0
                        ? row.members.map((m) => (
                            <span key={m} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{m}</span>
                          ))
                        : <span className="text-[11px] text-gray-400">그 외 전부</span>}
                    </div>
                  </td>
                  {row.texts.map((text, i) => (
                    <td key={tiers[i]?.code ?? i} className="px-3 py-2">
                      {/* 시점은 그룹마다 다르다 — 같은 1차라도 스마일 D+1, 라섹 D+5 */}
                      <div className="mb-1 text-[11px] font-semibold text-gray-400">D+{row.offsets[i]}</div>
                      <p className={`whitespace-pre-line leading-relaxed ${text ? 'text-gray-700' : 'text-amber-600'}`}>
                        {text || '문구 미확정 — 이 그룹은 발송되지 않습니다.'}
                      </p>
                      {/* 발송이 밀린 대상에게 나가는 변형 — 왜 다른지가 표에서 바로 보여야 한다. */}
                      {i > 0 && row.delayed[i - 1] && (
                        <div className="mt-2 rounded border border-blue-100 bg-blue-50/50 p-2">
                          <div className="mb-1 text-[11px] font-semibold text-blue-700">지연 시 (문자)</div>
                          <p className="whitespace-pre-line leading-relaxed text-gray-600">{row.delayed[i - 1]}</p>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-border/60 bg-gray-50/70 px-5 py-3">
          <button
            type="button"
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
