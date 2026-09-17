export default {
  s2: `
    <h3>화면이 아니라 도구임</h3>
    <p>지표를 보는 화면이 아니라 <b>마트를 다시 채우는 도구</b>임.
       배치가 놓친 기간을 수동으로 재적재하고, 실행 이력을 확인함.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td><b>누락 복구</b></td><td>늦게 입력된 과거 기록이 마트에 없을 때 그 기간을 다시 읽힘</td></tr>
        <tr><td>정의 변경 반영</td><td>SQL·분류 규칙을 고친 뒤 과거 구간을 다시 계산함</td></tr>
        <tr><td>배치 실패 확인</td><td>실행 이력에서 실패한 잡과 사유를 봄</td></tr>
        <tr><td>초기 적재</td><td>새 마트를 처음 채움</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용 · 되돌릴 수 없음</div>
      <p>재적재는 <b>해당 기간을 지우고 다시 넣음</b>(list 마트) 또는 <b>덮어씀</b>(monthly·daily 마트).
         실행 전 상태로 되돌리는 기능은 없음.</p>
    </div>

    <div class="note">
      <div class="h">언제 이 화면이 필요한가</div>
      <p>일일 배치는 <b>D-1 하루치만</b> 읽고, 월 1일 보정은 <b>전월 한 달만</b> 다시 읽음.
         그보다 <b>더 과거로 뒤늦게 입력된 기록</b>은 어떤 배치도 다시 읽지 않으므로
         여기서 수동으로 재적재해야 함 (<a href="exam-list.html">검사자 리스트 10장</a> 참조).</p>
    </div>
  `,

  s3: `
    <p>실행 폼 + 이력 표. 두 덩어리뿐임.</p>

    <div class="shot">
      <div style="padding:14px; border-bottom:1px solid #eaeaec">
        <div style="font-size:13px; font-weight:700">배치 수동 실행</div>
        <div class="shot-bar" style="border:0; padding:10px 0 0">
          <span class="ui">전체 도메인 재실행 ▾</span>
          <span class="ui">2026-07-01</span><span>~</span><span class="ui">2026-07-31</span>
          <span class="ui blue">▶ 실행</span>
        </div>
        <div class="ph" style="font-size:11.5px; margin-top:6px">
          기간 내 전 도메인(수술·예약·검사·전환·외래·전체지표·기타)을 순차 재실행합니다. min-year 가드 우회.
        </div>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">실행 이력 <span class="ui" style="font-size:10px">⟳ 새로고침</span></div>
        <table>
          <thead><tr><th></th><th>실행 유형</th><th>잡</th><th>대상 기간</th><th>상태</th><th>시작</th><th>소요</th></tr></thead>
          <tbody>
            <tr><td class="ph">▸</td><td>MANUAL</td><td>orchestrator[ALL]</td><td>2026-07-01 ~ 07-31</td><td><span class="pill g-smile">성공</span></td><td>08-26 09:12</td><td>4m 21s</td></tr>
            <tr><td class="ph">▸</td><td>DAILY</td><td>orchestrator</td><td>2026-08-25</td><td><span class="pill g-smile">성공</span></td><td>08-26 03:00</td><td>1m 08s</td></tr>
            <tr><td class="ph">▾</td><td>DAILY</td><td>orchestrator[RESERVATION_STATS_INTRADAY]</td><td>2026-08-25</td><td><span class="pill st-no">실패</span></td><td>08-26 10:00</td><td>12s</td></tr>
            <tr><td colspan="7" class="ph" style="font-size:11px; background:#fef2f2">　오류: connection timed out — MSSQL 연결 실패</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">이력 행을 펼치면 오류 상세가 나옴. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>도메인 선택</td><td>전체 + 7개 도메인</td><td>고르면 아래 설명이 바뀜</td></tr>
        <tr><td>기간</td><td>시작일 ~ 종료일</td><td>기본값은 최근 며칠</td></tr>
        <tr><td>실행</td><td>버튼</td><td>동기 실행 — <b>끝날 때까지 기다림</b></td></tr>
        <tr><td>이력</td><td>표 + 펼치기</td><td>실행 유형 · 잡 이름 · 기간 · 상태 · 소요시간 · 오류</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">도메인 설명을 화면에 적어 둠</div>
      <p>"수술 도메인만"이 어느 마트를 건드리는지(<code>mart_surgery_*</code>) 화면이 직접 말함.
         잘못 고르면 되돌릴 수 없으므로, 실행 전에 무엇이 바뀌는지 읽히게 했음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>도메인</td><td><b>서버</b></td><td>ALL · SURGERY · RESERVATION · EXAM · CONSULTATION · OUTPATIENT · OVERALL · ETC</td></tr>
        <tr><td>기간</td><td><b>서버</b></td><td><code>POST /api/admin/batch/rerun</code></td></tr>
        <tr><td>이력</td><td><b>서버</b></td><td><code>GET /api/admin/batch/run-logs</code></td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">수동 실행은 <code>min-year</code> 가드를 우회함</div>
      <p>자동 배치는 대상 연도가 <code>min-year</code>(2026) 미만이면 건너뜀.
         수동 실행은 그 가드를 <b>일부러 우회</b>함 — 초기 backfill 과 과거 보정에 필요하기 때문임.
         <b>그만큼 실수로 오래된 기간을 돌릴 수도 있음.</b></p>
    </div>
  `,

  s5: `
    <h3>도메인 8종</h3>
    <table>
      <thead><tr><th>도메인</th><th>건드리는 마트</th></tr></thead>
      <tbody>
        <tr><td><b>ALL</b></td><td>전 도메인 순차 실행</td></tr>
        <tr><td>SURGERY</td><td><code>mart_surgery_*</code></td></tr>
        <tr><td>RESERVATION</td><td><code>mart_reservation_*</code></td></tr>
        <tr><td>EXAM</td><td><code>mart_exam_*</code> · 검사 리스트</td></tr>
        <tr><td>CONSULTATION</td><td><code>mart_consultation_rate</code> · <code>stop_reason</code> · <code>cataract_reservation_rate</code></td></tr>
        <tr><td>OUTPATIENT</td><td><code>mart_outpatient_count_*</code></td></tr>
        <tr><td>OVERALL</td><td><code>mart_overall_exam_*</code></td></tr>
        <tr><td>ETC</td><td><code>mart_b2b_revenue_*</code> 등</td></tr>
      </tbody>
    </table>

    <h3>자동 배치 3종 — 이 화면이 보완하는 대상</h3>
    <table>
      <thead><tr><th>배치</th><th>주기</th><th>범위</th></tr></thead>
      <tbody>
        <tr><td>일일</td><td>매일 03:00</td><td><b>D-1 하루치</b>만</td></tr>
        <tr><td>예약통계 중간</td><td>매일 10:00</td><td>D-1 예약통계 일별 마트만 재실행 (콜센터 늦은 반영 흡수)</td></tr>
        <tr><td>월간 보정</td><td>매월 1일 03:30</td><td><b>전월 전체</b> 재계산</td></tr>
      </tbody>
    </table>
    <p>모두 <code>min-year</code>(2026) 가드가 걸려 있음. 전략의 정본은
       <a href="../databatch/strategy.md">databatch/strategy.md</a> — <b>§12 배치 실행 규칙</b> 참조.</p>

    <div class="note">
      <div class="h">재적재 방식이 마트 종류마다 다름</div>
      <table>
        <thead><tr><th>마트</th><th>방식</th><th>결과</th></tr></thead>
        <tbody>
          <tr><td>Monthly</td><td><code>ON CONFLICT DO UPDATE</code></td><td>값 덮어쓰기</td></tr>
          <tr><td>Daily</td><td>해당 날짜 upsert</td><td>덮어쓰기</td></tr>
          <tr><td><b>List</b></td><td><b>범위 delete + 재조회 insert</b></td><td><b>취소·삭제분까지 반영</b>됨</td></tr>
        </tbody>
      </table>
      <p>List 마트만 삭제를 반영함 — 원천에서 사라진 행이 마트에 남지 않게 하기 위해서임.</p>
    </div>

    <h3>실행 이력</h3>
    <table>
      <thead><tr><th>필드</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>실행 유형</td><td><code>DAILY</code> · <code>MANUAL</code> · <code>MONTHLY_RECONCILE</code></td></tr>
        <tr><td>잡 이름</td><td><code>orchestrator[도메인]</code> 형태로 구분함</td></tr>
        <tr><td>대상 기간 · 상태 · 소요시간</td><td>—</td></tr>
        <tr><td>오류</td><td>실패 시 사유. 행을 펼쳐 봄</td></tr>
      </tbody>
    </table>
    <p>이 이력은 다른 화면의 <b>"데이터 반영일"</b> 표시에도 쓰임 — 마지막 성공 시각이 그 값임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>되돌릴 수 없음</b></td><td>실행하면 끝임</td><td>기간·도메인을 확인하고 누름. 확인 절차가 <b>없음</b></td></tr>
        <tr><td><b>동기 실행</b></td><td>긴 기간을 돌리면 화면이 오래 기다림</td><td>범위를 나눠 돌림</td></tr>
        <tr><td><b>가드 우회</b></td><td>실수로 아주 오래된 기간을 돌릴 수 있음</td><td>의도된 동작이지만 안전장치가 없음</td></tr>
        <tr><td><b>진행률이 없음</b></td><td>도는 중인지 멈춘 건지 모름</td><td>이력에 끝난 뒤에야 나옴</td></tr>
        <tr><td><b>원천 의존</b></td><td>MSSQL 연결이 끊기면 실패함</td><td>Tailscale·터널 상태를 먼저 확인함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>보정 범위 확대</b></td><td>일일을 D-7~D-1 로 넓히거나 월간 보정을 2~3개월로 늘리면 이 화면을 쓸 일이 줄어듦. 조회 비용과 맞바꿈</td></tr>
        <tr><td>실행 전 확인</td><td>되돌릴 수 없는데 확인 대화상자가 없음</td></tr>
        <tr><td>비동기 실행 · 진행률</td><td>긴 재적재를 백그라운드로 돌릴지</td></tr>
        <tr><td>누락 감지</td><td>지금은 사람이 눈치채야 함. 원천과 마트 건수를 대조하는 점검 잡이 필요한지</td></tr>
      </tbody>
    </table>
  `,
}
