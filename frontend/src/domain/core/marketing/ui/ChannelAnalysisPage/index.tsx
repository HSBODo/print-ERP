import { useState, type FC } from 'react'
import { FileText, Lock } from 'lucide-react'
import { ModoodocDoc } from './ui/ModoodocDoc'
import { OverseasAgencyDoc } from './ui/OverseasAgencyDoc'
import { HomepageDoc } from './ui/HomepageDoc'
import { IncallDoc } from './ui/IncallDoc'
import { NaverDoc } from './ui/NaverDoc'
import { OutcallDoc } from './ui/OutcallDoc'
import { AppDoc } from './ui/AppDoc'
import { CafeDoc } from './ui/CafeDoc'
import { CreatripDoc } from './ui/CreatripDoc'
import { SelfOverseasDoc } from './ui/SelfOverseasDoc'

/**
 * 채널별 분석 — 좌측에서 채널을 고르면 오른쪽에 그 채널 문서가 열린다.
 *
 * 분석 본문은 실측 시점의 값을 고정한 정적 문서다. 일부 채널은 상단 추세 차트만 최신 데이터를 조회한다 —
 * 이 화면의 값어치는 숫자가 아니라 **어떤 가설이 검증되고 어떤 가설이 죽었는지**에 있고,
 * 매달 갱신되는 화면으로 만들면 숫자만 바뀌고 결론의 근거가 사라진다.
 * 최신 수치는 `예약 퍼널`·`채널별 수익성` 이 담당한다.
 *
 * 채널을 추가하려면 CHANNELS 에 한 줄 넣고 doc 에 컴포넌트를 붙이면 된다.
 * doc 이 없으면 자동으로 '준비 중' 으로 표시되며 클릭해도 안내만 나온다.
 */

type ChannelDoc = {
  id: string
  label: string
  /** 문서가 없으면 준비 중으로 표시한다. 목록에는 남긴다 — 무엇이 안 됐는지 보이게. */
  doc?: FC
  /** 준비 중 항목에만 쓴다. 왜 아직 없는지 한 줄. */
  note?: string
}

/** 수술 완료 인원(2026-01~08) 많은 순. 10개 채널 전부 문서가 있다. */
const CHANNELS: ChannelDoc[] = [
  { id: 'incall', label: '인콜', doc: IncallDoc },
  { id: 'naver', label: '네이버', doc: NaverDoc },
  { id: 'homepage', label: '홈페이지', doc: HomepageDoc },
  { id: 'outcall', label: '아웃콜', doc: OutcallDoc },
  { id: 'modoodoc', label: '모두닥', doc: ModoodocDoc },
  { id: 'app', label: '앱', doc: AppDoc },
  { id: 'cafe', label: '카페', doc: CafeDoc },
  { id: 'creatrip', label: '크리에이트립', doc: CreatripDoc },
  { id: 'agency-overseas', label: '해외에이전시', doc: OverseasAgencyDoc },
  { id: 'self-overseas', label: '자사해외', doc: SelfOverseasDoc },
]

function Placeholder({ label, note }: { label: string; note?: string }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-8 py-12 text-center">
      <Lock className="h-6 w-6 text-slate-300" />
      <p className="text-[15px] font-bold text-slate-700">
        {label} 분석은 아직 작성되지 않았습니다
      </p>
      {note && <p className="text-[12.5px] text-slate-400">{note}</p>}
      <p className="mt-1 max-w-[420px] text-[12.5px] leading-relaxed text-slate-500">
        채널 수치 자체는{' '}
        <b className="font-semibold text-slate-700">예약 퍼널</b>과{' '}
        <b className="font-semibold text-slate-700">채널별 수익성</b>에서 지금
        바로 볼 수 있습니다. 이 화면은 그 수치를 해석하고 검증한{' '}
        <b className="font-semibold text-slate-700">결론</b>을 담는 곳입니다.
      </p>
    </div>
  )
}

export function ChannelAnalysisPage() {
  const [sel, setSel] = useState(CHANNELS[0].id)
  const current = CHANNELS.find((c) => c.id === sel) ?? CHANNELS[0]
  const Doc = current.doc

  return (
    <div className="flex min-h-0 flex-1 gap-5 overflow-hidden">
      {/* ── 좌측 LNB ── 문서가 있는 채널을 위에, 준비 중을 아래에 둔다.
          self-start 로 내용 높이만 차지한다 — 기본값(stretch)이면 채널이 10개뿐인데도
          카드가 화면 끝까지 늘어나 빈 흰 판이 된다. 채널이 많아지면 max-h-full 안에서 스크롤. */}
      <aside className="flex max-h-full w-[196px] flex-none flex-col self-start overflow-y-auto rounded-2xl border border-slate-200/80 bg-white py-3 shadow-sm">
        <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          채널
        </p>
        {CHANNELS.map((c) => {
          const active = c.id === sel
          const ready = Boolean(c.doc)
          return (
            <button
              key={c.id}
              onClick={() => setSel(c.id)}
              title={c.note}
              className={`flex items-center gap-2 px-4 py-[9px] text-left text-[13px] transition-colors ${
                active
                  ? 'bg-slate-100 font-bold text-slate-900'
                  : ready
                    ? 'font-semibold text-slate-700 hover:bg-slate-50'
                    : 'font-normal text-slate-400 hover:bg-slate-50'
              }`}
            >
              <span
                className="h-4 w-[3px] flex-none rounded-sm"
                style={{ background: active ? '#2563eb' : 'transparent' }}
              />
              <span className="min-w-0 flex-1 truncate">{c.label}</span>
              {ready ? (
                <FileText className="h-3.5 w-3.5 flex-none text-slate-400" />
              ) : (
                <span className="flex-none text-[10px] text-slate-300">
                  준비중
                </span>
              )}
            </button>
          )
        })}
      </aside>

      {/* ── 우측 문서 ── */}
      <div className="min-w-0 flex-1 overflow-y-auto pb-8">
        {Doc ? (
          <Doc />
        ) : (
          <Placeholder label={current.label} note={current.note} />
        )}
      </div>
    </div>
  )
}
