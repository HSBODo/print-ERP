/* 예약 변경이력 — 2026-09-16 작성. 정본: docs/reservation/change-history.md · 마트 V63 · pages/reservation/reservation-change/ */
export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>검사예약(시력교정·드림렌즈·백내장)의 <b>예약일이 바뀐 이력</b>을 보는 화면임.
       예약 한 건을 CRM 에서 열어 이력 탭을 뒤지던 일을, 기간 단위 명단과 달력으로 바꿔 놓은 것임.
       메디컬 부서(MEDICAL)와 ALL 부서(ADMIN·DIRECTOR)에 열려 있고 마케팅 계열 부서에는 보이지 않음.</p>
    <table>
      <thead><tr><th>쓰는 사람</th><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>컨택센터 · 예약 담당</td><td>매일 아침</td><td>어제까지 예약일이 바뀐 건을 훑고, 여러 번 바뀐 고객은 <b>재확인 전화</b> 대상으로 뽑음</td></tr>
        <tr><td>운영 관리자</td><td>명절 전후 · 주간 회의</td><td>추이 달력에서 <b>변경률이 튀는 날</b>을 보고 명절 ±5일 창의 응대 인력을 조정함</td></tr>
        <tr><td>원장 · 경영진</td><td>월 단위</td><td>월별 변경률(등록 대비 변경)을 보고 예약 운영이 흔들리는 시기를 확인함</td></tr>
        <tr><td>데이터 점검</td><td>필요할 때</td><td><b>기준일</b>을 넣어 "그 날 시점에 잡혀 있던 예약 명단"을 되살려 다른 통계와 대조함</td></tr>
      </tbody>
    </table>

    <h3>이 화면이 대체한 것</h3>
    <p>지금까지는 예약 변경을 "얼마나 자주 일어나는지" 아무도 집계하지 못했음. CRM 의 <code>RESERVE_HISTORY</code> 는
       예약 1건에 이력 N행이 쌓이는 로그라, 사람 손으로는 한 건씩 열어 보는 것 말고 방법이 없었음.
       배치가 이 로그를 예약 1건 = 1행(최초 → 변경1 → … → 최종)으로 접어 마트에 두고, 화면은 그 마트만 읽음.</p>

    <div class="note">
      <div class="h">취소·미내원도 들어 있음</div>
      <p>목적이 <b>변경 패턴</b>이라 취소(C)·미내원(Y) 예약도 뺴지 않음. 그래서 이 화면의 건수는
         예약 종합·예약자 리스트의 건수와 <b>직접 비교하면 안 됨</b> — 모집단이 다름.</p>
    </div>
  `,

  s3: `
    <p>탭 두 개임 — <b>변경 상세</b>(명단)와 <b>추이 달력</b>(일별 건수·변경률). 툴바 오른쪽에 탭 설명이 한 줄 붙음.</p>

    <h3>① 변경 상세 탭</h3>
    <div class="shot">
      <div class="shot-bar">
        <span class="ui">등록 연도 · 2026년 ▾</span><span class="ui">등록 월 · 월 전체 ▾</span>
        <span class="ui">기준일 ▾</span><span class="ui">구분 전체 ▾</span><span class="ui">상태 전체 ▾</span>
        <span class="ui">변경 1회 이상 ▾</span><span class="ui">정렬 · 등록일순 ▾</span>
        <span class="ui">↺ 초기화</span><span class="ui blue">조회</span><span class="ui">CSV</span>
      </div>
      <table>
        <thead><tr><th>등록일</th><th>차트번호</th><th>이름</th><th>구분</th><th>상태</th><th>명절</th><th>최초 예약일</th><th>변경1</th><th>변경2</th><th>최종 예약일</th><th>변경횟수</th></tr></thead>
        <tbody>
          <tr><td>2026-09-01 10:12</td><td>2233873</td><td>홍길동</td><td><span class="pill">시력교정</span></td><td>내원</td><td></td><td>09-05</td><td>09-08 <span class="ph">(09-02 14:30)</span></td><td>09-12 <span class="ph">(09-06 09:10)</span></td><td>09-12</td><td class="ph" style="text-align:right">2</td></tr>
          <tr><td>2026-09-02 <span class="ph">채번</span></td><td>2240011</td><td>김철수</td><td><span class="pill">백내장</span></td><td>취소</td><td>명절(추석)</td><td>09-24</td><td>09-29</td><td></td><td>09-29</td><td class="ph" style="text-align:right">1</td></tr>
        </tbody>
      </table>
      <div class="shot-bar" style="border-top:1px solid #eaeaec"><span class="ph">1,284건 · 이전 · 1 / 13 · 다음 · 행 수 50/100/200</span></div>
    </div>
    <p class="shot-cap">숫자·이름은 예시임. 변경N 열은 조회 결과 중 가장 많이 바뀐 건에 맞춰 늘어나고 최대 6열임.
       기준일을 넣으면 「기준일 시점 예약일」 열이 최종 예약일 앞에 하나 더 생김.</p>

    <h3>② 추이 달력 탭</h3>
    <div class="shot">
      <div class="shot-bar">
        <span class="ui">◀ 2026년 9월 ▶</span>
        <span class="ui">등록일 기준 | <b>예약일 기준</b></span>
        <span class="ui"><b>등록 건수</b> | 변경 건수 | 변경률 %</span>
        <span class="ui">구분 · 전체 ▾</span>
        <span class="ph" style="margin-left:auto">등록 <b style="color:#1d4ed8">1,930건</b> · 변경 <b style="color:#dc2626">412건</b> · 변경률 <b style="color:#6d28d9">21.3%</b></span>
      </div>
      <table>
        <thead><tr><th>주</th><th>월</th><th>화</th><th>수</th><th>목</th><th>금</th><th>토</th><th>일</th><th>주 합계</th></tr></thead>
        <tbody>
          <tr><td class="ph">W37</td><td>62</td><td>71</td><td>58</td><td>66</td><td>80</td><td>44</td><td>9</td><td><b>390</b></td></tr>
          <tr><td class="ph">W39</td><td style="outline:2px solid #f59e0b">70</td><td style="outline:2px solid #f59e0b">88</td><td style="outline:2px solid #f59e0b">95</td><td style="outline:2px solid #f59e0b; background:#fef3c7">추석 12</td><td style="outline:2px solid #f59e0b">31</td><td>40</td><td>8</td><td><b>344</b></td></tr>
        </tbody>
      </table>
    </div>
    <p class="shot-cap">선택 월과 다음 달, 두 장이 세로로 이어짐(예약일 기준이면 미래 달까지 값이 있음).
       셀 음영은 그 두 달의 최댓값 대비 진하기, 명절 당일 ±5일은 호박색 테두리임. 주 행은 ISO 주차 번호와 주 합계를 보여줌.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>탭</td><td>변경 상세 · 추이 달력</td><td>탭마다 조회 조건이 따로 있음. 탭을 오가도 각자 조건은 유지됨</td></tr>
        <tr><td>상세 필터</td><td>등록 연도 · 월 · 기준일 · 구분 · 상태 · 변경횟수 · 정렬</td><td><b>[조회]</b> 를 눌러야 반영됨. 연도만 서버로 가고 나머지는 화면에서 거름(4장)</td></tr>
        <tr><td>상세 표</td><td>고정 열 7개 + 변경N + 최종 · 횟수</td><td>변경N 칸에는 그때 잡힌 예약일과, 작게 <b>변경한 시각</b>이 붙음. 시각을 모르는 이력은 날짜만 나옴</td></tr>
        <tr><td>CSV</td><td>버튼</td><td>화면에 걸린 필터·기준일 그대로 내려받음. 파일명에 연도·월이 붙음</td></tr>
        <tr><td>달력 조작</td><td>월 이동 · 기준 · 지표 · 구분</td><td>바꾸는 즉시 다시 그림([조회] 없음). 월 이동은 두 달 범위를 한 번에 다시 받음</td></tr>
        <tr><td>월 요약</td><td>등록 · 변경 · 변경률</td><td>선택 월 한 달치 합계. 구분을 고르면 그 구분만 합산됨</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>변경 상세 탭</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>등록 연도</td><td><b>서버</b></td><td>연도 하나(1/1 ~ 12/31, 올해면 오늘까지) 또는 「연도 전체」(2022-01-01 ~ 오늘). <code>GET /api/reservation-change?from&amp;to</code> 의 유일한 조건임</td></tr>
        <tr><td>등록 월</td><td>화면</td><td>받아 온 연도 안에서 월만 거름</td></tr>
        <tr><td>구분</td><td>화면</td><td>M 시력교정 · D 드림렌즈 · H 백내장</td></tr>
        <tr><td>상태</td><td>화면</td><td>Y 예약(미내원) · I 내원 · H 퇴원 · C 취소 — <b>현재</b> 상태임(이력 시점 상태가 아님)</td></tr>
        <tr><td>변경횟수</td><td>화면</td><td>1회 이상(기본) · 2 · 3 · 5회 이상. 「0회 포함」은 기준일 조회용임 — 서버는 변경된 예약만 주므로 0회 행은 원래 없고, 기준일을 넣었을 때 "그 시점엔 아직 안 바뀐 건"을 남기려는 선택지임</td></tr>
        <tr><td>기준일</td><td>화면</td><td>그 날까지 저장된 이력만 남겨 <b>그 시점의 예약일</b>을 복원함. 기준일 시점 예약일이 기준일보다 이미 지난 건은 목록에서 뺌. 기준일을 넣고 조회하면 정렬이 「예약일순(기준일 시점)」으로 자동 전환됨(직접 다른 정렬을 골랐으면 그대로)</td></tr>
        <tr><td>정렬</td><td>화면</td><td>등록일순(기본) · 예약일순(기준일 시점) · 변경횟수순</td></tr>
      </tbody>
    </table>
    <p>기본값은 <b>올해 · 변경 1회 이상 · 등록일순</b>임. 서버 범위 상한은 3,660일(10년) — 변경된 예약만 돌려주므로 2022년부터 전부 합쳐도 3만 행 안쪽이라 「연도 전체」를 한 번에 받음.</p>

    <h3>추이 달력 탭</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>월</td><td><b>서버</b></td><td>선택 월 + 다음 달의 달력 그리드 범위(최대 11주)를 <code>GET /api/reservation-change/daily?from&amp;to</code> 로 한 번에 받음. 상한 366일</td></tr>
        <tr><td>기준</td><td>화면</td><td>등록일 기준(그 날 등록된 예약) / 예약일 기준(그 날로 잡혀 있는 예약 · 기본). 응답에 두 축이 모두 들어 있어 전환은 즉시임</td></tr>
        <tr><td>지표</td><td>화면</td><td>등록 건수(기본) · 변경 건수 · 변경률 %</td></tr>
        <tr><td>구분</td><td>화면</td><td>전체 · 시력교정 · 드림렌즈 · 백내장. 응답이 구분별로 나뉘어 와서 화면에서 합산함</td></tr>
      </tbody>
    </table>
    <p>달력의 하한은 2022-01 임(데이터 시작). 예약일 기준은 <b>아직 오지 않은 달</b>도 조회됨 — 미래 예약이 그 날짜 칸에 잡힘.</p>
  `,

  s5: `
    <h3>단위와 날짜</h3>
    <table>
      <thead><tr><th>항목</th><th>정의</th></tr></thead>
      <tbody>
        <tr><td><b>행 1개</b></td><td>예약 1건(<code>RESERVE_NUM</code>). 같은 사람이 예약을 두 번 잡으면 두 행임</td></tr>
        <tr><td><b>등록일</b></td><td>3순위로 산정 — ① 변경이력 첫 저장 시각(H) ② 예약 등록시각 <code>InsertedDateTime</code>(I) ③ 예약번호 앞 6자리 채번일(N · 시각 없음, 화면에 「채번」 표시)</td></tr>
        <tr><td><b>변경</b></td><td>이력에서 <b>예약일이 바뀐 것</b>만 셈. 시간만 바뀌거나 같은 날짜로 다시 저장한 이력은 접혀서 횟수에 들어가지 않음</td></tr>
        <tr><td><b>등록 건수(달력)</b></td><td><code>RESERVE_HISTORY</code> 에 이력이 한 줄이라도 있는 검사예약. 변경이 없는 예약도 <code>change_count = 0</code> 으로 마트에 있어 분모가 됨</td></tr>
        <tr><td><b>변경률</b></td><td>변경 건수 ÷ 등록 건수 × 100. 분모가 0 이면 「—」(0% 로 찍지 않음)</td></tr>
      </tbody>
    </table>

    <p>마트 <code>list_reservation_change</code> 는 CRM <code>RESERVATION</code> + <code>RESERVE_HISTORY</code> 를 <code>ReservationChangeChainBuilder</code> 가 접어 <code>reserve_num</code> 으로 upsert 한 것임.
       변경 상세는 <code>select-list-reservation-change.sql</code>(<code>change_count >= 1</code> 만) 로 마트를 읽고, 나머지 필터·정렬·기준일 계산은 화면이 함.</p>
    <h3>컬럼 정의 — 변경 상세 표 11개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>등록일</td><td><code>registeredAt</code> · <code>registeredTime</code> · <code>regSource</code></td><td><code>registered_at</code> · <code>registered_time</code> · <code>reg_source</code></td><td>3순위 — H: <code>RESERVE_HISTORY.HISTORY_TIME</code> 첫 이력 시각(못 읽으면 <code>HISTORY_NUM</code> 앞 12자리) · I: <code>RESERVATION.InsertedDateTime</code> · N: <code>RESERVE_NUM</code> 앞 6자리(YYMMDD)</td><td><b>조회 기준</b>(등록 연도·월 필터). 날짜 뒤에 ISO 주차 태그(W33 · 연도가 다르면 W52(21))와 HH:MM. N 이면 시각 없이 「채번」. 툴팁에 출처. CSV 는 등록주차·등록시각·등록일 출처를 별도 열로 냄</td></tr>
        <tr><td>2</td><td>차트번호</td><td><code>chartNo</code></td><td><code>chart_no</code></td><td><code>RESERVATION.CUST_NUM</code></td><td>검색 대상. 8888…·9999… 로 시작하는 번호는 적재 제외</td></tr>
        <tr><td>3</td><td>이름</td><td><code>name</code></td><td><code>name</code></td><td><code>RESERVATION.CUST_NAME</code></td><td>CSV 만 마스킹. 「테스트」·「TEST」 포함 건 적재 제외. 검색 대상</td></tr>
        <tr><td>4</td><td>구분</td><td><code>branch</code></td><td><code>branch</code></td><td><code>RESERVATION.RESERVE_FLAG</code></td><td>M 시력교정 · D 드림렌즈 · H 백내장. 모르는 코드는 원문</td></tr>
        <tr><td>5</td><td>상태</td><td><code>reserveState</code></td><td><code>reserve_state</code></td><td><code>RESERVATION.RESERVE_STATE</code> (현재값)</td><td>Y 예약 · I 내원 · H 퇴원 · C 취소 배지. 취소·미내원도 포함</td></tr>
        <tr><td>6</td><td>명절</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>등록일이 신정·구정·추석 당일 ±5일 창에 들면 라벨 배지, 아니면 「—」. 당일 목록은 2027년까지 코드에 박아 둠(달력과 같은 창)</td></tr>
        <tr><td>7</td><td>최초 예약일</td><td><code>changeChain</code> 첫 스텝 (= <code>firstDate</code>)</td><td><code>change_chain</code> · <code>first_date</code></td><td><code>RESERVE_HISTORY.RESERVE_DATE</code> — 예약일이 유효한 첫 이력</td><td>파랑. 툴팁에 등록 시각. 화면·CSV 모두 체인을 풀어 쓰므로 <code>firstDate</code> 는 직접 쓰지 않음</td></tr>
        <tr><td>8</td><td>변경1 ~ 변경N</td><td><code>changeChain</code> 을 풀어서</td><td><code>change_chain</code></td><td><code>RESERVE_HISTORY.RESERVE_DATE</code> 가 <b>직전 스텝과 달라진</b> 이력만(A→B→A 는 2회)</td><td>형식 「변경시각@그때의 예약일|…」. 칸 수 = 조회 결과 전체의 최대 변경 횟수(최대 6) — 페이지를 넘겨도 헤더 고정. 7회 이상은 마지막 칸에 「+n」, 툴팁에 전체 경로. 기준일 없을 때 마지막 변경은 빨강. 시각 못 읽은 이력은 「@날짜」 → 툴팁 「시각 미상」, 기준일 판정에서 제외. CSV 는 「변경n 일시」 열을 같이 냄</td></tr>
        <tr><td>9</td><td>기준일 시점 예약일</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>기준일까지의 마지막 스텝의 예약일. 보라. 기준일이 없으면 열 자체가 없음. 기준일에 아직 등록 전이거나 시점 예약일이 기준일보다 앞선 건은 행에서 빠짐</td></tr>
        <tr><td>10</td><td>최종 예약일</td><td><code>finalDate</code></td><td><code>final_date</code></td><td><code>RESERVATION.RESERVE_DATE</code> (현재값)</td><td>빨강. 원천이 비면 마지막 스텝의 예약일. 툴팁에 전체 경로</td></tr>
        <tr><td>11</td><td>변경횟수</td><td><code>changeCount</code></td><td><code>change_count</code></td><td>체인 길이 − 1</td><td>화면 값은 <b>기준일까지의 횟수</b>(스텝 − 1). 기준일이 있고 전체와 다르면 「/ 전체 n회」 병기. 「변경 N회 이상」 필터·변경횟수순 정렬에 씀. 마트에는 0 도 있으나 이 API 는 ≥ 1 만 돌려줌</td></tr>
      </tbody>
    </table>

    <h3>달력 셀</h3>
    <table>
      <thead><tr><th>기준</th><th>SQL</th><th>셀의 뜻</th></tr></thead>
      <tbody>
        <tr><td>등록일 기준</td><td><code>select-list-reservation-change-daily-registered.sql</code></td><td>그 날 <b>등록된</b> 검사예약 수 · 그중 예약일이 한 번이라도 바뀐 수</td></tr>
        <tr><td>예약일 기준</td><td><code>select-list-reservation-change-daily-reserve-date.sql</code></td><td>그 날로 <b>잡혀 있는</b>(최종 예약일) 예약 수 · 그중 바뀐 수. 같은 예약이 두 축에서 다른 날에 들어감</td></tr>
      </tbody>
    </table>
    <p>명절 창: 구정·추석 당일(음력 기준으로 2027년까지 박아 둠)과 1/1 을 중심으로 ±5일. 추이 그래프의 명절 뷰와 같은 창임.</p>

    <p>달력은 <code>/api/reservation-change/daily</code> 가 위 두 SQL 결과를 <code>byRegistered</code> · <code>byReserveDate</code> 로 함께 돌려주고, 화면이 기준(등록일/예약일)·지표·구분을 골라 그림.</p>
    <h3>컬럼 정의 — 추이 달력 7개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>주차</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>그 주 월요일의 ISO 주차 「W{n}」. ISO 연도가 달력 연도와 다르면 「(yy)」 병기</td></tr>
        <tr><td>2</td><td>일자 셀 · 날짜</td><td><code>day</code></td><td><code>registered_at</code>(등록일 기준) · <code>final_date</code>(예약일 기준)</td><td>등록일: 위 3순위 · 예약일: <code>RESERVATION.RESERVE_DATE</code></td><td>월~일 7열. 그 달 밖 날짜는 회색이고 합계에서 제외. 토 파랑 · 일 빨강. 예약일 기준은 미래 달도 조회됨</td></tr>
        <tr><td>3</td><td>일자 셀 · 지표값</td><td><code>total</code> · <code>changed</code> · 파생</td><td>—</td><td>—</td><td>선택한 지표 하나를 크게 — 등록 건수 = total · 변경 건수 = changed · 변경률 % = changed ÷ total × 100(소수 1자리). 그 달 최대값 대비 농도로 히트 색(등록 파랑 · 변경 빨강 · 변경률 보라). 값이 없으면 회색 「0」</td></tr>
        <tr><td>4</td><td>일자 셀 · 등록 n · 변경 n</td><td><code>total</code> · <code>changed</code></td><td>COUNT(*) · SUM(<code>change_count >= 1</code>)</td><td><code>list_reservation_change</code> 행 수(미변경 0 포함) — 원천은 <code>RESERVE_HISTORY</code> 에 이력이 있는 검사예약</td><td>셀 아래 작은 글씨. 응답은 구분(<code>branch</code>)별 행이고 구분 필터는 화면에서 거름. 툴팁에 날짜·등록·변경·변경률·명절</td></tr>
        <tr><td>5</td><td>일자 셀 · 명절</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>창(당일 ±5일)은 호박색 테두리, 당일은 라벨 배지(구정·추석·신정)</td></tr>
        <tr><td>6</td><td>주 합계</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>그 달에 속한 날만 합산(주 합계의 합 = 월 합계). 지표값 크게 + 등록·변경·변경률 작게. 지표값 없으면 「—」</td></tr>
        <tr><td>7</td><td>월 헤더 · 등록 · 변경 · 변경률</td><td>— (화면 파생)</td><td>—</td><td>—</td><td>월 합계. 변경률은 분모 0 이면 「—」. 등록 0 이면 마트 적재 범위 안내 문구를 띄움</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>T-1 신선도</b></td><td>오늘 바뀐 예약은 내일 03:00 배치 뒤에야 나옴</td><td>당일 응대는 CRM 에서 확인함</td></tr>
        <tr><td><b>배치 범위 = 이력 저장 기간</b></td><td>등록은 1월인데 3월에 바뀐 예약도 3월 배치가 잡음(등록일 범위가 아님). 수동 재적재도 「이력이 저장된 기간」으로 넣어야 함</td><td>배치 관리에서 재실행할 때 이 뜻으로 기간을 잡음. 초기 백필은 2022-01 부터 월 단위</td></tr>
        <tr><td><b>저장 시각 형식 혼재</b></td><td><code>HISTORY_TIME</code> 이 문자열이라 절반 넘게 표준 형식이 아님. 못 읽으면 이력번호의 시각으로 대신하고, 그래도 없으면 「@날짜」로 시각이 빔</td><td>시각 유실이 5% 를 넘으면 배치가 경고함. 개별 빈 시각은 정상 범위임</td></tr>
        <tr><td><b>모집단이 다름</b></td><td>취소·미내원 포함, 이력이 한 줄이라도 있는 예약만 등록으로 셈</td><td>예약 종합·예약자 리스트 숫자와 맞추지 않음. 이 화면 안에서만 비교</td></tr>
        <tr><td><b>사유가 없음</b></td><td>원천 이력에는 사유 메모(<code>MEMO</code>)와 저장 직원이 있지만 마트에 싣지 않아 <b>왜 바꿨는지</b>는 안 보임</td><td>필요하면 마트 컬럼 추가 — 아래 미결</td></tr>
        <tr><td><b>명절 목록이 고정값</b></td><td>구정·추석 날짜를 2027년까지 코드에 박아 둠</td><td>매년 연말에 다음 해 날짜를 추가해야 함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>변경 사유 · 변경 주체 표시</b></td><td>원천에 있는 MEMO·EMP_NUM 을 마트에 실을지. 실으면 "누가 왜" 까지 보이지만 체인 문자열 규격을 늘려야 함</td></tr>
        <tr><td>변경률 기준선</td><td>몇 % 부터 이상인지 목표·경보 기준이 없음. 몇 달 관측 뒤 정함</td></tr>
        <tr><td>시각 유실 임계치</td><td>5% 는 초기값. 노이즈와 유의미의 경계를 관측 후 재조정</td></tr>
        <tr><td>수술예약(O) 확장</td><td>지금은 검사예약 M/D/H 만. 수술 예약일 변경을 같은 틀로 볼지</td></tr>
      </tbody>
    </table>
    <p>결정 기록의 정본은 <a href="../db/mart-inventory.md">db/mart-inventory.md</a> §3 과 레포의 <code>docs/reservation/change-history.md</code> 임.</p>
  `,
}
