export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>레거시 CRM 의 <b>「검사자 리스트(상담사별)」</b> 화면을 그대로 옮겨 온 것임.
       상담사·상담의·검안사가 붙은 <b>검사 원장</b>이라, 숫자를 보는 화면이 아니라 <b>사람을 찾는 화면</b>임.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>상담 후속</td><td>검사만 받고 수술로 안 간 사람을 추려 연락함 — 그래서 연락처가 화면에 있음</td></tr>
        <tr><td>검사 중단 확인</td><td>중단(Y)·취소사유·취소메모로 왜 멈췄는지 봄</td></tr>
        <tr><td>수치 대조</td><td>월별 검사자 종합지표·검사수와 명단 건수를 맞춤</td></tr>
        <tr><td>견적·수납 확인</td><td>견적가·수술가율·수납금액이 한 행에 있어 상담 결과를 되짚음</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용 — 이 화면은 개인정보 덩어리임</div>
      <p>주민번호 · 휴대전화 · 집전화 · 이메일 · 주소가 <b>한 표에 다 있음</b>.
         대시보드에서 이만큼의 식별정보를 한 번에 펴는 화면은 이것과 백내장 검사자 리스트뿐임.
         그래서 사이드바에서도 ADMIN 에게만 보이고, ADMIN 이 아니면 직접 URL 로 들어와도 placeholder 가 뜸.</p>
    </div>

    <div class="note warn">
      <div class="h">이름이 오해를 부름</div>
      <p>여기서 「검사자」는 <b>검사를 받은 고객</b>이지 검사를 <b>배정받은 직원</b>이 아님.
         레거시의 <code>uASSIGN1</code> 검사배정현황과 다른 화면임.</p>
    </div>
  `,

  s3: `
    <p>필터 바 한 줄 + 표. 컬럼이 51개라 가로 스크롤이 기본이고, 머리글과 좌측은 따라다니지 않음 — 넓게 펴서 보는 화면임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">일별</span><span>월별</span></span>
        <span class="ui">2026-08-01</span><span>~</span><span class="ui">2026-08-31</span>
        <span class="seg"><span>1주</span><span>2주</span><span>3주</span><span>4주</span><span>월별</span></span>
        <span class="ui">검사분류 전체 ▾</span>
        <span class="ui">검사구분 전체 ▾</span>
        <span class="ui grow ph">고객명 · 차트번호 · 휴대전화</span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>검사일</th><th>검사분류</th><th>신/구환</th><th>진료구분</th><th>검사시간</th>
            <th>차트번호</th><th>고객명</th><th>등급</th><th>만나이</th><th>휴대전화</th>
            <th>상담사</th><th>상담의</th><th>적절수술R</th><th>수술일</th><th>견적가</th><th>수납금액</th>
            <th>검사중단</th><th>취소사유</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-08-03</td><td><span class="pill g-icl">시력교정</span></td>
              <td><span class="pill g-smile">신환</span></td><td>시력교정</td><td>10:30</td>
              <td>2231045</td><td class="link">김○○</td><td><span class="pill g-lasik">A</span></td><td>28</td>
              <td class="link">010-****-1234</td><td>이상담</td><td>박원장</td><td>스마일프로</td>
              <td>2026-08-10</td><td>2,900,000</td><td>2,900,000</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td>2026-08-03</td><td><span class="pill g-lasek">드림렌즈</span></td>
              <td><span class="pill st-wait">구환</span></td><td>렌즈센터</td><td>14:00</td>
              <td>2198220</td><td class="link">최○○</td><td><span class="pill st-wait">C</span></td><td>11</td>
              <td class="link">010-****-5678</td><td>정상담</td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td>2026-08-04</td><td><span class="pill g-icl">시력교정</span></td>
              <td><span class="pill g-smile">신환</span></td><td>시력교정</td><td>11:15</td>
              <td>2234677</td><td class="link">박○○</td><td><span class="pill st-wait">B</span></td><td>34</td>
              <td class="link">010-****-9012</td><td>한상담</td><td>박원장</td><td>라섹</td>
              <td class="ph">—</td><td>1,800,000</td><td class="ph">—</td>
              <td class="invalid">Y</td><td>고민중</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="shot-bar">
        <span><b>1,047건</b> · 1-50</span>
        <span class="grow"></span>
        <span class="ui">이전</span><span class="ui dark">1</span><span class="ui">2</span><span class="ui">3</span><span>…</span><span class="ui">21</span><span class="ui">다음</span>
        <span>행 수</span><span class="ui">50건 ▾</span>
      </div>
    </div>
    <p class="shot-cap">51컬럼 중 앞부분만 그렸음. 「…」 뒤로 내원동기 3단 · 직업 · 국적 · 보험사 · 주민번호 · 주소 · 메모가 이어짐.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간 모드</td><td>일별 · 월별 토글</td><td>월별을 고르면 조회 시 <b>월 1일~말일로 자동 확장</b>됨</td></tr>
        <tr><td>기간</td><td>시작일 ~ 종료일</td><td>서버 조회 조건. 기본값은 <b>이번 달 1일~말일</b></td></tr>
        <tr><td>빠른 기간</td><td>1주 · 2주 · 3주 · 4주 · 월별</td><td><b>일별 모드에서만</b> 나타남. 4주는 말일까지 늘어남</td></tr>
        <tr><td>검사분류</td><td>전체 · 시력교정 · 드림렌즈</td><td>화면에서 거름</td></tr>
        <tr><td>검사구분</td><td>조회 결과에 <b>실제로 있는 값만</b></td><td>그 기간에 없는 구분까지 늘어놓지 않음</td></tr>
        <tr><td>검색어</td><td>고객명 · 차트번호 · <b>휴대전화</b></td><td>조회된 행 안에서 찾음. [조회]를 눌러야 적용</td></tr>
        <tr><td>표</td><td>51컬럼 · 머리글 클릭 정렬</td><td>빈 값은 <b>정렬 방향과 무관하게 항상 뒤로</b> 밂</td></tr>
        <tr><td>페이지네이션</td><td>번호 + 생략(…) · 행 수 25·50·100·200</td><td>7페이지를 넘으면 앞뒤와 현재 주변만 보임</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">화면은 원문, CSV 는 마스킹</div>
      <p>직원이 환자를 식별하고 연락해야 하므로 <b>화면은 레거시와 같이 원문</b>을 보여줌.
         반면 CSV 는 이름 · 주민번호 · 전화를 <b>가려서</b> 내보냄 — 파일은 PC 에 남고 메신저로 옮겨 다님.</p>
    </div>
  `,

  s4: `
    <h3>서버가 받는 것은 기간뿐</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서 거르나</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간(from ~ to)</td><td><b>서버</b></td><td>월별 모드면 월 1일~말일로 확장해 보냄. 최대 <b>366일</b></td></tr>
        <tr><td>검사분류</td><td>화면</td><td><code>examCategory</code> 일치 (시력교정 · 드림렌즈)</td></tr>
        <tr><td>검사구분</td><td>화면</td><td>코드가 아니라 <b>라벨</b>로 비교함(아래 표)</td></tr>
        <tr><td>고객명 · 차트번호 · 휴대전화</td><td>화면</td><td>부분일치. 이름만 소문자 변환</td></tr>
      </tbody>
    </table>
    <p>처음 들어오면 조회하지 않음 — <b>[조회]를 눌러야</b> 첫 요청이 나감.
       필터를 바꿔도 [조회] 전까지는 표가 그대로임(초안 상태와 조회 상태를 나눠 둠).</p>

    <h3>검사구분 코드</h3>
    <table>
      <thead><tr><th>코드</th><th>라벨</th><th>코드</th><th>라벨</th></tr></thead>
      <tbody>
        <tr><td>(빈값)</td><td>검사</td><td><code>5</code></td><td>검사OP</td></tr>
        <tr><td><code>2</code></td><td>재검사</td><td><code>6</code></td><td>당일재검사</td></tr>
        <tr><td><code>4</code></td><td>DNA검사</td><td><code>7</code></td><td>검사OP(Re)</td></tr>
      </tbody>
    </table>

    <h3>기준 날짜는 검사일임</h3>
    <div class="note">
      <div class="h"><code>EXAM.EXAM_DATE</code></div>
      <p>예약자 리스트가 <b>등록일</b> 기준인 것과 다름. 8월에 예약을 잡고 9월에 검사를 받으면
         예약자 리스트는 8월, 이 화면은 <b>9월</b>에 나옴. 두 화면의 건수를 직접 비교하면 안 되는 이유임.</p>
    </div>
  `,

  s5: `
    <div class="note">
      <div class="h">컬럼 정의의 정본은 따로 있음</div>
      <p>51컬럼의 화면 라벨 ↔ API 필드 ↔ 원본 엑셀 열 번호 대응표, 실행 SQL 전문, 검사정보1~30 취급은
         <a href="../db/검사자리스트-컬럼정의.md">db/검사자리스트-컬럼정의.md</a> 가 정본임.
         여기서는 <b>그 문서가 답하지 않는 것</b> — 모집단을 어떻게 자르고 파생값을 어떻게 만드는지 — 만 적음.</p>
    </div>

    <h3>모집단 — 무엇이 한 행이 되는가</h3>
    <p>행 1개 = 기간 내 <code>EXAM</code> 의 검사 1건. 주 원천은 <code>EXAM</code> + <code>CUSTOM</code> 이고
       수술·직원 정보는 <code>OPERATIONDATA</code> · <code>EMPLOYEE</code> 를 붙임.</p>
    <table>
      <thead><tr><th>규칙</th><th>내용</th><th>왜</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><code>EXAM.EXAM_DATE</code> 가 조회 범위 안</td><td>—</td></tr>
        <tr><td>상담사 제한</td><td>없음 — 전체 조회</td><td>레거시는 상담사별로 갈라 보지만 여기선 한 표에 다 폄</td></tr>
        <tr><td>테스트 제외</td><td>고객명에 <code>테스트</code>·<code>test</code>·<code>TEST</code></td><td>검사메모·예약번호의 <code>test</code> 는 <b>제외 기준으로 쓰지 않음</b> — "장용테스트"·"모노비전TEST" 같은 정상 임상 메모가 오탐됨</td></tr>
        <tr><td><b>백내장 그림자 행 제외</b></td><td>같은 고객·검사일에 <code>Cataract_Exam</code> 본행이 있고, <code>EXAM</code> 의 측정값(<code>RIGHT01~30</code>·<code>LEFT01~30</code>)이 전부 공백이면 뺌</td><td>백내장 검사가 <code>EXAM</code> 에 껍데기 행을 남김. 그대로 두면 시력교정 검사자가 부풀어 오름</td></tr>
      </tbody>
    </table>

    <h3>파생값 3종 — 원천에 없는 값</h3>
    <table>
      <thead><tr><th>컬럼</th><th>만드는 규칙</th></tr></thead>
      <tbody>
        <tr>
          <td>검사분류</td>
          <td>같은 검사일에 렌즈센터 예약(<code>D</code>)만 있고 검사예약(<code>M</code>)이 없으면 <b>드림렌즈</b>, 그 외 <b>시력교정</b></td>
        </tr>
        <tr>
          <td>신/구환</td>
          <td><code>CUSTOM.FIRST_DAY</code>(최초 내원일)가 <b>조회 기간 안</b>이면 신환. 조회 기간이 바뀌면 같은 사람이 신환↔구환으로 뒤집힘</td>
        </tr>
        <tr>
          <td>만나이</td>
          <td>API 가 아니라 <b>화면이 생년월일에서 계산</b>함. 그래서 CSV 를 나중에 열어도 그때의 나이가 아니라 <b>내려받은 날 기준</b>임</td>
        </tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">진료구분·예약 부가정보는 '같은 날 예약'에서 가져옴</div>
      <p>검사일과 <b>같은 날짜</b>의 검사예약(<code>RESERVE_FLAG='M'</code>, <code>RESERVE_STATE IN ('I','H')</code>)을 붙임.
         예약 없이 내원해 검사만 받은 건은 이 칸들이 빔 — 데이터 오류가 아님.</p>
    </div>

    <h3>표시 규칙</h3>
    <table>
      <thead><tr><th>대상</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>모든 응답 필드</td><td><b>문자열 보장</b> — 프론트 Zod 스키마가 <code>z.string()</code> 이라 <code>null</code> 이 오면 화면이 통째로 실패함</td></tr>
        <tr><td>빈 값</td><td>대시(—) 로 그림. 정렬할 때는 방향과 무관하게 뒤로 밂</td></tr>
        <tr><td>Y/N 칸</td><td>수술불가 · 검사중단은 <b>Y 만 빨갛게</b>, N 은 대시</td></tr>
        <tr><td>배지</td><td>검사분류 · 신구환 · 등급(R·A·B·C·G) · 검사구분에 색을 줌</td></tr>
        <tr><td>긴 텍스트</td><td>취소메모 · 검사특이사항 · 고객메모는 한 줄로 자르고 마우스를 올리면 전문</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>늦은 입력 누락</b></td><td>있었을 검사가 명단에 없음</td><td>아래 별도 설명</td></tr>
        <tr><td><b>백내장 미포함</b></td><td>백내장 검사가 안 보임</td><td>백내장은 <a href="cataract-exam-list.html">백내장 검사자 리스트</a>, 합친 건 <a href="all-exam-list.html">전체 검사자 리스트</a></td></tr>
        <tr><td><b>신/구환이 기간에 흔들림</b></td><td>조회 범위를 넓히면 신환이 늘어남</td><td>정의상 그러함. 신환 수를 셀 거면 조회 기간을 고정해야 함</td></tr>
        <tr><td><b>만나이는 조회 시점 기준</b></td><td>같은 CSV 를 반년 뒤 다시 받으면 나이가 다름</td><td>연령대 분석에는 생년월일을 씀</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 검사는 안 보임</td><td>매일 03시 배치 이후 반영</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 늦게 입력된 과거 검사기록은 자동으로 안 들어올 수 있음</div>
      <p>일일 배치(03:00)는 <b>D-1 하루치만</b> 다시 읽음. 월 1일 03:30 보정이 <b>전월 한 달</b>을 통째로 재계산하므로,
         늦은 입력이라도 <b>다음 달 1일 전에</b> 들어오면 흡수됨.
         그보다 늦게 들어오면(예: 7월 검사인데 9월 입력) 그 날짜를 다시 읽는 배치가 없어 <b>영구 누락</b>됨.</p>
      <p>2026-08-04 검사(차트 2234677)가 8/8 에 중단 처리로 입력돼 누락됐던 사례가 있음 —
         당시엔 월간 보정이 꺼져 있어 수동 재적재로 해소했음.
         <b>누락이 의심되면 "언제 입력됐나"를 먼저 봄</b>. 다음 달 1일 이후면 관리자 화면에서
         <a href="batch-management.html">해당 기간을 수동 재적재</a>해야 함.</p>
    </div>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>보정 범위 확대</td><td>일일 배치를 D-7~D-1 로 넓히거나 월간 보정을 2~3개월로 늘릴지. 조회 비용과 맞바꿈 — 개발자 협의 필요</td></tr>
        <tr><td>원데이 컬럼 추가</td><td>원데이(당일OP) 여부를 컬럼으로 낼지. <b>전체 검사자 리스트에는 이미 「원데이」 컬럼이 있음</b> — 이 화면에만 없어 두 리스트가 다름. 개발자 데이터 일괄 업데이트 뒤로 미뤄 둔 건임</td></tr>
        <tr><td>화면 마스킹</td><td>지금은 CSV 만 가림. 화면에도 걸면 상담 후속 연락을 못 하게 되므로 <b>업무와 맞바꾸는 결정</b>임</td></tr>
        <tr><td>검사정보1~30</td><td>측정값 30쌍은 화면에서 뺐음. 필요해지면 별도 화면인지 이 표의 확장인지</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/시력교정-검사자_2026-06~07.md">시력교정 검사자 점검</a> — 검사 예약 없이 외래·백내장으로 온 건이 섞여 든 사례.
       숫자가 종합지표와 안 맞으면 여기부터 봄.</p>
  `,
}
