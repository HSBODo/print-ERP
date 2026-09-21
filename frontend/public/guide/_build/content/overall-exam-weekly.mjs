export default {
  s2: `
    <h3>월별 종합지표의 주 단위 판</h3>
    <p><a href="overall-exam.html">월별 검사자 종합지표</a>와 <b>같은 9블록 35칼럼</b>을 주(월~일) 단위로 봄.
       칼럼 정의·순서·파생 산식이 전부 같고, <b>가로 축의 단위와 데이터 경로만</b> 다름.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월 중간 점검</td><td>달이 끝나기 전에 흐름이 어느 쪽인지 봄</td></tr>
        <tr><td>주 단위 이상 탐지</td><td>월 합계로는 상쇄돼 안 보이는 특정 주의 급변을 찾음</td></tr>
        <tr><td>월 합계 검증</td><td><b>그 달 주 합계 = 월별 표의 그 달 값</b>이어야 함</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
      <p>월별판과 같은 이유임 — 경영 지표를 한 장에 다 폄.</p>
    </div>
  `,

  s3: `
    <p>월별판과 같은 2단 머리글 표. 행이 연월 대신 <b>연·월·주차</b>임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>조회 연도</span>
        <span class="seg"><span>2024</span><span>2025</span><span class="on">2026</span></span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="2">주</th><th rowspan="2">기간</th><th rowspan="2">총검사자</th>
              <th colspan="3">소개유형</th><th colspan="3">직업</th>
              <th colspan="2">시력교정 수술예약</th><th colspan="2">중단</th><th>…</th>
            </tr>
            <tr>
              <th>일반고객</th><th>고객소개</th><th>직원소개</th>
              <th>직장인</th><th>학생</th><th>기타</th>
              <th>예약</th><th>예약률<br/>(중단포함)</th>
              <th>중단수</th><th>중단율</th><th>…</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2026-08 1주</td><td>08.01~08.09</td><td>318</td><td>266</td><td>37</td><td>15</td><td>214</td><td>73</td><td>31</td><td>134</td><td>48%</td><td>17</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 2주</td><td>08.10~08.16</td><td>261</td><td>219</td><td>30</td><td>12</td><td>176</td><td>60</td><td>25</td><td>110</td><td>48%</td><td>14</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 3주</td><td>08.17~08.23</td><td>274</td><td>230</td><td>31</td><td>13</td><td>184</td><td>63</td><td>27</td><td>116</td><td>49%</td><td>15</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 4주 <span class="pill st-wait" style="font-size:10px">진행중</span></td><td>08.24~08.30</td><td>88</td><td>74</td><td>10</td><td>4</td><td>59</td><td>20</td><td>9</td><td>37</td><td>42%</td><td>5</td><td>6%</td><td class="ph">…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">1주의 기간이 08.01~08.09 인 것에 주목 — 1일이 토요일이라 선행 부분 구간을 첫 정규 주에 합쳤음(4장). 숫자는 예시임.</p>

    <h3>월별판과 다른 점</h3>
    <table>
      <thead><tr><th>영역</th><th>월별</th><th>주간</th></tr></thead>
      <tbody>
        <tr><td>행 단위</td><td>연·월</td><td>연·월·주차 + 기간 표기</td></tr>
        <tr><td>연도 선택</td><td>전체 · 연도별</td><td><b>연도 하나</b>만 (행이 4~5배로 늘어남)</td></tr>
        <tr><td>데이터 경로</td><td>24·25 는 마트 시드</td><td><b>전 구간 운영 DB 라이브 집계</b></td></tr>
        <tr><td>비율 자릿수</td><td>소수점 1자리</td><td>기본 정수(%)</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>주 정의 — ISO 주차가 아님</h3>
    <div class="note bad">
      <div class="h">⚠️ 주차 레포트의 주차와 다른 규칙임</div>
      <p><a href="weekly-report.html">주차 레포트</a>는 <b>ISO 8601 연간 주차</b>(첫 목요일이 든 주가 1주차, 한 해 52/53주)를 씀.<br />
         이 화면은 <b>그 달의 주차</b>임 — 월 경계에서 잘라 각 달에 귀속시킴.
         이름이 비슷하다고 같은 주로 읽으면 안 됨.</p>
    </div>

    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>주의 시작</td><td>월요일 ~ 일요일</td></tr>
        <tr><td>월 경계</td><td>걸친 주는 <b>각 달로 잘라</b> 귀속. 그래야 월 합계 = 그 달 주 합계가 성립함</td></tr>
        <tr><td>선행 부분 구간</td><td>1일부터 첫 월요일 직전까지는 <b>첫 정규 주에 합쳐</b> 1주로 만듦</td></tr>
        <tr><td>부분 주</td><td><b>마지막 주만</b> 부분일 수 있음</td></tr>
      </tbody>
    </table>
    <p>예) 2026-02 은 1일이 일요일이라 1주 = 02.01~02.08, 2주 = 02.09~02.15 … 로 잡힘.
       정의의 정본은 <a href="../db/지표정의.md">db/지표정의.md §6</a>.</p>

    <h3>조회 조건</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td><code>GET /api/stats/overall-exam/weekly</code> — 한 해씩</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>칼럼은 월별판과 같음</h3>
    <p>그룹 9개 · 칼럼 35개 · 파생 산식 전부 <a href="overall-exam.html">월별 검사자 종합지표 5장</a>과 동일함.
       원시 카운트를 백엔드가 주고 <b>비율은 화면이 계산</b>하는 구조도 같음.</p>

    <h3>다른 것은 데이터 경로 하나임</h3>
    <table>
      <thead><tr><th>연도</th><th>월별판</th><th>주간판</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>마트 시드 (레거시 확정값, 월 단위)</td><td rowspan="2"><b>배치가 원천 리스트(<code>v_all_exam_list</code>)를 주 단위로 다시 센 마트</b>(<code>mart_overall_exam_weekly</code>) — 레거시 시드 없음. 현재 경로는 아래 참고</td></tr>
        <tr><td>2026 ~</td><td>배치 적재 마트</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">그래서 24·25 는 두 화면 값이 다를 수 있음</div>
      <p>월별판의 24·25 는 <b>레거시가 확정한 숫자</b>이고, 주간판은 <b>지금 규칙으로 원천을 다시 센 값</b>임.
         집계 규칙이 그 사이 바뀐 만큼 차이가 남. 버그가 아니라 <b>정의의 역사</b>임.</p>
    </div>

    <div class="note">
      <div class="h">2026 이후는 맞아야 함</div>
      <p>같은 규칙·같은 원천이므로 <b>그 달 주 합계 = 월별판 그 달 값</b>이 성립해야 함.
         안 맞으면 주 경계 처리나 배치 적재를 의심함.</p>
    </div>

    <div class="note">
      <div class="h">현재 코드의 실제 경로 — 마트를 읽음</div>
      <p>화면은 <code>GET /api/stats/overall-exam/weekly</code> → <code>mart_overall_exam_weekly</code>(PK <code>yr, mo, wk</code>) 를 읽음.
         마트는 월별판과 같은 <code>OverallMartJob</code> 이 Postgres 뷰 <code>v_all_exam_list</code> 를 일별 집계해 주(월~일, 월 경계 클립)로 묶어 적재함.
         MSSQL 을 직접 읽는 <code>OverallExamWeeklyService</code>(<code>sql/softcrm/overall/*-daily.sql</code> 6종)는 대사(reconcile) 용으로만 남아 있음.
         주간 적재에는 월별판의 min-year 가드가 없지만 <code>v_all_exam_list</code> 에 2026-01 이후 행만 있어 24·25 주간 행이 실제로 채워지는지는 <b>확인 필요</b>.</p>
    </div>

    <h3>컬럼 정의 — 39개</h3>
    <p>조회 경로는 마트 <code>mart_overall_exam_weekly</code> 임.
       비율 칼럼은 화면이 계산하므로 응답 필드와 마트 컬럼이 없음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>연도</td><td><code>year</code></td><td><code>yr</code></td><td>—</td><td>행 키 (<code>yr</code>, <code>mo</code>, <code>wk</code>). 연도가 바뀌는 행에 굵은 구분선. 왼쪽 고정 열</td></tr>
        <tr><td>2</td><td>월</td><td><code>month</code></td><td><code>mo</code></td><td>—</td><td>「N월」. 달이 바뀌는 행에 가는 구분선</td></tr>
        <tr><td>3</td><td>주</td><td><code>week</code> · <code>partial</code></td><td><code>wk</code> · <code>partial</code></td><td>—</td><td>「N주」. 그 달 안의 주차(1부터). <code>partial=true</code> 면 「N주*」 — 2주 이후에서 7일이 안 되는 마지막 주만 해당(1주는 선행 구간을 합쳐 부분 주로 보지 않음)</td></tr>
        <tr><td>4</td><td>기간</td><td><code>startDate</code> · <code>endDate</code></td><td><code>start_date</code> · <code>end_date</code></td><td>—</td><td>「MM.DD~MM.DD」. 월 경계에서 잘린 실제 구간. 1주 = 1일 ~ 첫 일요일</td></tr>
        <tr><td>5</td><td>총검사자</td><td><code>totalExam</code></td><td><code>total_exam</code></td><td><code>EXAM</code> 행(시력교정·드림렌즈) + <code>RESERVATION</code>(<code>RESERVE_FLAG='H'</code>) 고객×<code>RESERVE_DATE</code>(백내장)</td><td><code>v_all_exam_list</code> 행 수를 검사일 기준으로 주에 귀속. 그 달 주 합계 = 월별판 그 달 값이어야 함</td></tr>
        <tr><td>6</td><td>일반고객</td><td><code>introGeneral</code></td><td><code>intro_general</code></td><td><code>MOTIVE_NEW02.category01_name</code>(<code>Idx='1'</code> 최신) 이 소개고객·소개미확인·소개직원이 아닌 것</td><td>잔차 분류. 3분류 합 = 총검사자</td></tr>
        <tr><td>7</td><td>고객소개</td><td><code>introCustomer</code></td><td><code>intro_customer</code></td><td><code>MOTIVE_NEW02.category01_name</code> ∈ {소개고객, 소개미확인}</td><td></td></tr>
        <tr><td>8</td><td>직원소개</td><td><code>introStaff</code></td><td><code>intro_staff</code></td><td><code>MOTIVE_NEW02.category01_name</code> = 소개직원</td><td></td></tr>
        <tr><td>9</td><td>직장인</td><td><code>jobOffice</code></td><td><code>job_office</code></td><td><code>CUSTOM.JOB</code> 롤업(<code>job_bucket</code>) — 교사·교수·강사·사무직 + 나머지 기본값</td><td>3분류 합 = 총검사자</td></tr>
        <tr><td>10</td><td>학생</td><td><code>jobStudent</code></td><td><code>job_student</code></td><td><code>CUSTOM.JOB</code> 학생·수험생·초/중/고 N·대학 예정 등 패턴</td><td></td></tr>
        <tr><td>11</td><td>기타</td><td><code>jobEtc</code></td><td><code>job_etc</code></td><td><code>CUSTOM.JOB</code> 공란·무직·주부·취업준비·군인·퇴직 등</td><td></td></tr>
        <tr><td>12</td><td>예약 (시력교정 수술예약)</td><td><code>visionBooked</code></td><td><code>vision_booked</code></td><td>시력교정 행 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td><code>surgery_reserve_date<>''</code>. 예약일이 검사일 이후인지는 보지 않음</td></tr>
        <tr><td>13</td><td>예약률(중단포함)</td><td>—</td><td>—</td><td>—</td><td><code>visionBooked ÷ (visionExam + stopCount)</code>. <b>월별판(÷ visionExam)과 분모가 다름</b> — 확인 필요. 정수 %</td></tr>
        <tr><td>14</td><td>전체(노안포함)</td><td><code>cataractTotal</code></td><td><code>cataract_total</code></td><td><code>RESERVATION</code>(<code>RESERVE_FLAG='H'</code>, <code>RESERVE_JINRYO<>'3'</code>, <code>RESERVE_SEQ<>3</code>, <code>RESERVE_STATE</code> ∉ {C, Y}) 고객×검사일</td><td><code>exam_group='백내장'</code> 행 수 = 백내장 리스트 전체(4분류). 화면 각주의 「Cataract_Exam 세션수」는 옛 정의임</td></tr>
        <tr><td>15</td><td>백내장 만</td><td><code>cataractOnly</code></td><td><code>cataract_only</code></td><td><code>Cataract_Exam.OPERATIONR</code> / <code>OPERATIONL</code> 비공란 수(0~2)의 합 — 분류 백내장·중단 세션만</td><td><b>눈 수 단위</b>. 분류는 <code>CUSTOM.MY_OPTOMETRIST</code>·<code>MY_COUNSELOR</code> 배정 여부</td></tr>
        <tr><td>16</td><td>중단제외</td><td>—</td><td>—</td><td>—</td><td>항상 공란. 마트에 원시값 없음</td></tr>
        <tr><td>17</td><td>예약 (백내장)</td><td><code>cataractBooked</code></td><td><code>cataract_booked</code></td><td>백내장·중단 세션(눈 수 > 0) 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_JINRYO='4'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td><b>사람 단위</b></td></tr>
        <tr><td>18</td><td>예약률 (백내장)</td><td>—</td><td>—</td><td>—</td><td><code>cataractBooked ÷ cataractOnly</code>. 정수 %</td></tr>
        <tr><td>19</td><td>전환률</td><td>—</td><td>—</td><td>—</td><td><b>항상 공란</b>(정의 미확정). 월별판은 <code>cataractBooked ÷ cataractTotal</code> 로 채움</td></tr>
        <tr><td>20</td><td>중단수</td><td><code>stopCount</code></td><td><code>stop_count</code></td><td><code>EXAM.STOP_YN='Y'</code> (시력교정 행만)</td><td></td></tr>
        <tr><td>21</td><td>중단율</td><td>—</td><td>—</td><td>—</td><td><code>stopCount ÷ visionExam</code>. 소수점 1자리</td></tr>
        <tr><td>22</td><td>시력교정 (검사 건수)</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td><code>EXAM</code> 행 중 그날 <code>RESERVATION</code> M 예약 내원 또는 수술 연계(O 예약·<code>OPERATIONDATA</code>) 보유. 그날 D 예약만 있으면 제외</td><td><code>exam_group='시력교정'</code>. 백내장 H 예약만으로 내원한 날의 EXAM 행·측정값 공란 + <code>Cataract_Exam</code> 있는 행·테스트 고객 제외</td></tr>
        <tr><td>23</td><td>드림렌즈</td><td><code>dreamlens</code></td><td><code>dreamlens</code></td><td><code>EXAM</code> 행 중 그날 <code>RESERVATION</code> D 예약 있고 M 예약 없음</td><td><code>exam_group='드림렌즈'</code></td></tr>
        <tr><td>24</td><td>백내장 (검사 건수)</td><td><code>cataractOnly</code></td><td><code>cataract_only</code></td><td>15 와 동일</td><td>「백내장 만」을 다시 표시</td></tr>
        <tr><td>25</td><td>노안2</td><td>—</td><td>—</td><td>—</td><td><code>cataractTotal − cataractOnly</code></td></tr>
        <tr><td>26</td><td>합계</td><td>—</td><td>—</td><td>—</td><td><code>visionExam + dreamlens + cataractOnly + 노안2</code> (= 시력교정 + 드림렌즈 + 백내장 전체)</td></tr>
        <tr><td>27</td><td>시력교정 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>visionExam ÷ 합계</code>. 소수점 1자리</td></tr>
        <tr><td>28</td><td>드림렌즈 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>dreamlens ÷ 합계</code>. 소수점 1자리</td></tr>
        <tr><td>29</td><td>노안</td><td>—</td><td>—</td><td>—</td><td>고정 <code>0.0%</code></td></tr>
        <tr><td>30</td><td>백내장 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>cataractOnly ÷ 합계</code>. 소수점 1자리</td></tr>
        <tr><td>31</td><td>노안2+5대질환</td><td>—</td><td>—</td><td>—</td><td><code>노안2 ÷ 합계</code>. 소수점 1자리</td></tr>
        <tr><td>32</td><td>시력교정 (원데이/일반검사)</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td>22 와 동일</td><td>「검사 건수 시력교정」을 다시 표시</td></tr>
        <tr><td>33</td><td>원데이</td><td><code>oneDay</code></td><td><code>one_day</code></td><td>시력교정: 같은날 <code>RESERVATION</code> M 예약의 <code>RESERVE_JINRYO</code> ∈ {5, 7} / 백내장: 그날 H 예약의 <code>RESERVE_JINRYO</code> ∈ {7, 9}</td><td><code>exam_type='원데이'</code>. <b>백내장 원데이 포함</b>. 드림렌즈는 항상 일반</td></tr>
        <tr><td>34</td><td>원데이예약</td><td><code>oneDayBooked</code></td><td><code>one_day_booked</code></td><td>원데이 행 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td>O 예약 존재 기준. DTO 주석의 「7일 이내 수술」은 옛 정의임</td></tr>
        <tr><td>35</td><td>일반검사</td><td>—</td><td>—</td><td>—</td><td><code>visionExam − oneDay</code>. <code>oneDay</code> 에 백내장 원데이가 섞여 있어 순수 시력교정 일반검사와 어긋날 수 있음 — 확인 필요</td></tr>
        <tr><td>36</td><td>일반검사예약</td><td>—</td><td>—</td><td>—</td><td><code>visionBooked − oneDayBooked</code>. 35 와 같은 이유로 확인 필요</td></tr>
        <tr><td>37</td><td>일반검사비율</td><td>—</td><td>—</td><td>—</td><td><code>일반검사 ÷ visionExam</code>. 정수 %</td></tr>
        <tr><td>38</td><td>원데이성공률</td><td>—</td><td>—</td><td>—</td><td><code>oneDayBooked ÷ oneDay</code>. 정수 %</td></tr>
        <tr><td>39</td><td>일반성공률</td><td>—</td><td>—</td><td>—</td><td><code>일반검사예약 ÷ 일반검사</code>. 정수 %</td></tr>
      </tbody>
    </table>
    <p>비율은 분모가 0 이면 공란. 자릿수는 칼럼마다 다름 — 중단율·검사 비율 5종은 소수점 1자리, 나머지는 정수 %.
       정수는 천 단위 구분. 정렬·CSV 내보내기 없음. 데이터가 있는 주만 행으로 나오고 빈 미래 주는 없음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>24·25 가 월별판과 다름</b></td><td>같은 달인데 합계가 안 맞음</td><td>경로가 다름(5장). 과거 값 대조에는 월별판을 씀</td></tr>
        <tr><td><b>주차 개념 혼동</b></td><td>주차 레포트와 주 번호가 어긋남</td><td>규칙이 다름(4장). 두 화면의 주를 직접 비교하면 안 됨</td></tr>
        <tr><td><b>라이브 집계 부하</b></td><td>조회가 마트보다 느릴 수 있음</td><td>주 단위 분해가 마트에 없어 원천을 읽음</td></tr>
        <tr><td><b>진행 중인 주</b></td><td>마지막 주가 작음</td><td>부분 주는 마지막 하나뿐임</td></tr>
        <tr><td><b>빈 칸 둘</b></td><td>「중단제외」·「노안」 비율</td><td>월별판과 같은 이유임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>주차 개념 통일</td><td>ISO 와 '그 달의 주차'가 공존함. 통일하면 월 합계 = 주 합계가 깨지거나, 주차 레포트의 연간 축이 깨짐 — <b>둘 다 못 가짐</b></td></tr>
        <tr><td>24·25 주 단위 복원</td><td>레거시 확정값을 주로 쪼갤 원천이 있는지</td></tr>
        <tr><td>마트화</td><td>주 단위 집계를 마트에 넣을지. 넣으면 빨라지지만 주 경계 규칙이 배치에 박힘</td></tr>
      </tbody>
    </table>
  `,
}
