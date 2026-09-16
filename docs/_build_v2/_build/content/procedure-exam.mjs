export default {
  s2: `
    <h3>전체 검사수와 원데이 검사</h3>
    <p>시력교정 · 드림렌즈 · 백내장을 <b>합산한 전체 검사수</b>와, 그중 <b>원데이 검사</b>를 탭으로 나눠 봄.</p>

    <div class="note bad">
      <div class="h">⚠️ 「시술별」과 이름이 반대로 읽힘</div>
      <p>「검사건수」(이 화면 · <code>procedure-exam</code>) = <b>전체 검사수 합계</b><br />
         「시술별」(<a href="examination.html">examination</a>) = <b>시술 종류별 검사 건수</b><br />
         라우트 id 와 라벨이 어긋난 채 굳었음.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>총 검사 규모</td><td>월별 전체 검사수 추이</td></tr>
        <tr><td>원데이 비중</td><td>당일 수술로 이어지는 검사가 얼마나 되는지 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간 레포트의 「검사수」·「원데이 검사」와 같은 값임</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>필터 바 + 탭 2개 + 월별 꺾은선. <a href="examination.html">시술별</a>과 같은 골격임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
        <span class="grow"></span>
        <span class="seg"><span class="on">검사수</span><span>원데이 검사</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">검사수</div>
        <div class="ph" style="font-size:11.5px; margin-top:2px">시력교정·드림렌즈 검사(EXAM)와 백내장 검사(Cataract_Exam) 건수를 합산한 전체 검사 건수입니다.</div>
        <div style="border:1px solid #eaeaec;border-radius:10px;height:140px;margin-top:10px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
      </div>
    </div>
    <p class="shot-cap">탭마다 설명문이 바뀜 — 정의를 화면에서 직접 읽게 함.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년</td><td>—</td></tr>
        <tr><td>탭</td><td>검사수 · 원데이 검사</td><td>같은 응답의 다른 필드</td></tr>
        <tr><td>설명문</td><td>탭마다</td><td>모집단 정의와 연도별 성격을 적어 둠</td></tr>
        <tr><td>차트</td><td>월별 꺾은선</td><td>미래 월은 비움</td></tr>
      </tbody>
    </table>
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
    <h3>검사수</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>정의</td><td><code>EXAM</code>(시력교정 · 드림렌즈) + <code>Cataract_Exam</code>(백내장) 건수의 <b>합</b></td></tr>
        <tr><td>2024 · 2025</td><td>확정값</td></tr>
        <tr><td>2026 ~</td><td>운영 DB 집계</td></tr>
      </tbody>
    </table>
    <p>모집단은 <code>sql/fragments/exam-session-source.sql</code> 을 공유해
       <a href="exam-list.html">검사자 리스트</a>·<a href="overall-exam.html">종합지표</a>와 정합함.</p>

    <h3>원데이 검사</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>정의</td><td><code>EXAM</code> 기준 <b>같은 날 검사OP(M/5)로 내원한 검사</b> 중 <b>중단·취소 제외</b></td></tr>
        <tr><td>대상</td><td>시력교정만 — 백내장 원데이는 진료구분(C_원데이·C_노안원데이)으로 따로 판정함</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">원데이 판정이 화면마다 다름</div>
      <p>이 화면(시력교정 기준) · <a href="all-exam-list.html">전체 검사자 리스트</a>(시력교정·백내장·드림렌즈 각각) ·
         레거시(최신 예약 기준). <b>같은 '원데이'가 세 벌</b>이므로 숫자를 비교할 때 어느 정의인지 먼저 봄.</p>
    </div>

    <div class="note">
      <div class="h">지표 정의</div>
      <p><a href="../지표정의/2-검사.md">지표정의/2-검사.md</a> 가 정본임 — 원데이/일반 구분이 거기 있음.
         레거시 대조 기록은 <a href="../점검/원데이-레거시-비교_2026-07.md">점검/원데이-레거시-비교_2026-07.md</a>.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>원데이 정의가 여럿</b></td><td>다른 화면·레거시와 숫자가 다름</td><td>정의를 먼저 확인. 레거시 비교 기록이 있음</td></tr>
        <tr><td><b>메뉴 이름 혼동</b></td><td>「시술별」과 반대로 읽힘</td><td>미결</td></tr>
        <tr><td><b>2024·2025 고정</b></td><td>정의를 바꿔도 안 변함</td><td>확정값임</td></tr>
        <tr><td><b>진행 중인 달</b></td><td>마지막 점이 낮음</td><td>부분값</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>원데이 정의 통일</td><td>세 벌을 하나로 맞출지. 맞추면 과거 확정값과 어긋남</td></tr>
        <tr><td>메뉴 이름</td><td><a href="examination.html">시술별</a>과 함께 정리해야 함</td></tr>
        <tr><td>백내장 원데이</td><td>이 화면의 원데이는 시력교정만임. 합칠지</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/원데이-레거시-비교_2026-07.md">원데이 레거시 비교</a> — 반영 결과까지 정리돼 있음.</p>
  `,
}
