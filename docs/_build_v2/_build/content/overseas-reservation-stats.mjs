export default {
  s2: `
    <h3>레거시 구글시트를 그대로 옮긴 표</h3>
    <p>해외 예약통계는 오래 <b>구글 시트</b>로 관리됐음. 국가그룹 × 채널 × 지표가 가로로 길게 늘어선 표인데,
       그 <b>그룹·채널 구성을 그대로</b> 화면으로 옮겼음. 시트를 쓰던 사람이 그대로 읽을 수 있어야 하기 때문임.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>국가별 채널 확인</td><td>영미·중화·베트남·몽골 각각 어느 채널로 들어오는지 봄</td></tr>
        <tr><td>문의 → 예약 전환</td><td>채널마다 문의와 예약이 짝으로 붙어 있음</td></tr>
        <tr><td>수치 보정</td><td>자동 집계가 틀린 칸을 <b>화면에서 직접 고침</b></td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 이 화면은 셀을 직접 고칠 수 있음</div>
      <p>대시보드에서 <b>집계값을 사람이 덮어쓸 수 있는</b> 거의 유일한 화면임.
         해외 문의는 카톡·왓츠앱·위챗처럼 시스템에 안 남는 경로가 많아, 자동 집계만으로는 채워지지 않음.
         <b>일 행에서만</b> 고칠 수 있고 월·주 행은 합계라 잠겨 있음.</p>
    </div>
  `,

  s3: `
    <p>툴바(연도 · 월 · 보기 단위) + 가로로 매우 긴 표. 국가그룹마다 머리글 색이 다름.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026 ▾</span>
        <span class="ui">8월 ▾</span>
        <span class="seg"><span>월간</span><span>주간</span><span>주차</span><span class="on">일간</span><span>전체</span></span>
        <span class="grow ph" style="font-size:11px">2026-08-23까지 레거시 시트 숫자 · 이후는 접수리스트 자동 집계 · 일 행은 셀 클릭으로 수정</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="2">일자</th>
              <th colspan="5" style="background:#f1f5f9">총</th>
              <th colspan="4" style="background:#eff6ff">영미</th>
              <th colspan="4" style="background:#fff1f2">중화</th>
              <th>…</th>
            </tr>
            <tr>
              <th>총 문의</th><th>총 예약</th><th>총 검사</th><th>총 수술</th><th>총 외래</th>
              <th>총 문의</th><th>총 예약</th><th>홈페이지</th><th>예약</th>
              <th>총 문의</th><th>총 예약</th><th>위챗</th><th>예약</th>
              <th>…</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>8/1 (금)</td><td>12</td><td>7</td><td>5</td><td>2</td><td>3</td><td>4</td><td>2</td><td>2</td><td>1</td><td>6</td><td>4</td><td>3</td><td>2</td><td class="ph">…</td></tr>
            <tr><td>8/2 (토)</td><td>8</td><td>5</td><td>3</td><td>1</td><td>2</td><td>3</td><td>2</td><td>1</td><td>1</td><td>4</td><td>2</td><td>2</td><td>1</td><td class="ph">…</td></tr>
            <tr><td>8/3 (일)</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">국가그룹 6개(총·영미·중화·베트남·몽골·에이전시)가 색으로 갈림. 채널마다 <b>문의·예약이 짝</b>으로 붙음.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>보기 단위</td><td>월간 · 주간 · 주차 · 일간 · 전체</td><td><a href="reservation-stats-system.html">예약통계_시력교정</a>과 <b>같은 5단 구성</b></td></tr>
        <tr><td>연도 · 월</td><td>선택</td><td>주간·일간·전체는 월에 종속됨</td></tr>
        <tr><td>표</td><td>국가그룹 6 × 채널 × 지표</td><td>가로 스크롤. 그룹마다 머리글 색</td></tr>
        <tr><td>셀 수정</td><td>일 행만</td><td>클릭 → 입력 → 저장. 월·주 행은 <b>합계라 잠김</b></td></tr>
        <tr><td>안내 문구</td><td>툴바 우측</td><td>전환 시점과 수정 가능 여부를 화면이 직접 말함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">주간과 주차가 둘 다 있음</div>
      <p><b>주간</b> = 그 달의 달력 주(1~5주), <b>주차</b> = ISO 연간 주차.
         시트 시절에는 달력 주로 봤고, 다른 통계 화면은 ISO 주차를 씀.
         둘을 다 두어 <b>과거 방식과 현재 방식을 모두</b> 볼 수 있게 했음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>—</td></tr>
        <tr><td>월</td><td>화면</td><td>주간·일간·전체 보기에서만 의미가 있음</td></tr>
        <tr><td>보기 단위</td><td>화면</td><td>일별 값을 받아 <b>화면에서 묶음</b> — 재조회하지 않음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">모든 보기가 같은 일별 데이터를 묶은 것임</div>
      <p>월간·주간·주차·전체는 전부 <b>일 값의 합</b>임. 그래서 일 행을 고치면
         상위 모든 행이 함께 바뀜 — 합계를 따로 저장하지 않기 때문임.</p>
    </div>
  `,

  s5: `
    <h3>국가그룹 6개와 채널</h3>
    <table>
      <thead><tr><th>그룹</th><th>채널</th></tr></thead>
      <tbody>
        <tr><td>총</td><td>채널 없음 — 문의 · 예약 · 검사 · 수술 · 외래 합계만</td></tr>
        <tr><td>영미</td><td>홈페이지 · 이메일 · 카카오톡 · 왓츠앱 · Meta-DM · 전화 · 컨택센터 · 기타</td></tr>
        <tr><td>중화</td><td>홈/메일/전화 · 위챗 · 샤오홍슈 · 라인 · Insta/Tiktok · Creatrip · 컨택센터 · 기타</td></tr>
        <tr><td>베트남</td><td>메타 · 전화 · 기타</td></tr>
        <tr><td>몽골</td><td>페북 · 인스타 · 전화 · 기타</td></tr>
        <tr><td>에이전시</td><td>문의 · Creatrip</td></tr>
      </tbody>
    </table>
    <p>총 그룹을 뺀 5개 그룹은 각각 <b>총 문의 · 총 예약 + (채널별 문의·예약) + 검사 · 수술 · 외래</b> 구성임.
       채널 목록이 그룹마다 다른 것은 <b>시트가 그랬기 때문</b>임 — 지역마다 실제로 쓰는 메신저가 다름.</p>

    <h3>데이터 출처가 날짜로 갈림</h3>
    <table>
      <thead><tr><th>구간</th><th>출처</th><th>성격</th></tr></thead>
      <tbody>
        <tr><td><b>2026-08-23 까지</b></td><td>레거시 구글시트 숫자</td><td>이관된 고정값</td></tr>
        <tr><td>그 이후</td><td><a href="overseas-marketing-receptions.html">접수리스트</a> 자동 집계</td><td>매일 계산됨</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">전환 시점(cutover)은 서버가 알려줌</div>
      <p>날짜를 화면에 박아 두지 않고 API 응답의 <code>cutover</code> 값을 그대로 문구에 넣음.
         전환일이 바뀌어도 화면을 고칠 필요가 없음.</p>
    </div>

    <h3>수동 보정</h3>
    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>대상</td><td><b>일 행만</b>. 월·주·전체 행은 합계라 수정 불가</td></tr>
        <tr><td>저장 단위</td><td>(날짜, 그룹키, 지표키) 한 칸</td></tr>
        <tr><td>우선순위</td><td>수동 입력값이 자동 집계보다 <b>우선</b></td></tr>
      </tbody>
    </table>
    <div class="note">
      <div class="h">왜 수동 보정이 필요한가</div>
      <p>해외 문의는 <b>왓츠앱·위챗·샤오홍슈처럼 시스템에 안 남는 경로</b>가 많음.
         접수리스트에 등록되지 않은 문의는 자동 집계가 셀 수 없으므로, 담당자가 아는 값을 직접 넣음.
         자동 집계만 믿으면 문의 수가 실제보다 적게 나옴.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>구간 경계</b></td><td>2026-08-23 전후로 숫자의 성격이 다름</td><td>안내 문구를 함께 읽음. 경계를 걸친 비교는 조심</td></tr>
        <tr><td><b>수동 입력 의존</b></td><td>담당자가 안 넣으면 문의가 적게 나옴</td><td>메신저 문의를 접수리스트에 올리는 것이 근본 해결임</td></tr>
        <tr><td><b>수정 이력 없음</b></td><td>누가 언제 무엇을 고쳤는지 화면에서 모름</td><td>—</td></tr>
        <tr><td><b>표가 매우 넓음</b></td><td>가로 스크롤이 길어짐</td><td>시트 구성을 그대로 따른 결과임</td></tr>
        <tr><td><b>주간·주차 혼용</b></td><td>두 주 개념이 한 화면에 있음</td><td>의도된 것임. 어느 쪽을 보는지 늘 확인해야 함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>수정 이력·권한</td><td>표에 <code>updated_by</code>·<code>updated_at</code> 이 있어 <b>마지막으로 고친 사람과 시각은 남음</b>. 다만 <b>직전 1건만</b> 남고 화면에서 볼 수 없음 — 값이 바뀐 내력을 쌓을지, 권한을 좁힐지</td></tr>
        <tr><td>자동 집계 커버리지</td><td>메신저 문의를 어떻게 시스템에 남길지. 안 풀리면 수동 보정이 영구화됨</td></tr>
        <tr><td>채널 목록 변경</td><td>새 메신저가 뜨면 그룹마다 칼럼을 늘려야 함. 지금은 코드 수정임</td></tr>
        <tr><td><a href="overseas-marketing-statistics.html">통계</a>와의 관계</td><td>같은 해외 유입을 두 화면이 각각 셈. 문의 수가 다를 수 있고 <b>어느 쪽이 정본인지 정해지지 않았음</b></td></tr>
      </tbody>
    </table>
  `,
}
