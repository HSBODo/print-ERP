export default {
  s2: `
    <h3>검사받은 사람 중 몇이 중간에 멈췄나</h3>
    <p><b>중단률 = 중단수 ÷ 시력교정 검사자</b>. 한 지표만 보는 단순한 화면임.
       "왜 멈췄나"는 <a href="stop-reason.html">중단 사유</a>가 답함.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월별 추이</td><td>중단이 늘고 있는지 봄</td></tr>
        <tr><td>연도 비교</td><td>3개년을 겹쳐 계절성과 수준 변화를 봄</td></tr>
        <tr><td>레포트 대조</td><td>월간·주차 레포트의 「중단율」과 같은 값임</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">2026-07-07 신설</div>
      <p>그전에는 <a href="overall-exam.html">월별 검사자 종합지표</a>의 한 칸으로만 있었음.
         중단이 별도로 관리할 값이 되면서 화면으로 뺐음.</p>
    </div>
  `,

  s3: `
    <p>필터 바 + 꺾은선 하나. 이 대시보드에서 가장 단순한 통계 화면임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>연도</span>
        <span class="seg"><span class="on">2024</span><span class="on">2025</span><span class="on">2026</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">중단율</div>
        <div class="ph" style="font-size:11.5px; margin-top:2px">시력교정 검사자 대비 검사 중단 비율입니다.</div>
        <div style="border:1px solid #eaeaec; border-radius:10px; height:130px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
        <div class="ph" style="font-size:11px; margin-top:6px">Y축 0~10% 고정 · 눈금 2%p 간격</div>
      </div>
    </div>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연도 필터</td><td>기본 3개년</td><td>겹쳐 그림. 색은 최신부터 빨강 → 회색 → 하늘색</td></tr>
        <tr><td>차트</td><td>월별 꺾은선</td><td>Y축 <b>0~10% 고정</b>, 눈금 0·2·4·6·8·10</td></tr>
        <tr><td>미래 월</td><td>아직 오지 않은 달</td><td><b>점을 찍지 않음</b> — 0% 로 그리면 급락처럼 보임</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">Y축을 0~10% 로 못 박은 이유</div>
      <p>실제 중단율이 6% 안팎이라 자동 스케일이면 <b>작은 변동이 급등락처럼</b> 보임.
         고정 범위가 "그래서 이게 큰 변화인가"를 눈으로 판단하게 해 줌.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>기본 3개년</td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>검사일</b>임.</p>

    <div class="note">
      <div class="h">전용 API 가 없음</div>
      <p>이 화면은 <a href="overall-exam.html">월별 검사자 종합지표</a>의 API(<code>/api/stats/overall-exam/monthly</code>)를
         그대로 쓰고, <b>중단수 ÷ 시력교정 검사자를 화면에서 계산</b>함.
         지표 하나만 그리므로 별도 엔드포인트를 만들지 않았음.</p>
    </div>
  `,

  s5: `
    <h3>정의</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>분자</td><td>중단수 — <code>EXAM.STOP_YN = 'Y'</code></td></tr>
        <tr><td>분모</td><td>시력교정 검사자(<code>visionExam</code>)</td></tr>
        <tr><td>단위</td><td>%, 소수점 1자리</td></tr>
        <tr><td>기준 날짜</td><td>검사일</td></tr>
      </tbody>
    </table>
    <p>정본은 <a href="../지표정의/3-전환율-중단율.md">지표정의/3-전환율-중단율.md §3</a>.</p>

    <div class="note bad">
      <div class="h">⚠️ 분모가 바뀌면 중단률도 같이 움직임</div>
      <p>분모 <code>visionExam</code> 은 <b>검사자 정의를 손대면 함께 바뀜</b>.
         원데이 판정 변경, 백내장 그림자 행 제외 규칙 변경 같은 작업을 하면
         <b>중단률을 반드시 함께 확인</b>해야 함. 이 화면은 자기 분모를 갖고 있지 않음.</p>
    </div>

    <div class="note warn">
      <div class="h">분모가 중단·취소를 거르지 않음</div>
      <p><code>visionExam</code> 은 중단 건도 검사자로 셈. 즉 <b>중단한 사람이 분모에도 들어 있음</b>.
         "검사받은 사람 중 중단한 비율"이라는 뜻으로는 맞지만,
         "끝까지 간 사람 대비"로 읽으면 틀림
         (<a href="../지표정의/2-검사.md">지표정의/2-검사.md §5-⑤</a>).</p>
    </div>

    <h3>연도별 데이터</h3>
    <p>2024·2025 는 마트 시드, 2026 이후는 배치 적재 마트임.
       주차 레포트의 중단율은 <b>주차 집계에 값이 있는 연도만</b> 비교선을 그림 —
       마트에 없고 주차 라이브에만 있는 연도가 있어서임.</p>

    <h3>컬럼 정의 — 월별 표 3개</h3>
    <p>전용 API 없이 종합지표 응답의 중단 건수 · 검사수를 화면이 나눔.
       차트와 표는 같은 값을 보임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>(행 머리) 연도</td><td><code>year</code></td><td><code>yr</code></td><td>검사일 연도</td><td>연도 칩 색과 같은 색선. 최신 연도만 굵게·값 라벨 표시</td></tr>
        <tr><td>2</td><td>1월 ~ 12월</td><td>— (프론트 파생)</td><td>—</td><td><code>stopCount</code> ÷ <code>visionExam</code> × 100</td><td>소수 1자리 %. 미래 월이거나 <code>visionExam=0</code> 이면 빈칸(선도 끊김). Y축 0~10% 고정</td></tr>
        <tr><td>3</td><td>평균</td><td>— (프론트 파생)</td><td>—</td><td>표시된 월 중단률의 산술평균</td><td>건수 가중 아님(연간 중단수 ÷ 연간 검사자 와 다름). 빈칸 월 제외</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 응답 필드 6개</h3>
    <p>조회 경로는 마트 <code>mart_overall_exam_monthly</code> 이고 2026-05 이전은 시드 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>연도</td><td><code>year</code></td><td><code>yr</code></td><td>검사일 연도</td><td>—</td></tr>
        <tr><td>2</td><td>월</td><td><code>month</code></td><td><code>mo</code></td><td>검사일 월</td><td>마트에 행이 있는 달만 응답(데이터 없는 미래 월은 없음). 프론트가 없는 달을 <code>undefined</code> → 빈칸 처리</td></tr>
        <tr><td>3</td><td>— (분자: 중단수)</td><td><code>stopCount</code></td><td><code>stop_count</code></td><td><code>v_all_exam_list.exam_group='시력교정'</code> AND <code>stop_yn='Y'</code> 행 수 ← <code>list_exam.exam_stop</code> ← <code>EXAM.STOP_YN='Y'</code></td><td>시력교정만(백내장 <code>Cataract_Exam.Stop_YN</code> 은 안 셈). 중단 사유 화면의 「월 중단합계」와 같은 조건</td></tr>
        <tr><td>4</td><td>— (분모: 시력교정 검사자)</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td><code>v_all_exam_list.exam_group='시력교정'</code> 행 수 ← <code>list_exam.exam_category</code> ← <code>EXAM</code> 행 중 당일 <code>RESERVATION D</code>(드림렌즈)만 있고 <code>M</code> 이 없는 건을 뺀 나머지</td><td>세션 단위. 리스트 필터(테스트 이름 · 순수 외래 유입 제외 · 백내장 중복 제거)가 적용된 모집단. <b>중단·취소 건도 분모에 들어 있음</b>(위 노트)</td></tr>
        <tr><td>5</td><td>— (화면 미사용)</td><td><code>partial</code></td><td><code>partial</code></td><td>배치 시점의 진행 중인 월이면 true</td><td>이 화면은 미래 월 판정을 브라우저 날짜로 따로 함</td></tr>
        <tr><td>6</td><td>— (화면 미사용)</td><td><code>totalExam</code> · <code>introGeneral</code> · <code>introCustomer</code> · <code>introStaff</code> · <code>jobOffice</code> · <code>jobStudent</code> · <code>jobEtc</code> · <code>visionBooked</code> · <code>cataractTotal</code> · <code>cataractOnly</code> · <code>cataractBooked</code> · <code>dreamlens</code> · <code>oneDay</code> · <code>oneDayBooked</code></td><td>같은 이름의 snake_case 14개</td><td>—</td><td>종합지표 화면용. 정의는 <a href="overall-exam.html">월별 검사자 종합지표</a> 5장</td></tr>
      </tbody>
    </table>

  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>분모 종속</b></td><td>검사자 정의를 바꾸면 값이 움직임</td><td>검사 관련 작업 시 함께 점검</td></tr>
        <tr><td><b>분모에 중단 포함</b></td><td>정의를 오해하기 쉬움</td><td>"검사자 대비"임을 문서에 명시</td></tr>
        <tr><td><b>사유를 못 봄</b></td><td>왜 늘었는지 이 화면만으로는 모름</td><td><a href="stop-reason.html">중단 사유</a>로 감</td></tr>
        <tr><td><b>Y축 고정</b></td><td>10% 를 넘으면 선이 잘림</td><td>이례적 상황에서는 축을 넓혀야 함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>분모 정의</td><td>중단을 분모에서 뺄지. 빼면 값이 올라가고 과거와의 비교선이 끊김</td></tr>
        <tr><td>백내장 중단</td><td>이 화면은 <b>시력교정만</b> 봄. 백내장 중단(분류 '중단')은 별도로 세고 있어 통합 지표가 없음</td></tr>
        <tr><td>사유 연계</td><td>차트에서 중단 사유 화면으로 바로 넘어가게 할지</td></tr>
      </tbody>
    </table>
  `,
}
