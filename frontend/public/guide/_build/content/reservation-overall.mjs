export default {
  s2: `
    <h3>예약이 얼마나 들어왔는가, 한 장으로</h3>
    <p>검사예약 건수를 <b>콜과 온라인으로 합산</b>해 월별 추이로 봄.
       예약 지표 중 가장 위에 있는 숫자이고, 아래로 <a href="reservation-stats-system.html">예약통계_시력교정</a>·
       <a href="reservation-stats-cataract.html">예약통계_백내장</a>이 채널·주차로 분해함.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>전년 대비 확인</td><td>3개년이 겹쳐 있어 같은 달을 바로 비교함</td></tr>
        <tr><td>채널 비중 확인</td><td>탭을 바꿔 종합 · 온라인 · 콜을 오감</td></tr>
        <tr><td>명단 확인</td><td>숫자가 이상하면 <a href="reservation-list.html">예약자 리스트</a>로 내려감 — <b>합계가 같음</b></td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">예약자 리스트와 짝임</div>
      <p>이 화면의 월 값과 예약자 리스트의 그 달 행 수가 <b>같아야 함</b>. 둘 다 카카오를 빼고 셈.</p>
    </div>
  `,

  s3: `
    <p>필터 바 + 탭 3개 + 꺾은선 하나. 탭을 바꾸면 같은 자리에서 계열만 갈림.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
        <span class="grow"></span>
        <span class="seg"><span class="on">예약 종합</span><span>온라인 예약</span><span>콜 예약</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">예약 종합 (콜, 온라인)</div>
        <div class="ph" style="font-size:11.5px; margin-top:3px">검사예약을 콜(CTI·TM·재상담)과 온라인(홈페이지/앱·네이버·카카오톡)으로 합산한 종합 건수입니다.</div>
        <div style="border:1px solid #eaeaec; border-radius:10px; height:150px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        <div style="display:flex; gap:14px; margin-top:8px; font-size:11.5px">
          <span><span style="display:inline-block;width:18px;height:2px;background:#E11D2E;vertical-align:middle"></span> 2026</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#4B5563;vertical-align:middle"></span> 2025</span>
          <span><span style="display:inline-block;width:18px;height:2px;background:#A8CEDF;vertical-align:middle"></span> 2024</span>
        </div>
      </div>
    </div>
    <p class="shot-cap">색이 <b>최신 연도부터</b> 빨강 → 회색 → 하늘색 순으로 붙음. 연도가 바뀌어도 "가장 최근이 빨강"이 유지됨.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년(전전년·전년·당해)</td><td>여러 해를 겹쳐 그림</td></tr>
        <tr><td>탭</td><td>예약 종합 · 온라인 예약 · 콜 예약</td><td>같은 데이터의 <b>다른 필드</b>를 그림 — 재조회하지 않음</td></tr>
        <tr><td>제목·설명</td><td>탭마다 바뀜</td><td>데이터 성격의 경고를 <b>화면에서 직접</b> 읽게 함</td></tr>
        <tr><td>차트</td><td>월별 꺾은선</td><td>없는 값은 선을 끊음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">설명문이 화면에 붙어 있음</div>
      <p>"2024·2025 는 확정값, 2026 은 운영 DB 추정치" 같은 <b>데이터 성격 경고를 차트 바로 아래</b>에 둠.
         이 화면은 숫자의 신뢰 구간이 연도마다 다르기 때문에, 문서가 아니라 화면에서 알려야 함.</p>
    </div>
  `,

  s4: `
    <h3>조회 조건은 연도뿐</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>기본 3개년. <code>GET /api/stats/reservation-overall/monthly?years=…</code></td></tr>
        <tr><td>탭</td><td>화면</td><td>같은 응답의 <code>reservations</code> / <code>online</code> / <code>call</code> 필드를 골라 그림</td></tr>
      </tbody>
    </table>
    <p>기간 선택기가 없음 — 항상 <b>1~12월 전체</b>를 그림.</p>

    <div class="note">
      <div class="h">기준 날짜는 등록일</div>
      <p><a href="reservation-list.html">예약자 리스트</a>와 같이 <b>예약을 잡은 날</b>(<code>InsertedDateTime</code>) 기준임.
         검사일이 아님.</p>
    </div>
  `,

  s5: `
    <h3>탭 3종</h3>
    <table>
      <thead><tr><th>탭</th><th>포함 채널</th><th><code>RESERVE_PATH</code></th></tr></thead>
      <tbody>
        <tr><td>예약 종합</td><td>콜 + 온라인</td><td>CTI · CRM · ONLINE · APP · NAVER</td></tr>
        <tr><td>온라인 예약</td><td>홈페이지/앱 + 네이버</td><td>ONLINE · APP · NAVER</td></tr>
        <tr><td>콜 예약</td><td>인콜 + 아웃콜</td><td>CTI · CRM</td></tr>
      </tbody>
    </table>
    <p>종합 = 온라인 + 콜 임. 세 탭의 값이 이 관계를 만족해야 함.</p>

    <div class="note bad">
      <div class="h">⚠️ 카카오는 거의 안 잡힘</div>
      <p>카카오톡 예약은 <b>해피톡 채널</b>이라 <code>RESERVATION</code> 에 거의 남지 않음.
         탭 설명에는 "카카오톡"이 적혀 있지만 실제 값은 사실상 0 임.
         <a href="reservation-list.html">예약자 리스트</a>도 같은 이유로 카카오를 명단에서 뺌 — 그래서 두 화면 합계가 맞음.</p>
    </div>

    <h3>연도별로 숫자의 성격이 다름</h3>
    <table>
      <thead><tr><th>연도</th><th>출처</th><th>신뢰도</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>레거시 BCRM <b>문의통계 확정값</b></td><td>확정 — 변하지 않음</td></tr>
        <tr><td>2026 ~</td><td>운영 DB <b>추정치</b>(검사예약 전체)</td><td><b>당월까지만</b> 신뢰할 수 있음</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">'추정치'인 이유</div>
      <p>레거시 문의통계는 사람이 채널을 판단해 집계한 숫자였고, 2026 부터는 <code>RESERVE_PATH</code> 코드로 자동 분류함.
         분류 기준이 완전히 같지 않아 <b>연도 경계에서 단차</b>가 생길 수 있음.
         2025 → 2026 의 변화를 읽을 때는 이 점을 감안해야 함.</p>
    </div>

    <h3>색 규칙</h3>
    <p>최신 연도부터 <b>빨강(#E11D2E) → 회색(#4B5563) → 하늘색(#A8CEDF) → 주황(#F59E0B)</b> 순으로 붙음.
       연도를 몇 개 고르든 <b>가장 최근이 항상 빨강</b>이라, 해가 바뀌어도 읽는 법이 그대로임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>연도 경계 단차</b></td><td>2025 → 2026 에서 수준이 달라 보일 수 있음</td><td>집계 주체가 사람 → 코드로 바뀌었음. 추세 판단 시 감안</td></tr>
        <tr><td><b>카카오 누락</b></td><td>온라인에 카카오가 사실상 없음</td><td>해피톡 원천을 마트로 끌어와야 풀림</td></tr>
        <tr><td><b>진행 중인 달</b></td><td>마지막 점이 낮음</td><td>부분값임</td></tr>
        <tr><td><b>2024·2025 는 고정</b></td><td>정의를 바꿔도 과거 값은 안 변함</td><td>확정값이라 그럼. 새 정의로 과거를 다시 세면 레거시와 어긋남</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 예약은 안 들어옴</td><td>매일 03시 배치 이후</td></tr>
      </tbody>
    </table>

    <h3>지켜야 할 불변식</h3>
    <div class="note">
      <ul>
        <li>예약 종합 = 온라인 + 콜</li>
        <li>예약 종합 월 값 = <a href="reservation-list.html">예약자 리스트</a> 그 달 행 수 (둘 다 카카오 제외)</li>
        <li>예약 종합 = <a href="monthly-report.html">월간 레포트</a> 「예약 종합」 도표</li>
      </ul>
    </div>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>카카오 편입</td><td>해피톡을 마트로 가져오면 채널 비중이 바뀌고 <b>과거와의 비교선이 끊김</b></td></tr>
        <tr><td>'추정치' 표기</td><td>언제까지 추정치라고 부를지. 레거시 대조가 끝나면 확정으로 올릴 수 있음</td></tr>
        <tr><td>탭 설명문의 위치</td><td>화면에 박아 두면 정의 변경 때 코드를 고쳐야 함. 지표 문서로 뺄지</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../지표정의/1-예약.md">지표정의/1-예약.md</a>(콜·온라인 채널 구조, 등록일 기준) ·
       <a href="../db/예약통계_백내장-데이터소스-분석.md">예약통계_백내장 데이터소스 분석 §6.2</a>(채널 합산 공식·네이버 과다 원인).</p>
  `,
}
