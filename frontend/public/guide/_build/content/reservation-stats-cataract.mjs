export default {
  s2: `
    <h3>백내장판 예약 종합표</h3>
    <p><a href="reservation-stats-system.html">예약통계_시력교정</a>과 같은 골격이지만
       <b>채널 구성과 칼럼이 다름</b>. 백내장(노안 포함) 검사예약을
       인바운드(컨택센터) · 아웃바운드(TM) · 채팅 · 온라인 · 취소로 나눔.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>백내장 유입 확인</td><td>백내장·노안을 갈라 보고 합계로도 봄</td></tr>
        <tr><td>컨택센터 성과</td><td>응대율 · 재문의 비율 · <b>신환</b> 수를 봄</td></tr>
        <tr><td>TM 성과</td><td>총 DB / 유효 DB 두 기준의 예약율</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">시력교정판과 무엇이 다른가</div>
      <p>시력교정은 <b>신규문의</b> 중심이고, 백내장은 <b>신환·재문의</b> 중심임.
         백내장은 재문의가 많아(고령 환자가 여러 번 상담) 그 비율 자체가 지표가 됨.
         또 백내장에는 <b>온라인 부도수</b> 칸이 있음.</p>
    </div>
  `,

  s3: `
    <p>시력교정판과 같은 툴바·3단 머리글 표. 그룹 6개.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span><span>~</span><span class="ui">📅 2026-07 ▾</span>
        <span class="seg"><span class="on">월별</span><span>주별</span><span>주차</span><span>일별</span><span>전체</span></span>
        <span class="grow"></span>
        <span class="ui">🔍 진단</span><span class="ui">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="3">구분</th>
              <th colspan="3" style="background:#f1f5f9">총예약</th>
              <th colspan="5" style="background:#eff6ff">인바운드(컨택센터)</th>
              <th colspan="3" style="background:#eef2ff">아웃바운드(TM)</th>
              <th colspan="2" style="background:#f0fdfa">온라인예약</th>
            </tr>
            <tr>
              <th style="background:#f1f5f9">백내장</th><th style="background:#f1f5f9">노안</th><th style="background:#f1f5f9">합계</th>
              <th style="background:#eff6ff">총 인입콜</th><th style="background:#eff6ff">응대콜</th><th style="background:#eff6ff">응대율</th>
              <th style="background:#eff6ff">신규 재문의</th><th style="background:#eff6ff">★신환</th>
              <th style="background:#eef2ff">총 DB</th><th style="background:#eef2ff">유효 DB</th><th style="background:#eef2ff">예약수</th>
              <th style="background:#f0fdfa">예약수</th><th style="background:#f0fdfa">부도수</th>
            </tr>
            <tr><th colspan="13" style="background:#fafafa; font-weight:400; font-size:10px; color:#9aa0a6">… 실제로는 25칼럼</th></tr>
          </thead>
          <tbody>
            <tr><td>2026-07</td><td>57</td><td>45</td><td><b>102</b></td><td>412</td><td>388</td><td style="color:#dc2626">94.2%</td><td>96</td><td><b>62</b></td><td>310</td><td>188</td><td>44</td><td>18</td><td>2</td></tr>
            <tr><td class="ph">　1주</td><td>14</td><td>11</td><td>25</td><td>102</td><td>96</td><td style="color:#dc2626">94.1%</td><td>24</td><td>15</td><td>76</td><td>46</td><td>11</td><td>4</td><td class="ph">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">★신환이 이 표의 주요 지표임. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <p>툴바 · 단위 5종 · 3단 머리글 · 셀 편집 · 진단 모달 · CSV —
       <a href="reservation-stats-system.html">시력교정판 3장</a>과 <b>같은 규격</b>임.
       다른 것은 칼럼 구성뿐임.</p>

    <div class="note">
      <div class="h">편집 가능 조건이 더 좁음</div>
      <p>일(day) 행이면서 <b>확정 스냅샷</b>이고 <b>데이터가 있는 날</b>(미음영)일 때만 고칠 수 있음.
         라이브 조회 상태에서는 저장 대상이 없어 편집이 열리지 않음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간(월 범위)</td><td><b>서버</b></td><td>—</td></tr>
        <tr><td>단위</td><td>화면</td><td>월별 · 주별 · 주차 · 일별 · 전체</td></tr>
        <tr><td>편집</td><td>—</td><td>일 행 + <b>확정 스냅샷 또는 마트(D-1 배치)</b> + 단일 월</td></tr>
        <tr><td>진단</td><td>—</td><td><b>단일 월</b>. 스냅샷이 없으면 진단 자체가 불가함</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">시드 폴백이 없음</div>
      <p>운영 데이터(확정 스냅샷·라이브)가 없으면 <b>가짜 값을 채우지 않고 안내만</b> 띄움.
         빈 표를 보여주는 편이 틀린 숫자를 보여주는 것보다 낫다는 판단임.</p>
    </div>
  `,

  s5: `
    <h3>25칼럼 · 6그룹</h3>
    <table>
      <thead><tr><th>그룹</th><th>칼럼</th></tr></thead>
      <tbody>
        <tr><td>총예약</td><td>백내장 · 노안 · <b>합계</b></td></tr>
        <tr><td>인바운드(컨택센터)</td><td>총 인입콜 · 응대콜 · <b>응대율</b> · 총 신규검사문의 · 신규 재문의 · <b>재문의 비율</b> · <b>★신환</b> · <b>예약율</b></td></tr>
        <tr><td>아웃바운드(TM)</td><td>총 DB · 유효 DB · 예약수 · <b>총 DB 예약율</b> · <b>유효 DB 예약율</b> · <b>아웃바운드 총 예약수</b></td></tr>
        <tr><td>채팅(카카오톡)</td><td>총문의(모든) · <b>백내장 검사예약</b> · 노안 검사예약</td></tr>
        <tr><td>온라인예약</td><td>예약수 · <b>부도수</b></td></tr>
        <tr><td>취소</td><td>온라인 · 컨택센터 현장(CRM) · 카톡</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">백내장과 노안을 나눠 세고 합계도 냄</div>
      <p>노안(백내장 계열의 노안 교정)은 별개 수요라 따로 봄.
         다만 <b>합계가 이 표의 총예약</b>이고, 다른 화면에서 "백내장"이라 하면
         보통 이 합계를 뜻함 — 어느 쪽인지 확인해야 함.</p>
    </div>

    <div class="note warn">
      <div class="h">★신환이 별표를 단 이유</div>
      <p>백내장은 재문의가 많아 <b>문의 수만으로는 신규 수요를 못 읽음</b>.
         신환이 실제 유입 규모에 가장 가까운 값이라 표에서 강조함.</p>
    </div>

    <div class="note">
      <div class="h">채팅의 '총문의(모든)'</div>
      <p>카카오톡 문의 전체 수임 — <b>백내장이 아닌 문의도 포함</b>함.
         그 아래 백내장·노안 검사예약이 실제 성과임. 총문의를 분모로 쓸 때 주의함.</p>
    </div>

    <h3>데이터 소스</h3>
    <p>정의와 소스 분석은 <a href="../db/예약통계_백내장-데이터소스-분석.md">db/예약통계_백내장-데이터소스-분석.md</a> 가 정본임.
       <b>§6.2 에 채널 합산 공식과 네이버 과다 원인</b>이 정리돼 있음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>스냅샷 전용에 가까움</b></td><td>스냅샷이 없으면 편집·진단이 막힘</td><td>운영 데이터가 있어야 쓸 수 있는 화면임</td></tr>
        <tr><td><b>수기 입력 의존</b></td><td>콜·TM·카톡 값이 시스템 밖임</td><td>시력교정판과 같은 문제</td></tr>
        <tr><td><b>백내장/노안 경계</b></td><td>다른 화면의 '백내장'과 범위가 다를 수 있음</td><td>합계인지 백내장만인지 확인</td></tr>
        <tr><td><b>표가 넓음</b></td><td>가로 스크롤</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>승인·마감 절차</td><td>시력교정판과 같은 쟁점임</td></tr>
        <tr><td>노안 분리 기준</td><td>어디까지를 노안으로 볼지가 원천 코드에 의존함. <a href="all-exam-list.html">전체 검사자 리스트</a>의 '노안/FU' 분류와도 맞물림</td></tr>
        <tr><td>두 예약통계의 통합</td><td>시력교정판과 칼럼이 달라 한 화면으로 못 합침. 그대로 둘지</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../db/예약통계_백내장-데이터소스-분석.md">예약통계_백내장 데이터소스 분석</a> —
       숫자가 안 맞을 때 먼저 볼 문서임.</p>
  `,
}
