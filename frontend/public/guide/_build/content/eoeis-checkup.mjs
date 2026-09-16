export default {
  s2: `
    <h3>누가 어떤 장비로 얼마나 검사했나</h3>
    <p>아이리더(EOEIS) 검사기록을 <b>검사자 × 장비</b> 또는 <b>검사자 × 기간</b>으로 피벗해
       건수와 <b>장비 가중 점수</b>를 봄. 이 대시보드에서 <b>직원 단위 실적</b>을 보는 유일한 화면임.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>검사 인력 배분</td><td>검사자별 부하를 봄</td></tr>
        <tr><td>장비 활용도</td><td>장비별 사용 건수를 봄</td></tr>
        <tr><td>난이도 반영 실적</td><td>건수만이 아니라 <b>장비 가중 점수</b>로 봄 — 장비마다 손이 다르게 듦</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용 · 별도 데이터소스</div>
      <p>직원 실적이라 관리자에게만 열림. 또 아이리더는 <b>CRM 과 다른 DB</b>에 있어
         <code>EOEIS_DATASOURCE_URL</code> 이 설정되지 않은 환경에서는 <b>503</b> 을 줌.</p>
    </div>

    <div class="note">
      <div class="h">2026-08-05 신설</div>
      <p>백내장 검사 개편과 함께 만들어졌음. 배경은
         <a href="../점검/인수인계_2026-08-05_백내장검사.md">인수인계 문서</a>에 있음.</p>
    </div>
  `,

  s3: `
    <p>툴바 + 피벗 표. 탭으로 <b>가로축</b>을, 토글로 <b>셀 값</b>을 바꿈.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026-08-01</span><span>~</span><span class="ui">2026-08-31</span>
        <span class="seg"><span class="on">장비별</span><span>기간별</span></span>
        <span class="seg"><span class="on">건수</span><span>가중 점수</span></span>
        <span class="ui">📅 월 ▾</span>
        <span class="grow"></span>
        <span class="ui blue">🔍 조회</span><span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr><th>검사자</th><th>Optomap</th><th>OCT</th><th>Pentacam</th><th>Topography</th><th>…</th><th>합계</th></tr></thead>
          <tbody>
            <tr style="font-weight:700"><td>검사실 A</td><td>320</td><td>280</td><td>190</td><td>240</td><td class="ph">…</td><td>1,410</td></tr>
            <tr><td class="ph">　김검안</td><td>142</td><td>121</td><td>84</td><td>103</td><td class="ph">…</td><td>612</td></tr>
            <tr><td class="ph">　박검안</td><td>118</td><td>98</td><td>66</td><td>88</td><td class="ph">…</td><td>498</td></tr>
            <tr><td class="ph">　(검사자 미지정)</td><td>60</td><td>61</td><td>40</td><td>49</td><td class="ph">…</td><td>300</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">「기간별」 탭이면 가로축이 장비 대신 <b>월·주·일</b>이 됨. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>시작일 ~ 종료일</td><td><b>2026-07-01 이전은 조회할 수 없음</b> — 원천이 그때부터임</td></tr>
        <tr><td>피벗 탭</td><td>장비별 · 기간별</td><td>가로축을 바꿈</td></tr>
        <tr><td>값 토글</td><td>건수 · 가중 점수</td><td>셀에 무엇을 넣을지</td></tr>
        <tr><td>기간 단위</td><td>월 · 주 · 일</td><td>기간별 탭에서만 씀</td></tr>
        <tr><td>표</td><td>그룹 행 + 검사자 행</td><td>정렬 · 페이지네이션</td></tr>
        <tr><td><b>장비 점수 설정</b></td><td>팝업에서 장비별 점수를 직접 입력</td><td><b>화면에만 적용됨</b> — 새로고침하면 사라짐(5장)</td></tr>
        <tr><td>CSV</td><td>현재 피벗 그대로</td><td>—</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td><code>GET /api/eoeis-checkup?from&amp;to</code>. 하한 <b>2026-07-01</b></td></tr>
        <tr><td>피벗 · 값 · 단위</td><td>화면</td><td>받은 (검사자 · 장비 · 날짜 · 건수) 행을 화면에서 묶음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">서버는 원자 행만 줌</div>
      <p>응답은 <b>(검사자, 장비, 날짜, 건수)</b> 행 목록과 <b>장비별 점수표</b> 두 가지뿐임.
         피벗·합계·가중 점수는 전부 화면이 계산함. 그래서 탭을 바꿔도 재조회하지 않음.</p>
    </div>
  `,

  s5: `
    <h3>원천</h3>
    <table>
      <thead><tr><th>테이블</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td><code>checkup_record</code></td><td>검사 기록 — 검사자명 · 장비명 · 검사 시작시각</td></tr>
        <tr><td><code>checkup_device_score</code></td><td>장비별 <b>가중 점수</b> 표 · 장비 표시명의 정본</td></tr>
      </tbody>
    </table>

    <h3>장비명 정규화 — 이 화면의 핵심 처리</h3>
    <div class="note bad">
      <div class="h">⚠️ 원천 장비명이 대소문자·공백으로 갈려 들어옴</div>
      <p><code>Optomap</code> 과 <code>optomap</code> 처럼. 그대로 <code>GROUP BY</code> 하면
         <b>한 장비가 둘로 쪼개지고</b>, 점수표에 없는 쪽은 <b>가중 점수가 1 로 떨어짐</b>.</p>
      <p>그래서 <b>소문자 + 앞뒤공백 제거</b>한 값을 키로 묶고,
         표시 이름은 <b>점수표의 이름을 정본</b>으로 씀.
         점수표에 없는 장비는 같은 키로 묶인 원천 이름 중 대표값을 씀.</p>
    </div>

    <h3>제외 규칙</h3>
    <table>
      <thead><tr><th>대상</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>검사자명</td><td><code>(kd</code> · <code>(ls</code> 를 포함하면 제외 — 테스트·시스템 계정</td></tr>
        <tr><td>검사자 미지정</td><td>빈 값은 <b>「(검사자 미지정)」</b> 으로 묶어 <b>표에 남김</b> — 지우면 합계가 안 맞음</td></tr>
        <tr><td>장비 미상</td><td>빈 값은 <b>「(미상)」</b></td></tr>
      </tbody>
    </table>

    <h3>가중 점수</h3>
    <p><b>건수 × 장비 점수</b>. 장비마다 검사에 드는 손이 달라 건수만으로는 부하를 못 읽음.
       점수는 <code>checkup_device_score</code> 에 있고, <b>점수표에 없는 장비는 1 로 계산</b>됨 —
       그래서 장비명 정규화가 실패하면 점수가 조용히 낮아짐.</p>

    <div class="note warn">
      <div class="h">점수를 화면에서 덮어쓸 수 있음 — 저장되지 않음</div>
      <p>툴바의 설정 팝업에서 장비별 점수를 직접 넣어 <b>그 자리에서 다시 계산</b>해 볼 수 있음.
         다만 이 값은 <b>화면 상태로만 남고 새로고침하면 사라짐</b> — 서버에도, 다른 사용자에게도 반영되지 않음.
         "장비 점수를 화면에 적용했습니다. 새로고침하면 초기화됩니다."라는 안내가 그래서 뜸.
         <b>가정을 바꿔 보는 용도</b>이지 점수를 고치는 기능이 아님 — 정본은 <code>checkup_device_score</code> 임.</p>
    </div>

    <div class="note warn">
      <div class="h">2026-07-01 이전은 없음</div>
      <p>아이리더 원천이 그때부터라 하한이 걸려 있음. 그 이전 기간을 넣어도 데이터가 없음.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>별도 데이터소스</b></td><td>미설정 환경에서 503</td><td><code>EOEIS_DATASOURCE_URL</code> 이 필요함</td></tr>
        <tr><td><b>2026-07 이전 없음</b></td><td>과거 비교 불가</td><td>원천이 없음</td></tr>
        <tr><td><b>장비명 표기 흔들림</b></td><td>정규화가 실패하면 장비가 쪼개지고 점수가 1 로 떨어짐</td><td>점수표에 새 장비를 등록해야 함</td></tr>
        <tr><td><b>검사자 미지정</b></td><td>실명이 아닌 행이 섞임</td><td>합계 정합을 위해 남겨 둔 것임</td></tr>
        <tr><td><b>CRM 과 연결 안 됨</b></td><td>어느 환자의 검사인지 모름</td><td>검사자·장비 단위 집계 전용임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>가중 점수 산정</td><td>장비별 점수를 누가 어떻게 정하는지 규칙이 문서화되지 않았음</td></tr>
        <tr><td>점수 덮어쓰기의 자리</td><td>지금은 화면에만 적용되고 사라짐. 실제로 점수를 고치려면 <code>checkup_device_score</code> 를 직접 손대야 함 — 관리 화면이 필요한지</td></tr>
        <tr><td>새 장비 등록 절차</td><td>점수표에 없으면 점수 1 로 조용히 계산됨 — 경고가 없음</td></tr>
        <tr><td>검사자 마스터</td><td>이름 문자열이라 동명이인·표기 변경에 취약함. 사번 연결이 필요한지</td></tr>
        <tr><td>인사 평가 활용</td><td>직원 실적 지표라 <b>어디까지 쓸지</b>가 업무 판단임</td></tr>
      </tbody>
    </table>
  `,
}
