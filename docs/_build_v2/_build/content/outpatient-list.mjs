export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>월별 외래수 지표가 <b>어떤 내원으로 이루어졌는지</b> 펴 보는 화면임.
       외래수는 숫자 하나로만 보고되는데, 그 안에 진료구분·신구환·해피콜 여부가 섞여 있음.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>외래수 검증</td><td>조회건수를 <a href="outpatient-count.html">외래수</a> 지표와 맞춤 — <b>정합해야 함</b></td></tr>
        <tr><td>진료구분 분해</td><td>지표는 전부 합산해 버리므로, 세부 구분은 여기서만 볼 수 있음</td></tr>
        <tr><td>신환 확인</td><td>외래로 처음 온 사람을 추림</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">건수이지 사람 수가 아님</div>
      <p>같은 사람이 한 달에 세 번 외래로 오면 <b>세 행</b>임. 외래수 지표도 같은 기준이라
         두 숫자가 맞음. 사람 수를 세려면 차트번호로 접어야 함.</p>
    </div>
  `,

  s3: `
    <p>다른 리스트와 같은 골격 — 기간·필터 한 줄 + 37컬럼 표.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">일별</span><span>월별</span></span>
        <span class="ui">2026-08-01</span><span>~</span><span class="ui">2026-08-31</span>
        <span class="seg"><span>1주</span><span>2주</span><span>3주</span><span>4주</span><span>월별</span></span>
        <span class="ui">상태 전체 ▾</span>
        <span class="ui">신/구환 전체 ▾</span>
        <span class="ui">진료구분 전체 ▾</span>
        <span class="ui grow ph">고객명 · 차트번호 · 휴대전화</span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>예약일</th><th>예약시간</th><th>상태</th><th>진료구분</th><th>신/구환</th>
            <th>차트번호</th><th>고객명</th><th>등급</th><th>만나이</th><th>휴대전화</th>
            <th>담당의사</th><th>예약상담사</th><th>해피콜</th><th>당일예약</th><th>예약메모</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-08-01</td><td>09:30</td><td><span class="pill g-smile">내원</span></td>
              <td>일반외래</td><td><span class="pill st-wait">구환</span></td>
              <td>2119004</td><td class="link">정○○</td><td><span class="pill g-lasik">A</span></td><td>62</td>
              <td class="link">010-****-1234</td><td>박원장</td><td>이상담</td><td>Y</td><td class="ph">—</td><td class="ph">정기 검진</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td>2026-08-01</td><td>10:00</td><td><span class="pill st-wait">퇴원</span></td>
              <td>수술후경과</td><td><span class="pill st-wait">구환</span></td>
              <td>2229810</td><td class="link">김○○</td><td><span class="pill st-wait">B</span></td><td>29</td>
              <td class="link">010-****-5678</td><td>이원장</td><td class="ph">—</td><td class="ph">—</td><td>Y</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td>2026-08-01</td><td>11:20</td><td><span class="pill g-smile">내원</span></td>
              <td class="ph">—</td><td><span class="pill g-smile">신환</span></td>
              <td>2234901</td><td class="link">서○○</td><td><span class="pill st-wait">C</span></td><td>41</td>
              <td class="link">010-****-9012</td><td>박원장</td><td>한상담</td><td class="ph">—</td><td class="ph">—</td><td class="ph">타원 진료의뢰</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">3행의 진료구분이 빈 것은 오류가 아님 — 실제로 월 40~50건 있음(5장 참조).</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>일별·월별 토글 + 빠른 기간 5종</td><td>기준 = <b>예약일</b>(<code>RESERVE_DATE</code>). 기본값 이번 달</td></tr>
        <tr><td>상태</td><td>전체 · 내원 · 퇴원</td><td>모집단이 이 둘뿐이라 사실상 <b>구성 확인용</b>임</td></tr>
        <tr><td>신/구환</td><td>전체 · 신환 · 구환</td><td>조회 기간에 따라 값이 바뀜</td></tr>
        <tr><td>진료구분</td><td>조회 결과에 <b>실제로 있는 값만</b></td><td>그 기간에 없는 구분은 목록에 안 나옴</td></tr>
        <tr><td>검색어</td><td>고객명 · 차트번호 · 휴대전화</td><td>[조회]를 눌러야 적용</td></tr>
        <tr><td>표</td><td>37컬럼 · 정렬 · 페이지 25·50·100·200</td><td>—</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>서버가 받는 것은 기간뿐</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td><code>RESERVE_DATE</code> 범위. 월별 모드면 월 1일~말일로 확장</td></tr>
        <tr><td>상태 · 신구환 · 진료구분</td><td>화면</td><td>문자열 일치</td></tr>
        <tr><td>검색어</td><td>화면</td><td>고객명 · 차트번호 · 휴대전화 부분일치</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">기준 날짜는 예약일임</div>
      <p>내원한 날이 아니라 <b>예약이 잡힌 날짜</b>(<code>RESERVE_DATE</code>)임.
         상태가 내원(I)·퇴원(H)인 행만 싣기 때문에 실무상 대체로 같지만, 정의는 예약일 기준임.
         외래수 지표도 같은 기준이라 두 숫자가 맞음.</p>
    </div>
  `,

  s5: `
    <h3>모집단 — 외래 예약 중 실제로 온 건</h3>
    <table>
      <thead><tr><th>조건</th><th>값</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td><code>RESERVE_FLAG</code></td><td><code>'F'</code></td><td><b>외래</b>. 검사(M)·수술(O)·백내장외래(Z)는 다른 코드임</td></tr>
        <tr><td><code>RESERVE_STATE</code></td><td><code>'I'</code> 내원 · <code>'H'</code> 퇴원</td><td>예약(Y)·취소(C)는 뺌 — <b>실제로 온 건만</b></td></tr>
        <tr><td>고객명</td><td>테스트 계정 제외</td><td><code>%테스트%</code> · <code>%test%</code></td></tr>
      </tbody>
    </table>
    <p>정의의 정본은 <a href="../지표정의/6-외래.md">지표정의/6-외래.md</a> 임. 예약 구분 코드표(§5)도 거기 있음.</p>

    <div class="note bad">
      <div class="h">⚠️ 백내장 외래는 여기 없음</div>
      <p>백내장 쪽 외래는 <code>RESERVE_FLAG='Z'</code>(백내장외래)로 따로 있음.
         이 화면과 외래수 지표는 <b>둘 다 <code>'F'</code> 만</b> 셈. "외래 전부"가 아님.</p>
    </div>

    <h3>진료구분</h3>
    <p><code>RESERVE_JINRYO</code> 코드를 <code>MEDICAL_SUB_CFG</code>(<code>RESERVE_FLAG='F'</code>)에서 이름으로 바꿔 보여줌.
       이름이 없으면 <b>코드 값을 그대로</b> 표시함.</p>
    <div class="note warn">
      <div class="h">진료구분이 빈 건이 월 40~50건 있음</div>
      <p>원천에서 <code>RESERVE_JINRYO</code> 가 비어 들어옴. 데이터 오류가 아니라 <b>알려진 상태</b>임.
         진료구분별로 나눠 세면 이만큼이 어디에도 안 들어가므로, 합계와 분해 합이 다름.</p>
    </div>
    <div class="note warn">
      <div class="h"><code>RESERVE_JINRYO='3'</code>(수술후망막)을 전역에서 빼지 말 것</div>
      <p>다른 화면에서 <code>'3'</code> 을 제외하는 규칙이 있어 습관적으로 따라 빼면 외래수가 어긋남.
         외래 집계는 <b>진료구분을 구분하지 않고 전부 합산</b>함.</p>
    </div>

    <h3>파생 컬럼</h3>
    <table>
      <thead><tr><th>컬럼</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>상태</td><td><code>I</code> → 내원 · <code>H</code> → 퇴원. 그 외 코드는 원문 그대로</td></tr>
        <tr><td>신/구환</td><td><code>CUSTOM.FIRST_DAY</code> 가 조회 기간 안이면 신환. <b>기간을 바꾸면 뒤집힘</b></td></tr>
        <tr><td>만나이</td><td>화면이 생년월일에서 계산 — CSV 는 내려받은 날 기준</td></tr>
        <tr><td>양/음</td><td><code>LUNAR_YN='Y'</code> 면 음, 아니면 양</td></tr>
        <tr><td>담당의사</td><td><code>SELECT_DOC</code> 우선, 비면 <code>RESERVE_DOC</code>. <b>퇴직자(<code>EMP_STATE='N'</code>)는 이름이 안 붙음</b></td></tr>
        <tr><td>내원동기 3단</td><td><code>MOTIVE_NEW02</code> 의 <code>Idx='1'</code> 중 <b>가장 최근 것 하나</b></td></tr>
      </tbody>
    </table>

    <h3>컬럼 37개</h3>
    <p>예약 정보(예약일·시간·상태·진료구분·경로·메모·해피콜·당일예약·구환플래그) +
       고객 정보(차트·이름·등급·생년월일·연락처·주소·직업·국적·보험사) +
       직원 정보(담당의사·예약상담사·등록직원) + 내원동기 4칸.
       검사자 리스트와 겹치는 컬럼은 같은 원천·같은 규칙이라 표기가 일치함.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>진료구분 결측 월 40~50건</b></td><td>빈칸으로 남음</td><td>분해 합 ≠ 전체. 원천 입력 문제라 화면에서 못 고침</td></tr>
        <tr><td><b>백내장 외래 미포함</b></td><td>백내장 외래가 안 보임</td><td><code>FLAG='Z'</code> 는 별도. 합쳐 볼 화면이 아직 없음</td></tr>
        <tr><td><b>퇴직자 이름 결측</b></td><td>담당의사·상담사가 비는 행</td><td><code>EMP_STATE&lt;&gt;'N'</code> 조건 때문임. 과거 데이터일수록 자주 빔</td></tr>
        <tr><td><b>신/구환이 기간에 흔들림</b></td><td>기간을 넓히면 신환이 늘어남</td><td>정의상 그럼</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 외래는 안 보임</td><td>매일 03시 배치 이후</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">외래 예약이 검사자 집계에 섞여 들어감</div>
      <p>외래(<code>F</code>)로 내원했는데 <b>검사 기록(<code>EXAM</code>)이 만들어지는 경우</b>가 있음.
         이 화면 쪽 문제는 아니지만, 외래수와 검사자 수를 함께 볼 때 같은 사람이 양쪽에 잡힘.
         <a href="../지표정의/6-외래.md">지표정의/6-외래.md §4-③</a> 에 정리돼 있음.</p>
    </div>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>백내장 외래 통합</td><td><code>FLAG='Z'</code> 를 합칠지. 합치면 지표 정의와 과거 확정값이 전부 바뀜</td></tr>
        <tr><td>진료구분 결측 처리</td><td>'미지정' 버킷을 만들어 드러낼지, 지금처럼 빈칸으로 둘지</td></tr>
        <tr><td>사람 단위 보기</td><td>재내원을 접어 세는 관점이 필요한지 — 지금은 건수 전용임</td></tr>
      </tbody>
    </table>
  `,
}
