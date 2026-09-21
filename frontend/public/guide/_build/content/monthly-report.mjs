export default {
  s2: `
    <h3>이 화면이 최종 산출물임</h3>
    <p>다른 통계 화면이 "숫자를 확인하는 곳"이라면, 레포트는 <b>그대로 회의에 들어가는 문서</b>임.
       그래서 화면 설계의 목표가 다름 — 조회 편의가 아니라 <b>인쇄했을 때의 완성도</b>임.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월간 경영 회의</td><td>PDF 로 저장해 그대로 배포함</td></tr>
        <tr><td>전년 대비 확인</td><td>도표마다 3개년이 겹쳐 있어 한 장에서 증감을 읽음</td></tr>
        <tr><td>수치 재가공</td><td>CSV 로 내려 엑셀에서 다시 만듦</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">이 화면이 대체한 것</div>
      <p>도표 31개를 <b>매달 손으로 만들던 엑셀</b>임. 각 도표가 어느 화면의 숫자인지는
         이 대시보드의 개별 통계 페이지들과 같고, 레포트는 그것을 <b>한 판형에 모아 3개년으로 겹친 것</b>임.</p>
    </div>

    <h3>주차 레포트와의 관계</h3>
    <p><a href="weekly-report.html">주차 레포트</a>는 <b>같은 도표 목록</b>을 ISO 주차 축으로 봄.
       도표 정의·순서·그룹이 같고 축과 데이터 소스만 다름 —
       그래서 도표를 하나 추가하면 <b>두 화면에 동시에</b> 생김.</p>
  `,

  s3: `
    <p>좌측 목차 + 정중앙 본문. 본문만 인쇄 영역이라 목차·툴바는 PDF 에 안 나옴.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui grow"><b>월간 레포트</b> <span class="ph">· 2026년 1~8월 기준 · 당해연도(2026)·전년도(2025)·전전년도(2024) 3개년 비교 · 2026-08-25 데이터 반영</span></span>
        <span class="ui">⤓ CSV</span>
        <span class="ui dark">🖨 PDF로 저장</span>
      </div>
      <div style="display:flex; gap:0">
        <div style="width:190px; border-right:1px solid #eaeaec; padding:10px 12px; font-size:11.5px">
          <div style="font-weight:700; margin-bottom:6px">전체 도표 <span class="ph">(31/31)</span></div>
          <div class="ph" style="font-weight:700; margin-top:8px">예약</div>
          <div>예약 종합 (콜·온라인)</div><div>콜 예약</div><div>온라인 예약</div>
          <div class="ph" style="font-weight:700; margin-top:8px">검사 유입</div>
          <div>일반 고객 검사</div><div>고객소개 검사</div><div>직원소개 검사</div><div>고객분류별 검사수</div>
          <div class="ph" style="font-weight:700; margin-top:8px">검사수</div>
          <div>백내장 검사수</div><div>시력교정 검사</div><div>드림렌즈 신규수</div><div class="ph">…</div>
        </div>
        <div style="flex:1; padding:12px">
          <div class="wf-chart" style="border:1px solid #eaeaec; border-radius:10px; height:120px; padding:10px">
            <div class="ct ph" style="font-size:11px">예약 종합 (콜·온라인)</div>
            <div style="flex:1; border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:80px"></div>
          </div>
          <div class="wf-chart" style="border:1px solid #eaeaec; border-radius:10px; height:120px; padding:10px; margin-top:10px">
            <div class="ct ph" style="font-size:11px">콜 예약 (인콜·아웃콜)</div>
            <div style="flex:1; border-radius:6px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px); margin-top:8px; height:80px"></div>
          </div>
        </div>
      </div>
    </div>
    <p class="shot-cap">좌측 목차는 화면 폭 1520px 이상에서만 나옴. 그 아래에서는 본문만 남음.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>헤더</td><td>제목 · 기준 기간 · 3개년 표기 · <b>데이터 반영일</b></td><td>반영일은 마지막 배치 성공 시각임 — 숫자가 언제 것인지 알려줌</td></tr>
        <tr><td>목차</td><td>그룹 8개 · 도표 31개 · 완료 개수</td><td>클릭하면 해당 도표로 스크롤. <b>인쇄 제외</b></td></tr>
        <tr><td>본문</td><td>도표를 위에서 아래로</td><td>도표마다 3개년 선이 겹침</td></tr>
        <tr><td>CSV</td><td>연도 선택 팝업 → 전체 또는 한 해</td><td>UTF-8 BOM 을 붙임 — 안 붙이면 엑셀에서 한글이 깨짐</td></tr>
        <tr><td>PDF</td><td>브라우저 인쇄</td><td>별도 PDF 라이브러리 없이 <code>window.print()</code> + 인쇄 CSS</td></tr>
        <tr><td>중단 사유</td><td>월 선택이 붙은 도표</td><td>이 도표만 특정 월을 골라 봄</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">인쇄가 1급 기능임</div>
      <p>목차·툴바에 <code>report-no-print</code> 를 걸어 인쇄 영역에서 뺌.
         PDF 가 결과물이므로, 화면에서만 보이는 안내는 <b>인쇄본에서 사라진다</b>는 점을 늘 확인해야 함
         (주차 레포트의 '월' 뱃지가 인쇄용 문구를 따로 두는 이유임).</p>
    </div>
  `,

  s4: `
    <h3>조회 조건이 거의 없음</h3>
    <p>기간 선택기가 없음. 항상 <b>당해연도·전년도·전전년도 3개년</b>을 월별로 보여줌.
       레포트는 "무엇을 볼지 고르는 화면"이 아니라 <b>정해진 판형</b>이기 때문임.</p>
    <table>
      <thead><tr><th>조건</th><th>범위</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td>고정 3개년</td><td><code>CURRENT_YEAR</code> 기준으로 자동 산출</td></tr>
        <tr><td>월</td><td>1~12월 전부</td><td>진행 중인 달은 부분값으로 그려짐</td></tr>
        <tr><td>중단 사유 월</td><td>도표 안에서 선택</td><td>기본값 = 데이터가 있는 마지막 달</td></tr>
        <tr><td>CSV 연도</td><td>전체 또는 한 해</td><td>다운로드 시점에만 고르는 것이라 화면은 안 바뀜</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>도표 31개 · 그룹 8개</h3>
    <table>
      <thead><tr><th>그룹</th><th>도표</th></tr></thead>
      <tbody>
        <tr><td>예약</td><td>예약 종합(콜·온라인) · 콜 예약(인콜·아웃콜) · 온라인 예약(네이버·카카오·홈페이지)</td></tr>
        <tr><td>검사 유입</td><td>일반 고객 검사(소개 제외) · 고객소개 검사 · 직원소개 검사 · 고객분류별 검사수 · 직장인 · 학생 · 기타</td></tr>
        <tr><td>검사수</td><td>백내장 검사수 · 시력교정 검사 · 드림렌즈 신규수 · 드림렌즈 FU수 · 검사수 · 원데이 검사 · 일반 검사</td></tr>
        <tr><td>비율</td><td>일반검사 비율 · 백내장 예약률 · 시력교정 예약률 · 시력교정 일반예약률 · 원데이 예약률</td></tr>
        <tr><td>전환&amp;성공</td><td>시력교정 상담성공률</td></tr>
        <tr><td>중단</td><td>중단율 · 중단 사유</td></tr>
        <tr><td>수술</td><td>총 수술수 · 백내장 수술 · 시력교정 수술 · 재수술(레이저+렌즈) · 수술 상세표</td></tr>
        <tr><td>외래</td><td>외래수</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">지표 정의는 여기서 다시 쓰지 않음</div>
      <p>도표 하나하나의 계산식·집계 단위·날짜 기준은 <a href="../지표정의/README.md">지표정의/</a> 6문서가 정본임.
         레포트는 그 정의를 <b>그리는 화면</b>이고, 정의를 소유하지 않음.
         숫자가 이상하면 레포트가 아니라 해당 지표 문서와 개별 통계 화면을 봄.</p>
    </div>

    <h3>연도별로 데이터의 성격이 다름</h3>
    <table>
      <thead><tr><th>연도</th><th>출처</th><th>성격</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>마트에 심어 둔 <b>레거시 확정값</b>(월 단위)</td><td>이미 확정돼 변하지 않음. <b>주 단위로 쪼갤 수 없음</b></td></tr>
        <tr><td>2026 ~</td><td>배치가 적재한 마트</td><td>T-1 기준으로 매일 갱신됨</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">그래서 주차 레포트와 같은 달의 값이 미세하게 다를 수 있음</div>
      <p>주차 레포트는 전 구간을 <b>일별 집계에서 라이브로</b> 묶음.
         월간의 2024·2025 는 월 단위 확정값이라 애초에 다른 경로임.
         차이가 보이면 버그가 아니라 <b>이 구조 때문</b>일 수 있음 — 먼저 연도를 확인함.</p>
    </div>

    <h3>수치 포맷</h3>
    <table>
      <thead><tr><th>대상</th><th>표기</th></tr></thead>
      <tbody>
        <tr><td>건수</td><td>천 단위 콤마</td></tr>
        <tr><td>비율</td><td>소수점 자릿수를 도표마다 정함(<code>percentFractionDigits</code>)</td></tr>
        <tr><td>없는 값</td><td>선을 끊음 — 0 으로 그리지 않음</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 예약 도표 3개</h3>
    <p>한 행 = 도표(시리즈) 하나임.
       CRM 원천은 2026-06 이후 배치 적재분에만 해당하고, 그 전은 시드 값임.</p>
    <p>API: <code>GET /api/stats/reservation-overall/monthly</code> → <code>mart_reservation_overall_monthly</code>. 2026-06 이후 달은 마트 저장값이 아니라 조회 시점에 채널 마트를 합산함(셀 오버라이드 즉시 반영).</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>예약 종합 (콜, 온라인)</td><td><code>reservations</code></td><td><code>reservations</code></td><td>콜 + 온라인</td><td>온라인이 null 이면 종합도 null(선 끊김). Y축 800~3000 고정</td></tr>
        <tr><td>2</td><td>콜 예약 (인콜, 아웃콜)</td><td><code>call</code></td><td><code>call_count</code></td><td>시력교정 채널 마트 <code>call_reservation</code>(CtiRptLst 검사_예약·추가예약) + <code>tm_reservation</code>(DB_CUSTOM TM_Gubun=1000) + <code>tm_recounsel_reservation</code>(DB_ReCounsel) + 백내장 채널 마트 <code>new_patient</code>(CtiRptLst ★신환·추가예약) + <code>tm_reservation</code></td><td>시드 구간의 원 정의는 <code>RESERVATION.RESERVE_PATH IN ('CTI','CRM')</code></td></tr>
        <tr><td>3</td><td>온라인 예약 (네이버, 카카오, 홈페이지)</td><td><code>online</code></td><td><code>online</code></td><td>시력교정 채널 마트 <code>naver_reservation</code>(RESERVATION PATH=NAVER·FLAG=M·취소 제외) + <code>kakao_reservation</code>(HappyTalk_Counsel_List 수술전·★신환) + <code>mart_list_reservation_homepage</code> COUNT(*)</td><td>홈페이지 마트 커버리지 밖 달은 null. 시드 구간의 원 정의는 <code>RESERVE_PATH IN ('ONLINE','APP','NAVER')</code>(카카오 제외)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 검사 유입 도표 6개</h3>
    <p>조회 경로는 마트 <code>mart_overall_exam_monthly</code> 임.
       소개 3분류 합과 직업 3분류 합은 검사수와 같음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>일반 고객 검사 (소개 제외)</td><td><code>introGeneral</code></td><td><code>intro_general</code></td><td><code>v_all_exam_list.intro_type='일반'</code> ← <code>motive_l</code>(<code>MOTIVE_NEW02.category01_name</code>, Idx='1' 최신 1건)이 소개 3종이 아닌 것(빈 값 포함)</td><td>—</td></tr>
        <tr><td>2</td><td>고객소개 검사</td><td><code>introCustomer</code></td><td><code>intro_customer</code></td><td><code>intro_type='고객소개'</code> ← motive_l IN (소개고객, 소개미확인)</td><td>—</td></tr>
        <tr><td>3</td><td>직원소개 검사</td><td><code>introStaff</code></td><td><code>intro_staff</code></td><td><code>intro_type='직원소개'</code> ← motive_l = 소개직원</td><td>—</td></tr>
        <tr><td>4</td><td>직장인 검사</td><td><code>jobOffice</code></td><td><code>job_office</code></td><td><code>job_bucket='직장인'</code> ← <code>CUSTOM.JOB</code> 문자열 규칙(교사·교수·강사·사무직, 그리고 다른 규칙에 안 걸리는 나머지 전부)</td><td>규칙은 뷰 <code>v_all_exam_list</code>(V56) 한 곳</td></tr>
        <tr><td>5</td><td>학생 검사</td><td><code>jobStudent</code></td><td><code>job_student</code></td><td><code>job_bucket='학생'</code> ← JOB 에 학생·수험생·재수생·초/중/고·대입 등</td><td>—</td></tr>
        <tr><td>6</td><td>기타 검사 (직장인·학생 제외)</td><td><code>jobEtc</code></td><td><code>job_etc</code></td><td><code>job_bucket='기타'</code> ← 빈칸·무직·주부·취업준비·퇴직·군인·사회복무 등</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 고객분류별 검사수 시리즈 9개</h3>
    <p>조회 경로는 마트 <code>mart_exam_count_by_class</code> 이고 당해연도만 조회함.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>소개고객</td><td><code>motiveReport='소개고객'</code> · <code>cnt</code></td><td><code>motive_report</code> · <code>cnt</code></td><td><code>v_all_exam_list.motive_report</code> ← motive_l IN (VIP고객관리팀, 소개고객, 소개미확인)</td><td>배지 색은 전체 검사자 리스트의 내원동기(레포트)와 같음</td></tr>
        <tr><td>2</td><td>소개직원</td><td><code>motiveReport='소개직원'</code></td><td>〃</td><td>motive_l = 소개직원</td><td>—</td></tr>
        <tr><td>3</td><td>B2B(군인)</td><td><code>motiveReport='B2B(군인)'</code></td><td>〃</td><td>motive_l = B2B(군인)</td><td>—</td></tr>
        <tr><td>4</td><td>B2B(기업)</td><td><code>motiveReport='B2B(기업)'</code></td><td>〃</td><td>motive_l IN (B2B(기업), B2B(비앤빛), B2B(백내장), 제휴)</td><td>—</td></tr>
        <tr><td>5</td><td>광고</td><td><code>motiveReport='광고'</code></td><td>〃</td><td>motive_l = 광고</td><td>—</td></tr>
        <tr><td>6</td><td>홈페이지</td><td><code>motiveReport='홈페이지'</code></td><td>〃</td><td>motive_l = 홈페이지</td><td>—</td></tr>
        <tr><td>7</td><td>바이럴</td><td><code>motiveReport='바이럴'</code></td><td>〃</td><td>motive_l = 바이럴</td><td>—</td></tr>
        <tr><td>8</td><td>프로모션</td><td><code>motiveReport='프로모션'</code></td><td>〃</td><td>motive_l = 프로모션</td><td>—</td></tr>
        <tr><td>9</td><td>기타</td><td><code>motiveReport='기타'</code></td><td>〃</td><td>그 밖의 motive_l 전부(빈 값 포함)</td><td>응답에 없는 (월, 분류)는 0, 데이터 없는 월은 null(선 끊김). 응답이 비면 도표가 통째로 빠지고 목차에 미완성 표시. 월 합 = 검사수(라이브 구간)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 검사수 도표 5개</h3>
    <p>조회 경로는 마트 <code>mart_examination_monthly</code> · <code>mart_procedure_exam_monthly</code> 임.
       검사자 리스트와 모집단이 같음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>백내장 검사수</td><td><code>cataract</code></td><td><code>mart_examination_monthly.cataract</code></td><td><code>v_all_exam_list</code> exam_group='백내장' AND cataract_class IN ('백내장','중단') ← <code>list_cataract_exam.classification</code>(RESERVATION FLAG='H' 내원 + <code>CUSTOM.MY_OPTOMETRIST</code> 배정, <code>MY_COUNSELOR='BS0808'</code> 이면 '중단')</td><td>사람 단위. 담당자 재배정으로 과거 달이 소급 변동함 → 2026-01~05 는 V22 골든으로 고정. 응답에 없으면 0</td></tr>
        <tr><td>2</td><td>시력교정 검사</td><td><code>visionCorrection</code></td><td><code>vision_correction</code></td><td>exam_group='시력교정' ← <code>list_exam.exam_category</code>(EXAM 행 중 드림렌즈 전용이 아닌 것; 테스트·순수 외래 유입·백내장 중복 제외)</td><td>—</td></tr>
        <tr><td>3</td><td>검사수</td><td><code>examCount</code></td><td><code>mart_procedure_exam_monthly.exam_count</code></td><td><code>v_all_exam_list</code> COUNT(*) — EXAM 행 + 백내장 세션</td><td><b>원데이 + 일반 = 검사수</b> 가 성립함</td></tr>
        <tr><td>4</td><td>원데이 검사</td><td><code>oneDayExamCount</code></td><td><code>one_day_exam_count</code></td><td>exam_type='원데이' ← <code>list_exam.one_day</code>(검사일 당일 RESERVATION M/5·M/7 내원) · <code>list_cataract_exam.one_day</code>(진료구분 7·9)</td><td>검사일 뒤에 재검사 예약이 등록되면 월 보정 배치가 '일반'으로 뒤집음</td></tr>
        <tr><td>5</td><td>일반 검사</td><td>파생 — <code>examCount − oneDayExamCount</code></td><td>위 두 컬럼의 차</td><td>—</td><td>프론트 계산(<code>useReportSeries.examGeneral</code>)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 비율 도표 5개</h3>
    <p>예약률 2종은 마트에 저장된 비율을 읽고, 나머지 3종은 화면이 원시값을 나눠 만듦.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>일반검사 비율</td><td>파생 — <code>(examCount − oneDayExamCount) / examCount × 100</code></td><td><code>mart_procedure_exam_monthly</code> 두 컬럼</td><td>—</td><td>프론트 계산. examCount 0 이면 null. 정수 % 표시</td></tr>
        <tr><td>2</td><td>백내장 예약률 (수술예약건/검사자)</td><td><code>reservationRate</code> — <code>GET /api/stats/cataract-reservation-rate/trend?category=cataract</code></td><td><code>mart_reservation_rate_monthly.reservation_rate</code> (category='cataract')</td><td>분모 = <code>v_all_exam_list</code> 백내장(백내장·중단 분류) chart_no × 월 유니크 ; 분자 = 그중 브릿지 <code>RESERVATION FLAG='O'·JINRYO='4'·STATE&lt;&gt;'C'·RESERVE_DATE ≥ 그 달 첫 검사일</code> 보유자</td><td>배치는 소수 1자리로 저장, 화면은 <b>올림(Math.ceil)</b> 정수. examCount 0 이면 null. 24·25 V13 시드(비율만, 분모·분자 없음)</td></tr>
        <tr><td>3</td><td>시력교정 예약률 (수술예약건/검사자)</td><td><code>reservationRate</code> — 같은 API, <code>category=vision</code></td><td>같은 표, category='vision'</td><td>분모 = <code>v_all_exam_list</code> 시력교정 세션 중 순수 외래 제외(당일 M 예약 or 이후 O 예약 or 이후 수술) ; 분자 = 브릿지 O 예약(STATE&lt;&gt;'C') 보유 세션</td><td>위와 같음</td></tr>
        <tr><td>4</td><td>시력교정 일반예약률 (수술예약건/검사자)</td><td><code>visionGeneralBookRate</code> — <code>GET /api/stats/consultation-rate/trend</code></td><td><code>mart_consultation_rate_monthly.vision_general_book_rate</code></td><td>분모 = <code>list_exam</code> 세션 중 one_day='N'(cancel_code 빈 것) ; 분자 = 그중 브릿지 O 예약 보유</td><td>배치 소수 1자리, 화면 정수 반올림. 24·25 는 V18 시드(이 컬럼만 값이 있음)</td></tr>
        <tr><td>5</td><td>원데이 예약률 (수술예약건/검사자)</td><td>파생 — <code>oneDayBooked / oneDay × 100</code> — <code>GET /api/stats/overall-exam/monthly</code></td><td><code>mart_overall_exam_monthly.one_day_booked</code> / <code>one_day</code></td><td><code>v_all_exam_list</code> exam_type='원데이' ; booked = <code>surgery_reserve_date &lt;&gt; ''</code>(리스트 적재 시점의 O 예약)</td><td>프론트 계산. 브릿지가 아니라 리스트 스냅샷이라 적재 이후 생긴 예약은 다음 재적재 때 반영됨. oneDay 0 이면 null</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 시력교정 상담성공률 시리즈 3개</h3>
    <p>조회 경로는 마트 <code>mart_consultation_rate_monthly</code> 이고 당해연도만 그림.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>전체 성공률</td><td><code>visionCounselRate</code></td><td><code>vision_counsel_rate</code></td><td>분모(상담) = <code>list_exam</code> 세션 중 exam_stop&lt;&gt;'Y' AND 추천(<code>recommended_r/l</code>) 있음, cancel_code 빈 것 ; 분자 = 그중 브릿지 O 예약(STATE&lt;&gt;'C') 보유</td><td><code>visionCounselCount</code> &gt; 0 인 달만 그림 — 24·25 는 count 가 0 이라 선이 없음. 정수 % 표시</td></tr>
        <tr><td>2</td><td>원데이</td><td><code>visionCounselRateOneday</code></td><td><code>vision_counsel_rate_oneday</code></td><td>위 상담 중 one_day='Y' 세션</td><td>—</td></tr>
        <tr><td>3</td><td>일반</td><td><code>visionCounselRateGeneral</code></td><td><code>vision_counsel_rate_general</code></td><td>위 상담 중 one_day='N' 세션</td><td>레거시 대비 일부 월 ~5%p 차(산정 시점차)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 중단 도표: 중단율 1개 · 중단 사유 막대 8개</h3>
    <p>중단율은 종합지표 마트 값을 화면이 나누고, 중단 사유는 <code>mart_stop_reason_monthly</code> 를 읽음.
       둘 다 시력교정 중단만 셈.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>중단율</td><td>파생 — <code>stopCount / visionExam × 100</code></td><td><code>mart_overall_exam_monthly.stop_count</code> / <code>vision_exam</code></td><td><code>v_all_exam_list</code> exam_group='시력교정' AND stop_yn='Y' ← <code>EXAM.STOP_YN</code></td><td>소수 1자리 %. 값 있는 연도만 범례에 올림(<code>stopRateYears</code>)</td></tr>
        <tr><td>2</td><td>기타</td><td><code>other</code></td><td><code>other</code></td><td><code>v_all_exam_list.stop_reason_bucket='other'</code> ← <code>EXAM.CANCEL_CD</code> 107·199·117·304·127·311 + 미지 코드·코드 없음</td><td>잠정 중단(연한 파랑). 새 코드가 생기면 여기로 조용히 흘러들어 기타만 부풂</td></tr>
        <tr><td>3</td><td>불가-녹내장</td><td><code>glaucoma</code></td><td><code>glaucoma</code></td><td>CANCEL_CD 114·303</td><td>잠정 중단</td></tr>
        <tr><td>4</td><td>불가-시력변화</td><td><code>visionChange</code></td><td><code>vision_change</code></td><td>CANCEL_CD 111·302</td><td>잠정 중단</td></tr>
        <tr><td>5</td><td>불가-수술권유X</td><td><code>recommendX</code></td><td><code>recommend_x</code></td><td>CANCEL_CD 121·305</td><td>수술 불가(진한 파랑)</td></tr>
        <tr><td>6</td><td>불가-렌즈삽입불가</td><td><code>lensImpossible</code></td><td><code>lens_impossible</code></td><td>CANCEL_CD 122·306·399</td><td>수술 불가</td></tr>
        <tr><td>7</td><td>불가-원추각막</td><td><code>keratoconus</code></td><td><code>keratoconus</code></td><td>CANCEL_CD 124·125·308·309(원추각막·의심)</td><td>수술 불가</td></tr>
        <tr><td>8</td><td>불가-아벨리노</td><td><code>avellino</code></td><td><code>avellino</code></td><td>CANCEL_CD 126·310</td><td>수술 불가</td></tr>
        <tr><td>9</td><td>월 중단합계</td><td><code>total</code></td><td><code>total</code></td><td>7버킷 합</td><td>선택 월에 데이터가 없으면 전부 0 으로 그림. CSV 는 선택 월 열만 채우고 나머지 월은 빈칸. raw EXAM 대비 리스트 필터 4종만큼 월 최대 4건 적음(정상)</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 수술 도표 4개</h3>
    <p>조회 경로는 마트 <code>mart_surgery_monthly</code> 이고 2026-05 이전은 시드 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>총 수술수</td><td><code>total</code></td><td><code>total</code></td><td>시력교정(사람 × 수술일) + 백내장(눈) + 재수술(건)의 합</td><td>2026-01~05 는 프론트 상수 <code>SURGERY_GOLDEN</code> 이 마트값보다 우선(수술 3종). 같은 사람·같은 날이 수술과 재수술에 각각 잡히는 중복은 레거시와 같이 허용</td></tr>
        <tr><td>2</td><td>백내장 수술</td><td><code>cataractPatients</code></td><td><code>cataract_patients</code></td><td><code>list_surgery</code> 백내장 행(<code>Cataract_Operationdata.OPERATIONR/L</code>) 눈 단위 COUNT(*)</td><td>이름은 Patients 지만 <b>눈 단위</b>. 양안 같은 날이면 2</td></tr>
        <tr><td>3</td><td>시력교정 수술</td><td><code>visionPatients</code></td><td><code>vision_patients</code></td><td><code>list_surgery</code> 시력교정 행(<code>OPERATIONDATA.OPERATIONR/L</code>) DISTINCT chart_no × 수술일</td><td>사람 단위</td></tr>
        <tr><td>4</td><td>재수술 (레이저+렌즈)</td><td><code>reoperation</code></td><td><code>reoperation</code></td><td><code>list_reoperation</code> ← <code>RE_OPERATION</code>(REASON_CD 01·07·10 제외, 시술명 Irrigation 제외, 시술명 없는 행 제외) + 화면 저장 판정(<code>reoperation_decision</code>) 우선</td><td>건 단위. 골든 상수 없음 — 마트값 그대로</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 수술 상세표 28개</h3>
    <p>같은 마트를 당해연도 표로 펼친 것.
       시력교정은 사람 단위, 백내장은 눈 단위이며 0 은 빈칸으로 보임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>월</td><td><code>month</code></td><td><code>mo</code></td><td>—</td><td>미래 월·total 0 인 달 제외</td></tr>
        <tr><td>2</td><td>총수술</td><td><code>total</code></td><td><code>total</code></td><td>수술 도표 #1 과 같음</td><td>이 표는 마트값 그대로(프론트 골든 상수 미적용). 2026-01~05 는 V35 마트 골든 — 도표의 <code>SURGERY_GOLDEN</code> 과 같은 값인지 확인 필요</td></tr>
        <tr><td>3</td><td>시력교정</td><td><code>visionPatients</code></td><td><code>vision_patients</code></td><td>수술 도표 #3 과 같음</td><td>사람</td></tr>
        <tr><td>4</td><td>라섹</td><td><code>lasek</code></td><td><code>lasek</code></td><td>op_type='lasek' ← 시술명에 EYECLE·T-prk·EYE CLE·EYE+·FLAP PRK·PtK·M-LE</td><td>사람</td></tr>
        <tr><td>5</td><td>라섹EX</td><td><code>lasekEx</code></td><td><code>lasek_ex</code></td><td>addon_lasek_ex ← EYECLE 이면서 EX500</td><td>라섹의 하위 구분</td></tr>
        <tr><td>6</td><td>라섹RED</td><td><code>lasekRed</code></td><td><code>lasek_red</code></td><td>EYECLE 이면서 RED</td><td>라섹의 하위 구분</td></tr>
        <tr><td>7</td><td>라식</td><td><code>lasik</code></td><td><code>lasik</code></td><td>FLAP LIFT·OPTI·iFS·VISU·fs200·Micro+·Hybrid</td><td>—</td></tr>
        <tr><td>8</td><td>스마일</td><td><code>smile</code></td><td><code>smile</code></td><td>SMILE (Pro 가 아닌 것)</td><td>—</td></tr>
        <tr><td>9</td><td>스마일프로</td><td><code>smilePro</code></td><td><code>smile_pro</code></td><td>SMILE Pro·SMILEpro·SMILE PRO</td><td>—</td></tr>
        <tr><td>10</td><td>프레스비욘드</td><td><code>presbyond</code></td><td><code>presbyond</code></td><td>PRESBYOND — 다른 표기와 섞여도 최우선</td><td>노안 레이저. 옛 응답에는 없을 수 있어 optional</td></tr>
        <tr><td>11</td><td>PIOL</td><td><code>piolPatients</code></td><td><code>piol_patients</code></td><td>op_type IN (icl, tIcl, kpl, tKpl, viva) 실인원</td><td>ICL~VIVA 5종 합과 같아야 함(같지 않으면 대표유형 판정 문제)</td></tr>
        <tr><td>12</td><td>ICL</td><td><code>icl</code></td><td><code>icl</code></td><td>ICL·IPCL·ARF·ART·ARTIFLEX·GLAZE·ECHO — 환자당 대표유형(우안 우선) 1건</td><td>—</td></tr>
        <tr><td>13</td><td>T-ICL</td><td><code>tIcl</code></td><td><code>t_icl</code></td><td>T-ICL·T-IPCL·T-GLAZE·T-ECHO (ICL 보다 먼저 판정)</td><td>—</td></tr>
        <tr><td>14</td><td>KPL</td><td><code>kpl</code></td><td><code>kpl</code></td><td>KPL</td><td>—</td></tr>
        <tr><td>15</td><td>T-KPL</td><td><code>tKpl</code></td><td><code>t_kpl</code></td><td>T-KPL (KPL 보다 먼저 판정)</td><td>—</td></tr>
        <tr><td>16</td><td>VIVA</td><td><code>viva</code></td><td><code>viva</code></td><td>VIVA</td><td>—</td></tr>
        <tr><td>17</td><td>엑스트라</td><td><code>xtra</code></td><td><code>xtra</code></td><td>시술명에 +X</td><td>부가시술(사람). 유형과 중복 계상됨</td></tr>
        <tr><td>18</td><td>퍼스널</td><td><code>personal</code></td><td><code>personal</code></td><td>P.E</td><td>부가시술</td></tr>
        <tr><td>19</td><td>콘트라</td><td><code>contra</code></td><td><code>contra</code></td><td>CONT</td><td>부가시술</td></tr>
        <tr><td>20</td><td>웨이브비전</td><td><code>waveVision</code></td><td><code>wave_vision</code></td><td>W.V</td><td>부가시술</td></tr>
        <tr><td>21</td><td>모노비전</td><td><code>monoVision</code></td><td><code>mono_vision</code></td><td>MONO 로 시작</td><td>부가시술</td></tr>
        <tr><td>22</td><td>재수술</td><td><code>reoperation</code></td><td><code>reoperation</code></td><td>수술 도표 #4 와 같음</td><td>건</td></tr>
        <tr><td>23</td><td>재수술레이저</td><td><code>reopLaser</code></td><td><code>reop_laser</code></td><td>재수술 중 is_lens = false</td><td>렌즈/레이저 판정은 적재 시 자바(<code>ReoperationOverlay.LENS_PATTERNS</code>)가 넣은 값</td></tr>
        <tr><td>24</td><td>재수술렌즈</td><td><code>reopLens</code></td><td><code>reop_lens</code></td><td>재수술 중 is_lens = true</td><td>레이저 + 렌즈 = 재수술</td></tr>
        <tr><td>25</td><td>백내장</td><td><code>cataractPatients</code></td><td><code>cataract_patients</code></td><td>수술 도표 #2 와 같음</td><td>눈</td></tr>
        <tr><td>26</td><td>다초점</td><td><code>catMulti</code></td><td><code>cat_multi</code></td><td>Clareon·Panoptix·RESTOR·Lara·LISA·CTR(M)·CTRmulti·3PodF·T-CTR·T-CATARACT·Precizon·LAL·ELANA·Gemetric</td><td>눈</td></tr>
        <tr><td>27</td><td>단초점</td><td><code>catMono</code></td><td><code>cat_mono</code></td><td>K-flex·Kflex, 그리고 어느 패턴에도 안 걸리는 나머지</td><td>눈</td></tr>
        <tr><td>28</td><td>EDOF</td><td><code>catEdof</code></td><td><code>cat_edof</code></td><td>EDOF·Vivity·Eyhance·PureSee·Isopure·Symfony (백내장 중 최우선)</td><td>눈. 다초점 + 단초점 + EDOF = 백내장</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 외래 도표 1개 · 헤더 1개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>외래수</td><td><code>outpatientCount</code> — <code>GET /api/stats/outpatient-count/monthly</code></td><td><code>mart_outpatient_count_monthly.outpatient_count</code></td><td><code>list_outpatient</code> COUNT(*) ← <code>RESERVATION</code> FLAG='F' AND STATE IN ('I','H'), 테스트 고객 제외</td><td>예약일 기준. 24·25 V9, 2026-01~05 V27</td></tr>
        <tr><td>2</td><td>데이터 반영일 (헤더)</td><td><code>targetDate</code> — <code>GET /api/batch/last-success</code></td><td><code>batch_run_log.target_to</code></td><td>—</td><td>run_type='DAILY'·status='SUCCESS' 최신 1건이 커버한 날짜(D-1). 없으면 헤더에 안 붙음</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>진행 중인 달</b></td><td>마지막 점이 뚝 떨어짐</td><td>부분값임. 헤더의 데이터 반영일과 함께 읽어야 함</td></tr>
        <tr><td><b>스냅샷 드리프트</b></td><td>지난달 값이 나중에 달라짐</td><td>원천이 고객당 1행을 덮어쓰는 구조임. 월 마감 스냅샷 방침으로 대응 예정(<a href="../db/지표정의.md">db/지표정의.md §3</a>)</td></tr>
        <tr><td><b>2024·2025 는 월 단위 고정</b></td><td>주차로 못 쪼갬</td><td>레거시 확정값이라 원천 자체가 없음</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 것은 안 들어옴</td><td>레포트 용도상 문제되지 않음</td></tr>
        <tr><td><b>인쇄 레이아웃</b></td><td>브라우저·용지에 따라 도표가 잘릴 수 있음</td><td><code>window.print()</code> + CSS 이므로 브라우저 인쇄 설정에 의존함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>월 마감 시점</td><td>어느 시점의 값을 그 달의 확정값으로 볼지. 정해지면 드리프트가 사라짐</td></tr>
        <tr><td>도표 추가·삭제 절차</td><td>지금은 <code>reportItems.tsx</code> 하나를 고치면 월간·주차에 동시에 반영됨. 한쪽만 필요할 때의 규칙이 없음</td></tr>
        <tr><td>레포트 확정본 보관</td><td>PDF 를 사람이 저장함. 발행본을 시스템이 남길지</td></tr>
      </tbody>
    </table>
  `,
}
