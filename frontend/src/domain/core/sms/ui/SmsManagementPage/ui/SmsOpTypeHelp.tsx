import { groupHelpOf } from '../utils/smsTableModel'

/**
 * 수술 분류 도움말 — 표 헤더의 ? 로 연다.
 * 어떤 시술이 어느 분류로 묶이는지만 알려준다(분류가 곧 문구와 발송 시점이다).
 * 표가 overflow-auto 라 안쪽에 붙이면 잘린다. 그래서 화면 좌표(fixed)로 띄운다.
 */
export function SmsOpTypeHelp({ at, groups, onClose }: {
  at: { top: number; left: number }
  groups: ReturnType<typeof groupHelpOf>
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="수술 분류 설명"
        className="fixed z-50 w-[21rem] rounded-lg border border-border/70 bg-white p-3 shadow-lg"
        style={{ top: at.top, left: at.left }}
      >
        <p className="mb-2 text-[11px] text-muted-foreground">
          분류는 <b className="font-semibold text-gray-700">같은 문구가 같은 시점에 나가는 묶음</b>입니다.
          정확한 시술명은 셀에 마우스를 올리면 나옵니다.
        </p>
        <div className="flex flex-col gap-1">
          {groups.map(({ code, label, className, items }) => (
            <div key={code} className="flex items-start gap-2">
              <span className={`w-[4.2rem] shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-semibold ${className}`}>
                {label}
              </span>
              <span className="text-[11px] leading-5 text-gray-600">
                {items.length > 0 ? items.join(' · ') : '그 외 전부(백내장·재수술 등)'}
              </span>
            </div>
          ))}
          {groups.length === 0 && (
            <span className="text-[11px] text-gray-400">템플릿 설정을 불러오지 못했습니다.</span>
          )}
        </div>
      </div>
    </>
  )
}
