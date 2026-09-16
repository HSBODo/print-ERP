export default {
  s2: `
    <h3>이 화면이 최종 산출물임</h3>
    <p>다른 통계 화면이 "숫자를 확인하는 곳"이라면, 레포트는 <b>그대로 회의에 들어가는 문서</b>임.
       그래서 화면 설계의 목표가 다름 — 조회 편의가 아니라 <b>인쇄했을 때의 완성도</b>임.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월간 경영 회의</td><td>PDF 로 저장해 그대로 배포함</td></tr>
        <tr><td>전년 대비 확인</td><td>도표마다 3개년이 겹쳐 있어 한 장에서 증감을 읽음</td></tr>
        <tr><td>수치 재가공</td><td>CSV 로 내려 엑셀에서 다시 만듦</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">이 화면이 대체한 것</div>
      <p>도표 31개를 <b>매달 손으로 만들던 엑셀</b>임. 각 도표가 어느 화면의 숫자인지는
         이 대시보드의 개별 통계 페이지들과 같고, 레포트는 그것을 <b>한 판형에 모아 3개년으로 겹친 것</b>임.</p>
    </div>

    <h3>주차 레포트와의 관계</h3>
    <p><a href="weekly-report.html">주차 레포트</a>는 <b>같은 도표 목록</b>을 ISO 주차 축으로 봄.
       도표 정의·순서·그룹이 같고 축과 데이터 소스만 다름 —
       그래서 도표를 하나 추가하면 <b>두 화면에 동시에</b> 생김.</p>
  `,

  s3: `
    <p>좌측 목차 + 정중앙 본문. 본문만 인쇄 영역이라 목차·툴바는 PDF 에 안 나옴.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui grow"><b>월간 레포트</b> <span class="ph">· 2026년 1~8월 기준 · 당해연도(2026)·전년도(2025)·전전년도(2024) 3개년 비교 · 2026-08-25 데이터 반영</span></span>
        <span class="ui">⤓ CSV</span>
        <span class="ui dark">🖨 PDF로 저장</span>
      </div>
      <div style="display:flex; gap:0">
        <div style="width:190px; border-right:1px solid #eaeaec; padding:10px 12px; font-size:11.5px">
          <div style="font-weight:700; margin-bottom:6px">전체 도표 <span class="ph">(31/31)</span></div>
          <div class="ph" style="font-weight:700; margin-top:8px">예약</div>
          <div>예약 종합 (콜·온라인)</div><div>콜 예약</div><div>온라인 예약</div>
          <div class="ph" style="font-weight:700; margin-top:8px">검사 유입</div>
          <div>일반 고객 검사</div><div>고객소개 검사</div><div>직원소개 검사</div><div>고객분류별 검사수</div>
          <div class="ph" style="font-weight:700; margin-top:8px">검사수</div>
          <div>백내장 검사수</div><div>시력교정 검사</div><div>드림렌즈 신규수</div><div class="ph">…</div>
        </div>
        <div style="flex:1; padding:12px">
          <div class="wf-chart" style="border:1px solid #eaeaec; border-radius:10px; height:120px; padding:10px">
            <div class="ct ph" style="font-size:11px">예약 종합 (콜·온라인)</div>
            <div style="flex:1; border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:80px"></div>
          </div>
          <div class="wf-chart" style="border:1px solid #eaeaec; border-radius:10px; height:120px; padding:10px; margin-top:10px">
            <div class="ct ph" style="font-size:11px">콜 예약 (인콜·아웃콜)</div>
            <div style="flex:1; border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:80px"></div>
          </div>
        </div>
      </div>
    </div>
    <p class="shot-cap">좌측 목차는 화면 폭 1520px 이상에서만 나옴. 그 아래에서는 본문만 남음.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>헤더</td><td>제목 · 기준 기간 · 3개년 표기 · <b>데이터 반영일</b></td><td>반영일은 마지막 배치 성공 시각임 — 숫자가 언제 것인지 알려줌</td></tr>
        <tr><td>목차</td><td>그룹 8개 · 도표 31개 · 완료 개수</td><td>클릭하면 해당 도표로 스크롤. <b>인쇄 제외</b></td></tr>
        <tr><td>본문</td><td>도표를 위에서 아래로</td><td>도표마다 3개년 선이 겹침</td></tr>
        <tr><td>CSV</td><td>연도 선택 팝업 → 전체 또는 한 해</td><td>UTF-8 BOM 을 붙임 — 안 붙이면 엑셀에서 한글이 깨짐</td></tr>
        <tr><td>PDF</td><td>브라우저 인쇄</td><td>별도 PDF 라이브러리 없이 <code>window.print()</code> + 인쇄 CSS</td></tr>
        <tr><td>중단 사유</td><td>월 선택이 붙은 도표</td><td>이 도표만 특정 월을 골라 봄</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">인쇄가 1급 기능임</div>
      <p>목차·툴바에 <code>report-no-print</code> 를 걸어 인쇄 영역에서 뺌.
         PDF 가 결과물이므로, 화면에서만 보이는 안내는 <b>인쇄본에서 사라진다</b>는 점을 늘 확인해야 함
         (주차 레포트의 '월' 뱃지가 인쇄용 문구를 따로 두는 이유임).</p>
    </div>
  `,

  s4: `
    <h3>조회 조건이 거의 없음</h3>
    <p>기간 선택기가 없음. 항상 <b>당해연도·전년도·전전년도 3개년</b>을 월별로 보여줌.
       레포트는 "무엇을 볼지 고르는 화면"이 아니라 <b>정해진 판형</b>이기 때문임.</p>
    <table>
      <thead><tr><th>조건</th><th>범위</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td>고정 3개년</td><td><code>CURRENT_YEAR</code> 기준으로 자동 산출</td></tr>
        <tr><td>월</td><td>1~12월 전부</td><td>진행 중인 달은 부분값으로 그려짐</td></tr>
        <tr><td>중단 사유 월</td><td>도표 안에서 선택</td><td>기본값 = 데이터가 있는 마지막 달</td></tr>
        <tr><td>CSV 연도</td><td>전체 또는 한 해</td><td>다운로드 시점에만 고르는 것이라 화면은 안 바뀜</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>도표 31개 · 그룹 8개</h3>
    <table>
      <thead><tr><th>그룹</th><th>도표</th></tr></thead>
      <tbody>
        <tr><td>예약</td><td>예약 종합(콜·온라인) · 콜 예약(인콜·아웃콜) · 온라인 예약(네이버·카카오·홈페이지)</td></tr>
        <tr><td>검사 유입</td><td>일반 고객 검사(소개 제외) · 고객소개 검사 · 직원소개 검사 · 고객분류별 검사수 · 직장인 · 학생 · 기타</td></tr>
        <tr><td>검사수</td><td>백내장 검사수 · 시력교정 검사 · 드림렌즈 신규수 · 드림렌즈 FU수 · 검사수 · 원데이 검사 · 일반 검사</td></tr>
        <tr><td>비율</td><td>일반검사 비율</td></tr>
        <tr><td>전환&amp;성공</td><td>백내장 예약률 · 시력교정 예약률 · 시력교정 일반예약률 · 원데이 예약률 · 시력교정 상담성공률</td></tr>
        <tr><td>중단</td><td>중단율 · 중단 사유</td></tr>
        <tr><td>수술</td><td>총 수술수 · 백내장 수술 · 시력교정 수술 · 재수술(레이저+렌즈) · 수술 상세표</td></tr>
        <tr><td>외래</td><td>외래수</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">지표 정의는 여기서 다시 쓰지 않음</div>
      <p>도표 하나하나의 계산식·집계 단위·날짜 기준은 <a href="../지표정의/README.md">지표정의/</a> 6문서가 정본임.
         레포트는 그 정의를 <b>그리는 화면</b>이고, 정의를 소유하지 않음.
         숫자가 이상하면 레포트가 아니라 해당 지표 문서와 개별 통계 화면을 봄.</p>
    </div>

    <h3>연도별로 데이터의 성격이 다름</h3>
    <table>
      <thead><tr><th>연도</th><th>출처</th><th>성격</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>마트에 심어 둔 <b>레거시 확정값</b>(월 단위)</td><td>이미 확정돼 변하지 않음. <b>주 단위로 쪼갤 수 없음</b></td></tr>
        <tr><td>2026 ~</td><td>배치가 적재한 마트</td><td>T-1 기준으로 매일 갱신됨</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">그래서 주차 레포트와 같은 달의 값이 미세하게 다를 수 있음</div>
      <p>주차 레포트는 전 구간을 <b>일별 집계에서 라이브로</b> 묶음.
         월간의 2024·2025 는 월 단위 확정값이라 애초에 다른 경로임.
         차이가 보이면 버그가 아니라 <b>이 구조 때문</b>일 수 있음 — 먼저 연도를 확인함.</p>
    </div>

    <h3>수치 포맷</h3>
    <table>
      <thead><tr><th>대상</th><th>표기</th></tr></thead>
      <tbody>
        <tr><td>건수</td><td>천 단위 콤마</td></tr>
        <tr><td>비율</td><td>소수점 자릿수를 도표마다 정함(<code>percentFractionDigits</code>)</td></tr>
        <tr><td>없는 값</td><td>선을 끊음 — 0 으로 그리지 않음</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>진행 중인 달</b></td><td>마지막 점이 뚝 떨어짐</td><td>부분값임. 헤더의 데이터 반영일과 함께 읽어야 함</td></tr>
        <tr><td><b>스냅샷 드리프트</b></td><td>지난달 값이 나중에 달라짐</td><td>원천이 고객당 1행을 덮어쓰는 구조임. 월 마감 스냅샷 방침으로 대응 예정(<a href="../db/지표정의.md">db/지표정의.md §3</a>)</td></tr>
        <tr><td><b>2024·2025 는 월 단위 고정</b></td><td>주차로 못 쪼갬</td><td>레거시 확정값이라 원천 자체가 없음</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 것은 안 들어옴</td><td>레포트 용도상 문제되지 않음</td></tr>
        <tr><td><b>인쇄 레이아웃</b></td><td>브라우저·용지에 따라 도표가 잘릴 수 있음</td><td><code>window.print()</code> + CSS 이므로 브라우저 인쇄 설정에 의존함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>월 마감 시점</td><td>어느 시점의 값을 그 달의 확정값으로 볼지. 정해지면 드리프트가 사라짐</td></tr>
        <tr><td>도표 추가·삭제 절차</td><td>지금은 <code>reportItems.tsx</code> 하나를 고치면 월간·주차에 동시에 반영됨. 한쪽만 필요할 때의 규칙이 없음</td></tr>
        <tr><td>레포트 확정본 보관</td><td>PDF 를 사람이 저장함. 발행본을 시스템이 남길지</td></tr>
      </tbody>
    </table>
  `,
}
