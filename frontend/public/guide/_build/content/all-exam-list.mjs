export default {
  s2: `
    <h3>왜 리스트가 또 있는가</h3>
    <p>검사자 리스트는 시력교정, 백내장 검사자 리스트는 백내장 — 각각 <b>레거시 화면을 그대로 옮긴</b> 원장임.
       그래서 둘을 더해도 <b>레포트 숫자와 바로 맞지 않음</b>. 이 화면은 그 반대 방향으로 만들었음:
       <b>레포트가 세는 모집단을 먼저 정하고</b>, 그 모집단의 명단을 그대로 폄.</p>

    <div class="note">
      <div class="h">이 화면의 존재 이유는 한 문장임</div>
      <p>토글을 눌렀을 때의 <b>조회건수가 월별 검사자 종합지표의 칸 값과 같아야 함</b>.
         숫자가 안 맞을 때 "어느 사람이 더 세어졌나"를 여기서 폄.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>레포트 숫자 검증</td><td>검사구분·내원동기·직업 토글을 눌러 종합지표 칸과 건수를 맞춤</td></tr>
        <tr><td>구성 확인</td><td>신/구환 · 소개구분 · 직업구분 · 원데이 비중을 명단 단위로 봄</td></tr>
        <tr><td>백내장 경계 확인</td><td>백내장 102건 중 레포트에 들어가는 56건이 어느 분류인지 갈라 봄</td></tr>
      </tbody>
    </table>

    <h3>세 리스트의 역할 분담</h3>
    <table>
      <thead><tr><th>화면</th><th>모집단</th><th>맞춰야 할 대상</th><th>컬럼</th></tr></thead>
      <tbody>
        <tr><td><a href="exam-list.html">검사자 리스트</a></td><td>시력교정(<code>EXAM</code>)</td><td>레거시 상담사별 리스트</td><td>51 — 연락처·주소까지</td></tr>
        <tr><td><a href="cataract-exam-list.html">백내장 검사자 리스트</a></td><td>백내장 예약(<code>FLAG='H'</code>)</td><td>레거시 BCRM 통계_백내장_내원동기</td><td>백내장 전용</td></tr>
        <tr><td><b>전체 검사자 리스트</b></td><td><b>레포트가 세는 것 전부</b></td><td><b>월별 검사자 종합지표</b></td><td>24 — 구성 분석용</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>필터가 많음. 종합지표의 <b>칸 하나하나가 필터 하나</b>에 대응하도록 늘어놓은 것이라 그러함.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">일별</span><span>월별</span></span>
        <span class="ui">2026-07-01</span><span>~</span><span class="ui">2026-07-31</span>
        <span class="seg"><span>1주</span><span>2주</span><span>3주</span><span>4주</span><span>월별</span></span>
      </div>
      <div class="shot-bar">
        <span class="seg"><span class="on">전체</span><span>시력교정</span><span>드림렌즈</span><span>백내장</span><span>노안/FU/기타</span></span>
        <span class="seg"><span class="on">전체</span><span>원데이</span><span>일반</span></span>
        <span class="seg"><span class="on">전체</span><span>신환</span><span>구환</span></span>
        <span class="seg"><span class="on">전체</span><span>일반</span><span>고객소개</span><span>직원소개</span></span>
        <span class="seg"><span class="on">전체</span><span>직장인</span><span>학생</span><span>기타</span></span>
        <span class="ui grow ph">고객명 · 차트번호 · 휴대전화</span>
        <span class="ui">조회건수 <b>1,349건</b></span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>검사일</th><th>검사구분</th><th>원데이</th><th>백내장분류</th><th>신/구환</th>
            <th>소개구분</th><th>내원동기(레포트)</th><th>내원동기(대)</th><th>직업구분</th><th>직업</th>
            <th>차트번호</th><th>고객명</th><th>등급</th><th>만나이</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-07-02</td><td><span class="pill g-icl">시력교정</span></td>
              <td><span class="pill g-smile">원데이</span></td><td class="ph">—</td>
              <td><span class="pill g-smile">신환</span></td><td>일반</td><td>광고</td><td>광고</td>
              <td>직장인</td><td>사무직</td><td>2229810</td><td class="link">김○○</td>
              <td><span class="pill g-lasik">A</span></td><td>29</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td>2026-07-02</td><td><span class="pill g-lasek">백내장</span></td>
              <td>일반</td><td><span class="pill g-icl">백내장</span></td>
              <td><span class="pill st-wait">구환</span></td><td>고객소개</td><td>소개고객</td><td>소개고객</td>
              <td>기타</td><td>주부</td><td>2119004</td><td class="link">정○○</td>
              <td><span class="pill st-wait">B</span></td><td>62</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td>2026-07-03</td><td><span class="pill g-lasek">백내장</span></td>
              <td>일반</td><td><span class="pill st-wait">노안/FU</span></td>
              <td><span class="pill st-wait">구환</span></td><td>일반</td><td>기타</td><td class="ph">—</td>
              <td>기타</td><td class="ph">—</td><td>2201773</td><td class="link">한○○</td>
              <td><span class="pill st-wait">C</span></td><td>58</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">필터 줄이 둘임 — 위는 기간, 아래는 구성 토글 5종. 조회건수가 종합지표와 맞추는 값임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>일별·월별 토글 + 빠른 기간 5종</td><td>기본값이 <b>전월 전체</b>임 — 이번 달이 아님(아래 참조)</td></tr>
        <tr><td>검사구분</td><td>전체 · 시력교정 · 드림렌즈 · 백내장 · 노안/FU/기타</td><td>백내장이 <b>둘로 갈라져 있음</b> — 5장 참조</td></tr>
        <tr><td>원데이</td><td>전체 · 원데이 · 일반</td><td>빈칸이 없는 <b>이진값</b>임</td></tr>
        <tr><td>신/구환 · 소개구분 · 직업구분</td><td>각각 토글</td><td>전부 화면에서 즉시 거름</td></tr>
        <tr><td>검색어</td><td>고객명 · 차트번호 · 휴대전화</td><td>즉시 반영(다른 리스트와 달리 [조회] 불필요)</td></tr>
        <tr><td>표</td><td>24컬럼</td><td>연락처는 휴대전화 하나만. 주민번호·주소는 없음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">검사자 리스트보다 컬럼이 훨씬 적음</div>
      <p>구성 분석이 목적이라 <b>식별정보를 최소로</b> 줄였음. 그래서 이 화면은 ADMIN 전용이 아님 —
         상세가 필요하면 개별 리스트로 감.</p>
    </div>
  `,

  s4: `
    <h3>기본 조회 기간이 전월임</h3>
    <div class="note warn">
      <div class="h">다른 리스트는 이번 달, 이 화면은 <b>전월 전체</b></div>
      <p>레포트와 맞추는 화면이라 <b>완결된 달</b>을 기본으로 열림. 진행 중인 달을 열면 종합지표와
         애초에 맞을 수 없으므로(양쪽 다 아직 차는 중), 기본값 자체를 지난달로 뒀음.</p>
    </div>

    <table>
      <thead><tr><th>조건</th><th>어디서 거르나</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td>기준 = 검사일. 월별 모드면 월 1일~말일로 확장</td></tr>
        <tr><td>검사구분 5종</td><td>화면</td><td>백내장만 <code>cataractClass</code> 까지 봄 — 아래</td></tr>
        <tr><td>원데이 · 신구환 · 소개구분 · 직업구분</td><td>화면</td><td>파생 컬럼 값과 문자열 일치</td></tr>
        <tr><td>검색어</td><td>화면</td><td>고객명 · 차트번호 · 휴대전화 부분일치</td></tr>
      </tbody>
    </table>

    <h3>검사구분 필터가 5개인 이유</h3>
    <table>
      <thead><tr><th>필터</th><th>조건</th><th>레포트에서의 취급</th></tr></thead>
      <tbody>
        <tr><td>시력교정</td><td><code>examGroup='시력교정'</code></td><td>검사유입·검사수 양쪽</td></tr>
        <tr><td>드림렌즈</td><td><code>examGroup='드림렌즈'</code></td><td>전체 검사수</td></tr>
        <tr><td><b>백내장</b></td><td><code>examGroup='백내장'</code> <b>AND</b> <code>cataractClass ∈ (백내장, 중단)</code></td><td><b>월간 레포트 백내장 검사수</b></td></tr>
        <tr><td><b>노안/FU/기타</b></td><td><code>examGroup='백내장'</code> <b>AND</b> 위에 안 드는 나머지</td><td>전체 검사수에만</td></tr>
        <tr><td>전체</td><td>제한 없음</td><td>전체 검사수</td></tr>
      </tbody>
    </table>
    <p>즉 <b>「백내장」 토글은 백내장 전부가 아님</b>. 레포트가 백내장 검사수로 세는 부분집합이고,
       나머지는 옆 토글에 있음. 둘을 더해야 백내장 리스트 전체(2026-07 = 102)가 됨.</p>
  `,

  s5: `
    <h3>모집단 — 세 갈래를 한 표로</h3>
    <table>
      <thead><tr><th>검사구분</th><th>원천</th><th>판정</th></tr></thead>
      <tbody>
        <tr><td>백내장</td><td><code>Cataract_Exam</code> 계열 (백내장검사 예약 <code>FLAG='H'</code>)</td><td>백내장 예약 행이면 무조건 백내장</td></tr>
        <tr><td>드림렌즈</td><td rowspan="2"><code>EXAM</code> + <code>CUSTOM</code></td><td>렌즈센터 예약만 있고 <b>진료 예약(M)이 없을 때</b></td></tr>
        <tr><td>시력교정</td><td>그 외 전부</td></tr>
      </tbody>
    </table>
    <p>세 갈래 모두 <b>사람 단위</b>(고객 × 검사일 1행)임. 백내장은 레거시 BCRM 백내장_검사와 같은 정의라
       레거시 화면 건수와 1:1 로 맞음.</p>

    <div class="note bad">
      <div class="h">⚠️ 리스트 전체 행수를 백내장 검사수로 쓰면 안 됨</div>
      <p>2026-07 기준 백내장 예약 행은 <b>102</b>지만 월간 레포트의 백내장 검사수는 <b>56</b>
         (분류 '백내장' 45 + '중단' 11)임. 나머지 46('노안/FU'·'기타')은 <b>전체 검사수에만</b> 들어감.
         이 불변식이 깨지면 레포트와 리스트가 어긋난 것임.</p>
    </div>

    <h3>백내장분류 4종 — 검안사·상담사 조합으로 가름</h3>
    <table>
      <thead><tr><th>분류</th><th>검안사</th><th>상담사</th><th>레포트 검사수</th></tr></thead>
      <tbody>
        <tr><td>백내장</td><td>O</td><td>O</td><td><b>포함</b></td></tr>
        <tr><td>중단</td><td>O</td><td><code>BS0808</code>(미지정)</td><td><b>포함</b></td></tr>
        <tr><td>노안/FU</td><td>X</td><td><code>BS0808</code></td><td>제외</td></tr>
        <tr><td>기타</td><td colspan="2">그 외 조합</td><td>제외</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">라벨을 곧이곧대로 읽지 말 것</div>
      <p><b>'노안/FU'는 술후 추적이 아님</b> — 2026-07 40건 전부 과거 백내장 수술기록이 없고 수술 연계도 0건임.
         원천에 노안 전용 코드로 잡힌 건은 0건이라 '노안'은 <b>정황 판단</b>임.<br />
         <b>'기타'를 '미검사'로 부르지 말 것</b> — 2026-01~07 총 11건 중 2건은 백내장 검사기록이 있음.</p>
    </div>

    <h3>파생 컬럼 — 원천에 없는 값 6종</h3>
    <table>
      <thead><tr><th>컬럼</th><th>값</th><th>규칙</th></tr></thead>
      <tbody>
        <tr>
          <td>원데이</td><td>원데이 · 일반</td>
          <td><b>빈칸 없는 이진값</b>(2026-08-05 확정).
              시력교정 = 같은 날 검사OP(<code>M</code>/<code>5</code>) 내원, 중단·취소 제외 /
              백내장 = 진료구분 C_원데이(7)·C_노안원데이(9) /
              드림렌즈 = 구조상 원데이가 불가능해 <b>항상 일반</b></td>
        </tr>
        <tr>
          <td>신/구환</td><td>신환 · 구환</td>
          <td><code>CUSTOM.FIRST_DAY</code> 가 <b>조회 기간 안</b>이면 신환. 기간을 바꾸면 뒤집힘</td>
        </tr>
        <tr>
          <td>소개구분</td><td>일반 · 고객소개 · 직원소개</td>
          <td>내원동기(대)로 판정 — 소개고객·소개미확인 → 고객소개 / 소개직원 → 직원소개 / 그 외 일반</td>
        </tr>
        <tr>
          <td>내원동기(레포트)</td><td>9계열</td>
          <td>아래 매핑표. <b>미기재 포함 그 외 전부 '기타'</b></td>
        </tr>
        <tr>
          <td>직업구분</td><td>직장인 · 학생 · 기타</td>
          <td><code>CUSTOM.JOB</code> 자유입력을 키워드로 접음 — 아래</td>
        </tr>
        <tr>
          <td>만나이</td><td>숫자</td>
          <td>화면이 생년월일에서 계산. CSV 는 <b>내려받은 날 기준</b></td>
        </tr>
      </tbody>
    </table>

    <h3>내원동기(레포트) 9계열 매핑</h3>
    <table>
      <thead><tr><th>레포트 값</th><th>내원동기(대) 원값</th></tr></thead>
      <tbody>
        <tr><td>B2B(군인)</td><td>B2B(군인)</td></tr>
        <tr><td>B2B(기업)</td><td>B2B(기업) · B2B(비앤빛) · B2B(백내장) · 제휴</td></tr>
        <tr><td>소개고객</td><td>소개고객 · 소개미확인 · VIP고객관리팀</td></tr>
        <tr><td>소개직원 · 광고 · 바이럴 · 프로모션 · 홈페이지</td><td>같은 이름 그대로</td></tr>
        <tr><td><b>기타</b></td><td>그 외 전부 + <b>미기재</b></td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">이 매핑은 세 곳에 같은 규칙으로 박혀 있음</div>
      <p><code>find-all-exam-list.sql</code> · <code>select-all-exam-list.sql</code> ·
         <code>find-exam-count-by-class-monthly.sql</code>(월간 레포트 도표 #7).
         하나만 고치면 리스트와 레포트가 어긋남 — <b>반드시 함께</b> 고침.</p>
    </div>

    <h3>직업구분 — 자유입력을 세 통으로</h3>
    <table>
      <thead><tr><th>통</th><th>걸리는 값</th></tr></thead>
      <tbody>
        <tr><td>학생</td><td>학생 · 대학원생 · 수험생 · 재수생 · 신입생 · 초/중/고 + 숫자 · 초등 · 중학 · 고등 · 대학예정 · 졸업예정 · 졸업생 · 대입 · <code>university</code></td></tr>
        <tr><td>직장인</td><td>교사 · 교수 · 교직원 · 강사 · 사무직 · <b>그리고 아래 '기타'에 안 걸리는 나머지 전부</b></td></tr>
        <tr><td>기타</td><td>군인 · 사회복무 · 공익근무 · 주부 · 가사 · 무직 · 없음 · 휴식 · 휴직 · 취업준비 · 퇴직 · 은퇴 · 입대 전 · <b>빈값</b></td></tr>
      </tbody>
    </table>
    <p>기본값이 <b>직장인</b>임 — 분류에 안 걸리는 자유입력은 직장인으로 떨어짐.
       "직장인이 많다"를 읽을 때 이 점을 감안해야 함.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>직업구분 기본값이 직장인</b></td><td>분류 안 되는 자유입력이 직장인으로 쌓임</td><td>직업(원값) 컬럼을 함께 봐야 함</td></tr>
        <tr><td><b>내원동기 '기타'에 미기재가 섞임</b></td><td>기타 비중이 실제보다 커 보임</td><td>내원동기(대) 원값이 빈 행을 따로 세야 정확함</td></tr>
        <tr><td><b>신/구환이 조회 기간에 흔들림</b></td><td>기간을 넓히면 신환이 늘어남</td><td>레포트와 맞출 때는 <b>월 단위 기본값</b>을 그대로 씀</td></tr>
        <tr><td><b>백내장 분류 라벨의 오해</b></td><td>'노안/FU'·'기타'를 이름대로 읽으면 틀림</td><td>5장의 경고 참조. 라벨이 아니라 판정 규칙을 봄</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 검사는 안 보임</td><td>기본값이 전월이라 실무에서 잘 안 걸림</td></tr>
      </tbody>
    </table>

    <h3>지켜야 할 불변식</h3>
    <div class="note">
      <div class="h">이 셋이 깨지면 어딘가 잘못된 것임</div>
      <ul>
        <li>검사구분 <b>백내장</b> 토글 건수 = 월간 레포트 <b>백내장 검사수</b></li>
        <li>백내장 + 노안/FU/기타 = <a href="cataract-exam-list.html">백내장 검사자 리스트</a> 전체 행수</li>
        <li>검사구분 <b>전체</b> 건수 = 월별 검사자 종합지표의 <b>총검사자</b></li>
      </ul>
    </div>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>'노안/FU' 라벨 교체</td><td>실측상 술후 추적이 아님. 이름을 바꾸면 레거시 라벨(F/U)과 어긋남 — 어느 쪽에 맞출지</td></tr>
        <tr><td>직업 사전 정비</td><td>키워드 규칙을 늘릴지, 원천 입력을 코드값으로 바꿀지. 후자가 근본이지만 CRM 변경이 필요함</td></tr>
        <tr><td>내원동기 미기재 분리</td><td>레포트 9계열에서 '미기재'를 '기타'와 갈라 낼지. 갈라면 레포트 도표도 함께 바뀜</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/인수인계_2026-08-05_백내장검사.md">백내장 검사 개편 인수인계</a> —
       모집단 102·분류 4종의 배경과 함정. 부록A 에 검사수 점검 이력.</p>
  `,
}
