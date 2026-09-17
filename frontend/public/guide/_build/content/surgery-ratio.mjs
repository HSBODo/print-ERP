export default {
  s2: `
    <h3>어떤 수술이 얼마를 차지하나</h3>
    <p>기준 연도와 월(연간 전체 가능)을 골라 <b>수술 유형별 주요 지표·점유율</b>과
       <b>상위 수술의 월별 추이</b>를 함께 봄.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>수술 포트폴리오 확인</td><td>어느 수술이 주력인지, 비중이 움직이는지 봄</td></tr>
        <tr><td>연간 요약</td><td>「연간 전체」로 그 해 전체 구성을 한 번에 봄</td></tr>
        <tr><td>상위 수술 추세</td><td>월 선택과 무관하게 그 해 12개월 흐름을 봄</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h"><a href="surgery-composition.html">수술별 비중</a>과 무엇이 다른가</div>
      <p>이 화면은 <b>주요 지표·점유율·추이</b>를 <b>차트</b>로 봄(요약 관점).<br />
         수술별 비중은 <b>26칼럼 표</b>로 월·주·일까지 내려감(상세 관점).<br />
         같은 원천을 다른 각도로 봄.</p>
    </div>
  `,

  s3: `
    <p>툴바(연도 · 월) + 주요 지표 카드 + 점유율 패널 + 추이 패널.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026년 ▾</span>
        <span class="ui">연간 전체 ▾</span>
      </div>
      <div style="padding:12px">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px">
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">스마일프로</div><div style="font-size:19px;font-weight:800">2,140</div><div class="ph" style="font-size:11px">38.2%</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">라섹계</div><div style="font-size:19px;font-weight:800">1,520</div><div class="ph" style="font-size:11px">27.1%</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">ICL</div><div style="font-size:19px;font-weight:800">880</div><div class="ph" style="font-size:11px">15.7%</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">백내장</div><div style="font-size:19px;font-weight:800">310</div><div class="ph" style="font-size:11px">5.5%</div></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px">
          <div style="flex:1; border:1px solid #eaeaec;border-radius:10px;height:130px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
          <div style="flex:1; border:1px solid #eaeaec;border-radius:10px;height:130px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        </div>
      </div>
    </div>
    <p class="shot-cap">좌: 유형별 점유율 · 우: 상위 수술 월별 추이. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td>Select</td><td>—</td></tr>
        <tr><td>월</td><td><b>연간 전체</b> + 1~12월</td><td>「연간 전체」면 12개월을 합산함</td></tr>
        <tr><td>주요 지표 · 점유율</td><td>고른 기간 기준</td><td>월을 고르면 그 달, 연간 전체면 합계</td></tr>
        <tr><td>상위 수술 추이</td><td><b>항상 그 연도 12개월</b></td><td><b>월 선택과 무관</b>함</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">기간 비교 모드를 없앴음 (2026-07-30)</div>
      <p>종전에는 월별·연도별 비교 모드가 있었는데, <b>기간을 여러 개 추가해도 첫 번째만 반영</b>돼
         쓸 수 없었음. 고치는 대신 <b>기준 연도 + 월</b> 하나만 고르는 구조로 단순화했음.</p>
    </div>

    <div class="note">
      <div class="h">추이가 월 선택을 따르지 않는 이유</div>
      <p>월을 고르는 것은 <b>"어느 시점의 구성을 볼까"</b>이고,
         추이는 <b>"그 해 어떻게 움직였나"</b>임. 추이까지 한 달로 좁히면 점 하나만 남음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td><code>GET /api/stats/surgery-ratio</code> — <code>/surgery/monthly</code> 와 같은 소스</td></tr>
        <tr><td>월</td><td>화면</td><td>받은 12개월 값에서 고르거나 합산함</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>수술일</b>임. 연도 하나만 서버에서 받고 나머지는 화면 계산임.</p>
  `,

  s5: `
    <h3>유형과 점유율</h3>
    <p>유형 판정 규칙은 <a href="surgery-list.html">수술자 리스트 5장</a>과 같음 —
       수술명 문자열을 정해진 순서로 훑음.</p>
    <table>
      <thead><tr><th>값</th><th>계산</th></tr></thead>
      <tbody>
        <tr><td>주요 지표</td><td>고른 기간의 유형별 건수</td></tr>
        <tr><td>점유율</td><td>유형 건수 ÷ 기간 합계</td></tr>
        <tr><td>추이</td><td>상위 유형의 월별 건수 (그 연도 12개월)</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">점유율의 분모를 확인할 것</div>
      <p>"전체 수술 대비"인지 "시력교정 대비"인지에 따라 같은 유형의 비중이 달라짐.
         <a href="surgery-composition.html">수술별 비중</a>은 칼럼마다 <b>분모가 다름</b>(그쪽 5장 참조) —
         두 화면의 % 를 나란히 놓고 비교하면 안 됨.</p>
    </div>

    <div class="note">
      <div class="h">지표 정의</div>
      <p>수술 유형 분류 키워드와 집계 단위는 <a href="../지표정의/5-수술.md">지표정의/5-수술.md</a> 가 정본임.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>기간 비교 불가</b></td><td>두 달을 나란히 못 봄</td><td>2026-07-30 에 의도적으로 뺐음. 비교는 추이 차트로</td></tr>
        <tr><td><b>연도 하나만</b></td><td>전년 대비를 한 화면에서 못 봄</td><td>월간 레포트의 「수술 상세표」를 봄</td></tr>
        <tr><td><b>분모 혼동</b></td><td>다른 수술 화면의 % 와 안 맞음</td><td>분모를 먼저 확인</td></tr>
        <tr><td><b>문자열 분류</b></td><td>새 수술명이 기타로 떨어짐</td><td>목록을 함께 늘림</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>전년 대비</td><td>비교 축을 되살릴지. 종전 구현이 망가져 뺀 것이라 <b>다시 넣으려면 설계부터</b></td></tr>
        <tr><td>수술 화면 정리</td><td>수술 관련 화면이 4개임. 역할 분담을 명시할지 통합할지</td></tr>
        <tr><td>'주요' 의 기준</td><td>상위 몇 개를 주요로 볼지 고정돼 있지 않음</td></tr>
      </tbody>
    </table>
  `,
}
