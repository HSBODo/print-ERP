export default {
  s2: `
    <h3>레거시 종합표를 그대로 재현한 화면</h3>
    <p>병원이 오래 써 온 <b>「총검사자」 종합표(35칼럼)</b>가 원본임.
       검사자 수와 그 구성(소개유형·직업), 예약률·중단율·검사 비율·원데이 성공률을
       <b>한 표에 가로로 늘어놓은</b> 형태 그대로 옮겼음.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월 마감 확인</td><td>한 달의 검사·예약·중단을 한 줄로 읽음</td></tr>
        <tr><td>연도 비교</td><td>2024부터의 모든 달이 한 표에 세로로 쌓여 있음</td></tr>
        <tr><td>다른 화면 검증</td><td>레포트·리스트의 숫자가 이 표의 칸과 맞는지 봄</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
      <p>개인정보는 없지만 <b>경영 지표를 한 장에 다 편</b> 화면이라 관리자에게만 열림.</p>
    </div>

    <div class="note">
      <div class="h">이 표가 다른 화면의 기준점임</div>
      <p><a href="all-exam-list.html">전체 검사자 리스트</a>는 <b>이 표의 칸을 명단으로 펴려고</b> 만든 화면임.
         토글별 조회건수가 이 표의 값과 맞아야 함.</p>
    </div>
  `,

  s3: `
    <p>툴바 한 줄 + 표 하나. 컬럼이 35개라 <b>2단 머리글</b>(그룹 → 칼럼)로 묶었음.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>조회 연도</span>
        <span class="seg"><span class="on">전체</span><span>2024</span><span>2025</span><span>2026</span></span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="2">연월</th><th rowspan="2">총검사자</th>
              <th colspan="3">소개유형</th><th colspan="3">직업</th>
              <th colspan="2">시력교정 수술예약</th><th colspan="6">백내장</th><th colspan="2">중단</th><th>…</th>
            </tr>
            <tr>
              <th>일반고객</th><th>고객소개</th><th>직원소개</th>
              <th>직장인</th><th>학생</th><th>기타</th>
              <th>예약</th><th>예약률<br/>(중단포함)</th>
              <th>전체<br/>(노안포함)</th><th>백내장 만</th><th>중단제외</th><th>예약</th><th>예약률</th><th>전환률</th>
              <th>중단수</th><th>중단율</th><th>…</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-06</td><td>1,412</td><td>1,180</td><td>172</td><td>60</td>
              <td>948</td><td>331</td><td>133</td><td>604</td><td>49.8%</td>
              <td>98</td><td>52</td><td class="ph"></td><td>31</td><td>59.6%</td><td>31.6%</td>
              <td>77</td><td>6.3%</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2026-07</td><td>1,349</td><td>1,131</td><td>158</td><td>60</td>
              <td>902</td><td>318</td><td>129</td><td>571</td><td>48.9%</td>
              <td>102</td><td>56</td><td class="ph"></td><td>34</td><td>60.7%</td><td>33.3%</td>
              <td>71</td><td>6.1%</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2026-08 <span class="pill st-wait" style="font-size:10px">진행중</span></td>
              <td>1,041</td><td>872</td><td>121</td><td>48</td>
              <td>701</td><td>240</td><td>100</td><td>438</td><td>48.2%</td>
              <td>79</td><td>41</td><td class="ph"></td><td>25</td><td>61.0%</td><td>31.6%</td>
              <td>55</td><td>6.1%</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">그룹 9개 · 칼럼 35개. 「…」 뒤로 검사 건수 5칸 · 검사 비율 5칸 · 원데이/일반검사 8칸이 이어짐. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>조회 연도</td><td>전체 · 2024 · 2025 · … · 올해</td><td>연도 목록은 <b>2024부터 올해까지 자동</b>으로 늘어남</td></tr>
        <tr><td>표</td><td>2단 머리글 · 35칼럼 · 행 = 연월</td><td>그룹이 바뀌는 자리에 구분선</td></tr>
        <tr><td>진행중 표시</td><td>부분 집계인 달에 표시</td><td>월중 스냅샷임을 알림</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">조회 버튼이 없음</div>
      <p>전 연도를 한 번에 받아 두고 <b>연도 필터는 화면에서</b> 거름.
         행이 연·월 단위라 데이터량이 작아서 가능한 구조임.</p>
    </div>
  `,

  s4: `
    <h3>조회 조건은 연도 하나뿐</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도 목록</td><td>서버</td><td>2024 ~ 올해. <code>GET /api/stats/overall-exam/monthly?years=…</code></td></tr>
        <tr><td>연도 필터</td><td>화면</td><td>전체 또는 한 해</td></tr>
      </tbody>
    </table>
    <p>기간 선택기·검색·정렬이 없음. <b>고정 판형의 표</b>이지 탐색 화면이 아님.</p>
  `,

  s5: `
    <div class="note">
      <div class="h">지표 정의의 정본</div>
      <p>35칼럼 하나하나의 뜻과 검증 이력은 <a href="../db/지표정의.md">db/지표정의.md §6</a> 가 정본임.
         흐름별 요약은 <a href="../지표정의/2-검사.md">지표정의/2-검사.md</a>.
         여기서는 <b>어디까지가 원시값이고 어디부터가 화면 계산인지</b>를 밝힘.</p>
    </div>

    <h3>원시값 vs 화면 계산 — 경계가 중요함</h3>
    <p>마트(<code>mart_overall_exam_monthly</code>)에는 <b>정수 카운트만</b> 들어 있음.
       예약률·비율·성공률 같은 <b>파생 산식은 전부 화면이 계산</b>함.
       그래서 산식을 고치면 배치를 다시 돌릴 필요 없이 화면만 배포하면 되지만,
       <b>API 를 직접 호출하는 쪽은 비율을 받지 못함</b>.</p>

    <h3>컬럼 정의 — 37개</h3>
    <p>조회 경로는 마트 <code>mart_overall_exam_monthly</code> 임.
       비율 칼럼은 화면이 계산하므로 응답 필드와 마트 컬럼이 없음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>연도</td><td><code>year</code></td><td><code>yr</code></td><td>—</td><td>행 키 (<code>yr</code>, <code>mo</code>). 연도가 바뀌는 행에 굵은 구분선. 왼쪽 고정 열</td></tr>
        <tr><td>2</td><td>월</td><td><code>month</code> · <code>partial</code></td><td><code>mo</code> · <code>partial</code></td><td>—</td><td>「N월」. <code>partial=true</code> 면 「N월*」. 배치가 오늘이 속한 달만 <code>true</code> 로 적재(월중 부분 집계)</td></tr>
        <tr><td>3</td><td>총검사자</td><td><code>totalExam</code></td><td><code>total_exam</code></td><td><code>EXAM</code> 행(시력교정·드림렌즈) + <code>RESERVATION</code>(<code>RESERVE_FLAG='H'</code>) 고객×<code>RESERVE_DATE</code>(백내장)</td><td><code>v_all_exam_list</code> 행 수. 테스트 고객·순수 외래·백내장 H 예약만 있는 날의 EXAM 행은 제외. <a href="all-exam-list.html">전체 검사자 리스트</a> 「전체」 건수와 같아야 함</td></tr>
        <tr><td>4</td><td>일반고객</td><td><code>introGeneral</code></td><td><code>intro_general</code></td><td><code>MOTIVE_NEW02.category01_name</code>(<code>Idx='1'</code> 최신) 이 소개고객·소개미확인·소개직원이 아닌 것</td><td><code>intro_type='일반'</code>. 잔차 분류라 3분류 합 = 총검사자</td></tr>
        <tr><td>5</td><td>고객소개</td><td><code>introCustomer</code></td><td><code>intro_customer</code></td><td><code>MOTIVE_NEW02.category01_name</code> ∈ {소개고객, 소개미확인}</td><td>소개미확인을 고객소개에 편입(레거시 정합)</td></tr>
        <tr><td>6</td><td>직원소개</td><td><code>introStaff</code></td><td><code>intro_staff</code></td><td><code>MOTIVE_NEW02.category01_name</code> = 소개직원</td><td></td></tr>
        <tr><td>7</td><td>직장인</td><td><code>jobOffice</code></td><td><code>job_office</code></td><td><code>CUSTOM.JOB</code> 문자열 롤업(<code>job_bucket</code>)</td><td>교사·교수·강사·사무직 + 학생·기타 패턴에 안 걸리는 나머지 전부(기본값). 3분류 합 = 총검사자</td></tr>
        <tr><td>8</td><td>학생</td><td><code>jobStudent</code></td><td><code>job_student</code></td><td><code>CUSTOM.JOB</code> 에 학생·수험생·재수생·초/중/고 N·대학 예정·졸업 예정 등</td><td></td></tr>
        <tr><td>9</td><td>기타</td><td><code>jobEtc</code></td><td><code>job_etc</code></td><td><code>CUSTOM.JOB</code> 이 공란·무직·주부·가사·취업준비·군인·사회복무·퇴직·휴직 등</td><td></td></tr>
        <tr><td>10</td><td>예약 (시력교정 수술예약)</td><td><code>visionBooked</code></td><td><code>vision_booked</code></td><td>시력교정 행 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td><code>surgery_reserve_date<>''</code>. 최신 O 예약 1건 기준이라 예약일이 검사일 이후인지는 보지 않음. 24·25 는 V16 백필값</td></tr>
        <tr><td>11</td><td>예약률(중단포함)</td><td>—</td><td>—</td><td>—</td><td>화면 산식 <code>visionBooked ÷ visionExam</code>. 주간판은 분모가 <code>visionExam + stopCount</code> 로 다름 — 확인 필요</td></tr>
        <tr><td>12</td><td>전체(노안포함)</td><td><code>cataractTotal</code></td><td><code>cataract_total</code></td><td><code>RESERVATION</code>(<code>RESERVE_FLAG='H'</code>, <code>RESERVE_JINRYO<>'3'</code>, <code>RESERVE_SEQ<>3</code>, <code>RESERVE_STATE</code> ∉ {C, Y}) 고객×검사일</td><td><code>exam_group='백내장'</code> 행 수 = 백내장 리스트 전체(백내장·중단·노안/FU·기타). 2024 시드는 만 + 노안2 로 재구성한 값</td></tr>
        <tr><td>13</td><td>백내장 만</td><td><code>cataractOnly</code></td><td><code>cataract_only</code></td><td><code>Cataract_Exam.OPERATIONR</code> / <code>OPERATIONL</code> 비공란 수(0~2)의 합 — 분류 백내장·중단 세션만</td><td><b>눈 수 단위</b>. 분류는 <code>CUSTOM.MY_OPTOMETRIST</code>·<code>MY_COUNSELOR</code> 배정 여부로 가름. 월간 레포트 백내장 검사수와 같아야 함</td></tr>
        <tr><td>14</td><td>중단제외</td><td>—</td><td>—</td><td>—</td><td>항상 공란. 마트에 원시값 없음(뷰의 <code>cataract_class='백내장'</code> 만 세면 나오지만 배치가 싣지 않음)</td></tr>
        <tr><td>15</td><td>예약 (백내장)</td><td><code>cataractBooked</code></td><td><code>cataract_booked</code></td><td>백내장·중단 세션(눈 수 > 0) 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_JINRYO='4'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td><b>사람 단위</b>(눈 수 아님)</td></tr>
        <tr><td>16</td><td>예약률 (백내장)</td><td>—</td><td>—</td><td>—</td><td><code>cataractBooked ÷ cataractOnly</code>. 분자 사람·분모 눈 수</td></tr>
        <tr><td>17</td><td>전환률</td><td>—</td><td>—</td><td>—</td><td><code>cataractBooked ÷ cataractTotal</code>. 주간판은 공란(정의 미확정)</td></tr>
        <tr><td>18</td><td>중단수</td><td><code>stopCount</code></td><td><code>stop_count</code></td><td><code>EXAM.STOP_YN='Y'</code> (시력교정 행만)</td><td>24·25 와 2026-01~05 는 시드(레거시 중단율에서 역산한 값)</td></tr>
        <tr><td>19</td><td>중단율</td><td>—</td><td>—</td><td>—</td><td><code>stopCount ÷ visionExam</code></td></tr>
        <tr><td>20</td><td>시력교정 (검사 건수)</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td><code>EXAM</code> 행 중 그날 <code>RESERVATION</code> M 예약 내원 또는 수술 연계(O 예약·<code>OPERATIONDATA</code>) 보유. 그날 D 예약만 있으면 제외</td><td><code>exam_group='시력교정'</code>. 백내장 H 예약만으로 내원한 날의 EXAM 행, 측정값 전부 공란 + <code>Cataract_Exam</code> 있는 행, 테스트 고객 제외</td></tr>
        <tr><td>21</td><td>드림렌즈</td><td><code>dreamlens</code></td><td><code>dreamlens</code></td><td><code>EXAM</code> 행 중 그날 <code>RESERVATION</code> D 예약 있고 M 예약 없음</td><td><code>exam_group='드림렌즈'</code></td></tr>
        <tr><td>22</td><td>백내장 (검사 건수)</td><td><code>cataractOnly</code></td><td><code>cataract_only</code></td><td>13 과 동일</td><td>「백내장 만」을 다시 표시</td></tr>
        <tr><td>23</td><td>노안2</td><td>—</td><td>—</td><td>—</td><td><code>cataractTotal − cataractOnly</code> (노안/FU + 기타 몫)</td></tr>
        <tr><td>24</td><td>합계</td><td>—</td><td>—</td><td>—</td><td><code>visionExam + dreamlens + cataractTotal</code> (= 시력교정 + 드림렌즈 + 백내장 만 + 노안2). 2026-06 이후 총검사자와 같아야 함</td></tr>
        <tr><td>25</td><td>시력교정 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>visionExam ÷ 합계</code></td></tr>
        <tr><td>26</td><td>드림렌즈 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>dreamlens ÷ 합계</code></td></tr>
        <tr><td>27</td><td>노안</td><td>—</td><td>—</td><td>—</td><td>고정 <code>0.0%</code>. 현재 분류에 노안 단독 건이 없음</td></tr>
        <tr><td>28</td><td>백내장 (검사 비율)</td><td>—</td><td>—</td><td>—</td><td><code>cataractOnly ÷ 합계</code></td></tr>
        <tr><td>29</td><td>노안2+5대질환</td><td>—</td><td>—</td><td>—</td><td><code>노안2 ÷ 합계</code></td></tr>
        <tr><td>30</td><td>시력교정 (원데이/일반검사)</td><td><code>visionExam</code></td><td><code>vision_exam</code></td><td>20 과 동일</td><td>「검사 건수 시력교정」을 다시 표시</td></tr>
        <tr><td>31</td><td>원데이</td><td><code>oneDay</code></td><td><code>one_day</code></td><td>시력교정: 같은날 <code>RESERVATION</code> M 예약의 <code>RESERVE_JINRYO</code> ∈ {5, 7} / 백내장: 그날 H 예약의 <code>RESERVE_JINRYO</code> ∈ {7, 9}</td><td><code>exam_type='원데이'</code>. <b>백내장 원데이 포함</b>. 드림렌즈는 항상 일반. 24·25 시드는 시력교정 원데이만</td></tr>
        <tr><td>32</td><td>원데이예약</td><td><code>oneDayBooked</code></td><td><code>one_day_booked</code></td><td>원데이 행 중 <code>RESERVATION</code>(<code>RESERVE_FLAG='O'</code>, <code>RESERVE_STATE<>'C'</code>) 보유</td><td>「7일 이내 수술」이 아니라 O 예약 존재 기준(2026-08-06 확정). 24·25 와 2026-01~05 는 성공률에서 역산한 시드</td></tr>
        <tr><td>33</td><td>일반검사</td><td>—</td><td>—</td><td>—</td><td><code>visionExam − oneDay</code>. <code>oneDay</code> 에 백내장 원데이가 섞여 있어 순수 시력교정 일반검사와 어긋날 수 있음 — 확인 필요</td></tr>
        <tr><td>34</td><td>일반검사예약</td><td>—</td><td>—</td><td>—</td><td><code>visionBooked − oneDayBooked</code>. 33 과 같은 이유로 확인 필요</td></tr>
        <tr><td>35</td><td>일반검사비율</td><td>—</td><td>—</td><td>—</td><td><code>일반검사 ÷ visionExam</code></td></tr>
        <tr><td>36</td><td>원데이성공률</td><td>—</td><td>—</td><td>—</td><td><code>oneDayBooked ÷ oneDay</code></td></tr>
        <tr><td>37</td><td>일반성공률</td><td>—</td><td>—</td><td>—</td><td><code>일반검사예약 ÷ 일반검사</code></td></tr>
      </tbody>
    </table>
    <p>비율은 분모가 0 이면 <b>0% 가 아니라 공란</b>, 소수점 1자리. 정수는 천 단위 구분만 입힘. 정렬·CSV 내보내기 없음.
       같은 응답 필드를 두 칸에 쓰는 자리(22·30)는 값이 항상 같음.</p>

    <div class="note warn">
      <div class="h">지금 비어 있는 칸 둘</div>
      <ul>
        <li><b>백내장 「중단제외」</b> — 마트에 원시값이 없어 항상 공란임.</li>
        <li><b>검사 비율 「노안」</b> — 현재 분류에서 해당 건이 0 이라 <code>0.0%</code> 로 고정돼 있음.</li>
      </ul>
      <p>둘 다 레거시 표의 칸을 그대로 남겨 둔 자리임 — 없애면 표 모양이 원본과 달라짐.</p>
    </div>

    <h3>연도별 데이터 출처</h3>
    <table>
      <thead><tr><th>연도</th><th>출처</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>마트 시드(V14 + V16 레거시 확정값). 배치는 min-year=2026 가드로 쓰지 않음</td></tr>
        <tr><td>2026-01 ~ 05</td><td>V27 골든 시드(총검사자·소개유형·직업·시력교정·원데이·원데이예약·중단수). 배치가 이 다섯 달은 건너뛰므로 나머지 컬럼(시력교정 예약·백내장·드림렌즈)에 값이 있는지 확인 필요</td></tr>
        <tr><td>2026-06 ~</td><td>배치(<code>OverallMartJob</code>)가 매일 적재하는 마트</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>「중단제외」 공란</b></td><td>백내장 그룹의 한 칸이 늘 비어 있음</td><td>마트에 원시값이 없음. 넣으려면 배치·마트 스키마부터 바꿔야 함</td></tr>
        <tr><td><b>「노안」 비율 고정 0</b></td><td>항상 <code>0.0%</code></td><td>현재 분류 규칙에서 해당 건이 없음. 분류가 바뀌면 살아남</td></tr>
        <tr><td><b>비율이 API 에 없음</b></td><td>API 응답에는 카운트만 있음</td><td>화면이 계산함. 외부에서 쓰려면 같은 산식을 다시 구현해야 함</td></tr>
        <tr><td><b>진행 중인 달</b></td><td>마지막 행이 작음</td><td>부분 집계 표시를 확인함</td></tr>
        <tr><td><b>스냅샷 드리프트</b></td><td>지난달 값이 나중에 달라짐</td><td>월 마감 스냅샷 방침으로 대응 예정</td></tr>
      </tbody>
    </table>

    <h3>지켜야 할 불변식</h3>
    <div class="note">
      <ul>
        <li>총검사자 = <a href="all-exam-list.html">전체 검사자 리스트</a> 「전체」 조회건수</li>
        <li>검사 건수 백내장 = 전체 검사자 리스트 「백내장」 토글 = 월간 레포트 백내장 검사수</li>
        <li>합계 = 시력교정 + 드림렌즈 + 백내장 전체 (노안2 포함)</li>
      </ul>
    </div>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>빈 칸 둘의 처리</td><td>채울지, 표에서 뺄지. 빼면 레거시 표와 모양이 달라져 대조가 어려워짐</td></tr>
        <tr><td>파생 산식의 위치</td><td>화면에 두면 API 사용자가 못 받고, 마트에 두면 산식 변경마다 재적재가 필요함</td></tr>
        <tr><td>주간판과의 값 차이</td><td><a href="overall-exam-weekly.html">주간 종합지표</a>는 전 구간 라이브라 24·25 가 다름 — 어느 쪽을 정본으로 쓸지</td></tr>
      </tbody>
    </table>
  `,
}
