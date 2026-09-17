export default {
  s2: `
    <h3>구현은 됐지만 메뉴에서 숨겨 둔 화면</h3>
    <p>예약 <b>전체</b>(검사·수술·외래·드림렌즈)의 건수와 구성을 봄.
       예약 종합이 <b>검사예약만</b> 세는 것과 달리, 이 화면은 <b>모든 예약 종류</b>를 셈.</p>

    <div class="note warn">
      <div class="h">왜 숨겼나</div>
      <p>대시보드의 예약 지표는 <b>검사예약</b>을 중심으로 정리됐음. 이 화면의 '전체 예약건수'는
         수술·외래 예약까지 더한 값이라 <b>다른 화면과 숫자가 안 맞음</b>.
         혼동을 막으려고 <code>HIDDEN_MENU_IDS</code> 로 사이드바에서 뺐고, <b>라우트는 살려 뒀음</b> —
         URL 로는 여전히 볼 수 있음.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>예약 총량</td><td>진료 종류를 가리지 않고 예약이 몇 건인지 봄</td></tr>
        <tr><td>종류별 구성</td><td>수술 · 외래 · 드림렌즈 비중을 봄</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>공통 필터 바 + 주요 지표 카드 + 여러 차트 패널. 이 대시보드에서 <b>차트 종류가 가장 다양한</b> 화면임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">월 비교</span><span>연도 추이</span></span>
        <span class="ui">2026-07 ✕</span><span class="ui">＋ 기간 추가</span>
        <span class="grow"></span>
        <span class="seg"><span class="on">전체 예약건수</span><span>수술 예약수</span><span>외래 예약수</span><span>드림렌즈 예약수</span></span>
      </div>
      <div style="padding:12px">
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px">
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">전체 예약건수</div><div style="font-size:19px;font-weight:800">4,820</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">수술</div><div style="font-size:19px;font-weight:800">812</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">외래</div><div style="font-size:19px;font-weight:800">3,540</div></div>
          <div style="border:1px solid #eaeaec;border-radius:10px;padding:10px"><div class="ph" style="font-size:11px">드림렌즈</div><div style="font-size:19px;font-weight:800">468</div></div>
        </div>
        <div style="display:flex; gap:10px; margin-top:10px">
          <div style="flex:2; border:1px solid #eaeaec;border-radius:10px;height:120px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
          <div style="flex:1; border:1px solid #eaeaec;border-radius:10px;height:120px;background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        </div>
      </div>
    </div>
    <p class="shot-cap">누적 막대 · 꺾은선 · 영역 · 파이 · 콤보를 함께 씀. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>필터 바</td><td>월 비교 / 연도 추이</td><td>공통 <code>FilterBar</code></td></tr>
        <tr><td>지표 탭</td><td>전체 · 수술 · 외래 · 드림렌즈</td><td>—</td></tr>
        <tr><td>주요 지표 카드</td><td>지표별 건수와 증감</td><td>—</td></tr>
        <tr><td>차트</td><td>누적 막대 · 꺾은선 · 영역 · 파이 · 콤보</td><td>연도별로 선 패턴이 다름</td></tr>
        <tr><td>모바일</td><td>세로 스택</td><td>768px 미만</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간/연도</td><td><b>서버</b></td><td>주요 지표 · 추이 · 구성의 세 API를 함께 호출함</td></tr>
        <tr><td>지표 탭</td><td>화면</td><td>—</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>예약 등록일</b>임.</p>
  `,

  s5: `
    <h3>세는 대상 — 다른 예약 화면과 다름</h3>
    <table>
      <thead><tr><th>지표</th><th>대상</th></tr></thead>
      <tbody>
        <tr><td>전체 예약건수</td><td>수술 + 외래 + 드림렌즈</td></tr>
        <tr><td>수술 예약수</td><td>수술 예약(<code>RESERVE_FLAG='O'</code>)</td></tr>
        <tr><td>외래 예약수</td><td>외래 예약(<code>'F'</code>)</td></tr>
        <tr><td>드림렌즈 예약수</td><td>렌즈센터 예약</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ <b>검사예약이 없음</b></div>
      <p>이 화면의 '전체'에는 <b>검사예약(<code>'M'</code>)이 들어 있지 않음</b>.
         그래서 예약 종합·<a href="reservation-list.html">예약자 리스트</a>와
         <b>겹치지도 않고 합쳐지지도 않음</b>. 이름이 '전체 예약건수'라 오해를 부르는 지점임.</p>
    </div>

    <div class="note">
      <div class="h">지표 정의</div>
      <p>예약 구분 코드표는 <a href="../지표정의/6-외래.md">지표정의/6-외래.md §5</a> 에 있음 —
         <code>M</code> 검사 · <code>O</code> 수술 · <code>F</code> 외래 · <code>H</code> 백내장검사 · <code>Z</code> 백내장외래 등.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>이름이 오해를 부름</b></td><td>'전체 예약건수'인데 검사예약이 없음</td><td>숨긴 가장 큰 이유임</td></tr>
        <tr><td><b>사이드바에 없음</b></td><td>메뉴로 못 감</td><td>URL 직접 접근은 됨</td></tr>
        <tr><td><b>다른 예약 지표와 안 맞음</b></td><td>합계가 어디와도 일치하지 않음</td><td>모집단이 다름</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>이 화면을 살릴지</b></td><td>검사예약을 포함해 진짜 '전체'로 만들면 쓸모가 생김. 아니면 삭제 대상임</td></tr>
        <tr><td>이름 교체</td><td>살린다면 '진료 예약 현황' 같은 이름이 정확함</td></tr>
        <tr><td>수술·외래 예약 지표의 자리</td><td>지금 이 둘을 보는 화면이 여기뿐임. 숨긴 채로 두면 볼 곳이 없음</td></tr>
      </tbody>
    </table>
  `,
}
