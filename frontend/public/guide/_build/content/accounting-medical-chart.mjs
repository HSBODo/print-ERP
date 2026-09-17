/* accounting-medical-chart.html (2026-09-04 손으로 쓴 기획서) 의 2·3·4·5장을 옮겨 옴. 6~9장은 코드에서 자동 생성된다. */
export default {
  s2: "    <p><a href=\"accounting-surgery-chart.html\">시력교정 매출 그래프</a>의 짝임 — 그쪽이 비급여 매출(CRM)이라면 여기는 <b>진료(EMR) 수납 수익</b>.\n       급여수익과 비급여수익의 구성이 궁금할 때 한 해를 지표 4종으로 갈라 봄.</p>\n    <table>\n      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>\n      <tbody>\n        <tr><td>월간 경영 보고</td><td>순수납액(실수납합계) 추이 + 전년 동월 대비</td></tr>\n        <tr><td>수익 구성 분석</td><td>단일 연도에서 급여총액 · 공단청구액 · 비급여 선을 같이 봄 — 급여수익(공단부담 + 본인부담)과 비급여수익 중 어느 쪽이 움직였는지</td></tr>\n        <tr><td>부문별 분석</td><td>구분 필터(전체 · 외래 · 입원 · 백내장)로 부문별 추이 — 행 데이터가 있는 해만</td></tr>\n      </tbody>\n    </table>\n",
  s3: "    <div class=\"shot\">\n      <div class=\"shot-bar\">\n        <span>연도</span>\n        <span class=\"seg\"><span>2023</span><span>2024</span><span>2025</span><span class=\"on\">2026</span></span>\n        <span>구분</span>\n        <span class=\"seg\"><span class=\"on\">전체</span><span>외래</span><span>입원</span><span>백내장</span></span>\n        <span class=\"grow\"></span>\n        <span class=\"ui green\">⤓ CSV</span>\n      </div>\n      <div style=\"padding:8px 16px;text-align:center;font-size:12px;border-bottom:1px solid #eaeaec;\">\n        <span style=\"color:#E11D2E;font-weight:700\">━ 실수납합계</span> &nbsp;\n        <span style=\"color:#4B5563\">━ 공단청구액</span> &nbsp;\n        <span style=\"color:#A8CEDF\">━ 급여총액</span> &nbsp;\n        <span style=\"color:#F59E0B\">━ 비급여</span>\n      </div>\n      <div style=\"padding:22px 16px;text-align:center;color:#9aa2ad;font-size:12px;border-bottom:1px solid #eaeaec;\">\n        ── 꺾은선 차트 (SVG) — 지표 4종 겹침 · 범례 클릭 = 그 선을 강조(맨 앞 + 값 라벨) ──\n      </div>\n      <div class=\"scroll-x\">\n        <table>\n          <thead><tr><th></th><th>1월</th><th>2월</th><th>3월</th><th class=\"ph\">…</th><th>12월</th><th>합계</th></tr></thead>\n          <tbody>\n            <tr><td class=\"ph\">건수</td><td>1,254</td><td>1,180</td><td>1,342</td><td class=\"ph\">…</td><td></td><td>7,912</td></tr>\n            <tr><td style=\"color:#E11D2E\"><b>실수납합계</b></td><td><b>391,260,000</b></td><td><b>362,400,000</b></td><td><b>418,700,000</b></td><td class=\"ph\">…</td><td></td><td><b>2,394,800,000</b></td></tr>\n            <tr><td style=\"color:#4B5563\">공단청구액</td><td>121,510,000</td><td>112,300,000</td><td>128,900,000</td><td class=\"ph\">…</td><td></td><td>744,200,000</td></tr>\n            <tr><td style=\"color:#A8CEDF\">급여총액</td><td>182,340,000</td><td>168,700,000</td><td>193,500,000</td><td class=\"ph\">…</td><td></td><td>1,116,900,000</td></tr>\n            <tr><td style=\"color:#F59E0B\">비급여</td><td>96,100,000</td><td>88,400,000</td><td>102,800,000</td><td class=\"ph\">…</td><td></td><td>587,300,000</td></tr>\n          </tbody>\n        </table>\n      </div>\n    </div>\n    <p class=\"shot-cap\">단일 연도 모드. 연도를 둘 이상 고르면 지표 선 대신 연도별 실수납합계 선으로 바뀌고, 구분 필터는 숨음.</p>\n    <h3>구성 요소</h3>\n    <table>\n      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>\n      <tbody>\n        <tr><td>연도 칩</td><td>다중 선택 (마지막 하나 해제 불가)</td><td>1개 = 지표 모드, 2개 이상 = 연도 비교 모드(실수납합계만)</td></tr>\n        <tr><td>구분</td><td>전체 · 외래 · 입원 · 백내장</td><td><b>행 데이터가 있는 해(현재 연도)에서만 노출</b> — 과거 연도는 월별 합계만 있어 구분을 못 가름</td></tr>\n        <tr><td>범례</td><td>선별 클릭</td><td>클릭한 선을 강조(맨 앞으로 + 값 라벨). 다시 클릭하면 해제</td></tr>\n        <tr><td>표 · CSV</td><td>건수 행 + 선별 행, 1~12월 + 합계</td><td>월별매출_연도_구분.csv</td></tr>\n      </tbody>\n    </table>\n",
  s4: "    <table>\n      <thead><tr><th>조건</th><th>선택지</th><th>규칙</th></tr></thead>\n      <tbody>\n        <tr><td>연도</td><td>월별 합계가 있는 연도 전부</td><td>다중 선택. 2개 이상이면 <b>실수납합계만</b> 비교 — 지표·구분은 단일 연도 전용</td></tr>\n        <tr><td>구분</td><td>전체 · 외래 · 입원 · 백내장</td><td>행 데이터에서 월별 합계를 다시 계산하는 <b>유일한 경로</b>라 현재 연도에서만 동작. 백내장 = 매출구분 ∈ {입원, 입원외} (수납 내역과 같은 규칙)</td></tr>\n      </tbody>\n    </table>\n",
  s5: "    <table>\n      <thead><tr><th>지표</th><th>정의</th></tr></thead>\n      <tbody>\n        <tr><td><b>실수납합계</b></td><td>순수납액 — 실수납액 + 미수 회수분, 환불(반제)행(일련번호 98)은 −환불액으로 계상 — <b><a href=\"accounting-payment-list.html\">진료 수납 내역</a>과 같은 산식·같은 코드</b>를 씀. 두 화면의 월 합계가 어긋나면 버그임</td></tr>\n        <tr><td>공단청구액</td><td>수납원장 청구액 컬럼(공단 · 보험자부담 청구분)의 월 합</td></tr>\n        <tr><td>급여총액</td><td>급여 진료비 총액의 월 합 (공단부담 + 본인부담)</td></tr>\n        <tr><td>비급여</td><td>비급여② 컬럼의 월 합 — 비급여수익 부분</td></tr>\n        <tr><td>건수</td><td>수납 행 수 (표에만 표시)</td></tr>\n      </tbody>\n    </table>\n    <p>값 라벨은 강조 선에만 붙이고, 선과 겹쳐 안 읽히지 않게 아래 여백이 없으면 위로 올림.\n       값 라벨·축 숫자는 <b>원 단위 그대로</b>(천 단위 구분 기호) 표기함 — 억/만 축약은 시력교정 매출 그래프에만 씀.</p>\n",
  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>두 경로가 섞임</b></td><td>행 적재가 끝난 달(<code>rows_complete</code> · 2026~)은 행을 다시 접은 <b>실수납합계</b>, 그 전 달은 월집계 마트의 <b>레거시 순액</b>. 정의가 달라 2025→2026 경계에서 선이 살짝 꺾일 수 있음</td><td>연도 비교 모드는 실수납합계만 겹침. 정의는 <code>docs/accounting/mart-and-api.md</code> §2·§5</td></tr>
        <tr><td><b>구분 필터는 완료 월만</b></td><td>외래/입원/백내장 필터는 행이 있는 달에만 걸림. 2023~2025 는 「전체」만 값이 있음</td><td>구분 필터를 켜면 과거 연도가 비는 것이 정상</td></tr>
        <tr><td><b>빈 달은 0</b></td><td>조회 결과가 없는 달도 0 으로 실려 선이 끊기지 않고 바닥으로 내려감</td><td>0 이 "미적재"인지 "수납 없음"인지는 배치 이력으로 구분</td></tr>
        <tr><td><b>연도 다중 선택 규칙</b></td><td>연도를 2개 이상 고르면 실수납합계만 비교하고 지표·구분 필터가 잠김</td><td>지표 4종은 단일 연도에서만</td></tr>
        <tr><td><b>월집계 원천 5개 합산</b></td><td>2023~2025 값은 원장·PAYTRANS·건생비를 월별로 더한 레거시 공식이라 행으로 검산할 수 없음</td><td>원형 스냅샷과 대조한 값을 그대로 씀</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>정의 통일</b></td><td>과거 연도도 실수납합계로 다시 만들려면 2023~2025 원장 행을 실어야 함(구 원장 체계). 할지 말지</td></tr>
        <tr><td>백내장 구분의 정의</td><td>매출구분 입원·입원외 = 백내장으로 두었는데 회계 쪽 정의와 같은지 확인 필요</td></tr>
        <tr><td>목표선</td><td>시력교정 그래프와 같은 문제</td></tr>
      </tbody>
    </table>
  `,
}
