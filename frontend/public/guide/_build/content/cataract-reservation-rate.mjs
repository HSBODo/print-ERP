export default {
  s2: `
    <h3>검사받은 사람 중 몇이 수술을 예약했나</h3>
    <p>시력교정과 백내장을 <b>탭으로 나눠</b> 월별 예약률을 봄.
       분모가 <b>검사받은 사람 전체</b>라는 점이 <a href="consultation-rate.html">전환율</a>과 다름.</p>

    <div class="note bad">
      <div class="h">⚠️ 전환율과 헷갈리지 말 것</div>
      <p><b>예약률(이 화면)</b> = 예약 ÷ <b>검사받은 사람</b><br />
         <b>전환율</b> = 예약 ÷ <b>상담한 사람</b><br />
         두 화면이 같은 그룹(전환&amp;성공률)에 나란히 있어 더 헷갈림. 분모를 먼저 확인함.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>검사 대비 성과</td><td>검사를 받게 하는 것과 예약까지 가는 것 중 어디가 약한지 봄</td></tr>
        <tr><td>시력교정 vs 백내장</td><td>두 진료의 예약률 수준이 다름 — 탭으로 갈라 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「백내장 예약률」·「시력교정 예약률」과 같은 값임</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>필터 바 + 탭 2개 + 월별 꺾은선 하나.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
        <span class="grow"></span>
        <span class="seg"><span class="on">시력교정 예약률</span><span>백내장 예약률</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">시력교정 예약률</div>
        <div class="ph" style="font-size:11.5px; margin-top:2px">시력교정 검사자 대비 수술예약 비율입니다.</div>
        <div style="border:1px solid #eaeaec; border-radius:10px; height:140px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        <div class="ph" style="font-size:11px; margin-top:6px">Y축 55~90% (백내장 탭은 40~100%)</div>
      </div>
    </div>
    <p class="shot-cap">탭마다 <b>Y축 범위가 다름</b> — 두 지표의 수준이 달라 같은 축을 쓰면 한쪽이 평평해 보임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년</td><td>겹쳐 그림</td></tr>
        <tr><td>탭</td><td>시력교정 예약률 · 백내장 예약률</td><td><b>서버 조회가 다시 나감</b> — 계산이 다른 지표임</td></tr>
        <tr><td>Y축</td><td>시력교정 55~90% / 백내장 40~100%</td><td>탭마다 고정 범위</td></tr>
        <tr><td>제목·설명</td><td>탭마다 바뀜</td><td>—</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">Y축을 고정하는 이유</div>
      <p>자동 스케일이면 달마다 축이 흔들려 <b>추세가 실제보다 크게 보임</b>.
         비율 지표는 절대 위치가 중요해서 범위를 못 박았음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>기본 3개년</td></tr>
        <tr><td>탭</td><td><b>서버</b></td><td><code>category=vision</code> / <code>cataract</code> — 다른 계산임</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>검사일</b>임.</p>
  `,

  s5: `
    <div class="note">
      <div class="h">정의의 정본</div>
      <p><a href="../지표정의/4-예약률.md">지표정의/4-예약률.md</a> — <b>2026-06 에 정의를 교체</b>했으므로
         그 이전 자료와 비교할 때는 반드시 확인함.</p>
    </div>

    <h3>2026-06 에 무엇이 바뀌었나</h3>
    <p>세 예약률(백내장·시력교정·원데이)의 분자를 <b>"검사일 이후 수술예약"으로 통일</b>했음.
       그전에는 백내장이 <b>눈 단위</b> 분모를 썼고 원데이는 <b>'7일 내 수술 실시'</b>를 분자로 써서
       지표마다 규칙이 제각각이었음.</p>

    <h3>백내장 예약률</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>분모</td><td>백내장 검사수 = <a href="cataract-exam-list.html">백내장 검사자 리스트</a>의 <b>「백내장」 + 「중단」</b> 분류</td></tr>
        <tr><td>분자</td><td>분모 대상 중 백내장 수술예약 보유자</td></tr>
        <tr><td>분자 조건</td><td><code>RESERVE_FLAG='O'</code> · <code>RESERVE_JINRYO='4'</code> · <code>RESERVE_STATE &lt;&gt; 'C'</code> · <b><code>RESERVE_DATE &gt;= 검사일</code></b></td></tr>
        <tr><td>집계 단위</td><td><b>사람</b></td></tr>
        <tr><td>계산</td><td><code>Math.ceil(분자 × 100 ÷ 분모)</code> — 서비스에서 계산해 마트에 저장</td></tr>
      </tbody>
    </table>
    <p>2026-07 실측: <b>32 ÷ 57 = 56%</b></p>

    <div class="note warn">
      <div class="h">분자에 기간 제한이 필요한 이유</div>
      <p><code>RESERVE_DATE &gt;= 검사일</code> 이 없으면 <b>과거 예약 이력까지 세어 과대 집계</b>됨.
         전환율 화면은 이 조건이 <b>아직 없음</b> — 두 화면의 성격 차이임.</p>
    </div>

    <div class="note warn">
      <div class="h"><code>RESERVE_JINRYO='4'</code> 를 빠뜨리면 안 됨</div>
      <p>백내장 수술예약을 가리는 조건임. 지정하지 않으면 <b>시력교정 수술예약이 섞임</b>.</p>
    </div>

    <h3>시력교정 예약률</h3>
    <p>수술예약 보유자 ÷ 시력교정 검사자. 같은 화면의 <code>category=vision</code> 계열임.</p>

    <div class="note bad">
      <div class="h">⚠️ 백내장 예약률의 분모는 백내장 검사수와 다를 수 있음</div>
      <p><a href="../지표정의/3-전환율-중단율.md">지표정의 3 §2</a> 가 지적한 것 —
         검사수 쿼리와 예약률 쿼리의 조건이 다름.
         검사수는 미내원(<code>'Y'</code>)을 빼고 검안사 조건이 있는데, 예약률 쪽은 그렇지 않은 버전이 있었음.
         <b>단위가 눈 → 사람으로 바뀐 뒤 분모 재검토가 필요하다고 정리된 상태</b>임
         (<a href="../db/지표정의.md">db/지표정의.md §1.4.1</a>).</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>2026-06 정의 교체</b></td><td>그 전후로 값의 성격이 다름</td><td>과거 보고서와 비교할 때 반드시 확인</td></tr>
        <tr><td><b>분모 재검토 미완</b></td><td>백내장 검사수와 분모가 어긋날 수 있음</td><td>지표 문서에 미결로 남아 있음</td></tr>
        <tr><td><b>Y축 고정</b></td><td>범위를 벗어나면 선이 잘림</td><td>이례적인 달에는 축을 넓혀야 함</td></tr>
        <tr><td><b>전환율과 혼동</b></td><td>이름·위치가 비슷함</td><td>분모를 먼저 확인</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>백내장 예약률 분모</b></td><td>검사수와 같은 모집단으로 맞출지. 맞추면 과거 값이 바뀜</td></tr>
        <tr><td>전환율에도 기간 제한</td><td>두 화면의 규칙이 다른 채로 나란히 있음. 통일할지</td></tr>
        <tr><td>원데이 예약률의 위치</td><td>지금은 레포트 도표에만 있음. 이 화면의 세 번째 탭이 될지</td></tr>
      </tbody>
    </table>
  `,
}
