export default {
  s2: `
    <h3>외래가 몇 건인가</h3>
    <p>월별 외래수를 연도별로 겹쳐 봄. 지표 하나만 그리는 단순한 화면이고,
       명단은 <a href="outpatient-list.html">외래수 리스트</a>가 맡음.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>외래 규모 추이</td><td>월별·연도별 비교</td></tr>
        <tr><td>명단 확인</td><td>숫자가 이상하면 리스트로 내려감 — <b>합계가 같음</b></td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「외래수」와 같은 값임</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">환자 흐름의 마지막 단계</div>
      <p>예약 → 검사 → 전환/중단 → 수술 → <b>외래</b>. 수술 후 경과 관찰이 여기 잡힘.</p>
    </div>
  `,

  s3: `
    <p>필터 바 + 월별 꺾은선 하나. 탭도 없음.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">외래수</div>
        <div class="ph" style="font-size:11.5px; margin-top:2px">월별 외래수 추이를 연도별로 비교합니다.</div>
        <div style="border:1px solid #eaeaec;border-radius:10px;height:140px;margin-top:10px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        <div style="display:flex; gap:14px; margin-top:8px; font-size:11.5px">
          <span><span style="display:inline-block;width:18px;height:2px;background:#E11D2E;vertical-align:middle"></span> 2026</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#4B5563;vertical-align:middle"></span> 2025</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#A8CEDF;vertical-align:middle"></span> 2024</span>
        </div>
      </div>
    </div>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년</td><td>연도 칩에 계열 색이 붙음</td></tr>
        <tr><td>차트</td><td>월별 꺾은선</td><td>최신 연도가 빨강</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td><code>GET /api/stats/outpatient-count/monthly?years=…</code></td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>예약일</b>(<code>RESERVE_DATE</code>)임 — 리스트와 같음.</p>
  `,

  s5: `
    <h3>정의</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>구분</td><td><code>RESERVE_FLAG = 'F'</code> (외래)</td></tr>
        <tr><td>상태</td><td><code>RESERVE_STATE IN ('I','H')</code> — 내원 · 퇴원</td></tr>
        <tr><td>단위</td><td><b>건수</b> (사람 수가 아님)</td></tr>
        <tr><td>진료구분</td><td><b>구분하지 않고 전부 합산</b></td></tr>
      </tbody>
    </table>
    <p>정본은 <a href="../지표정의/6-외래.md">지표정의/6-외래.md</a>. 예약 구분 코드표(§5)도 거기 있음.</p>

    <div class="note bad">
      <div class="h">⚠️ 백내장 외래(<code>FLAG='Z'</code>)는 포함하지 않음</div>
      <p>"외래 전부"가 아니라 <b><code>'F'</code> 만</b>임. 리스트와 같은 모집단이라 두 숫자가 맞음.</p>
    </div>

    <div class="note warn">
      <div class="h"><code>RESERVE_JINRYO='3'</code>(수술후망막)을 전역에서 빼지 말 것</div>
      <p>다른 화면의 제외 규칙을 습관적으로 따라 적용하면 외래수가 어긋남.
         외래는 진료구분을 <b>구분하지 않음</b>.</p>
    </div>

    <h3>연도별 데이터</h3>
    <table>
      <thead><tr><th>연도</th><th>출처</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>레거시 확정값</td></tr>
        <tr><td>2026 ~</td><td>배치 적재 마트</td></tr>
      </tbody>
    </table>
    <p>2026 은 레거시와 대조를 거쳤음 — <a href="../지표정의/6-외래.md">지표정의/6-외래.md §3</a> 참조.</p>

    <h3>컬럼 정의 — 차트 시리즈 1개 · 표 컬럼 3개</h3>
    <p>조회 경로는 마트 <code>mart_outpatient_count_monthly</code> 이고 외래수 리스트와 정의가 같음.
       2026-05 이전은 시드 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>연도 라인(차트 시리즈 · 연도마다 1개)</td><td><code>outpatientCount</code> (<code>year</code>·<code>month</code> 로 위치)</td><td><code>outpatient_count</code> (<code>yr</code>, <code>mo</code>)</td><td><code>list_outpatient</code> 행 수 = <code>RESERVATION</code>(<code>RESERVE_FLAG='F'</code>, <code>RESERVE_STATE IN ('I','H')</code>, 테스트 이름 제외) — 2026-06 이후. 그 이전은 시드 확정값</td><td>기본 3개 연도(올해·전년·전전년), 필터바에서 바꿈. 최신 연도만 굵은 선 + 값 라벨. null 은 선을 끊음. 색은 최신순 빨강·회색·하늘·주황</td></tr>
        <tr><td>2</td><td>연도 (표 첫 열)</td><td><code>year</code></td><td><code>yr</code></td><td>—</td><td>시리즈 색 막대 표시. 최신 연도는 색 글씨</td></tr>
        <tr><td>3</td><td>1월 ~ 12월 (표 셀)</td><td><code>outpatientCount</code></td><td><code>outpatient_count</code></td><td>위와 같음</td><td>천 단위 구분. null 은 빈칸. 응답은 요청 연도 × 12개월이 항상 채워짐(미저장 월은 null)</td></tr>
        <tr><td>4</td><td>합계</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>12개월 중 숫자만 합산. 0 이면 빈칸</td></tr>
      </tbody>
    </table>
    <p>응답의 <code>total</code>(마트 <code>total</code>)은 <code>outpatient_count</code> 와 같은 값으로 적재되며 화면에서 쓰지 않음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>건수이지 사람 수가 아님</b></td><td>재내원이 여러 번 세어짐</td><td>정의상 그럼</td></tr>
        <tr><td><b>백내장 외래 미포함</b></td><td>실제 외래보다 적음</td><td><code>FLAG='Z'</code> 는 별도</td></tr>
        <tr><td><b>진료구분 결측</b></td><td>합계에는 들어가지만 분해가 안 됨</td><td>월 40~50건. 리스트에서 확인</td></tr>
        <tr><td><b>검사자 집계와 겹침</b></td><td>외래로 와서 검사 기록이 생기는 경우</td><td><a href="../지표정의/6-외래.md">지표정의 §4-③</a></td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>백내장 외래 통합</td><td>합치면 지표 정의와 과거 확정값이 전부 바뀜</td></tr>
        <tr><td>진료구분 분해 화면</td><td>지금은 리스트에서만 볼 수 있음. 추이로 낼지</td></tr>
        <tr><td>사람 단위 지표</td><td>재내원을 접은 '외래 환자 수'가 필요한지</td></tr>
      </tbody>
    </table>
  `,
}
