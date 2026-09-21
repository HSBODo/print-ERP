import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

/**
 * 문서 폴더는 레포 밖에 산다. 산출물은 이 스크립트의 상위(문서 폴더 루트)에 쓰고,
 * 참조 문서(지표정의·db·점검·databatch)는 같은 루트에 복사돼 있다.
 */
const PLAN = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '..')
const OUT = path.join(PLAN, 'pages')
const TODAY = '2026-09-17'

const HERE = url.fileURLToPath(new URL('.', import.meta.url))
const data = JSON.parse(fs.readFileSync(path.join(process.argv[2] ?? HERE, 'spec-data.json'), 'utf8'))

/**
 * 사람이 쓴 본문. content/<id>.mjs 가 { s2, s3, s4, s5, s10 } 을 내보내면 그 장의
 * 「작성 예정」 자리를 대신한다. 자동 생성 장(1·6·7·8·9)과 분리해 둬야
 * 코드가 바뀔 때마다 다시 생성해도 손으로 쓴 내용이 살아남는다.
 */
const CONTENT_DIR = path.join(HERE, 'content')
const CONTENT = new Map()
if (fs.existsSync(CONTENT_DIR)) {
  for (const f of fs.readdirSync(CONTENT_DIR).filter((x) => x.endsWith('.mjs'))) {
    const mod = await import(url.pathToFileURL(path.join(CONTENT_DIR, f)).href)
    CONTENT.set(f.replace(/\.mjs$/, ''), mod.default)
  }
}
const HAND_SECTIONS = [2, 3, 4, 5, 10]
/**
 * 10장「제약과 미결」 노출 스위치.
 * 발표 자리에서는 미결 목록이 논점을 흐려 통째로 감춘다 — 원고(content/*.mjs 의 s10)는
 * 손대지 않으므로 이 값을 true 로 되돌리면 그대로 다시 나온다.
 * 장 목차와 본문 카드, 그리고 「작성 완료」 판정(REQUIRED_SECTIONS)이 함께 따라간다.
 */
const SHOW_SECTION_10 = false
/* 작성 완료로 치는 데 필요한 장 — 감춘 10장은 요구하지 않는다(써 두면 되살릴 때 그대로 나온다). */
const REQUIRED_SECTIONS = HAND_SECTIONS.filter((n) => SHOW_SECTION_10 || n !== 10)
const filledOf = (id) => {
  const c = CONTENT.get(id)
  if (!c) return []
  return HAND_SECTIONS.filter((n) => typeof c['s' + n] === 'string' && c['s' + n].trim())
}
const byId = new Map(data.pages.map((p) => [p.id, p]))
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/* statsPages.ts 의 설명문은 경어체다 — 문서 문체(음슴체)에 맞춰 출력만 바꾼다. 레포 원본은 건드리지 않는다. */
const toMusum = (s) => String(s ?? '')
  .replace(/입니다/g, '임').replace(/합니다/g, '함')
  .replace(/됩니다/g, '됨').replace(/습니다/g, '음')

/* sms.html 의 스타일을 그대로 물려받는다 — 기획서 두 벌이 서로 다른 문서처럼 보이면 안 된다. */
const SMS = path.join(PLAN, 'sms.html')
const smsHtml = fs.readFileSync(SMS, 'utf8')
const BASE_STYLE = smsHtml.slice(smsHtml.indexOf('<style>') + 7, smsHtml.indexOf('</style>'))
const FONT = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />'

/**
 * 좌측 전메뉴 트리의 생김새는 두 곳에 적혀 있다 —
 *   sms.html  `nav .tree · details.tsec · .tgrp · a.cur`        (48장이 물려받음)
 *   prd.html  `#view-menus .menus-nav …` (같은 규칙, 선택자만 다름)
 * prd.html 은 자기 <style> 을 쓰고 BASE_STYLE 을 읽지 않아 물리적으로 한 벌로 합칠 수가 없다.
 * 한쪽만 고치면 「전메뉴 현황」 탭과 메뉴별 기획서의 트리가 달라 보인다 — 눈으로는 잘 안 걸리고,
 * 실제로 한 번 그렇게 어긋난 적이 있다. 그래서 생성 때마다 값을 대조해 다르면 여기서 멈춘다.
 */
const assertTreeStyleInSync = (prd) => {
  const pick = (text, prefix) => {
    const out = new Map()
    const re = new RegExp(`\\n\\s*${prefix}(\\.tree|details\\.tsec[^{]*|\\.tgrp|a\\.cur)\\s*\\{([^}]*)\\}`, 'g')
    for (const m of text.matchAll(re)) out.set(m[1].trim(), m[2].replace(/\s+/g, ' ').trim())
    return out
  }
  const a = pick(smsHtml, 'nav ')
  const b = pick(prd, '#view-menus \\.menus-nav ')
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort()
  const drift = keys.filter((k) => a.get(k) !== b.get(k))
  if (!a.size || drift.length) {
    console.error('❌ 좌측 트리 스타일이 sms.html 과 prd.html 에서 어긋났다.')
    if (!a.size) console.error('   sms.html 에서 `nav .tree …` 규칙을 찾지 못했다 — 선택자가 바뀌었는지 확인할 것.')
    for (const k of drift) {
      console.error(`   ${k}`)
      console.error(`     sms.html : ${a.get(k) ?? '(없음)'}`)
      console.error(`     prd.html : ${b.get(k) ?? '(없음)'}`)
    }
    console.error('   한쪽만 고치면 「전메뉴 현황」 탭과 메뉴별 기획서의 트리가 달라 보인다. 맞춘 뒤 다시 돌릴 것.')
    process.exit(1)
  }
}

/**
 * 참조 문서 폴더의 .md 는 render-metric-docs.mjs 가 찍은 .html 이 짝으로 있다.
 * 문서 곳곳(RELATED · 문서 지도 · 손으로 쓴 본문)에서 .md 를 그대로 가리키면
 * 브라우저가 원문 텍스트를 띄워 버려 탭바도 좌측 목록도 없는 화면으로 튕긴다.
 * 쓰기 직전에 한 번에 .html 로 돌린다 — 링크를 적는 쪽(content/*.mjs · RELATED)은
 * 원래 경로 그대로 두면 된다. 폴더 목록은 렌더러의 FOLDERS 와 짝이므로 함께 고쳐야 한다.
 */
const RENDERED_DIRS = ['지표정의', '지표정의/_원본', 'db', 'db/tables', '점검', 'databatch']
const linkRenderedDocs = (html) => html.replace(
  /href="([^"]*?)([^"/]+)\.md((?:#[^"]*)?)"/g,
  (whole, dir, name, hash) => {
    const folder = dir.replace(/^(?:\.\.\/)+/, '').replace(/\/$/, '')
    if (!RENDERED_DIRS.includes(folder)) return whole
    return `href="${dir}${name === 'README' ? 'index' : name}.html${hash}"`
  },
)

const EXTRA_STYLE = `
  /* ── 기획서 공통 추가분 ── */
  a { color: var(--accent-ink); }
  .t-done { background: #ecfdf5; color: #047857; }
  .t-draft { background: #f3f4f6; color: #4b5563; }
  .t-plan { background: #fffbeb; color: #b45309; }
  .t-mart { background: #eef2ff; color: #4338ca; }
  .t-crm { background: #fff7ed; color: #c2410c; }
  .t-mixed { background: #f5f3ff; color: #6d28d9; }
  table.menu td:first-child { white-space: normal; }
  table.menu td { white-space: normal; }
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #3b4048; }
  .todo { border: 1px dashed #d4d4d8; border-radius: 11px; padding: 14px 16px; background: #fcfcfd; margin: 10px 0 4px; }
  .todo .h { font-size: 12.5px; font-weight: 700; color: var(--muted-2); margin-bottom: 7px; letter-spacing: .02em; }
  .todo ul { margin-bottom: 0; }
  .todo li { color: var(--muted); }
  /* 완성 문서 맨 아래에 남기는 한 줄 참조 — 상단 안내 상자를 대신한다. */
  .genfoot { margin: 12px 0 0; padding-top: 11px; border-top: 1px solid var(--line); font-size: 11.5px; color: var(--muted-2); }
  .pager { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; margin-top: 6px; }
  .pager a { text-decoration: none; font-weight: 600; }
  /* SQL 리소스 목록은 길어서(최대 75개) 접어 둔다 — 펼치면 그대로 나온다. */
  details.sqlrefs { margin: 14px 0 4px; border: 1px solid var(--line); border-radius: 10px; background: #fcfcfd; }
  details.sqlrefs summary { cursor: pointer; padding: 9px 14px; font-size: 13px; font-weight: 700; color: var(--muted); list-style: none; }
  details.sqlrefs summary::-webkit-details-marker { display: none; }
  details.sqlrefs summary::before { content: '▸'; margin-right: 7px; font-size: 10px; color: var(--muted-2); }
  details.sqlrefs[open] summary::before { content: '▾'; }
  details.sqlrefs summary:hover { color: var(--ink); }
  details.sqlrefs ul { margin: 0; padding: 0 14px 12px 32px; }
  details.sqlrefs li { margin-bottom: 2px; }
`

/* 기획서 48장이 파일로 나뉘어 있어도 윗줄은 같은 자리에 남아야 한다 —
   그래야 링크를 눌렀을 때 문서가 바뀐 게 아니라 안에서 본문만 바뀐 것처럼 보인다.
   prd.html 은 뷰를 바꾸는 <button> 이지만 여기서는 prd.html 로 돌아가는 <a> 다. */
const TABBAR = `  <!-- ===== Top tab bar ===== -->
  <div class="tabbar">
    <div class="tabs">
      <a class="tab" href="../prd.html#view-prd">대쉬보드 요구사항</a>
      <span class="sep">···</span>
      <a class="tab" href="../지표정의/1-예약.html">지표 정의</a>
      <span class="sep">···</span>
      <a class="tab" href="../glossary.html">용어사전</a>
      <span class="sep">···</span>
      <a class="tab" href="../prd.html#view-flow">IA</a>
      <span class="sep">···</span>
      <a class="tab active" href="../prd.html#view-menus">전메뉴 현황</a>
      <span class="sep">···</span>
      <a class="tab" href="../prd.html#view-wireframe">화면 조회 쿼리문</a>
      <span class="sep">···</span>
      <a class="tab" href="../prd.html#view-goal">26.09월 목표</a>
      <span class="sep">···</span>
      <a class="tab" href="../prd.html#view-expansion">26.10 이후 확장 전략</a>
    </div>
  </div>`

const shell = ({ title, brand, nav, body, upDir = '' }) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
${FONT}
<style>${BASE_STYLE}${EXTRA_STYLE}</style>
</head>
<body>
${TABBAR}
<div class="shell">

<nav>
  <div class="brand">${esc(brand)}</div>
${nav}
</nav>

<main>
<div class="content">
${body}
</div>
</main>

</div>

<script>
/* 좌측 트리는 48장이 모두 같은 모습으로 서 있다. 다만 항목이 많아 현재 항목이 화면 밖에
   있으면 페이지마다 다른 자리처럼 보이므로, 열자마자 트리 안쪽만 스크롤해 현재 항목을 보인다.
   문서까지 함께 움직이는 scrollIntoView 대신 nav.scrollTop 을 직접 준다.
   두 요소의 실제 화면 좌표를 빼서 구한다 — offsetTop 은 nav 가 positioned 인지에 따라
   기준이 달라져서, CSS 에서 position 한 줄만 바뀌어도 조용히 어긋난다. */
(function () {
  var nav = document.querySelector('nav'), cur = document.querySelector('nav a.cur');
  if (!nav || !cur) return;
  var y = cur.getBoundingClientRect().top - nav.getBoundingClientRect().top - nav.clientHeight / 2;
  if (y > 0) nav.scrollTop = nav.scrollTop + y;
})();
</script>

</body>
</html>
`

/* ---------------- 공통 라벨 ---------------- */
const STATUS_TAG = {
  complete: '<span class="tag t-auto">운영 중</span>',
  'frontend-only': '<span class="tag t-api">프론트만</span>',
  'backend-only': '<span class="tag t-api">API만</span>',
  pending: '<span class="tag t-warn">미착수</span>',
}
const SOURCE_TAG = {
  mart: '<span class="tag t-mart">마트</span>',
  crm: '<span class="tag t-crm">CRM 직결</span>',
  mixed: '<span class="tag t-mixed">마트+CRM</span>',
  app: '<span class="tag t-mart">앱 테이블</span>',
  unknown: '<span class="tag t-draft">—</span>',
}
const SOURCE_TEXT = {
  mart: '마트(Postgres) 전용 — 배치가 적재한 테이블만 읽음.',
  crm: 'CRM(MSSQL) 원천 직결 — 마트 경유 없이 운영 DB를 읽음.',
  mixed: '마트와 CRM 원천이 함께 잡힘 — 프로파일(postgres-mart / mssql)에 따라 갈리는 구조이거나, 공용 리포지터리를 거치며 다른 화면의 SQL 까지 딸려온 경우임. 어느 쪽이 실제 조회 경로인지는 확인이 필요함.',
  app: '앱 운영 테이블(Postgres) 전용 — 배치 마트나 CRM 이 아니라, 화면이 JPA 엔티티로 직접 읽고 쓰는 테이블임.',
  unknown: '조회 경로가 잡히지 않았음 — 미구현(placeholder)이거나 화면이 조회를 하지 않는 정적 문서임.',
}

/* 기획서 작성 상태. SMS 는 생성기 밖에 있는 완성본이라 파일을 따로 가리킨다. */
const SPEC_DONE = new Set(['sms'])
/* 기획서를 문서 내비게이션에서 감출 메뉴. 파일은 그대로 두고 링크만 끊는다 —
   전메뉴 트리 · 현황 표의 기획서 칸 · 작성 로드맵 · 이전/다음 이동에서 빠진다. */
const SPEC_HIDDEN = new Set(['reservation-overall'])
const specHref = (id) => (SPEC_DONE.has(id) ? 'sms.html' : `pages/${id}.html`)
const isComplete = (id) => SPEC_DONE.has(id) || REQUIRED_SECTIONS.every((n) => filledOf(id).includes(n))

/* 작성 우선순위 — 발표에서 실제로 열어 보일 순서다. */
const TIERS = [
  { n: '1순위', why: '조회 빈도가 높은 명단 화면. 컬럼 정의가 기존 문서로 확보되어 이관 난이도가 낮다.',
    ids: ['reservation-list', 'exam-list', 'all-exam-list', 'surgery-list', 'outpatient-list'] },
  { n: '2순위', why: '경영 회의에 그대로 사용되는 산출물. 도표 단위의 지표 정의가 필요하다.',
    ids: ['monthly-report', 'weekly-report', 'overall-exam', 'overall-exam-weekly', 'reservation-overall'] },
  { n: '3순위', why: '2026-08 신설 섹션. 지표 정의가 확정 전이므로 기획서가 정의 합의 문서를 겸한다.',
    ids: ['reservation-channel', 'channel-profit', 'channel-analysis', 'overseas-marketing-receptions', 'overseas-marketing-statistics', 'overseas-reservation-stats'] },
  { n: '4순위', why: '지표 정의 문서가 확보되어 상당 구간을 링크 참조로 대체할 수 있다.',
    ids: ['consultation-rate', 'cataract-reservation-rate', 'stop-rate', 'stop-reason', 'surgery', 'surgery-ratio', 'surgery-composition', 'reservation-stats-system', 'reservation-stats-cataract', 'cataract-exam-list', 'eoeis-checkup', 'examination', 'procedure-exam', 'outpatient-count', 'dreamlens-revenue', 'reservation-list-homepage', 'batch-management'] },
  { n: '5순위', why: '로드맵 수립 이후 추가된 메뉴(2026-08 말~09). 코드와 함께 확정된 규칙을 기획서로 옮긴다.',
    ids: ['reservation-change', 'accumulated-eyes', 'accounting-medical', 'accounting-vision', 'accounting-vision-summary', 'accounting-vision-chart', 'accounting-medical-chart', 'account-management'] },
]

/* 화면별로 이어 읽을 문서 — 지표정의·점검 기록은 이미 있는 정본이라 링크로 잇는다. */
const RELATED = {
  'reservation-list': [['지표정의/1-예약.md', '예약 지표 정의'], ['db/검사자리스트-컬럼정의.md', '리스트 컬럼 정의']],
  'monthly-report': [['지표정의/README.md', '도표별 지표 정의 — 흐름 인덱스'], ['db/지표정의.md', '검증 이력·월별 확정값']],
  'weekly-report': [['지표정의/README.md', '도표별 지표 정의 — 흐름 인덱스'], ['db/지표정의.md', '주 정의 §6']],
  'dreamlens-revenue': [['지표정의/2-검사.md', '드림렌즈 검사 정의']],
  'channel-analysis': [['지표정의/1-예약.md', '예약 채널 구조']],
  'overseas-marketing-receptions': [['db/tables/CUSTOM.md', 'CRM 고객 테이블 — 매칭 대상']],
  'overseas-marketing-statistics': [['지표정의/5-수술.md', '수술 지표 정의'], ['지표정의/6-외래.md', '외래 지표 정의']],
  'overseas-reservation-stats': [['지표정의/1-예약.md', '예약 지표 정의']],
  'reservation': [['지표정의/6-외래.md', '예약 구분 코드표 §5']],
  'reservation-list-homepage': [['databatch/legacy-homepage-source-strategy.md', '홈페이지 소스 전략'], ['점검/홈페이지-CRM-예약수-비교_2026-07.md', '홈페이지 vs CRM 대조']],
  'reservation-overall': [['지표정의/1-예약.md', '예약 지표 정의']],
  'reservation-stats-system': [['지표정의/1-예약.md', '예약 지표 정의']],
  'reservation-stats-cataract': [['db/예약통계_백내장-데이터소스-분석.md', '백내장 예약통계 데이터소스'], ['지표정의/1-예약.md', '예약 지표 정의']],
  'exam-list': [['db/검사자리스트-컬럼정의.md', '검사자 리스트 컬럼 정의'], ['지표정의/2-검사.md', '검사 지표 정의'], ['점검/시력교정-검사자_2026-06~07.md', '시력교정 검사자 점검']],
  'cataract-exam-list': [['db/검사자리스트-컬럼정의.md', '컬럼 정의 (백내장판)'], ['점검/인수인계_2026-08-05_백내장검사.md', '백내장 검사 개편 인수인계']],
  'all-exam-list': [['db/검사자리스트-컬럼정의.md', '컬럼 정의'], ['지표정의/2-검사.md', '검사 지표 정의']],
  'overall-exam': [['지표정의/2-검사.md', '검사 지표 정의'], ['db/지표정의.md', '상세 레퍼런스']],
  'overall-exam-weekly': [['지표정의/2-검사.md', '검사 지표 정의']],
  'eoeis-checkup': [['점검/인수인계_2026-08-05_백내장검사.md', '아이리더 배경']],
  'examination': [['지표정의/2-검사.md', '검사 지표 정의']],
  'procedure-exam': [['지표정의/2-검사.md', '검사 지표 정의']],
  'consultation-rate': [['지표정의/3-전환율-중단율.md', '전환율·중단율 정의']],
  'cataract-reservation-rate': [['지표정의/4-예약률.md', '예약률 정의 (2026-06 교체)']],
  'stop-rate': [['지표정의/3-전환율-중단율.md', '중단율 정의']],
  'stop-reason': [['db/중단사유-분류-정의.md', '중단 사유 7버킷 분류'], ['지표정의/3-전환율-중단율.md', '중단율 정의']],
  'surgery-list': [['지표정의/5-수술.md', '수술 지표 정의'], ['점검/재수술-분류_2026-01~07.md', '재수술 분류 기준'], ['점검/시력교정-수술자_2026-07.md', '수술 유형 대조']],
  surgery: [['지표정의/5-수술.md', '수술 지표 정의']],
  'surgery-ratio': [['지표정의/5-수술.md', '수술 지표 정의']],
  'surgery-composition': [['지표정의/5-수술.md', '수술 지표 정의']],
  'outpatient-list': [['지표정의/6-외래.md', '외래 지표 정의 · 예약 코드표']],
  'outpatient-count': [['지표정의/6-외래.md', '외래 지표 정의']],
  'batch-management': [['databatch/strategy.md', '배치·마트 전환 전략']],
  'reservation-channel': [['지표정의/1-예약.md', '예약 지표 정의']],
  'channel-profit': [['지표정의/1-예약.md', '예약 지표 정의']],
}

/* ---------------- 전메뉴 현황 (prd.html 의 「전메뉴 현황」 탭에 주입) ---------------- */
const sectionTitles = { 'bnviit-section': '비앤빛', 'marketing-section': '마케팅', 'overseas-marketing-section': '해외마케팅', 'admin-section': '관리자' }

const visiblePages = data.pages.filter((p) => !p.hidden)
const hiddenPages = data.pages.filter((p) => p.hidden)
const counts = {
  total: data.pages.length,
  visible: visiblePages.length,
  hidden: hiddenPages.length,
  complete: data.pages.filter((p) => p.status === 'complete').length,
  pending: data.pages.filter((p) => p.status === 'pending').length,
  admin: data.pages.filter((p) => p.adminOnly).length,
  executive: data.pages.filter((p) => p.executiveOnly).length,
  specDone: data.pages.filter((p) => isComplete(p.id)).length,
}

const menuRow = (id) => {
  const p = byId.get(id)
  if (!p) return ''
  const filled = filledOf(id).length
  const spec = SPEC_HIDDEN.has(id)
    ? '<span class="tag t-plan">비공개</span>'
    : isComplete(id)
    ? `<a href="${specHref(id)}">기획서 보기</a> <span class="tag t-done">작성 완료</span>`
    : filled
      ? `<a href="${specHref(id)}">기획서 보기</a> <span class="tag t-plan">${filled}/${HAND_SECTIONS.length}장</span>`
      : p.status === 'pending'
        ? `<a href="${specHref(id)}">문서 보기</a> <span class="tag t-plan">기획 먼저</span>`
        : `<a href="${specHref(id)}">문서 보기</a> <span class="tag t-draft">초안</span>`
  return `      <tr>
        <td>${esc(p.label)}${p.adminOnly ? ' <span class="tag t-warn">ADMIN</span>' : p.executiveOnly ? ' <span class="tag t-warn">임원</span>' : ''}</td>
        <td><span class="mono">${esc(p.path)}</span></td>
        <td>${STATUS_TAG[p.status]}</td>
        <td>${planSourceTag(id, p)}</td>
        <td>${p.endpoints.length ? p.endpoints.length + '개' : '—'}</td>
        <td>${spec}</td>
      </tr>`
}

/* 미구현 메뉴는 코드가 없어 자동 추출이 「—」 로 남는다. content/<id>.mjs 가 s6plan(예정 원천)을 적어 두면
   현황 표에서도 「예정」 으로 구분해 보여 준다 — 코드가 생기면 자동 추출 태그가 우선한다. */
const PLAN_KIND_LABEL = { crm: 'CRM', mart: '마트', mixed: '마트+CRM' }
const planSourceTag = (id, p) => {
  const c = CONTENT.get(id)
  if (p.source !== 'unknown' || !c?.s6plan) return SOURCE_TAG[p.source]
  return `<span class="tag t-plan">${PLAN_KIND_LABEL[c.s6planKind] ?? 'CRM'} 예정</span>`
}

const menuTable = (ids) => `    <table class="menu">
      <thead><tr><th>메뉴</th><th>화면 경로</th><th>구현</th><th>데이터</th><th>API</th><th>기획서</th></tr></thead>
      <tbody>
${ids.map(menuRow).filter(Boolean).join('\n')}
      </tbody>
    </table>`

const sectionCards = data.tree.map((sec, i) => {
  const title = sectionTitles[sec.id] ?? sec.label
  const groups = sec.groups.filter((g) => g.ids.length)
  const body = groups
    .map((g) => {
      // kids() 는 런타임에 숨김을 걸러낸다. 소스 인자에는 남아 있으므로 여기서 같은 규칙을 적용한다.
      const ids = g.ids.filter((id) => byId.has(id) && !byId.get(id).hidden)
      if (!ids.length) return ''
      const groupTitle = g.label === 'Report' ? '리포트' : g.label
      const head = g.solo || !g.label || g.label === title ? '' : `    <h3>${esc(groupTitle)}</h3>\n`
      return head + menuTable(ids)
    })
    .filter(Boolean)
    .join('\n')
  const n = ids_count(groups)
  return `  <div class="card">
    <div class="card-head"><div class="chip">${i + 2}</div><h2>${esc(title)} — ${n}개 메뉴</h2></div>
${body}
  </div>`
})
function ids_count(groups) {
  return groups.reduce((a, g) => a + g.ids.filter((id) => byId.has(id) && !byId.get(id).hidden).length, 0)
}

/* 트리에도 없고 숨김도 아닌 메뉴가 있으면 표에서 통째로 빠진다 — 생성 때 드러낸다. */
const inTree = new Set(data.tree.flatMap((s) => s.groups.flatMap((g) => g.ids)))
const orphans = data.pages.filter((p) => !p.hidden && !inTree.has(p.id))
if (orphans.length) console.log('!! 트리 밖 노출 메뉴:', orphans.map((p) => p.id).join(', '))

const roadmapCard = `  <div class="card">
    <div class="card-head"><div class="chip">${data.tree.length + 3}</div><h2>작성 로드맵</h2></div>
    <p>작성 순서는 정의 문서 확보 여부를 기준으로 정한다. <b>정의 문서가 이미 있는 화면</b>을 우선 이관하고,
       정의가 확정되지 않은 화면은 후순위로 배치한다. 1·6·7·8·9장은 자동 생성되므로 수기 작성 범위는 <b>2·3·4·5·10장</b>이다.</p>
${TIERS.map((t) => `    <h3>${esc(t.n)} — ${t.ids.length}개</h3>
    <p>${esc(t.why)}</p>
    <p>${t.ids.map((id) => (!byId.has(id) ? '' : SPEC_HIDDEN.has(id) ? `${esc(byId.get(id).label)}<span class="tag t-plan">비공개</span>` : `<a href="${specHref(id)}">${esc(byId.get(id).label)}</a>`)).filter(Boolean).join(' · ')}</p>`).join('\n')}
    <h3>작성 범위 제외 — 자동 생성분만 유지한 ${counts.total - counts.specDone}개</h3>
    <p><b>사이드바 비노출</b> 및 <b>미착수</b> 메뉴는 본문 작성 대상에서 제외한다.
       미구현 메뉴는 기획서 작성보다 <b>기획 확정이 선행</b>되어야 하고, 비노출 메뉴는 존치 여부 결정이 선행되어야 한다.
       자동 생성 장(1·6·7·8·9)은 확보되어 있으므로, 해당 메뉴를 재개할 때 <b>2·3·4·5·10장만 추가 작성</b>한다.</p>
  </div>`

/* prd.html 의 GEN 마커 사이에 들어갈 내용. 링크는 prd.html 이 루트에 있으므로
   옛 인덱스 시절의 상대 경로(pages/… · sms.html · 지표정의/…)가 그대로 동작한다. */
const menuStatus = `  <div class="topbar">
    <div class="title">전메뉴 현황</div>
    <div class="sub">메뉴 ${counts.total}종의 구현 상태 · 데이터 경로 · 기획서 작성 현황 | 소스 코드 기준 자동 생성 ${TODAY}</div>
  </div>

  <div class="card">
    <div class="card-head"><div class="chip">1</div><h2>현황 요약</h2></div>
    <div class="kpis">
      <div class="kpi"><div class="n">${counts.total}</div><div class="l">정의된 메뉴</div></div>
      <div class="kpi"><div class="n">${counts.complete}</div><div class="l">운영 중</div></div>
      <div class="kpi"><div class="n">${counts.pending}</div><div class="l">미착수</div></div>
      <div class="kpi"><div class="n">${counts.hidden}</div><div class="l">사이드바 비노출</div></div>
      <div class="kpi"><div class="n">${counts.admin}</div><div class="l">ADMIN 전용</div></div>
      <div class="kpi"><div class="n">${counts.executive}</div><div class="l">임원 전용</div></div>
      <div class="kpi"><div class="n">${counts.specDone} / ${counts.total}</div><div class="l">기획서 작성 완료</div></div>
    </div>
    <div class="note">
      <div class="h">자동 생성 범위</div>
      <p>메뉴별 기획서의 <b>1·6·7·8·9장</b>(개요 · 데이터 소스 · API · 권한 · 연관 문서)은
         <code>statsPages.ts</code> · <code>navigation.ts</code>, 프론트엔드 import 그래프, 백엔드 컨트롤러 의존 그래프에서
         자동 생성한다. 소스 코드가 정본이므로 해당 장은 <b>직접 수정하지 않고 재생성으로 갱신</b>한다.
         본 탭 역시 <code>_build/gen.mjs</code> 가 생성 시점(${TODAY}) 기준으로 산출한 결과이다.
         수기 작성 대상은 <b>2·3·4·5·10장</b>이다.</p>
    </div>
  </div>

  <details class="legend">
    <summary>표기 범례 — 구현 상태 · 데이터 경로 · 기획서 상태</summary>
    <table>
      <thead><tr><th>표기</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td>${STATUS_TAG.complete}</td><td>백엔드 API와 프론트엔드 화면이 연결되어 서비스 중인 상태</td></tr>
        <tr><td>${STATUS_TAG.pending}</td><td>메뉴 정의만 존재하고 화면은 플레이스홀더 상태. 운영 빌드에서 라우트 차단</td></tr>
        <tr><td>${SOURCE_TAG.mart}</td><td>배치가 적재한 PostgreSQL 마트만 조회</td></tr>
        <tr><td>${SOURCE_TAG.crm}</td><td>CRM(MSSQL) 운영 DB를 직접 조회</td></tr>
        <tr><td>${SOURCE_TAG.mixed}</td><td>두 경로가 모두 탐지됨. 프로파일 분기 또는 공용 리포지터리 경유로 추정되며 개별 확인 필요</td></tr>
        <tr><td>${SOURCE_TAG.app}</td><td>배치 마트·CRM 조회 없이 앱 운영 테이블(PostgreSQL, JPA 엔티티)만 읽고 씀. 예: 계정 관리의 <code>users</code></td></tr>
        <tr><td><span class="tag t-warn">ADMIN</span></td><td>ADMIN 롤 전용(<code>ADMIN_ONLY_PAGE_IDS</code>). 그 외 롤에게는 사이드바 숨김 및 직접 URL 접근 차단</td></tr>
        <tr><td><span class="tag t-warn">임원</span></td><td>임원 이상(ADMIN · DIRECTOR) 전용(<code>EXECUTIVE_ONLY_PAGE_IDS</code>). MANAGER · STAFF 에게는 사이드바 숨김 및 직접 URL 접근 차단. 백엔드 <code>/api/accounting/**</code> 매처와 대칭</td></tr>
        <tr><td><span class="tag t-done">작성 완료</span></td><td>수기 작성 본문을 포함한 기획서 보유</td></tr>
${[...CONTENT.values()].some((c) => c?.s6plan) ? `        <tr><td><span class="tag t-plan">CRM 예정</span></td><td>미구현 메뉴의 <b>예정 원천</b>. 코드가 없어 자동 추출이 불가하므로 기획서 6장에 수기로 적은 조회 경로를 표기. 구현 후 재생성하면 자동 추출 태그로 대체</td></tr>
` : ''}        <tr><td><span class="tag t-draft">초안</span></td><td>자동 생성 장만 존재. 2·3·4·5·10장 미작성</td></tr>
        <tr><td><span class="tag t-plan">기획 먼저</span></td><td>미구현 메뉴로 기획 확정 전이므로 본문 작성 대상 아님</td></tr>
      </tbody>
    </table>
  </details>

${sectionCards.join('\n\n')}

  <div class="card">
    <div class="card-head"><div class="chip">${data.tree.length + 2}</div><h2>사이드바 비노출 — ${counts.hidden}개</h2></div>
    <p><code>HIDDEN_MENU_IDS</code> 에 등록되어 사이드바에 노출되지 않는 메뉴이다. 라우트는 유지되므로 <b>URL 직접 접근은 가능하다</b>
       (운영 빌드에서는 미착수 메뉴의 라우트를 별도로 차단한다). 대부분 기획만 존재하고 구현이 없는 항목이다.</p>
${menuTable(hiddenPages.map((p) => p.id))}
  </div>

${roadmapCard}

  <div class="card">
    <div class="card-head"><div class="chip">${data.tree.length + 4}</div><h2>문서 지도</h2></div>
    <p>기획서는 기존 정의를 <b>재기술하지 않는다</b>. 정본 문서가 있는 항목은 링크로 참조한다.</p>
    <table>
      <thead><tr><th>문서</th><th>수록 내용</th><th>기획서와의 관계</th></tr></thead>
      <tbody>
        <tr><td><a href="sms.html">기획/sms.html</a></td><td>문자 발송 관리 기획서 13장</td><td>메뉴별 기획서의 <b>표준 양식</b></td></tr>
        <tr><td><a href="지표정의/README.md">지표정의/</a></td><td>예약 → 검사 → 전환율 → 수술 → 외래 6문서</td><td>5장(표·지표 정의)의 참조 정본</td></tr>
        <tr><td><a href="db/지표정의.md">db/지표정의.md</a></td><td>검증 이력 · 월별 확정값 · 마감 스냅샷 방침</td><td>수치 불일치 시 검증 근거</td></tr>
        <tr><td><a href="db/tables/_index.md">db/tables/</a></td><td>운영 테이블 카탈로그 (컬럼 · JOIN · 유의사항)</td><td>6장(데이터 소스)의 참조 정본</td></tr>
        <tr><td><a href="databatch/strategy.md">databatch/strategy.md</a></td><td>배치 · 마트 전환 전략</td><td>마트 테이블 적재 방식</td></tr>
        <tr><td><a href="점검/">점검/</a></td><td>레거시 대조 기록</td><td>10장(제약과 미결)의 작성 근거</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">현행 기준 — 소스 코드</div>
      <p>메뉴·API·구현 현황이 본 문서와 상이할 경우 <b>소스 코드를 기준</b>으로 한다. 본 탭은 소스 코드 기준 자동 생성물이므로
         생성 시점(${TODAY}) 이후의 변경 사항은 반영되어 있지 않다.</p>
    </div>
  </div>`

/* 마커 사이만 갈아끼운다 — 마커가 없으면 조용히 덮어쓰지 않고 멈춘다. 같은 입력이면 결과도 같다(멱등). */
const PRD = path.join(PLAN, 'prd.html')
const MARK_OPEN = '<!-- GEN:menu-status -->'
const MARK_CLOSE = '<!-- /GEN:menu-status -->'
const prdHtml = fs.readFileSync(PRD, 'utf8')
assertTreeStyleInSync(prdHtml)
const mo = prdHtml.indexOf(MARK_OPEN)
const mc = prdHtml.indexOf(MARK_CLOSE)
if (mo === -1 || mc === -1 || mc < mo) {
  console.error(`!! prd.html 에서 ${MARK_OPEN} … ${MARK_CLOSE} 구간을 찾지 못했음.`)
  console.error('   「전메뉴 현황」 탭(#view-menus) 안의 마커 두 줄이 지워졌는지 확인할 것. 덮어쓰지 않고 중단함.')
  process.exit(1)
}
/* 현황 표 왼편에 메뉴별 기획서와 같은 전메뉴 트리를 세운다.
   표에서 기획서로 넘어갈 때 좌측이 그대로 남아 있어야 화면이 튀지 않는다.
   navTree 는 아래에서 정의되므로 이 주입은 파일 끝(writePrd 호출)에서 수행한다. */
const writePrd = () => {
  const withTree = `  <div class="menus-layout">
  <nav class="menus-nav">
    <div class="brand">전메뉴 현황</div>
    <div class="tree">
${navTree(null, { fromRoot: true, openAll: true })}
    </div>
  </nav>
  <div class="menus-main">
    <div class="mcol">
${menuStatus}
    </div>
  </div>
  </div>`
  fs.writeFileSync(PRD, prdHtml.slice(0, mo + MARK_OPEN.length) + '\n' + linkRenderedDocs(withTree) + '\n' + prdHtml.slice(mc), 'utf8')
}

fs.mkdirSync(OUT, { recursive: true })

/* ---------------- 메뉴별 뼈대 ---------------- */
/* SHOW_SECTION_10 은 파일 상단(HAND_SECTIONS 옆)에 있다 — 작성 완료 판정과 함께 움직이기 때문. */

const SECTIONS = [
  { n: 1, t: '개요 — 이 화면은 무엇인가', auto: true },
  { n: 2, t: '사용자와 쓰임새', auto: false },
  { n: 3, t: '화면 구성', auto: false },
  { n: 4, t: '조회 조건과 필터', auto: false },
  { n: 5, t: '표 · 지표 정의', auto: false },
  { n: 6, t: '데이터 소스', auto: true },
  { n: 7, t: 'API', auto: true },
  { n: 8, t: '권한과 노출', auto: true },
  { n: 9, t: '연관 문서', auto: true },
  { n: 10, t: '제약과 미결', auto: false },
]

const TODO_PROMPTS = {
  2: ['누가 여는가 — 경영진 / 관리자 / 상담사 중 실제 사용자는?',
      '언제 여는가 — 매일 / 주간 회의 전 / 월 마감 때?',
      '이 화면이 대체한 수기·엑셀 작업은 무엇인가',
      '보고 나서 하는 행동은 무엇인가 (숫자만 확인 / 명단을 뽑아 전화 / 보고서에 붙임)'],
  3: ['영역을 위에서 아래로 나눠 적음 — 툴바 · 필터 · 요약 카드 · 표 · 차트 · 팝업',
      '목업은 스크린샷 대신 HTML 로 그려 둠 (sms.html §3 참고) — UI 가 바뀌면 라벨만 고치면 됨',
      '번호를 붙이고 아래 표에서 번호별로 설명함'],
  4: ['기본 조회 범위는 무엇인가 (당월 / 최근 30일 / 전년 동월 포함)',
      '조회 단위 — 일 / 주(ISO) / 월 / 연 중 무엇을 고를 수 있나',
      '서버 조회 조건과 화면에서만 거르는 조건을 나눔',
      '조회 범위 상한이 있나 (예: 366일)'],
  5: ['컬럼마다 — 화면 라벨 / 응답 필드 / 원천 컬럼 / 계산식 / 빈 값일 때',
      '집계 단위를 못 박음 — 사람 / 눈 / 건 중 무엇인가',
      '날짜 기준을 못 박음 — 검사일 / 예약일 / 등록일 / 수술일 중 무엇인가',
      '이미 정의된 지표는 지표정의 문서로 링크함 (다시 쓰지 않음)'],
  10: ['레거시 숫자와 어긋나는 지점이 있나 — 점검/ 문서에 이미 조사된 건인지 확인',
       'T-1 신선도 · 소급 입력 누락 같은 구조적 제약이 이 화면에 어떻게 나타나나',
       '아직 정하지 못한 것 — 누가 언제까지 정해야 하나',
       '알려진 버그 · 임시 조치'],
}

const relLinks = (id) => {
  const items = RELATED[id] ?? []
  if (!items.length) return '    <p>이 화면에 걸린 정의 문서가 아직 없음. 5장을 쓰면서 정본이 어디인지 정하고 여기 이음.</p>'
  return `    <table>
      <thead><tr><th>문서</th><th>왜 보나</th></tr></thead>
      <tbody>
${items.map(([href, why]) => `        <tr><td><a href="../${href}">${esc(href)}</a></td><td>${esc(why)}</td></tr>`).join('\n')}
      </tbody>
    </table>`
}

/* 섹션 내 이전/다음 — 여러 장을 이어 볼 때 허브로 되돌아가지 않게. */
const order = []
for (const sec of data.tree) for (const g of sec.groups) for (const id of g.ids) if (byId.has(id) && !SPEC_HIDDEN.has(id)) order.push(id)
for (const p of hiddenPages) if (!order.includes(p.id)) order.push(p.id)

const groupLabelOf = new Map()
for (const sec of data.tree) {
  for (const g of sec.groups) {
    for (const id of g.ids) {
      groupLabelOf.set(id, [sectionTitles[sec.id] ?? sec.label, g.solo || !g.label ? null : g.label])
    }
  }
}

/* 공용 전메뉴 트리 — 47장이 모두 같은 좌측 네비를 쓴다. 섹션 > 그룹 > 메뉴 3단이고,
   details/summary 라 JS 없이 접힌다. 현재 페이지가 속한 섹션만 open, 현재 페이지는 하이라이트. */
const pageHref = (id) => (SPEC_DONE.has(id) ? '../sms.html' : `${id}.html`)
const treeSections = data.tree.map((sec) => {
  const title = sectionTitles[sec.id] ?? sec.label
  const groups = sec.groups
    .map((g) => ({
      label: g.solo || !g.label || g.label === title ? null : g.label,
      ids: g.ids.filter((id) => byId.has(id) && !byId.get(id).hidden && !SPEC_HIDDEN.has(id)),
    }))
    .filter((g) => g.ids.length)
  return { title, groups, all: groups.flatMap((g) => g.ids) }
})
// 숨김 메뉴는 사이드바(코드) 기준으로 트리에서 빠지므로, 문서 트리에서는 전용 섹션으로 모은다.
treeSections.push({
  title: '사이드바 비노출',
  groups: [{ label: null, ids: hiddenPages.map((p) => p.id) }],
  all: hiddenPages.map((p) => p.id),
})

/**
 * 좌측 전메뉴 트리. pages/*.html 과 prd.html 「전메뉴 현황」 탭이 함께 쓴다.
 *   fromRoot=false → pages/ 안에서 부르는 경우(형제 파일 · sms 는 ../)
 *   fromRoot=true  → prd.html 에서 부르는 경우(pages/ 를 붙이고 sms 는 같은 폴더)
 * 같은 트리를 두 곳에 두어야 현황 표에서 기획서로 넘어갈 때 화면이 튀지 않는다.
 */
const navTree = (curId, { fromRoot = false, openAll = false } = {}) => {
  const href = (id) => (fromRoot
    ? (SPEC_DONE.has(id) ? 'sms.html' : `pages/${id}.html`)
    : pageHref(id))
  return treeSections.map((sec) => {
    const open = openAll || sec.all.includes(curId)
    const body = sec.groups.map((g) =>
      (g.label ? `    <div class="tgrp">${esc(g.label)}</div>\n` : '') +
      g.ids.map((id) => `    <a href="${href(id)}"${id === curId ? ' class="cur"' : ''}>${esc(byId.get(id).label)}</a>`).join('\n')
    ).join('\n')
    return `  <details class="tsec"${open ? ' open' : ''}>
    <summary>${esc(sec.title)}</summary>
${body}
  </details>`
  }).join('\n')
}

let count = 0
for (const p of data.pages) {
  if (SPEC_DONE.has(p.id)) continue
  const [secLabel, grpLabel] = groupLabelOf.get(p.id) ?? [p.sectionLabel, null]
  const where = grpLabel && grpLabel !== secLabel ? `${secLabel} › ${grpLabel}` : (secLabel ?? '(사이드바 비노출)')
  const isPending = p.status === 'pending'
  const content = CONTENT.get(p.id) ?? {}
  const written = (n) => typeof content['s' + n] === 'string' && content['s' + n].trim()
  const filled = filledOf(p.id)
  const done = REQUIRED_SECTIONS.every((n) => filled.includes(n))

  /* 장 목차는 본문 콘텐츠의 왼편에 세로로 세운다(sticky). 미작성 장은 「작성 예정」 배지를 유지한다. */
  const chapToc = `    <aside class="chaptoc">
      <div class="h">이 문서의 장</div>
${SECTIONS.filter((s) => SHOW_SECTION_10 || s.n !== 10).map((s) => `      <a href="#s${s.n}"${s.auto || written(s.n) ? '' : ' class="tbd"'}>${s.n}. ${esc(s.t.split(' — ')[0])}</a>`).join('\n')}
    </aside>`

  /* 문서 머리의 작성 상태 안내 상자("작성 중 — n/5장" · "뼈대" · "미착수")는 2026-09-16 에 뺐다 —
     읽는 사람에게 문서 관리 사정을 앞세울 이유가 없다. 작성 상태는 전메뉴 현황 표와 맨 아래 .genfoot 한 줄로 충분하다. */
  const stateNote = ''

  /* 완성 문서용 한 줄 참조 — 어느 장이 자동 생성이고 손으로 쓴 장이 어디 있는지만 남긴다. */
  const genFoot = done
    ? `\n      <p class="genfoot"><b>1 · 6 · 7 · 8 · 9장</b>(개요 · 데이터 소스 · API · 권한 · 연관 문서)은 코드에서 자동 생성 — 고칠 일이 생기면 문서가 아니라 코드를 고치고 다시 생성함. <b>2 · 3 · 4 · 5 · 10장</b>은 손으로 쓴 것이고 <code>_build/content/${esc(p.id)}.mjs</code> 에 있음.</p>`
    : ''

  const todo = (n) => `    <div class="todo">
      <div class="h">채울 것</div>
      <ul>
${(TODO_PROMPTS[n] ?? []).map((x) => `        <li>${esc(x)}</li>`).join('\n')}
      </ul>
    </div>`

  const epTable = p.endpoints.length
    ? `    <table>
      <thead><tr><th>메서드 · 경로</th></tr></thead>
      <tbody>
${p.endpoints.map((e) => `        <tr><td><span class="mono">${esc(e)}</span></td></tr>`).join('\n')}
      </tbody>
    </table>
    <h3>백엔드 컨트롤러</h3>
    <ul>
${p.controllers.map((c) => `      <li><span class="mono">${esc(c)}</span></li>`).join('\n')}
    </ul>`
    : `    <p>이 화면이 호출하는 API 가 없음. ${isPending ? '미착수 메뉴라 화면이 placeholder 임.' : '화면이 조회를 하지 않는 정적 문서이거나, 호출 경로가 자동 추출로 잡히지 않았음.'}</p>`

  const tableList = (arr) => (arr.length ? arr.map((t) => `<code>${esc(t)}</code>`).join(' · ') : '—')

  const body = `  <div class="topbar">
    <div class="title">${esc(p.label)} — 기획서</div>
    <div class="sub">${esc(where)} · <span class="mono">${esc(p.path)}</span> · 뼈대 자동 생성 ${TODAY}</div>
  </div>

  <div class="withtoc">
${chapToc}
    <div class="chapmain">

${stateNote}  <div class="card" id="s1">
    <div class="card-head"><div class="chip">1</div><h2>개요 — 이 화면은 무엇인가</h2></div>
    <p>${esc(toMusum(p.description))}</p>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>메뉴 위치</td><td>${esc(where)}</td></tr>
        <tr><td>화면 경로</td><td><span class="mono">${esc(p.path)}</span></td></tr>
        <tr><td>메뉴 ID</td><td><code>${esc(p.id)}</code></td></tr>
        <tr><td>구현 상태</td><td>${STATUS_TAG[p.status]}</td></tr>
        <tr><td>접근 권한</td><td>${p.adminOnly ? '<b>ADMIN 전용</b> — ADMIN 이 아니면 사이드바에서 숨고 직접 URL 접근도 placeholder 로 막힘' : p.executiveOnly ? '<b>임원 이상(ADMIN · DIRECTOR) 전용</b> — MANAGER · STAFF 는 사이드바에서 숨고 직접 URL 접근도 placeholder 로 막힘. 백엔드도 <code>/api/accounting/**</code> 를 <code>hasAnyRole(ADMIN, DIRECTOR)</code> 로 막음' : '로그인 사용자 전체'}</td></tr>
        <tr><td>사이드바 노출</td><td>${p.hidden ? '<b>숨김</b>(<code>HIDDEN_MENU_IDS</code>) — 라우트는 살아 있어 URL 로는 접근됨' : p.adminOnly ? '노출 — 단 ADMIN 롤에게만' : p.executiveOnly ? '노출 — 단 ADMIN · DIRECTOR 롤에게만' : '노출'}</td></tr>
        <tr><td>화면 컴포넌트</td><td>${p.component ? `<span class="mono">${esc(p.component)}</span>` : '없음 — <code>StatsPlaceholderPage</code> 로 렌더'}</td></tr>
      </tbody>
    </table>
${written(2) ? '' : `    <h3>이 화면이 없으면 어떻게 되나</h3>
    <p class="shot-cap">한 문단으로 답함 — 이 화면을 지우면 누가 무슨 수작업으로 돌아가는가. PRD 의 문제 정의를 이 화면 크기로 좁힌 것임.</p>
    <div class="todo"><div class="h">채울 것</div><ul>
      <li>이 화면이 대체한 구체적인 수기·엑셀 작업</li>
      <li>레거시(성민CRM) 화면이 따로 있다면 그것과의 차이</li>
    </ul></div>
`}  </div>

${SECTIONS.filter((s) => !s.auto && s.n < 6).map((s) => `  <div class="card" id="s${s.n}">
    <div class="card-head"><div class="chip">${s.n}</div><h2>${esc(s.t)}</h2></div>
${written(s.n) ? content['s' + s.n] : `    <p class="shot-cap">작성 예정.</p>\n${todo(s.n)}`}
  </div>`).join('\n\n')}

  <div class="card" id="s6">
    <div class="card-head"><div class="chip">6</div><h2>데이터 소스</h2></div>
${p.source === 'unknown' && content.s6plan ? `    <div class="note">
      <div class="h">예정 원천 — 기획안</div>
      <p>화면 코드가 아직 없어 조회 경로를 자동 추출할 수 없음. 아래는 <b>레거시 화면 · 테이블 카탈로그 · WORK DB 실측</b>을 근거로 정한 예정 원천이며,
         구현 후 재생성하면 코드에서 추출한 표로 바뀜. 원고는 <code>_build/content/${esc(p.id)}.mjs</code> 의 <code>s6plan</code>.</p>
    </div>
${content.s6plan}` : `    <p>${SOURCE_TEXT[p.source]}</p>
    <table>
      <thead><tr><th>구분</th><th>테이블 · 뷰</th></tr></thead>
      <tbody>
        <tr><td>마트 (Postgres)</td><td>${tableList(p.martTables)}</td></tr>
        <tr><td>CRM 원천 (MSSQL)</td><td>${tableList(p.crmTables)}</td></tr>
${p.appTables?.length ? `        <tr><td>앱 테이블 (Postgres · JPA)</td><td>${tableList(p.appTables)}</td></tr>
` : ''}      </tbody>
    </table>
${p.sqlRefs.length ? `    <details class="sqlrefs">
      <summary>SQL 리소스 ${p.sqlRefs.length}개 — 펼쳐 보기</summary>
      <ul>
${p.sqlRefs.map((s) => `        <li><span class="mono">backend/src/main/resources/${esc(s)}</span></li>`).join('\n')}
      </ul>
    </details>` : ''}
    <div class="note warn">
      <div class="h">자동 추출 — 확정 전 검토</div>
      <p>위 목록은 <b>컨트롤러가 주입받는 클래스를 따라가며</b> 모은 것임.
         공용 리포지터리 하나에 여러 화면의 SQL 이 함께 들어 있으면 <b>이 화면이 쓰지 않는 테이블까지 섞임</b>.
         5장(표·지표 정의)을 쓸 때 실제 조회 경로를 확인해 이 표를 줄여 둘 것.
         테이블별 컬럼·함정은 <a href="../db/tables/_index.md">db/tables/</a> 가 정본임.</p>
    </div>`}
  </div>

  <div class="card" id="s7">
    <div class="card-head"><div class="chip">7</div><h2>API — ${p.endpoints.length}개</h2></div>
${epTable}
  </div>

  <div class="card" id="s8">
    <div class="card-head"><div class="chip">8</div><h2>권한과 노출</h2></div>
    <table>
      <thead><tr><th>항목</th><th>설정</th><th>어디서 정하나</th></tr></thead>
      <tbody>
        <tr><td>ADMIN 전용</td><td>${p.adminOnly ? '<b>예</b>' : '아니오'}</td><td><code>ADMIN_ONLY_PAGE_IDS</code> (navigation.ts)</td></tr>
        <tr><td>임원(ADMIN · DIRECTOR) 전용</td><td>${p.executiveOnly ? '<b>예</b>' : '아니오'}</td><td><code>EXECUTIVE_ONLY_PAGE_IDS</code> (navigation.ts) · <code>SecurityConfig</code> <code>/api/accounting/**</code></td></tr>
        <tr><td>사이드바 숨김</td><td>${p.hidden ? '<b>예</b>' : '아니오'}</td><td><code>HIDDEN_MENU_IDS</code> (navigation.ts)</td></tr>
        <tr><td>구현 상태</td><td><code>${esc(p.status)}</code></td><td><code>MENU_STATUS</code> (navigation.ts)</td></tr>
        <tr><td>운영 빌드 차단</td><td>${isPending ? '<b>차단</b> — placeholder 로 렌더' : '차단 없음'}</td><td><code>isRouteBlocked</code> (pageRegistry.ts)</td></tr>
      </tbody>
    </table>
  </div>

  <div class="card" id="s9">
    <div class="card-head"><div class="chip">9</div><h2>연관 문서</h2></div>
${relLinks(p.id)}
    <h3>상위 문서</h3>
    <table>
      <thead><tr><th>문서</th><th>수록 내용</th></tr></thead>
      <tbody>
        <tr><td><a href="../prd.html">PRD</a></td><td>제품 전체의 문제 정의 · 사용자 · 리스크 — 기획서 전체의 입구</td></tr>
        <tr><td><a href="../prd.html#view-menus">전메뉴 현황</a></td><td>메뉴 ${counts.total}종의 현황과 작성 로드맵 (PRD 의 탭)</td></tr>
        <tr><td><a href="../sms.html">문자 발송 관리 기획서</a></td><td>메뉴별 기획서의 본보기 (13장)</td></tr>
      </tbody>
    </table>
  </div>

${SHOW_SECTION_10 ? `  <div class="card" id="s10">
    <div class="card-head"><div class="chip">10</div><h2>제약과 미결</h2></div>
${written(10) ? content.s10 : `    <p class="shot-cap">작성 예정.</p>\n${todo(10)}`}
  </div>` : ''}

  <div class="card">
    <div class="pager">
      <span>${(() => { const i = order.indexOf(p.id); const prev = i > 0 ? order[i - 1] : null; return prev ? `← <a href="${SPEC_DONE.has(prev) ? '../sms.html' : prev + '.html'}">${esc(byId.get(prev).label)}</a>` : '' })()}</span>
      <span><a href="../prd.html#view-menus">전메뉴 현황</a></span>
      <span>${(() => { const i = order.indexOf(p.id); const next = i >= 0 && i < order.length - 1 ? order[i + 1] : null; return next ? `<a href="${SPEC_DONE.has(next) ? '../sms.html' : next + '.html'}">${esc(byId.get(next).label)}</a> →` : '' })()}</span>
    </div>${genFoot}
  </div>

    </div>
  </div>
`

  fs.writeFileSync(path.join(OUT, `${p.id}.html`), linkRenderedDocs(shell({
    title: `${p.label} — 기획서`,
    brand: p.label,
    nav: `  <div class="tree">
${navTree(p.id, { openAll: true })}
  </div>`,
    body,
  })), 'utf8')
  count++
}

/* sms.html 은 손으로 쓴 본보기라 통째로 생성하지 않는다. 좌측 트리만 마커 구간으로 갈아끼운다 —
   메뉴가 늘거나 라벨이 바뀌어도 48장의 트리가 한 벌로 유지된다.
   마커가 지워져 있으면 prd.html 과 같이 덮어쓰지 않고 멈춘다. */
const writeSms = () => {
  const OPEN = '<!-- GEN:nav-tree -->'
  const CLOSE = '<!-- /GEN:nav-tree -->'
  const cur = smsHtml
  const o = cur.indexOf(OPEN)
  const c = cur.indexOf(CLOSE)
  if (o < 0 || c < 0 || c < o) {
    console.error('❌ sms.html 의 좌측 트리 마커를 찾지 못했다.')
    console.error(`   <nav> 안의 ${OPEN} / ${CLOSE} 두 줄을 확인할 것. 덮어쓰지 않고 중단함.`)
    process.exit(1)
  }
  const tree = navTree('sms', { fromRoot: true, openAll: true })
  fs.writeFileSync(SMS, `${cur.slice(0, o + OPEN.length)}\n${tree}\n${cur.slice(c)}`, 'utf8')
}

/* navTree 가 정의된 뒤라야 트리를 감쌀 수 있어 마지막에 쓴다. */
writePrd()
writeSms()

console.log('prd.html 전메뉴 현황 주입 + pages:', count, '| 작성 완료:', data.pages.filter((p) => isComplete(p.id)).length)
