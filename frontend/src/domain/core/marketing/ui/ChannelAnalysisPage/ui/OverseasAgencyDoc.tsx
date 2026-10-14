import {
  Callout,
  DocHeader,
  Hi,
  Section,
  Sources,
  Summary,
  Table,
} from './docParts'

/**
 * 해외에이전시 채널 분석 문서 (2026-01~08 실측).
 *
 * ⚠️ 표본이 작다 — 예약 27명 / 수술 12명. 비율은 한 명이 3~4%p 를 움직인다.
 *    그래서 이 문서는 **비율 순위**가 아니라 **0 과 100 으로 갈리는 사실**만 결론으로 쓴다
 *    (취소 0건, 추천 있으면 수술 100%, 할인 0원 — 이건 표본이 작아도 성립한다).
 *    "객단가 1위" 같은 순위 주장은 의도적으로 넣지 않았다.
 *
 * 조회하지 않는 정적 문서다. 최신 수치는 `예약 퍼널`·`채널별 수익성` 에서 본다.
 */

const PERIOD = '2026-01-01 ~ 2026-08-31 (등록일 기준)'

export function OverseasAgencyDoc() {
  return (
    <div className="flex flex-col gap-4">
      <DocHeader
        title="해외에이전시"
        badges={[PERIOD, '예약 27명 · 수술 12명', '⚠️ 소표본']}
      />

      <Summary headline="오면 반드시 수술한다. 문제는 60%가 수술을 못 받고 돌아간다는 것이다.">
        취소·부도가 <b className="font-semibold text-white">0건</b>이고 할인도{' '}
        <b className="font-semibold text-white">0원</b>이다. 당일 검사·당일
        수술로 끝난다. 그런데 검사에서{' '}
        <b className="font-semibold text-white">
          추천 시술이 나온 사람은 100% 수술했고, 안 나온 사람은 100% 못 했다
        </b>
        . 즉 이 채널의 병목은 상담이 아니라{' '}
        <b className="font-semibold text-white">
          에이전시 단계의 사전 스크리닝
        </b>
        이다.
      </Summary>

      <Section no="1" title="누가 오는가 — 몽골 중심">
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-500">
              국적 (수술 완료 12명)
            </p>
            <Table
              head={['국적', '인원']}
              rows={[
                [<Hi>몽골</Hi>, <Hi>8명</Hi>],
                ['프랑스', '1명'],
                ['홍콩', '1명'],
                ['미기재', '2명'],
              ]}
            />
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
              해외 채널 중 유일하게 <Hi>몽골</Hi>이 주력이다. 크리에이트립은
              대만(25/34), 앱은 미국·프랑스 등 서구권으로 갈린다.
            </p>
          </div>
          <div>
            <p className="mb-2 text-[12px] font-semibold text-slate-500">
              리드타임 — 등록에서 수술까지
            </p>
            <Table
              head={['채널', '검사까지', '수술까지']}
              rows={[
                [<Hi>해외에이전시</Hi>, <Hi>1일</Hi>, <Hi>1일</Hi>],
                ['자사해외', '9일', '12일'],
                ['인콜', '7일', '13일'],
                ['크리에이트립', '13일', '13일'],
                ['앱', '18일', '19일'],
              ]}
            />
            <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500">
              <Hi>등록·검사·수술이 같은 날</Hi>이다. 입국해서 하루에 끝내고
              돌아간다. 일정을 다시 잡을 수 없는 구조라{' '}
              <b>검사 당일에 결론이 나야 한다</b>.
            </p>
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
          ※ 연령·직업 분포는 넣지 않았다. 12명으로는 한 명이 8%p 를 움직여
          해석이 불가능하다.
        </p>
      </Section>

      <Section no="2" title="퍼널 — 취소·부도가 0건이다">
        <Table
          head={[
            '채널',
            '예약',
            '취소제외',
            '접수',
            '검사',
            '수술등록',
            '수술완료',
            '최종전환',
          ]}
          rows={[
            [
              '크리에이트립',
              '38',
              '38',
              '38',
              '38',
              '34',
              '34',
              <Hi>89.5%</Hi>,
            ],
            ['자사해외', '23', '23', '23', '23', '19', '17', '73.9%'],
            [
              <Hi>해외에이전시</Hi>,
              <Hi>27</Hi>,
              <Hi>27</Hi>,
              <Hi>27</Hi>,
              <Hi>27</Hi>,
              <Hi>11</Hi>,
              <Hi>11</Hi>,
              <Hi>40.7%</Hi>,
            ],
            ['아웃콜', '1,096', '999', '845', '838', '651', '622', '56.8%'],
            [
              '인콜',
              '4,776',
              '3,776',
              '3,048',
              '3,030',
              '2,296',
              '2,186',
              '45.8%',
            ],
          ]}
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Callout tone="good" title="예약 27명 전원이 검사까지 왔다">
            취소 0 · 미내원 0 · 검사중단 0. 해외
            3채널(에이전시·크리에이트립·자사해외) 모두 같다. 인콜은 예약 4,776명
            중 <b>1,728명(36%)이 취소·미내원</b>으로 빠진다. 비행기를 타고 온
            사람은 안 빠진다 — 당연하지만 숫자로 확인됐다.
          </Callout>
          <Callout
            tone="warn"
            title="그런데 최종전환은 40.7%로 해외 채널 중 꼴찌다"
          >
            떨어지는 지점이 하나뿐이다 —{' '}
            <b>검사 → 수술등록에서 27명이 11명이 된다</b>. 같은 해외 채널인
            크리에이트립은 38 → 34 로 거의 안 빠진다. 원인은 아래 3번.
          </Callout>
        </div>
      </Section>

      <Section no="3" title="병목의 정체 — 영업이 아니라 수술 부적합">
        <p className="mb-3 text-[13px] leading-relaxed text-slate-600">
          검사 결과(
          <code className="rounded bg-slate-100 px-1 text-[12px]">
            EXAM.OPERATIONR
          </code>{' '}
          = 추천 시술)와 실제 수술 여부를 대조했다. 결과가 <Hi>0 아니면 100</Hi>
          으로 완전히 갈린다.
        </p>
        <Table
          head={['검사 결과', '건수', '수술함', '견적 없음']}
          rows={[
            [<Hi>추천 시술 있음</Hi>, '12', <Hi>12 (100%)</Hi>, '0'],
            [<Hi>추천 없음</Hi>, '16', <Hi>0 (0%)</Hi>, '15'],
            ['Extra만 해당', '1', '0', '1'],
          ]}
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <Callout tone="good" title="상담 실패가 아니다">
            추천이 나온 사람은 <b>한 명도 빠짐없이 수술했다</b>. 가격을 듣고
            돌아간 사람이 아니라, 애초에 <b>제시할 시술이 없었던</b> 것이다.
            16명 중 15명은 견적조차 발행되지 않았다.
          </Callout>
          <Callout tone="warn" title="몽골 유입에 집중돼 있다">
            국적별로 보면 몽골 21명 중 <b>13명(62%)</b>이 수술까지 가지 못했다.
            각막 조건·도수 분포 때문인지, 에이전시가 대상을 넓게 보내서인지는{' '}
            <b>검사 수치를 봐야 알 수 있다(미확인)</b>.
          </Callout>
        </div>
      </Section>

      <Section no="4" title="단가 — 할인 0원, 정가 그대로 받는다">
        <Table
          head={['', '해외에이전시', '인콜', '모두닥']}
          rows={[
            ['평균 정가(견적)', '390만', '440만', '404만'],
            [<Hi>평균 할인</Hi>, <Hi>0만</Hi>, '71만', '78만'],
            ['할인율', <Hi>0.0%</Hi>, '16.1%', '19.2%'],
            ['평균 실가(견적 기준)', '390만', '369만', '326만'],
            ['실수납 객단가', <Hi>407만</Hi>, '339만', '304만'],
          ]}
        />
        <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
          견적 문자열에{' '}
          <code className="rounded bg-slate-100 px-1 text-[12px]">
            에이전시B
          </code>{' '}
          ·{' '}
          <code className="rounded bg-slate-100 px-1 text-[12px]">
            에이전시C
          </code>{' '}
          같은 태그가 붙지만 <Hi>금액이 딸린 할인 항목이 하나도 없다</Hi>.
          플랫폼 할인(모두닥 60.4% 적용)도 0%다.
        </p>
        <Callout tone="warn" title="에이전시 수수료는 이 숫자에 없다">
          <b>
            정가를 다 받는 대신 에이전시에 수수료를 준다면 실질 마진은 여기
            보이는 것보다 낮다.
          </b>
          수수료는 CRM 어디에도 기록되지 않아 확인할 수 없다.
          <b>
            {' '}
            계약 조건 확인 없이 "객단가가 제일 높은 채널"이라고 말하면 안 된다.
          </b>
        </Callout>
      </Section>

      <Section no="5" title="그래서 무엇을 판단해야 하나">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-[15px] font-bold text-slate-900">
            사전 스크리닝을 에이전시에 넘길 수 있는가
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            27명이 입국해 11명만 수술했다. 나머지 16명은{' '}
            <b>검사·통역·일정에 리소스를 쓰고 매출 0</b>이다. 리드타임이 1일이라
            재방문으로 회수되지도 않는다.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            현지에서 <Hi>기본 굴절·각막 정보만 미리 받아도</Hi> 상당수를 거를 수
            있다. 부적합 사유가 무엇인지(각막 두께? 도수 범위? 안질환?) 먼저
            확인하면 에이전시에 줄 기준을 만들 수 있다.
          </p>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-slate-600">
          이 채널은 <Hi>객단가를 올릴 여지가 없다</Hi>(이미 할인 0, 정가 수취).
          개선 여지는 전부 <Hi>부적합 60%를 줄이는 쪽</Hi>에 있다.
        </p>
      </Section>

      <Sources
        items={[
          <>
            기간 {PERIOD}. 인원은 예약 → 검사 → 수술등록 → 수술완료를 통과한
            사람(<b>예약 퍼널</b>과 같은 정의).
          </>,
          <>
            <b>표본이 작다 — 예약 27명 / 수술 12명.</b> 한 명이 3~4%p 를
            움직인다. 0 과 100 으로 갈리는 사실만 결론으로 썼고 순위 주장은 넣지
            않았다.
          </>,
          <>
            부적합 판정은 <code>EXAM.OPERATIONR</code>(추천 시술) 공란 여부로
            봤다. 의학적 사유는 이 필드에 없다.
          </>,
          <>
            국적은 <code>CUSTOM.NATION_CODE</code> 기준(코드 17 = 몽골). 4명은
            미기재다.
          </>,
          <>
            실수납(407만)이 견적(390만)보다 높다 — 검사비 등 견적 외 항목이 붙은
            것으로 보이나 확인하지 않았다.
          </>,
          <>
            <b>에이전시 수수료는 CRM 에 없어 공헌이익을 계산할 수 없다.</b>{' '}
            광고비·수수료가 입력돼야 채널 간 수익성 비교가 가능하다.
          </>,
        ]}
      />
    </div>
  )
}
