export default {
  s2: `
    <h3>수술이 몇 건인가</h3>
    <p>수술 건수의 총량과 구성을 주요 지표·추이·구성 패널로 봄.
       명단은 <a href="surgery-list.html">수술자 리스트</a>, 유형별 비중은
       <a href="surgery-ratio.html">주요 수술별 비중</a>·<a href="surgery-composition.html">수술별 비중</a>이 맡음.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>총량 확인</td><td>월별·연도별 수술 건수 추이</td></tr>
        <tr><td>그룹 비교</td><td>시력교정 · 렌즈/각막 · 백내장을 나눠 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「총 수술수」와 같은 값임</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
    </div>
  `,

  s3: `
    <p>공통 필터 바 + 주요 지표 카드 + 추이·구성 패널. 다른 통계 화면과 같은 골격임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">월 비교</span><span>연도 추이</span></span>
        <span class="ui">2026-07 ✕</span><span class="ui">＋ 기간 추가</span>
        <span class="grow"></span>
        <span class="seg"><span class="on">전체</span><span>시력교정</span><span>렌즈/각막</span><span>백내장</span></span>
      </div>
      <div style="padding:12px">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px">
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">전체 수술건수</div><div style="font-size:20px;font-weight:800">769</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">시력교정</div><div style="font-size:20px;font-weight:800">578</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">렌즈/각막</div><div style="font-size:20px;font-weight:800">148</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">백내장</div><div style="font-size:20px;font-weight:800">43</div></div>
        </div>
        <div style="border:1px solid #eaeaec;border-radius:10px;height:120px;margin-top:10px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
      </div>
    </div>
    <p class="shot-cap">숫자는 예시임 — <b>전체 = 시력교정 + 렌즈/각막 + 백내장</b> 이 성립함.
          이 화면의 「전체」에는 <b>재수술이 없음</b>(유형 12종의 합). 재수술까지 더한 총수술은
          <a href="surgery-list.html">수술자 리스트</a> 「전체」 탭이 냄 — 5장 참조.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>필터 바</td><td>월 비교 / 연도 추이</td><td>공통 <code>FilterBar</code></td></tr>
        <tr><td>그룹</td><td>전체 · 시력교정 · 렌즈/각막 · 백내장</td><td>같은 데이터를 다른 묶음으로 봄</td></tr>
        <tr><td>주요 지표 카드</td><td>그룹별 건수</td><td>—</td></tr>
        <tr><td>추이</td><td>월별 꺾은선</td><td>—</td></tr>
        <tr><td>구성</td><td>유형별 막대</td><td>—</td></tr>
        <tr><td>모바일</td><td>세로 스택</td><td>768px 미만</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간/연도</td><td><b>서버</b></td><td>고른 기간의 연도를 모아 조회</td></tr>
        <tr><td>그룹</td><td>화면</td><td>받은 유형별 값을 묶음</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>수술일</b>임.</p>
  `,

  s5: `
    <h3>유형 12종</h3>
    <table>
      <thead><tr><th>그룹</th><th>유형</th></tr></thead>
      <tbody>
        <tr><td>시력교정</td><td>라섹 · 라식 · 스마일 · 스마일프로</td></tr>
        <tr><td>렌즈/각막</td><td>ICL · T-ICL · KPL · T-KPL · VIVA</td></tr>
        <tr><td>백내장</td><td>다초점 · 단초점 · EDOF</td></tr>
      </tbody>
    </table>
    <p>유형 판정은 <b>수술명 문자열</b>을 순서대로 훑어 정함 —
       규칙과 순서는 <a href="surgery-list.html">수술자 리스트 5장</a>에 있음.
       프론트와 백엔드 SQL 이 <b>같은 순서</b>를 유지해야 함.</p>

    <div class="note warn">
      <div class="h">단위 주의 — 건인지 사람인지</div>
      <p>이 화면은 <b>건수</b> 계열임. <a href="surgery-composition.html">수술별 비중</a>의 PIOL 합계처럼
         <b>DISTINCT 환자 수</b>를 쓰는 지표와 섞어 읽으면 안 됨.
         지표 정의는 <a href="../지표정의/5-수술.md">지표정의/5-수술.md</a>.</p>
    </div>

    <div class="note">
      <div class="h">재수술은 별도 원천임</div>
      <p><b>이 화면의 「전체 수술건수」에는 재수술이 들어가지 않음</b> — 유형 12종의 합이기 때문임.
         <code>RE_OPERATION</code> 에 따로 있음. 총수술에 더할 때의 규칙은
         <a href="surgery-list.html">수술자 리스트</a>의 「전체」 탭과 같음
         (2026-07: 726 + 43 + 29 = 798).</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>문자열 분류</b></td><td>새 수술명이 '기타'로 떨어짐</td><td>새 시술 도입 시 프론트·백엔드 목록을 함께 늘림</td></tr>
        <tr><td><b>건/사람 단위 혼재</b></td><td>다른 수술 화면과 합이 안 맞음</td><td>지표마다 단위를 확인함</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 수술은 안 보임</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>수술 화면 4개의 역할</td><td>수술 건수 · 주요 수술별 비중 · 수술별 비중 · 수술자 리스트가 겹침. <b>어느 화면이 무엇을 답하는지</b> 정리가 필요함</td></tr>
        <tr><td>분류 목록의 정본</td><td>마트 쪽은 <code>surgery_op_type()</code> 함수 하나로 모였으나(V47), 프론트 <code>classifyVision()</code> 과는 여전히 두 벌임 — 한쪽만 고치면 조용히 어긋남</td></tr>
      </tbody>
    </table>
  `,
}
