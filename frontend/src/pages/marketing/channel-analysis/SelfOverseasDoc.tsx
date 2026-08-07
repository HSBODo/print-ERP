import { Callout, DocHeader, Hi, Section, Sources, Summary, Table } from './docParts'

/**
 * 자사해외 채널 분석 문서 (2026-01~08 실측).
 *
 * ⚠️ 이 채널은 **분류 기준 자체가 임시**다. 내원동기(중)에 적힌 담당자 이름 두 개
 *    (김지은(외) · 연제진)로만 잡아낸 것이고, 그 판정표는 reservation_channel_staff 에
 *    2행이 전부다. 해외팀 조직 정보가 들어오면 다시 잡아야 한다.
 *    표본 17명이라 이 문서는 결론보다 **데이터 품질 지적**이 본체다.
 *
 * 조회하지 않는 정적 문서다. 최신 수치는 `예약 퍼널`·`채널별 수익성` 에서 본다.
 */

const PERIOD = '2026-01-01 ~ 2026-08-31 (등록일 기준)'

export function SelfOverseasDoc() {
  return (
    <div className="flex flex-col gap-4">
      <DocHeader title="자사해외" badges={[PERIOD, '예약 23명 · 수술 17명', '⚠️ 분류 임시 · 소표본']} />

      <Summary headline="해외 채널로 분류했는데 외국인이 0명이다.">
        수술 17명 전원의 <b className="font-semibold text-white">국적이 비어 있다</b>.
        해외 담당자가 유치했다고 분류했지만, 실제로 외국인인지 국적 입력을 안 한 것인지
        <b className="font-semibold text-white"> 데이터로 구분할 수 없다</b>.
        객단가도 250만으로 전 채널 최저다. 이 문서의 결론은 하나다 —
        <b className="font-semibold text-white"> 지금 상태로는 이 채널을 평가할 수 없다.</b>
      </Summary>

      <Section no="1" title="⚠️ 먼저 — 이 채널은 어떻게 만들어졌나">
        <p className="mb-3 text-[13px] leading-relaxed text-slate-600">
          내원동기(중)에 적힌 <b>담당자 이름</b>으로만 잡는다. 판정표(<code className="rounded bg-slate-100 px-1 text-[12px]">reservation_channel_staff</code>)에
          들어 있는 건 두 행이 전부다.
        </p>
        <Table
          head={['내원동기(중)', '예약경로', '예약', '비고']}
          rows={[
            ['김지은(외)', '아웃콜', '12명', '사내 동명이인 구분 접미사 (외)'],
            ['연제진', '인콜', '7명', '자사 해외마케팅 담당'],
            ['연제진', '아웃콜', '3명', ''],
            ['김지은(외)', '인콜', '1명', ''],
          ]}
        />
        <Callout tone="warn" title="이름 기반 분류의 한계">
          <b>담당자가 바뀌거나 이름이 다르게 적히면 채널이 통째로 사라진다.</b>
          동명이인 구분을 접미사 '(외)'에 의존하고 있어, 입력 실수 한 번에
          자사해외가 아웃콜로 흘러가거나 그 반대가 된다.
          해외팀 조직 테이블이 들어오면 <b>사람이 아니라 소속으로 판정</b>해야 한다.
        </Callout>
      </Section>

      <Section no="2" title="국적 — 17명 전원 미기재">
        <Table
          head={['채널', '수술 인원', '국적 표기됨', '외국인율']}
          rows={[
            ['크리에이트립', '34명', '34명', '100.0%'],
            ['앱', '108명', '103명', '95.4%'],
            ['해외에이전시', '12명', '10명', '83.3%'],
            ['아웃콜', '642명', '299명', '46.6%'],
            [<Hi>자사해외</Hi>, <Hi>17명</Hi>, <Hi>0명</Hi>, <Hi>0.0%</Hi>],
          ]}
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Callout tone="warn" title="두 가지 해석이 모두 가능하다">
            <b>① 실제로 국내 환자다</b> — 해외마케팅 담당자가 국내 소개 건을 함께 처리했을 수 있다.<br />
            <b>② 외국인인데 국적을 안 넣었다</b> — 다른 해외 채널은 83~100%가 기록돼 있어
            이쪽만 0%인 건 입력 누락일 가능성이 있다.<br />
            <b>데이터만으로는 가릴 수 없다. 담당자에게 확인해야 한다.</b>
          </Callout>
          <Callout tone="warn" title="직원소개 할인 82.4%">
            할인 항목의 대부분이 <b>직원소개</b>다(아웃콜 40.4% · 인콜 14.0%).
            평균 할인 102만으로 전 채널 최고이고 할인율은 21.4%다.
            <b>해외 유치보다 내부 소개에 가까운 모습</b>이지만, 이것도 ①·② 어느 쪽인지 못 가린다.
          </Callout>
        </div>
      </Section>

      <Section no="3" title="퍼널과 단가 — 참고용">
        <Table
          head={['', '자사해외', '크리에이트립', '해외에이전시', '전체평균']}
          rows={[
            ['예약 → 수술완료', '23 → 17', '38 → 34', '27 → 11', '—'],
            ['최종전환', '73.9%', '89.5%', '40.7%', '48.6%'],
            ['취소·미내원', <Hi>0건</Hi>, '0건', '0건', '—'],
            ['평균 정가(견적)', '477만', '469만', '390만', '435만'],
            [<Hi>평균 할인</Hi>, <Hi>102만</Hi>, '60만', '0만', '69만'],
            ['할인율', <Hi>21.4%</Hi>, '12.9%', '0.0%', '15.9%'],
            [<Hi>실수납 객단가</Hi>, <Hi>250만</Hi>, '336만', '407만', '337만'],
          ]}
        />
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          정가는 477만으로 가장 높은데 할인 102만을 받아 <Hi>객단가는 250만으로 최저</Hi>다.
          시술은 스마일프로 35.3% · 라섹 23.5%이고 <Hi>ICL 계열이 0%</Hi>다 —
          라섹 비중이 전 채널 최고(전체 9.6%)라 회복 기간이 긴 시술을 택할 수 있는 층,
          즉 <b>국내 거주자일 가능성을 시사한다</b>(정황이지 증거는 아니다).
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
          연령은 평균 26.4세로 젊고 25~29세가 47.1%다. 리드타임은 검사 9일 · 수술 12일이다.
        </p>
      </Section>

      <Section no="4" title="검증된 것과 아직 모르는 것">
        <div className="grid gap-3 lg:grid-cols-2">
          <Callout tone="good" title="검증된 사실">
            <ul className="ml-4 list-disc space-y-1">
              <li>예약 23명 전원 접수(취소·미내원 0건)</li>
              <li>수술 17명 전원 국적 미기재</li>
              <li>직원소개 할인 82.4%, 평균 할인 102만(최고)</li>
              <li>객단가 250만으로 전 채널 최저</li>
              <li>라섹 23.5%로 최고, ICL 계열 0%</li>
            </ul>
          </Callout>
          <Callout tone="bad" title="이 문서로 판단하면 안 되는 것">
            <ul className="ml-4 list-disc space-y-1">
              <li><b>"자사 해외마케팅의 성과"</b> — 환자가 외국인인지조차 확인되지 않았다.</li>
              <li><b>"객단가가 낮으니 비효율"</b> — 17명이고 직원소개가 섞여 있다.</li>
              <li><b>채널 간 순위</b> — 분류 기준이 이름 두 개라 다른 채널과 대등하지 않다.</li>
            </ul>
          </Callout>
        </div>
      </Section>

      <Section no="5" title="그래서 무엇을 해야 하나">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-[15px] font-bold text-slate-900">분석보다 정비가 먼저다</p>
          <ol className="mt-2 ml-4 list-decimal space-y-1.5 text-[13px] leading-relaxed text-slate-600">
            <li>
              <Hi>국적 입력</Hi> — 17명이 외국인인지 확인한다. 이것만으로 이 채널의 정체가 정해진다.
            </li>
            <li>
              <Hi>해외팀 조직 정보</Hi>를 받아 이름이 아니라 <b>소속으로 판정</b>하도록 바꾼다.
              지금은 담당자가 바뀌면 채널이 사라진다.
            </li>
            <li>
              그 뒤에 <b>직원소개 82.4%</b>가 해외 유치인지 내부 소개인지 갈라 본다.
            </li>
          </ol>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
            채널을 미리 만들어 둔 것 자체는 맞는 판단이었다 — 나중에 붙이려면 소급 분류가 훨씬 어렵다.
            다만 <b>지금 상태의 숫자를 성과로 읽으면 안 된다</b>.
          </p>
        </div>
      </Section>

      <Sources
        items={[
          <>기간 {PERIOD}. 인원은 예약 → 검사 → 수술등록 → 수술완료를 통과한 사람(<b>예약 퍼널</b>과 같은 정의).</>,
          <><b>표본 17명이고 분류 기준이 담당자 이름 2개다.</b> 이 문서는 결론보다 데이터 품질 지적이 본체다.</>,
          <>판정표는 <code>reservation_channel_staff</code>(2행: 김지은(외) · 연제진)이다. 해외팀 조직 정보가 들어오면 갱신해야 한다.</>,
          <>국적은 <code>CUSTOM.NATION_CODE</code> 기준이며 17명 전원 비어 있다. 국내 환자인지 입력 누락인지 구분 불가.</>,
          <>정가·할인은 검사 시점 <b>견적</b>(EXAM.OP_ESTIMATE) 파싱값이다.</>,
        ]}
      />
    </div>
  )
}
