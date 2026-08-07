import type { ReactNode } from 'react'

/**
 * 모두닥 채널 분석 — 정적 문서 페이지.
 *
 * 조회를 하지 않는다. 수치는 2026-01~08 실측을 본문에 고정해 둔 것이다.
 * 이유: 이 문서의 값어치는 숫자 자체가 아니라 **어떤 가설이 검증되고 어떤 가설이 죽었는지**에 있다.
 * 매달 갱신되는 화면으로 만들면 그때그때 숫자만 바뀌고 결론의 근거가 사라진다.
 * 숫자를 다시 뽑고 싶으면 `예약통계_채널별`·`채널별 수익성` 을 보면 된다.
 *
 * ⚠️ 유지보수 시 주의 — 4번 항목(철회 기록)을 지우지 말 것.
 *    "스마일→프로 상담 전환" 은 한 번 제안됐다가 데이터로 반박된 안이다.
 *    기록을 지우면 같은 제안이 다시 올라온다.
 */

/* 출처를 한 곳에 모은다 — 본문 수치를 고칠 때 어디를 다시 돌려야 하는지 바로 알 수 있게. */
const PERIOD = '2026-01-01 ~ 2026-08-31 (등록일 기준)'
const N_MODOODOC = 475

function Section({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-7 py-6 shadow-sm">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-slate-900 text-[12px] font-bold text-white">
          {no}
        </span>
        <h2 className="text-[16px] font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

/** 표 — 마지막 열은 오른쪽 정렬이 기본이다(숫자 칸). */
function Table({ head, rows }: { head: string[]; rows: (string | ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200">
            {head.map((h, i) => (
              <th key={h} className={`whitespace-nowrap py-2 text-[11.5px] font-semibold text-slate-400 ${i === 0 ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-slate-50">
              {r.map((cell, ci) => (
                <td key={ci} className={`py-[7px] tabular-nums ${ci === 0 ? 'text-left font-medium text-slate-700' : 'text-right text-slate-900'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Hi = ({ children }: { children: ReactNode }) => (
  <b className="font-bold text-slate-900">{children}</b>
)

/** 결론 박스 — 색으로 성격을 구분한다. good=검증됨 / bad=철회됨 / warn=미확인 */
function Callout({ tone, title, children }: { tone: 'good' | 'bad' | 'warn'; title: string; children: ReactNode }) {
  const s = {
    good: { bg: 'bg-emerald-50/70', bd: 'border-emerald-200', tx: 'text-emerald-800' },
    bad: { bg: 'bg-red-50/70', bd: 'border-red-200', tx: 'text-red-800' },
    warn: { bg: 'bg-amber-50/70', bd: 'border-amber-200', tx: 'text-amber-800' },
  }[tone]
  return (
    <div className={`rounded-xl border ${s.bd} ${s.bg} px-4 py-3`}>
      <p className={`mb-1 text-[13px] font-bold ${s.tx}`}>{title}</p>
      <div className="text-[13px] leading-relaxed text-slate-600">{children}</div>
    </div>
  )
}

export function ModoodocPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto pb-8">
      {/* ── 헤더 ── */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5">
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">모두닥 채널 분석</h1>
        <span className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600">
          {PERIOD}
        </span>
        <span className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600">
          수술 완료 {N_MODOODOC}명
        </span>
      </div>

      {/* ── 한 줄 요약 ── */}
      <div className="rounded-2xl border border-slate-900 bg-slate-900 px-7 py-5 shadow-sm">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">한 줄 요약</p>
        <p className="mt-1.5 text-[17px] font-bold leading-relaxed text-white">
          국내 20대 후반 직장인이, 정가가 낮은 스마일을 골라, 플랫폼 할인을 받고 수술한다.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-300">
          객단가 326만원은 <b className="font-semibold text-white">깎아준 결과가 아니라 이 채널의 고정 특성</b>이다.
          타채널과의 차이 43만원 중 36만원(84%)이 시술 구성 차이이고, 그 구성은 검사 단계의 임상 판단으로 이미 정해져 있다.
        </p>
      </div>

      <Section no="1" title="누가 오는가">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-500">연령 분포</p>
            <Table
              head={['연령대', '모두닥', '타채널']}
              rows={[
                ['25–29세', <Hi>36.8%</Hi>, '26.9%'],
                ['20–24세', '26.1%', '26.7%'],
                ['30–34세', '22.9%', '21.6%'],
                ['35–39세', '8.2%', '10.0%'],
                ['10대', <Hi>3.2%</Hi>, '10.1%'],
                ['40세 이상', '2.7%', '4.8%'],
              ]}
            />
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
              25–29세에 <Hi>+10%p</Hi> 몰린다. 10대는 3분의 1 수준이라 <Hi>수험생·학생 유입 경로가 아니다</Hi>.
            </p>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-500">직업 (상위 6)</p>
            <Table
              head={['직업', '인원', '비중']}
              rows={[
                ['직장인', '214명', <Hi>45.1%</Hi>],
                ['대학생', '114명', '24.0%'],
                ['취업준비·휴식', '38명', '8.0%'],
                ['자영업·프리랜서', '22명', '4.6%'],
                ['일반사무·회사원', '17명', '3.6%'],
                ['군인', '12명', '2.5%'],
              ]}
            />
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
              직장인 비중이 타채널(36.2%)보다 <Hi>9%p 높다</Hi>. 가처분소득이 있는 층이다.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[12px] font-semibold text-slate-500">국적 — 외국인 채널이 아니다</p>
          <Table
            head={['채널', '수술 인원', '외국인 비율']}
            rows={[
              ['크리에이트립', '34명', '100.0%'],
              ['앱', '108명', '95.4%'],
              ['해외에이전시', '12명', '83.3%'],
              ['아웃콜', '642명', '46.6%'],
              ['인콜', '2,190명', '4.0%'],
              ['홈페이지', '834명', '2.2%'],
              [<Hi>모두닥</Hi>, <Hi>475명</Hi>, <Hi>1.1%</Hi>],
            ]}
          />
          <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
            모두닥 외국인은 5명(1.1%)으로 전 채널 최저 수준이다. <Hi>국내 채널로 봐야 한다.</Hi>
            {' '}신환 비율은 94.1%로 타채널과 같아 신규 유치력 자체는 평범하다.
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            ※ 성별은 확인할 수 없다 — CRM(CUSTOM)에 성별 컬럼이 없고 주민번호는 암호화되어 있다.
          </p>
        </div>
      </Section>

      <Section no="2" title="할인은 얼마인가 — 평균 78만원 (할인율 19.2%, 전 채널 최고)">
        <Table
          head={['할인 항목', '모두닥 적용률', '타채널', '평균 금액']}
          rows={[
            [<Hi>플랫폼</Hi>, <Hi>60.4%</Hi>, '5.4%', '65만'],
            [<Hi>모두닥(스마일)</Hi>, <Hi>11.8%</Hi>, '0.1%', '85만'],
            ['스마일프로특가', '11.8%', '24.4%', '60만'],
            [<Hi>모두닥</Hi>, <Hi>10.9%</Hi>, '0.1%', '20만'],
            [<Hi>플랫폼(프로)</Hi>, '7.8%', '1.6%', '60만'],
            ['선결', '5.1%', '5.7%', '121만'],
            ['원데이', '1.7%', '3.0%', '20만'],
            ['B2B군인·기업', '1.1%', '3.2%', '80만'],
            ['수험생', '0.6%', '6.3%', '60만'],
          ]}
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Callout tone="good" title="할인은 전부 채널 정책이다">
            <Hi>플랫폼</Hi> · <Hi>모두닥</Hi> · <Hi>모두닥(스마일)</Hi> 세 항목이 할인의 83%를 차지한다.
            모두닥 유입에 자동으로 붙는 값이고 <b>상담사 재량 할인이 아니다</b>.
          </Callout>
          <Callout tone="warn" title="계약 조건인지 자체 정책인지는 모른다">
            <b>플랫폼-70</b>이 모두닥과의 계약상 의무인지 우리가 정한 판촉인지는 데이터로 알 수 없다.
            계약 조건이라면 할인 조정은 애초에 선택지가 아니다. <b>확인 필요.</b>
          </Callout>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          수험생 할인은 0.6%(타채널 6.3%)뿐이라 연령 분포와 정확히 맞아떨어진다.
        </p>
      </Section>

      <Section no="3" title="객단가가 낮은 이유 — 84%가 시술 구성">
        <p className="mb-3 text-[13px] leading-relaxed text-slate-600">
          최종 수납액만 보면 "깎아줬나 싼 걸 했나"를 구분할 수 없다.
          검사 견적(<code className="rounded bg-slate-100 px-1 text-[12px]">EXAM.OP_ESTIMATE</code>)에
          정가와 할인이 <code className="rounded bg-slate-100 px-1 text-[12px]">SMILE_300/플랫폼-70</code> 형태로
          들어 있어 둘을 갈랐다.
        </p>
        <Table
          head={['', '모두닥', '인콜(최대 채널)', '차이']}
          rows={[
            ['평균 정가', '404만', '440만', <Hi>−36만 (84%)</Hi>],
            ['평균 할인', '78만', '71만', <Hi>−7만 (16%)</Hi>],
            ['평균 실가', <Hi>326만</Hi>, '369만', '−43만'],
            ['할인율', '19.2%', '16.1%', '+3.1%p'],
          ]}
        />
        <p className="mt-4 mb-2 text-[12px] font-semibold text-slate-500">정가가 낮은 원인 — 스마일 편중</p>
        <Table
          head={['시술', '모두닥 비중', '전체 비중', '평균 단가']}
          rows={[
            [<Hi>스마일</Hi>, <Hi>51.3%</Hi>, '35.0%', '245만'],
            ['스마일프로', '23.1%', '35.4%', <Hi>398만</Hi>],
            ['라섹', '9.7%', '9.6%', '192만'],
            ['T-ICL', '7.2%', '8.3%', '559만'],
            ['ICL', '3.2%', '4.7%', '492만'],
          ]}
        />
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
          245만짜리 스마일이 절반이고, 398만짜리 스마일프로는 전체보다 12%p 적다.
          같은 시술 안에서는 오히려 스마일프로를 <Hi>405만</Hi>(전체 398만)으로 더 받았다.
        </p>
      </Section>

      <Section no="4" title="검증된 것과 철회한 것">
        <div className="grid gap-3 lg:grid-cols-2">
          <Callout tone="bad" title="철회 — 「스마일 → 스마일프로 상담 전환」">
            <p className="mb-2">
              한 번 제안했다가 <b>데이터로 반박된 안</b>이다. 추천 시술과 실제 시술을 3,727건 대조한 결과
              <b> 하향 변경이 단 한 건도 없었다.</b>
            </p>
            <div className="rounded-lg bg-white/70 p-2.5">
              <Table
                head={['추천 → 실행', '모두닥', '타채널']}
                rows={[
                  ['스마일 → 스마일', '241', '1,612'],
                  ['프로 → 프로', '109', '1,765'],
                  [<Hi>프로 → 스마일(하향)</Hi>, <Hi>0</Hi>, <Hi>0</Hi>],
                ]}
              />
            </div>
            <p className="mt-2">
              전원이 추천받은 대로 수술했다. 시술 구성은 <b>검사 단계의 임상 판단(각막 두께·도수·난시)</b>으로
              이미 결정되며 상담으로 옮길 여지가 없다. 임상 결정을 영업 변수로 다룬 잘못된 제안이었다.
            </p>
          </Callout>

          <div className="flex flex-col gap-3">
            <Callout tone="good" title="검증된 사실">
              <ul className="ml-4 list-disc space-y-1">
                <li>25–29세 · 직장인 45% · 국내 99%</li>
                <li>할인 평균 78만, 그중 83%가 채널 정책</li>
                <li>객단가 차이의 84%가 정가(시술 구성)</li>
                <li>추천 대비 시술 하향 0건</li>
              </ul>
            </Callout>
            <Callout tone="warn" title="근거 없는 추측 — 쓰지 말 것">
              <ul className="ml-4 list-disc space-y-1">
                <li>"할인을 줄이면 유입이 준다" — 검증한 적 없음</li>
                <li>"모두닥 환자는 눈 조건이 다르다" — 검사 데이터 미확인</li>
              </ul>
            </Callout>
          </div>
        </div>
      </Section>

      <Section no="5" title="그래서 무엇을 판단해야 하나">
        <p className="text-[14px] font-bold leading-relaxed text-slate-900">
          객단가는 조정 대상이 아니라 이 채널의 고정 특성이다. 남는 질문은 하나다.
        </p>
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-[15px] font-bold text-slate-900">모두닥 광고비를 쓸 만한가?</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            326만 × 475명 = <Hi>약 15.5억</Hi> 매출. 시력교정은 렌즈 원가가 없어 공헌이익률이 높다.
            객단가가 43만 낮아도 물량이 받쳐주면 충분히 남을 수 있다.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            객단가를 올리려 하지 말고 <Hi>CAC 대비 공헌이익</Hi>으로 판단해야 한다.
            광고비만 입력되면 <b>채널별 수익성</b> 화면에서 바로 나온다.
          </p>
        </div>
      </Section>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-7 py-5">
        <p className="mb-2 text-[12px] font-bold text-slate-500">출처와 한계</p>
        <ul className="ml-4 list-disc space-y-1 text-[12.5px] leading-relaxed text-slate-500">
          <li>기간 {PERIOD}. 인원은 예약 → 검사 → 수술등록 → 수술완료를 모두 통과한 사람이다(예약통계_채널별과 같은 정의).</li>
          <li>정가·할인은 검사 시점 <b>견적</b>이라 실수납액과 편차가 있다. 매출 분석에는 수납액을, 가격 정책 분석에는 견적을 쓴다.</li>
          <li>견적 파싱 커버리지는 시력교정 100%(6,349건). 백내장은 형식이 달라 빠지지만 예약 퍼널에 1건뿐이라 영향이 없다.</li>
          <li>할인 컬럼(COSTPRICE.DicPrc 등)은 사실상 비어 있어(0.09%) 쓰지 않았다. 할인은 견적 텍스트에서 파싱했다.</li>
          <li>성별 미확인. 광고비 미입력 상태라 CAC·ROAS는 아직 계산할 수 없다.</li>
        </ul>
      </div>
    </div>
  )
}
