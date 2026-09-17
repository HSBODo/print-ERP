export default {
  s2: `
    <h3>시술별로 검사가 몇 건인가</h3>
    <p>시력교정 · 드림렌즈 · 백내장 검사 건수를 <b>탭으로 나눠</b> 월별 추이로 봄.
       메뉴 이름은 「시술별」이지만 <b>수술이 아니라 검사</b>를 셈.</p>

    <div class="note bad">
      <div class="h">⚠️ 메뉴 이름과 내용이 어긋남</div>
      <p>「시술별」(<code>examination</code>) = <b>시술 종류별 검사 건수</b><br />
         「검사건수」(<a href="procedure-exam.html">procedure-exam</a>) = <b>전체 검사수 합계</b><br />
         이름만 보면 반대로 읽힘. 라우트 id 와 라벨이 어긋난 채 굳었음.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>시술별 수요</td><td>어느 진료의 검사가 늘고 있는지 봄</td></tr>
        <tr><td>전년 대비</td><td>3개년을 겹쳐 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「시력교정 검사」·「드림렌즈 신규수」·「백내장 검사수」와 이어짐</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>필터 바 + 탭 4개 + 월별 꺾은선.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
        <span class="grow"></span>
        <span class="seg"><span class="on">전체 검사건수</span><span>시력교정</span><span>드림렌즈</span><span>백내장</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">전체 검사건수</div>
        <div style="border:1px solid #eaeaec;border-radius:10px;height:140px;margin-top:10px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        <div style="display:flex; gap:14px; margin-top:8px; font-size:11.5px">
          <span><span style="display:inline-block;width:18px;height:2px;background:#E11D2E;vertical-align:middle"></span> 2026</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#4B5563;vertical-align:middle"></span> 2025</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#A8CEDF;vertical-align:middle"></span> 2024</span>
        </div>
      </div>
    </div>
    <p class="shot-cap">색 규칙은 다른 추이 화면과 같음 — <b>최신 연도가 항상 빨강</b>.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년</td><td>겹쳐 그림</td></tr>
        <tr><td>탭</td><td>전체 검사건수 · 시력교정 · 드림렌즈 · 백내장</td><td>같은 응답의 다른 필드 — <b>재조회하지 않음</b></td></tr>
        <tr><td>차트</td><td>월별 꺾은선</td><td><b>미래 월은 점을 찍지 않음</b></td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">미래 월을 비워 두는 이유</div>
      <p>0 으로 그리면 <b>급락한 것처럼</b> 보임. 아직 오지 않은 달은 선을 끊음.
         이 규칙은 추이 계열 화면 전체가 공유함.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>기본 3개년</td></tr>
        <tr><td>탭</td><td>화면</td><td>—</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>검사일</b>임.</p>
  `,

  s5: `
    <h3>탭 4종</h3>
    <table>
      <thead><tr><th>탭</th><th>모집단</th></tr></thead>
      <tbody>
        <tr><td>전체 검사건수</td><td>아래 셋의 합</td></tr>
        <tr><td>시력교정</td><td><code>EXAM</code> 중 시력교정 분류</td></tr>
        <tr><td>드림렌즈</td><td><code>EXAM</code> 중 드림렌즈 분류 (렌즈센터 예약만 있고 진료 예약 없음)</td></tr>
        <tr><td>백내장</td><td><code>Cataract_Exam</code> 계열</td></tr>
      </tbody>
    </table>
    <p>분류 판정 규칙은 <a href="all-exam-list.html">전체 검사자 리스트 5장</a>과 같음.</p>

    <div class="note">
      <div class="h">지표 정의</div>
      <p><a href="../지표정의/2-검사.md">지표정의/2-검사.md</a> 가 정본임 —
         시력교정·드림렌즈·백내장 검사의 정의와 원데이/일반 구분이 거기 있음.</p>
    </div>

    <div class="note warn">
      <div class="h">백내장 탭의 값이 어느 백내장인지 확인할 것</div>
      <p>백내장은 <b>레포트 검사수(분류 백내장+중단)</b>와 <b>리스트 전체(102)</b> 두 숫자가 있음.
         레포트와 맞춰야 하면 <a href="all-exam-list.html">전체 검사자 리스트</a>의 「백내장」 토글 값과 대조함.</p>
    </div>

    <h3>연도별 데이터</h3>
    <p>2024·2025 는 확정값, 2026 이후는 운영 DB 집계임. 다른 추이 화면과 같은 구조임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>메뉴 이름 혼동</b></td><td>「시술별」과 「검사건수」가 반대로 읽힘</td><td>id 와 라벨이 어긋난 채 굳었음 — 10장 미결</td></tr>
        <tr><td><b>백내장 범위</b></td><td>다른 화면의 백내장과 다를 수 있음</td><td>레포트 검사수 기준인지 확인</td></tr>
        <tr><td><b>진행 중인 달</b></td><td>마지막 점이 낮음</td><td>부분값</td></tr>
        <tr><td><b>2024·2025 고정</b></td><td>정의를 바꿔도 안 변함</td><td>확정값임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>메뉴 이름 교체</b></td><td>「시술별」 ↔ 「검사건수」를 바로잡을지. 바꾸면 사용자가 익힌 위치가 흔들리고 라우트 id 도 어긋난 채 남음</td></tr>
        <tr><td>두 화면 통합</td><td>「시술별」과 「검사건수」가 같은 소재를 다르게 자름. 탭 하나로 합칠지</td></tr>
      </tbody>
    </table>
  `,
}
