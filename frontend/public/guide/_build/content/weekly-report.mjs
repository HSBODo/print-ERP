export default {
  s2: `
    <h3>월간 레포트와 같은 도표를, 주 단위로</h3>
    <p>도표 목록·순서·그룹이 <a href="monthly-report.html">월간 레포트</a>와 <b>완전히 같음</b>.
       바뀌는 것은 가로축(월 → ISO 주차)과 데이터 소스뿐임.
       도표를 하나 추가하면 두 화면에 동시에 생김 — 정의를 한 곳(<code>reportItems.tsx</code>)에서 만듦.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>주간 회의</td><td>지난주 실적을 전년 같은 주와 겹쳐 봄</td></tr>
        <tr><td>월 중간 점검</td><td>월이 끝나기 전에 흐름이 어느 쪽인지 봄 — 월간은 달이 끝나야 읽힘</td></tr>
        <tr><td>이벤트 영향 확인</td><td>프로모션 주간 전후를 주 단위로 비교함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">왜 별도 화면인가</div>
      <p>월간 레포트에 "주 단위 보기" 토글을 다는 대신 화면을 나눴음.
         <b>2024·2025 가 주로 쪼개지지 않기</b> 때문임 — 같은 화면에 두면 연도마다 축이 다른
         이상한 도표가 됨. 주차 레포트는 <b>전 구간을 일별 집계에서 라이브로</b> 묶어 그 문제를 피함.</p>
    </div>
  `,

  s3: `
    <p>월간 레포트와 같은 골격(좌측 목차 + 정중앙 본문)에 <b>주차 범위 셀렉트</b> 하나가 더 붙음.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui grow"><b>주차 레포트</b> <span class="ph">· ISO 8601 주차 · 3개년 비교</span></span>
        <span class="ui">전체 (52주) ▾</span>
        <span class="ui">⤓ CSV</span>
        <span class="ui dark">🖨 PDF로 저장</span>
      </div>
      <div style="display:flex; gap:0">
        <div style="width:200px; border-right:1px solid #eaeaec; padding:10px 12px; font-size:11.5px">
          <div style="font-weight:700; margin-bottom:6px">전체 도표 <span class="ph">(31/31)</span></div>
          <div class="ph" style="font-weight:700; margin-top:8px">예약</div>
          <div>예약 종합 (콜·온라인)</div><div>콜 예약</div>
          <div class="ph" style="font-weight:700; margin-top:8px">검사 유입</div>
          <div>일반 고객 검사</div>
          <div style="display:flex; justify-content:space-between">고객분류별 검사수 <span class="pill g-icl" style="font-size:10px">월</span></div>
          <div class="ph" style="font-weight:700; margin-top:8px">전환&amp;성공</div>
          <div style="display:flex; justify-content:space-between">시력교정 상담성공률 <span class="pill g-icl" style="font-size:10px">월</span></div>
          <div class="ph">…</div>
        </div>
        <div style="flex:1; padding:12px">
          <div style="border:1px solid #eaeaec; border-radius:10px; padding:10px">
            <div class="ct ph" style="font-size:11px">예약 종합 (콜·온라인) — 1주 ~ 52주</div>
            <div style="border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:80px"></div>
          </div>
          <div style="border:1px solid #eaeaec; border-radius:10px; padding:10px; margin-top:10px">
            <div style="color:#b45309; font-size:11px; font-weight:700">※ 이 도표는 주차로 분해되지 않아 월 기준으로 표시합니다.</div>
            <div class="ct ph" style="font-size:11px; margin-top:4px">고객분류별 검사수</div>
            <div style="border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:70px"></div>
          </div>
        </div>
      </div>
    </div>
    <p class="shot-cap">월 기준 도표에는 목차에 <b>「월」 뱃지</b>, 본문에 <b>안내 문구</b>가 함께 붙음 — 뱃지는 인쇄에 안 나오기 때문임.</p>

    <h3>월간 레포트와 다른 점</h3>
    <table>
      <thead><tr><th>영역</th><th>월간</th><th>주차</th></tr></thead>
      <tbody>
        <tr><td>가로축</td><td>1~12월</td><td>ISO 주차 (52 또는 53주)</td></tr>
        <tr><td>범위 선택</td><td>없음</td><td><b>전체 / 특정 월</b> 셀렉트</td></tr>
        <tr><td>월 기준 도표</td><td>해당 없음</td><td>4개에 <b>「월」 표시</b></td></tr>
        <tr><td>Y축</td><td>도표별 고정 범위 있음</td><td><b>자동 스케일</b> — 월간 범위를 그대로 쓰면 선이 바닥에 붙음</td></tr>
        <tr><td>중단율 비교 연도</td><td>월간 마트에 값이 있는 연도</td><td><b>주차 집계에 값이 있는 연도</b></td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>범위 선택 — 전체 또는 한 달</h3>
    <table>
      <thead><tr><th>선택</th><th>보이는 주차</th></tr></thead>
      <tbody>
        <tr><td>전체</td><td>그 해 52 또는 53주 전부</td></tr>
        <tr><td>1~12월</td><td>그 달에 <b>걸친</b> 주차 — 월 경계 주차를 포함함</td></tr>
      </tbody>
    </table>
    <p>연도는 월간과 같이 <b>고정 3개년</b>임. 범위를 좁혀도 세 해의 같은 주차가 겹쳐 그려짐.</p>

    <div class="note warn">
      <div class="h">주차 개념이 이 시스템에 셋 있음</div>
      <p>이 화면은 <b>ISO 8601 연간 주차</b>(월~일, 첫 목요일이 든 주가 1주차)를 씀.
         <a href="overall-exam-weekly.html">주간 검사자 종합지표</a>는 <b>월 경계에서 자른 그 달의 주차</b>라 규칙이 다름.
         이름이 비슷하다고 같은 주차로 읽으면 안 됨.</p>
    </div>
  `,

  s5: `
    <h3>도표 33개 — 월간 31개 + 주차 전용 2개</h3>
    <p>목록은 <a href="monthly-report.html">월간 레포트 5장</a>을 봄. 드림렌즈 신규수·FU수 2개는 월간 대응 데이터가 없어 <b>주차에만</b> 실림(<code>weeklyOnly</code>). 여기서는 <b>주차로 분해되는가</b>만 다룸.</p>

    <h3>주차로 분해되지 않는 도표 4종</h3>
    <table>
      <thead><tr><th>도표</th><th>왜 월 기준인가</th></tr></thead>
      <tbody>
        <tr><td>고객분류별 검사수</td><td rowspan="4">원천이 월 단위 집계이거나, 주 단위로 쪼개면 표본이 너무 작아 의미가 없음.
            월간 레포트와 <b>같은 소스</b>를 그대로 가져와 그림</td></tr>
        <tr><td>시력교정 상담성공률</td></tr>
        <tr><td>중단 사유</td></tr>
        <tr><td>수술 상세표</td></tr>
      </tbody>
    </table>
    <div class="note">
      <div class="h">표시를 두 벌 붙임</div>
      <p>목차에는 <b>「월」 뱃지</b>, 본문에는 <b>안내 문구</b>를 붙임.
         목차는 인쇄 영역 밖이라 뱃지만 두면 <b>PDF 에서 구분이 사라짐</b>.</p>
    </div>

    <h3>데이터 소스 — 전 구간 라이브</h3>
    <table>
      <thead><tr><th>구간</th><th>월간 레포트</th><th>주차 레포트</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>레거시 확정값 (월 단위)</td><td rowspan="2"><code>/api/report/weekly</code> — 일별 집계를 주로 묶음.<br />2025 는 골든시드, 2026+ 는 배치가 채널 마트에서 접음</td></tr>
        <tr><td>2026 ~</td><td>배치 적재 마트 (월 단위)</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">같은 달인데 두 화면 값이 다를 수 있음</div>
      <p>월간의 2024·2025 는 <b>월 단위 확정값</b>이고, 주차는 <b>일별을 다시 묶은 값</b>임.
         경로가 달라 미세한 차이가 남. 주간 검사자 종합지표가 월별 종합지표와 갖는 관계와 같은 성격임.
         차이가 보이면 먼저 <b>연도</b>를 확인함.</p>
    </div>

    <h3>Y축을 자동 스케일로 두는 이유</h3>
    <p>월간 도표에는 도표별 고정 Y 범위가 있음(예: 예약 종합 800~3000).
       주차 값은 그 1/4~1/5 수준이라(168~608) 같은 범위를 쓰면 <b>선이 축 하단 밖으로 밀려 바닥에 붙음</b>.
       그래서 주차 레포트는 고정 범위를 물려받지 않고 자동 스케일로 그림.</p>

    <h3>컬럼 정의 — 주차 축 3개</h3>
    <p>주차 도표는 모두 마트 <code>mart_weekly_report</code> 를 읽고 비율은 화면이 계산함.
       월간과 같은 규칙은 <a href="monthly-report.html">월간 레포트 5장</a>을 따르고, 여기서는 다른 점만 적음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>주차 열 머리글 (예: 32 · 월 경계 주는 32*)</td><td><code>week</code></td><td><code>wk</code></td><td>ISO 8601 연간 주차(월~일, 첫 목요일이 든 주 = 1주차, 52 또는 53주)</td><td>축 자체는 프론트 <code>weeksOfYear(당해연도)</code> 가 만들고 응답의 (year, week) 로 값을 붙임. 연도 비교는 <b>주차 번호 기준</b>(2026-31주 ↔ 2025-31주)</td></tr>
        <tr><td>2</td><td>연도(범례)</td><td><code>year</code></td><td><code>yr</code></td><td>ISO 주차연도 — 1주차가 전년 12월을 물어도 이 연도로 귀속</td><td>3개년 고정. 값이 없는 주는 null(선 끊김)</td></tr>
        <tr><td>3</td><td>부제 날짜 범위 · 열 머리글 툴팁</td><td>— (<code>startDate</code>·<code>endDate</code> 가 응답에 있으나 화면은 안 씀)</td><td><code>start_date</code>·<code>end_date</code></td><td>그 주의 월요일·일요일</td><td>화면은 당해연도 주차의 날짜를 프론트가 다시 계산해 씀. CSV 헤더는 「NN주차」만</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 예약 도표 3개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>예약 종합 (콜, 온라인)</td><td><code>reservations</code></td><td><code>reservations</code></td><td>콜 + 온라인 — <b>날짜 단위</b>로 더한 뒤 주로 합산</td><td>온라인 미상인 날이 하나라도 섞인 주는 null. 2026 W1~22 는 V57 시드(일수 비례라 ±5% 오차 가능). Y축 자동 스케일</td></tr>
        <tr><td>2</td><td>콜 예약 (인콜, 아웃콜)</td><td><code>call</code></td><td><code>call_cnt</code></td><td>시력교정 채널 마트 일별 <code>call_reservation + tm_reservation + tm_recounsel_reservation</code> + 백내장 채널 마트 일별 <code>new_patient + tm_reservation</code></td><td>월간 예약 도표 #2 와 같은 식을 일별로 적용한 것</td></tr>
        <tr><td>3</td><td>온라인 예약 (네이버, 카카오, 홈페이지)</td><td><code>online</code></td><td><code>online</code></td><td>시력교정 채널 마트 일별 <code>naver_reservation + kakao_reservation</code> + 홈페이지 마트(<code>mart_list_reservation_homepage</code>) 일별 COUNT</td><td>2026-05 이전 날짜는 정의 자체가 달라(레거시 RESERVE_PATH) 미상 → V57 시드가 채움. 홈페이지 커버리지 밖 날은 null(진행 중인 주는 예외)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 검사 유입 도표 6개 · 월 기준 1개</h3>
    <p>검사 일별 집계를 주 단위로 합산함. 분류 규칙은 월간과 같음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>일반 고객 검사 (소개 제외)</td><td><code>introGeneral</code></td><td><code>intro_general</code></td><td>일별 <code>intro_general</code> 합</td><td>—</td></tr>
        <tr><td>2</td><td>고객소개 검사</td><td><code>introCustomer</code></td><td><code>intro_customer</code></td><td>일별 <code>intro_customer</code> 합</td><td>—</td></tr>
        <tr><td>3</td><td>직원소개 검사</td><td><code>introStaff</code></td><td><code>intro_staff</code></td><td>일별 <code>intro_staff</code> 합</td><td>—</td></tr>
        <tr><td>4</td><td>직장인 검사</td><td><code>jobOffice</code></td><td><code>job_office</code></td><td>일별 <code>job_office</code> 합</td><td>—</td></tr>
        <tr><td>5</td><td>학생 검사</td><td><code>jobStudent</code></td><td><code>job_student</code></td><td>일별 <code>job_student</code> 합</td><td>—</td></tr>
        <tr><td>6</td><td>기타 검사 (직장인·학생 제외)</td><td><code>jobEtc</code></td><td><code>job_etc</code></td><td>일별 <code>job_etc</code> 합</td><td>—</td></tr>
        <tr><td>7</td><td>고객분류별 검사수 (「월」 표시)</td><td>월간과 같음 — <code>GET /api/stats/exam-count/by-class</code></td><td><code>mart_exam_count_by_class</code></td><td><a href="monthly-report.html">월간 레포트</a> 「고객분류별 검사수 시리즈 9개」 참조</td><td>주차로 분해되지 않아 월 기준 그대로. CSV 제외</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 검사수 도표 7개</h3>
    <p>월간에 없는 드림렌즈 2종이 추가됨. 나머지는 일별 집계를 주로 합산함.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>백내장 검사수</td><td><code>cataractExam</code></td><td><code>cataract_exam</code></td><td><code>v_all_exam_list</code> 백내장(백내장·중단 분류) 세션을 chart_no × ISO 주로 접은 <b>사람 수</b></td><td>백내장 예약률 분모와 같은 값. 월간은 chart_no × 월이라 접는 단위가 다름</td></tr>
        <tr><td>2</td><td>시력교정 검사</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td>일별 <code>vision</code>(exam_group='시력교정') 합</td><td>—</td></tr>
        <tr><td>3</td><td>드림렌즈 신규수 (주차 전용)</td><td><code>dreamlensNew</code></td><td><code>dreamlens_new</code></td><td>외래센터 주간보고 확정값 — V30(2024 W1 ~ 2026 W30)·V31(2026 W31, 장부 산출) 시드</td><td>배치가 산출하지 않음(사내에 신규/FU 구분 소스가 없음). 시드 없는 주는 null. 월간 레포트에는 이 도표가 없음</td></tr>
        <tr><td>4</td><td>드림렌즈 FU수 (주차 전용)</td><td><code>dreamlensFu</code></td><td><code>dreamlens_fu</code></td><td>위와 같음</td><td>위와 같음</td></tr>
        <tr><td>5</td><td>검사수</td><td><code>examCount</code></td><td><code>exam_total</code></td><td>일별 <code>total</code>(<code>v_all_exam_list</code> 행수) 합</td><td>—</td></tr>
        <tr><td>6</td><td>원데이 검사</td><td><code>oneDayExam</code></td><td><code>one_day</code></td><td>일별 <code>one_day</code>(exam_type='원데이') 합</td><td>—</td></tr>
        <tr><td>7</td><td>일반 검사</td><td>파생 — <code>examTotal − oneDay</code></td><td>두 컬럼의 차</td><td>—</td><td>프론트 계산. 원데이 + 일반 = 검사수</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 비율 도표 5개</h3>
    <p>마트에 분자 · 분모만 두고 화면이 나눔. 분모가 0 이면 빈 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>일반검사 비율</td><td>파생 — <code>(examTotal − oneDay) / examTotal × 100</code></td><td><code>exam_total</code>·<code>one_day</code></td><td>—</td><td>정수 % 표시</td></tr>
        <tr><td>2</td><td>백내장 예약률 (수술예약건/검사자)</td><td>파생 — <code>cataractBooked / cataractExam × 100</code></td><td><code>cataract_booked</code> / <code>cataract_exam</code></td><td>분자 = 그 주 첫 검사일 이후 백내장 O 예약(JINRYO='4', 브릿지) 보유자</td><td>사람 단위(2026-08 통일). 월간은 마트 비율을 <b>올림</b>하지만 주차는 프론트가 <b>반올림</b> — 반올림 방식이 다름</td></tr>
        <tr><td>3</td><td>시력교정 예약률 (수술예약건/검사자)</td><td>파생 — <code>visionBooked / visionExam × 100</code></td><td><code>vision_booked</code> / <code>vision_exam</code></td><td>분자 = 시력교정 세션 중 브릿지 O 예약(STATE&lt;&gt;'C') 보유</td><td>월간 배치는 '순수 외래 제외' 를 브릿지로 다시 판정하지만 주차는 뷰 행 전체가 분모 — 리스트 적재 시 같은 필터가 이미 걸려 있어 차이는 작음</td></tr>
        <tr><td>4</td><td>시력교정 일반예약률 (수술예약건/검사자)</td><td>파생 — <code>bookedGeneral / examGeneralBase × 100</code></td><td><code>booked_general</code> / <code>exam_general_base</code></td><td>분모 = 시력교정 세션 중 exam_type='일반' ; 분자 = 그중 O 예약 보유</td><td>월간(<code>list_exam</code> one_day='N' · cancel_code 빈 것)과 모집단 조건이 약간 다름</td></tr>
        <tr><td>5</td><td>원데이 예약률 (수술예약건/검사자)</td><td>파생 — <code>oneDayBooked / oneDay × 100</code></td><td><code>one_day_booked</code> / <code>one_day</code></td><td>분자 = 원데이 세션 중 <b>검사일 이후</b> O 예약(브릿지 max_o_any ≥ exam_date) 보유</td><td>월간은 리스트 스냅샷의 <code>surgery_reserve_date</code> 로 판정 — 주차가 미래 예약을 더 반영함</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 전환&amp;성공 월 기준 1개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>시력교정 상담성공률 (「월」 표시)</td><td>월간과 같음 — <code>GET /api/stats/consultation-rate/trend</code></td><td><code>mart_consultation_rate_monthly</code></td><td><a href="monthly-report.html">월간 레포트</a> 「시력교정 상담성공률 시리즈 3개」 참조</td><td>월 기준 그대로. CSV 제외</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 중단 도표 1개 · 월 기준 1개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>중단율</td><td>파생 — <code>stopCount / visionExam × 100</code></td><td><code>stop_count</code> / <code>vision_exam</code></td><td>일별 <code>stop_count</code>(exam_group='시력교정' AND stop_yn='Y') 합</td><td>소수 1자리 %. 비교 연도는 <b>주차 집계에 값이 있는 연도</b>로 고름(월간의 <code>stopRateYears</code> 를 쓰면 24·25 선이 빠짐)</td></tr>
        <tr><td>2</td><td>중단 사유 (「월」 표시)</td><td>월간과 같음 — <code>GET /api/stats/stop-reason/monthly</code></td><td><code>mart_stop_reason_monthly</code></td><td><a href="monthly-report.html">월간 레포트</a> 「중단 도표」 표 참조</td><td>월 선택 기본값 = 범위 셀렉트의 월(전체면 데이터 있는 최신 월). CSV 제외</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 수술 도표 4개 · 월 기준 1개</h3>
    <p>수술 일별 집계를 주 단위로 합산함. 단위는 월간과 같음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>총 수술수</td><td><code>totalSurgery</code></td><td><code>total_surgery</code></td><td>일별 <code>total</code> 합</td><td>2025 시드는 수술 3종·재수술 3종이 NULL → 빈칸. 월간의 <code>SURGERY_GOLDEN</code> 상수는 주차에 적용되지 않음</td></tr>
        <tr><td>2</td><td>백내장 수술</td><td><code>cataractSurgery</code></td><td><code>cataract_surgery</code></td><td>일별 <code>cataract_patients</code>(눈) 합</td><td>—</td></tr>
        <tr><td>3</td><td>시력교정 수술</td><td><code>visionSurgery</code></td><td><code>vision_surgery</code></td><td>일별 <code>vision_patients</code>(사람) 합</td><td>—</td></tr>
        <tr><td>4</td><td>재수술 (레이저+렌즈)</td><td><code>reoperation</code></td><td><code>reoperation</code></td><td>일별 <code>reoperation</code>(건) 합</td><td><code>reopLaser</code>·<code>reopLens</code>(<code>reop_laser</code>·<code>reop_lens</code>)도 내려오지만 도표 없음</td></tr>
        <tr><td>5</td><td>수술 상세표 (「월」 표시)</td><td>월간과 같음 — <code>GET /api/stats/surgery/panel/trend</code></td><td><code>mart_surgery_monthly</code></td><td><a href="monthly-report.html">월간 레포트</a> 「수술 상세표 28개」 참조</td><td>월 기준 그대로. CSV 제외</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 외래 도표 1개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>외래수</td><td><code>outpatient</code></td><td><code>outpatient</code></td><td><code>list_outpatient</code> 일별 집계 <code>total</code> 을 ISO 주로 합산(RESERVATION FLAG='F'·STATE IN I/H)</td><td>예약일 기준. 월간 외래 도표와 같은 리스트</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>월간과 값이 미세하게 다름</b></td><td>같은 달을 더해도 월간 값과 안 맞음</td><td>경로가 다름(5장). 어느 쪽을 정본으로 쓸지 먼저 정해야 함</td></tr>
        <tr><td><b>도표 4종은 월 기준</b></td><td>주차 축인데 값이 안 움직임</td><td>「월」 표시를 확인. 주 단위 분해가 원천에 없음</td></tr>
        <tr><td><b>진행 중인 주</b></td><td>마지막 주가 낮게 찍힘</td><td>부분값임. 주가 끝나야 완결됨</td></tr>
        <tr><td><b>53주 해</b></td><td>연도마다 주 개수가 다름</td><td>ISO 규칙상 정상임. 마지막 주를 전년과 1:1 로 비교할 때 주의</td></tr>
        <tr><td><b>월 경계 주차</b></td><td>특정 월을 골라도 전월·익월 날짜가 섞인 주가 들어옴</td><td>의도된 동작임 — ISO 주차는 월에 걸침</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>월간·주차 값 일치</td><td>2024·2025 를 일별로 복원할 수 없어 구조적으로 못 맞춤. <b>차이를 화면에 드러낼지</b>가 남은 선택</td></tr>
        <tr><td>월 기준 도표 4종</td><td>주 단위로 만들 수 있는 것이 있는지 재검토. 상담성공률은 표본이 작아 노이즈가 큼</td></tr>
        <tr><td>주차 라벨 표기</td><td>월을 고르면 <b>부제에 날짜 범위가 이미 붙음</b>(「8월 포함 31~36주 (07-27 ~ 09-06)」). 남은 것은 <b>각 주차 열 머리글</b>로, 거기는 「32주」뿐임 — 열마다 날짜를 붙일지</td></tr>
      </tbody>
    </table>
  `,
}
