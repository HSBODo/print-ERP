export default {
  s2: `
    <h3>상담까지 간 사람 중 몇이 예약했나</h3>
    <p>검사받은 사람 전체가 아니라 <b>의사가 수술 방법을 제시한 사람</b>(=상담) 중에서 예약 비율을 봄.
       상담사·의사의 성과에 가장 가까운 지표임.</p>

    <div class="note bad">
      <div class="h">⚠️ 예약률과 다른 지표임 — 분모가 다름</div>
      <p><b>전환율(이 화면)</b> = 예약 ÷ <b>상담한 사람</b><br />
         <b><a href="cataract-reservation-rate.html">예약률</a></b> = 예약 ÷ <b>검사받은 사람 전체</b><br />
         이름이 비슷해 섞어 쓰기 쉬운데, 분모가 달라 값도 다름.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>상담 성과 확인</td><td>월별·연도별 상담성공률 추이를 봄</td></tr>
        <tr><td>원데이/일반 비교</td><td>원데이는 마음을 정하고 오므로 성공률이 다름 — 나눠 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「시력교정 상담성공률」과 같은 값임</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
      <p>상담 관련 지표라 관리자에게만 열림.</p>
    </div>
  `,

  s3: `
    <p>공통 필터 바 + 주요 지표 카드 + 패널 2개. 월 비교 모드와 연도 추이 모드에서 아래 패널이 바뀜.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">월 비교</span><span>연도 추이</span></span>
        <span class="ui">2026-06 ✕</span><span class="ui">2026-07 ✕</span><span class="ui">＋ 기간 추가</span>
      </div>
      <div style="padding:12px">
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px">
          <div style="border:1px solid #eaeaec; border-radius:10px; padding:10px">
            <div class="ph" style="font-size:11px">시력교정 상담성공률</div>
            <div style="font-size:20px; font-weight:800">78.4%</div>
            <div style="font-size:11px; color:#047857">▲ +1.2%p</div>
          </div>
          <div style="border:1px solid #eaeaec; border-radius:10px; padding:10px">
            <div class="ph" style="font-size:11px">시력교정 수술 전환율</div>
            <div style="font-size:20px; font-weight:800">61.2%</div>
            <div style="font-size:11px; color:#b91c1c">▼ -0.8%p</div>
          </div>
          <div style="border:1px solid #eaeaec; border-radius:10px; padding:10px">
            <div class="ph" style="font-size:11px">백내장 수술 전환율</div>
            <div style="font-size:20px; font-weight:800">56.1%</div>
            <div style="font-size:11px; color:#6b7280">— 0.0%p</div>
          </div>
        </div>
        <div style="border:1px solid #eaeaec; border-radius:10px; height:120px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
      </div>
    </div>
    <p class="shot-cap">필터 바는 다른 통계 화면과 공유하는 공통 컴포넌트임. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>필터 바</td><td>월 비교 / 연도 추이 모드</td><td>공통 <code>FilterBar</code> — 여러 통계 화면이 같은 규격을 씀</td></tr>
        <tr><td>주요 지표 카드</td><td>상담성공률 · 시력교정 수술 전환율 · 백내장 수술 전환율</td><td>세 지표를 함께 놓음</td></tr>
        <tr><td>월 비교 패널</td><td>고른 달들을 나란히</td><td>월 비교 모드에서만</td></tr>
        <tr><td>연도 추이 패널</td><td>월별 꺾은선 × 연도</td><td>연도 추이 모드에서만</td></tr>
        <tr><td>모바일</td><td>세로 스택</td><td>768px 미만에서 그리드 대신 스택</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>모드</td><td>화면</td><td>월 비교 · 연도 추이</td></tr>
        <tr><td>기간/연도</td><td><b>서버</b></td><td>고른 기간의 연도만 모아 조회함</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <code>EXAM.EXAM_DATE</code>(<b>검사일</b>)임.</p>
  `,

  s5: `
    <div class="note">
      <div class="h">정의의 정본</div>
      <p><a href="../지표정의/3-전환율-중단율.md">지표정의/3-전환율-중단율.md §1</a>.
         여기서는 <b>플래그 4종과 함정</b>만 옮김.</p>
    </div>

    <h3>검사 한 건마다 4개 플래그를 판정함</h3>
    <table>
      <thead><tr><th>플래그</th><th>뜻</th><th>판정</th></tr></thead>
      <tbody>
        <tr><td><code>examCount</code></td><td>검사함</td><td><code>EXAM</code> 행 존재 (<code>CANCEL_CD=''</code>)</td></tr>
        <tr><td><b><code>counsel</code></b></td><td><b>상담함</b></td><td><code>STOP_YN &lt;&gt; 'Y'</code> <b>그리고</b> 적절수술(<code>OPERATIONR</code>·<code>OPERATIONL</code>) 중 하나라도 입력됨</td></tr>
        <tr><td><code>booked</code></td><td>수술 예약함</td><td>수술 예약(<code>RESERVE_FLAG='O'</code>, <code>STATE&lt;&gt;'C'</code>)이 존재</td></tr>
        <tr><td><code>actual</code></td><td>실제 수술함</td><td><code>OPERATIONDATA</code> 에 기록 존재</td></tr>
        <tr><td><code>od</code></td><td>원데이</td><td>그날 검사OP(<code>M</code>/<code>5</code>) 예약 존재</td></tr>
      </tbody>
    </table>
    <p><b><code>counsel</code> 이 이 화면의 핵심</b>임 — 검사만 하고 끝난 게 아니라
       <b>의사가 수술 방법을 제시한 상태</b>를 뜻함. 중단이면 상담으로 치지 않음.</p>

    <h3>산출값</h3>
    <p><b>상담성공률 = <code>counselBooked</code> ÷ <code>counsel</code></b> 을
       <b>전체 · 원데이 · 일반</b> 세 계열로 냄.</p>

    <div class="note bad">
      <div class="h">⚠️ 가장 큰 함정 — <code>booked</code>·<code>actual</code> 에 기간 제한이 없음</div>
      <p>"이 검사 <b>이후에</b> 예약했는지"가 아니라 <b>"언제든 수술 예약 이력이 있는지"</b>를 봄.
         <code>RESERVATION</code> 을 고객번호로만 묶고 날짜 조건을 걸지 않기 때문임.
         <code>actual</code> 도 <code>OPERATIONDATA</code> 전체를 봄.</p>
      <p>즉 <b>2020년에 수술 예약한 이력이 있으면 2026년 검사도 "예약함"으로 잡힘</b>.
         재방문 환자가 많은 달일수록 전환율이 높게 나옴. 해석할 때 반드시 감안함.</p>
    </div>

    <div class="note">
      <div class="h">예약률은 이 함정을 이미 고쳤음</div>
      <p><a href="cataract-reservation-rate.html">예약률</a>은 2026-06 정의 교체 때
         분자에 <code>RESERVE_DATE &gt;= 검사일</code> 조건을 넣었음.
         <b>전환율은 아직 안 넣었음</b> — 넣으면 값이 낮아지지만 의미는 정확해짐(10장).</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>기간 무제한 판정</b></td><td>재방문이 많은 달에 전환율이 높음</td><td>정의상 그러함. 절대값보다 <b>추세</b>로 읽음</td></tr>
        <tr><td><b>분모가 '상담'이라 흔들림</b></td><td>적절수술 입력이 누락되면 상담이 줄어 성공률이 올라감</td><td>입력 관행에 민감한 지표임</td></tr>
        <tr><td><b>예약률과 혼동</b></td><td>두 화면이 같은 그룹에 있음</td><td>분모가 다름. 보고서에는 어느 쪽인지 명시</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 검사는 안 들어옴</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>기간 제한 도입</b></td><td>"이 검사에서 이어진 예약"으로 좁힐지. 좁히면 전환율이 낮아지지만 의미가 정확해짐 — <b>업무 판단이 필요</b>하고, 과거 값과의 비교선이 끊김</td></tr>
        <tr><td>상담 정의</td><td>적절수술 입력 여부로 판정하는 것이 맞는지. 입력 누락에 취약함</td></tr>
        <tr><td>세 주요 지표의 구성</td><td>상담성공률과 두 전환율을 한 카드 줄에 둔 것이 읽기에 맞는지</td></tr>
      </tbody>
    </table>
  `,
}
