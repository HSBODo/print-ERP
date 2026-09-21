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

    <h3>컬럼 정의 — 51개</h3>
    <p>화면 51열 = API 응답 49필드 + 화면 계산 2열(No · 만나이).
       조회 경로는 마트 <code>list_exam</code> 이고, 엑셀 원본 열 대응은 <a href="../db/검사자리스트-컬럼정의.md">컬럼 정의 문서</a> 참조.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>No</td><td>—</td><td>—</td><td>—</td><td>행 번호(페이지 반영). 우측 정렬. 정렬 시 원래 조회 순서 기준</td></tr>
        <tr><td>2</td><td>검사일</td><td><code>examDate</code></td><td><code>exam_date</code></td><td><code>EXAM.EXAM_DATE</code></td><td><b>조회 기준 날짜</b>. 행 1개 = <code>EXAM</code> 1건. 마트는 <code>DATE</code>, 응답은 <code>YYYY-MM-DD</code> 문자열. 조회 범위 최대 366일</td></tr>
        <tr><td>3</td><td>검사분류</td><td><code>examCategory</code></td><td><code>exam_category</code></td><td>파생 — 같은 날 <code>RESERVATION</code>(<code>STATE IN ('I','H')</code>)에 <code>FLAG='D'</code> 만 있고 <code>FLAG='M'</code> 이 없으면 '드림렌즈', 그 외 '시력교정'</td><td>배지 2색. 필터 바의 전체/시력교정/드림렌즈는 이 값으로 클라이언트 필터</td></tr>
        <tr><td>4</td><td>신/구환</td><td><code>patientType</code></td><td><code>patient_type</code></td><td><code>CUSTOM.FIRST_DAY</code> 가 적재 범위(<code>:from~:to</code>) 안이면 '신환', 아니면 '구환'</td><td><b>마트 적재 시점 값</b> — 화면 조회 기간이 아니라 배치 적재 범위 기준. 재적재 범위가 달라지면 같은 사람이 신환↔구환으로 바뀔 수 있음. 배지</td></tr>
        <tr><td>5</td><td>진료구분</td><td><code>examType</code></td><td><code>exam_type</code></td><td><code>MEDICAL_SUB_CFG.SUB_NAME</code>(<code>RESERVE_FLAG='M'</code>, <code>SUB_FLAG=RESERVE_JINRYO</code>) — 그날 최신 M 예약. 없으면 코드→라벨(1 검사 · 5 검사OP · 4 DNA검사 · 2 재검사 · 6 당일재검사 · 7 검사OP(Re)), 그 외 코드 그대로</td><td>예약이 없으면 응답 <code>''</code> 인데 화면 <code>formatExamType</code> 이 <code>''</code>→'검사' 로 그리므로 <b>빈 값이 '검사' 로 보임</b>. 배지. 진료구분 필터 옵션은 응답값에서 만듦. 정렬·CSV 는 라벨 기준</td></tr>
        <tr><td>6</td><td>검사시간</td><td><code>examTime</code></td><td><code>exam_time</code></td><td><code>RESERVATION.START_TIME</code>(그날 최신 M 예약)</td><td>예약 없으면 빈 값</td></tr>
        <tr><td>7</td><td>차트번호</td><td><code>chartNo</code></td><td><code>chart_no</code></td><td><code>CUSTOM.CUST_NUM</code>(양끝 공백 제거)</td><td>CSV 텍스트 강제(앞 0 보존). 검색어 대상(부분 일치)</td></tr>
        <tr><td>8</td><td>고객명</td><td><code>name</code></td><td><code>name</code></td><td><code>CUSTOM.CUST_NAME</code></td><td>화면 원문, <b>CSV 만 마스킹</b>(홍*동). 검색어 대상. '테스트'·'test' 포함 고객은 적재 시 제외</td></tr>
        <tr><td>9</td><td>고객명(영)</td><td><code>nameEng</code></td><td><code>name_eng</code></td><td><code>CUSTOM.CUST_ENAME</code></td><td>CSV 마스킹 같음. 검색 대상 아님</td></tr>
        <tr><td>10</td><td>등급</td><td><code>grade</code></td><td><code>grade</code></td><td><code>CUSTOM.LEVEL</code></td><td>배지 R·A·B·C·G, 그 외 값은 회색</td></tr>
        <tr><td>11</td><td>생년월일</td><td><code>birth</code></td><td><code>birth</code></td><td><code>CUSTOM.BIRTH_DAY</code></td><td>문자열 그대로. 만나이의 원천</td></tr>
        <tr><td>12</td><td>만나이</td><td>—</td><td>—</td><td><code>birth</code> 화면 파생(<code>calcAge</code>)</td><td><code>YYYY-MM-DD</code> 형식이 아니거나 0~129 밖이면 대시. 정렬은 숫자. CSV 는 <b>내려받은 날 기준</b></td></tr>
        <tr><td>13</td><td>양/음</td><td><code>lunar</code></td><td><code>lunar</code></td><td><code>CUSTOM.LUNAR_YN</code></td><td><code>'Y'</code> → 음, 그 외 양(빈 값 없음)</td></tr>
        <tr><td>14</td><td>휴대전화</td><td><code>phone2</code></td><td><code>phone2</code></td><td><code>CUSTOM.CALL_NUM2</code></td><td>CSV 마스킹(010-****-5678) + 텍스트 강제. 검색어 대상</td></tr>
        <tr><td>15</td><td>집전화</td><td><code>phone1</code></td><td><code>phone1</code></td><td><code>CUSTOM.CALL_NUM1</code></td><td>CSV 마스킹 + 텍스트 강제. 검색 대상 아님</td></tr>
        <tr><td>16</td><td>이메일</td><td><code>email</code></td><td><code>email</code></td><td><code>CUSTOM.EMAIL</code></td><td>한 줄로 자름. CSV 원문</td></tr>
        <tr><td>17</td><td>상담사</td><td><code>counselor</code></td><td><code>counselor</code></td><td><code>CUSTOM.MY_COUNSELOR</code> → <code>EMPLOYEE.EMP_NAME</code></td><td rowspan="3">고객 마스터의 현재 담당자 기준(검사 당시 담당 아님). 재배정되면 과거 달 값도 재적재 시 바뀜</td></tr>
        <tr><td>18</td><td>상담의</td><td><code>doctor</code></td><td><code>doctor</code></td><td><code>CUSTOM.MY_DOCTOR</code> → <code>EMPLOYEE.EMP_NAME</code></td></tr>
        <tr><td>19</td><td>검안사</td><td><code>optometrist</code></td><td><code>optometrist</code></td><td><code>CUSTOM.MY_OPTOMETRIST</code> → <code>EMPLOYEE.EMP_NAME</code></td></tr>
        <tr><td>20</td><td>적절수술R</td><td><code>recommendedR</code></td><td><code>recommended_r</code></td><td><code>EXAM.OPERATIONR</code></td><td rowspan="2">빈 값 대시</td></tr>
        <tr><td>21</td><td>적절수술L</td><td><code>recommendedL</code></td><td><code>recommended_l</code></td><td><code>EXAM.OPERATIONL</code></td></tr>
        <tr><td>22</td><td>수술예약일</td><td><code>surgeryReserveDate</code></td><td><code>surgery_reserve_date</code></td><td><code>RESERVATION.RESERVE_DATE</code> — <code>FLAG='O'</code> · <code>STATE&lt;&gt;'C'</code>, <code>RESERVE_NUM</code> 최댓값 1건</td><td><b>검사일과 무관한 고객의 최신 수술예약</b>. 진료구분 제한 없음(백내장 수술예약도 잡힘). 빈 값 대시</td></tr>
        <tr><td>23</td><td>수술일</td><td><code>surgeryDate</code></td><td><code>surgery_date</code></td><td><code>OPERATIONDATA.OPERATION_DATE</code></td><td rowspan="4"><code>OPERATIONDATA</code> 를 <code>CUST_NUM</code> 만으로 LEFT JOIN — 검사일 무관. 수술 기록이 여럿인 고객은 <b>검사 1건이 여러 행으로 늘 수 있음</b> — 확인 필요. 빈 값 대시</td></tr>
        <tr><td>24</td><td>수술방법R</td><td><code>surgeryR</code></td><td><code>surgery_r</code></td><td><code>OPERATIONDATA.OPERATIONR</code></td></tr>
        <tr><td>25</td><td>수술방법L</td><td><code>surgeryL</code></td><td><code>surgery_l</code></td><td><code>OPERATIONDATA.OPERATIONL</code></td></tr>
        <tr><td>26</td><td>집도의</td><td><code>surgeon</code></td><td><code>surgeon</code></td><td><code>OPERATIONDATA.OPERATION_DOC</code> → <code>EMPLOYEE.EMP_NAME</code></td></tr>
        <tr><td>27</td><td>견적가</td><td><code>estimate</code></td><td><code>estimate</code></td><td><code>EXAM.OP_ESTIMATE</code></td><td>텍스트 그대로(숫자 아님). 한 줄로 자름</td></tr>
        <tr><td>28</td><td>수술가율</td><td><code>surgeryRate</code></td><td><code>surgery_rate</code></td><td><code>EXAM.ExamPercent</code></td><td>문자열 그대로. 빈 값 대시</td></tr>
        <tr><td>29</td><td>수납금액</td><td><code>payment</code></td><td><code>payment</code></td><td><code>COSTPRICE</code>·<code>CSTPRCSUB</code>·<code>PRCITMLST</code>·<code>PrcItmDtl</code> 결제 집계 <code>RECEIPT</code>(<code>COST_FLAG O/I/H</code>, <code>PayStt&lt;&gt;'A'</code>)</td><td><b>고객 누적 합계</b>(검사일 무관). 천단위 콤마 문자열, 0 이면 빈 값. 우측 정렬. 차트번호 <code>9999999999999</code> 는 집계 제외</td></tr>
        <tr><td>30</td><td>수술불가</td><td><code>opImpossible</code></td><td><code>op_impossible</code></td><td><code>EXAM.OP_POSSIBLE_YN</code></td><td><b>Y 만 빨갛게</b>, 그 외 대시. 원천 컬럼명은 '가능' 이지만 레거시 원장의 수술불가구분과 같은 컬럼임. 백내장판은 <code>Impossible</code></td></tr>
        <tr><td>31</td><td>검사중단</td><td><code>examStop</code></td><td><code>exam_stop</code></td><td><code>EXAM.STOP_YN</code></td><td>Y 만 빨갛게. 중단 집계(<code>select-stop-reason-daily-agg.sql</code>)도 이 마트 컬럼을 셈</td></tr>
        <tr><td>32</td><td>취소사유</td><td><code>cancelCode</code></td><td><code>cancel_code</code></td><td><code>EXAM.CANCEL_CD</code>(양끝 공백 제거)</td><td>코드 그대로(이름 변환 없음). 빈 값 대시</td></tr>
        <tr><td>33</td><td>취소메모</td><td><code>cancelMemo</code></td><td><code>cancel_memo</code></td><td><code>EXAM.CANCEL_REASON</code>, 없으면 <code>CANCEL_CFG.CANCEL_REASON</code>(← <code>CANCEL_CD</code>)</td><td>한 줄로 자름</td></tr>
        <tr><td>34</td><td>예약경로</td><td><code>route</code></td><td><code>route</code></td><td><code>RESERVATION.RESERVE_PATH</code>(그날 최신 M 예약)</td><td>빈 값 대시</td></tr>
        <tr><td>35</td><td>섹션</td><td><code>section</code></td><td><code>section</code></td><td><code>MOTIVE_NEW02.section</code>(<code>cust_num</code> 일치 · <code>Idx='1'</code> · <code>pkey</code> 최댓값 1건)</td><td rowspan="5">고객 단위 최신 내원동기 1건 — 검사일과 무관. 빈 값 대시</td></tr>
        <tr><td>36</td><td>내원동기(대)</td><td><code>motiveL</code></td><td><code>motive_l</code></td><td><code>MOTIVE_NEW02.category01_name</code></td></tr>
        <tr><td>37</td><td>내원동기(중)</td><td><code>motiveM</code></td><td><code>motive_m</code></td><td><code>MOTIVE_NEW02.category02_name</code></td></tr>
        <tr><td>38</td><td>내원동기(세)</td><td><code>motiveS</code></td><td><code>motive_s</code></td><td><code>MOTIVE_NEW02.category03_name</code></td></tr>
        <tr><td>39</td><td>동기메모</td><td><code>motiveMemo</code></td><td><code>motive_memo</code></td><td><code>MOTIVE_NEW01.comments</code>(← <code>MOTIVE_NEW02.fkey</code>), 없으면 <code>MOTIVE_NEW02.name</code></td></tr>
        <tr><td>40</td><td>직업</td><td><code>job</code></td><td><code>job</code></td><td><code>CUSTOM.JOB</code></td><td>원문 그대로</td></tr>
        <tr><td>41</td><td>국적</td><td><code>nationality</code></td><td><code>nationality</code></td><td><code>NationCustom_CFG.Nation_CodeName</code>(← <code>CUSTOM.Nation_code</code>)</td><td>—</td></tr>
        <tr><td>42</td><td>보험사</td><td><code>insurance</code></td><td><code>insurance</code></td><td><code>EtcCfg.EtcCodNam</code>(<code>EtcBseCod='InsuranceCfg'</code>, ← <code>CUSTOM.InsuranceCode</code>)</td><td>—</td></tr>
        <tr><td>43</td><td>주민번호</td><td><code>jumin</code></td><td><code>jumin</code></td><td>—(적재 SQL 이 <code>''</code> 고정)</td><td><b>항상 빈 값</b>(PII). CSV 마스킹 함수·텍스트 강제는 걸려 있으나 값이 없음</td></tr>
        <tr><td>44</td><td>우편번호</td><td><code>zip</code></td><td><code>zip</code></td><td><code>CUSTOM.ZIP_CODE</code>(양끝 공백 제거)</td><td>CSV 텍스트 강제</td></tr>
        <tr><td>45</td><td>주소1</td><td><code>addr1</code></td><td><code>addr1</code></td><td><code>CUSTOM.ADDR1</code></td><td rowspan="2">한 줄로 자름. CSV 는 마스킹 없이 원문(<code>maskAddress</code> 는 있으나 미적용)</td></tr>
        <tr><td>46</td><td>주소2</td><td><code>addr2</code></td><td><code>addr2</code></td><td><code>CUSTOM.ADDR2</code></td></tr>
        <tr><td>47</td><td>검사예약등록일</td><td><code>examRegDate</code></td><td><code>exam_reg_date</code></td><td>그날 최신 M 예약 <code>RESERVE_NUM</code> 앞 6자리(YYMMDD) → <code>YYYY-MM-DD</code></td><td>예약번호 규칙에서 역산. 6자리 미만·예약 없음이면 빈 값 대시</td></tr>
        <tr><td>48</td><td>수술예약등록일</td><td><code>surgeryRegDate</code></td><td><code>surgery_reg_date</code></td><td>O 예약(#22 와 같은 행) <code>RESERVE_NUM</code> 앞 6자리</td><td>같음</td></tr>
        <tr><td>49</td><td>최근내원일</td><td><code>lastVisit</code></td><td><code>last_visit</code></td><td><code>CUSTOM.LAST_DAY</code></td><td>적재 시점 값</td></tr>
        <tr><td>50</td><td>검사특이사항</td><td><code>examMemo</code></td><td><code>exam_memo</code></td><td><code>EXAM.EXAM_MEMO</code></td><td>한 줄로 자름. '테스트'·'test' 포함 메모는 행 제외가 아니라 <b>원데이 판정(<code>one_day</code>)에서만 제외</b></td></tr>
        <tr><td>51</td><td>고객메모</td><td><code>memo</code></td><td><code>memo</code></td><td><code>CUSTOM.ETC</code></td><td>한 줄로 자름</td></tr>
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
