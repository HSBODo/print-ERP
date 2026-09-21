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

    <div class="note warn">
      <div class="h">「전체 수술건수」에 재수술이 들어감 — 연도에 따라 다름</div>
      <p>KPI 「전체 수술건수」는 응답의 <code>total</code> 을 그대로 씀. 2026 이후(배치 적재 · V35 확정값)는
         <b>시력교정 + 백내장 + 재수술</b>이고(2026-01: 1361 + 90 + 32 = 1483), 2024·2025 시드(V15)는
         <b>재수술 미포함</b>(시력교정 + 백내장)임. 유형 12종의 합과도 다름 — 시력교정 인원은 유형별 중복을 걷어낸 DISTINCT 값이기 때문임.
         재수술 원천은 <code>RE_OPERATION</code> 이고 가산 기준은 <a href="surgery-list.html">수술자 리스트</a> 「전체」 탭과 같음.</p>
    </div>

    <h3>컬럼 정의 — KPI 4개 · 차트 시리즈 3개</h3>
    <p>조회 경로는 마트 <code>mart_surgery_monthly</code> 하나이고 세 API 의 응답이 같음.
       2026-05 이전은 시드 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>전체 수술건수 (KPI)</td><td><code>total</code></td><td><code>total</code></td><td>시력교정 인원 + 백내장 안수 + 재수술 포함건 (<code>OPERATIONDATA</code> · <code>Cataract_Operationdata</code> · <code>RE_OPERATION</code>)</td><td>기준 기간 값 + 비교 기간별 증감률(%). 연도 모드는 12개월 합. 2024·2025 는 재수술 미포함(위 노트)</td></tr>
        <tr><td>2</td><td>시력교정 (KPI)</td><td><code>visionPatients</code></td><td><code>vision_patients</code></td><td><code>list_surgery</code> 시력교정 행의 사람×수술일 DISTINCT ← <code>OPERATIONDATA</code></td><td>월값 = 일별 DISTINCT 의 합(같은 달 다른 날 두 번이면 2). 유형 4종(라섹·라식·스마일·스마일프로)의 합이 아님</td></tr>
        <tr><td>3</td><td>렌즈/각막 (KPI)</td><td><code>icl</code> + <code>tIcl</code> + <code>kpl</code> + <code>tKpl</code> + <code>viva</code></td><td><code>icl</code> · <code>t_icl</code> · <code>kpl</code> · <code>t_kpl</code> · <code>viva</code></td><td>시력교정 눈의 시술명이 ICL · T-ICL · KPL · T-KPL · VIVA 계열(<code>surgery_op_type</code>) — 환자당 대표유형(우안 우선) 1건</td><td>프론트 합산. 대표유형 규칙이라 5종 합 = <code>piol_patients</code>(PIOL 실인원)</td></tr>
        <tr><td>4</td><td>백내장 (KPI)</td><td><code>cataractPatients</code></td><td><code>cataract_patients</code></td><td><code>list_surgery</code> 백내장 행의 눈 수 COUNT(*) ← <code>Cataract_Operationdata</code></td><td>이름은 Patients 지만 <b>안(眼) 단위</b>. 같은 날 양안 = 2</td></tr>
        <tr><td>5</td><td>수술 유형별 비교 — 시리즈 <code>p0</code>~<code>p2</code> (월별 모드 막대)</td><td>1~4 와 같음</td><td>같음</td><td>같음</td><td>시리즈 = 선택한 기간(최대 3), X축 4항목 = KPI 1~4. 색은 <code>CHART_COLORS</code> 순</td></tr>
        <tr><td>6</td><td>월별 추이 비교 — 시리즈 <code>y{연도}</code> (연도별 모드 선)</td><td>탭 그룹의 월값(1~4 중 하나)</td><td>같음</td><td>같음</td><td>시리즈 = 선택 연도 최근 3개(빨강 → 진회색 → 연하늘, 최신이 빨강). 탭(전체/시력교정/렌즈·각막/백내장)이 값을 고름. 미래 월은 빈 값이라 선이 끊김. 최신 연도만 값 라벨</td></tr>
        <tr><td>7</td><td>월별 추이 표 — 1월~12월 · 합계</td><td>같음</td><td>같음</td><td>같음</td><td>차트와 같은 값. 합계 = 표시된 월의 합(미래 월 제외). 빈 값은 공란</td></tr>
      </tbody>
    </table>
    <p>응답의 <code>presbyond</code> · <code>piolPatients</code> · 부가시술(<code>xtra</code> 등) · 라섹계 세부 · 재수술 세부는 이 화면에서 쓰지 않음(<a href="surgery-composition.html">수술별 비중</a>이 씀).</p>
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
