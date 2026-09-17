export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>예약 숫자를 <b>사람 단위로 되짚어야 할 때</b> 여는 화면임. 예약 종합·예약통계는 건수만 보여주므로
       "이번 달 네이버가 왜 늘었나"를 물으면 답할 수 없음. 이 화면은 그 건수를 이룬 <b>명단 자체</b>를 폄.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>예약 숫자가 튀었을 때</td><td>채널 필터로 좁혀 어떤 유입이 늘었는지 행 단위로 확인함</td></tr>
        <tr><td>레거시·수기 집계와 안 맞을 때</td><td>명단을 CSV 로 내려 건별로 대조함. 합계가 <b>예약 종합과 같아야</b> 함</td></tr>
        <tr><td>내원동기를 확인할 때</td><td>CRM 등록값이 빈 건이 메모·TM 배정 DB 로 채워졌는지 색으로 구분해 봄</td></tr>
        <tr><td>예약 이후 흐름을 볼 때</td><td>검사등록일 · 검사중단 · 수술등록일 · 수술금액이 한 행에 붙어 있어 퍼널을 행에서 읽음</td></tr>
      </tbody>
    </table>

    <h3>이 화면이 대체한 것</h3>
    <p>레거시 CRM 의 예약 목록은 <b>예약 건 자체</b>만 보여줌. 검사로 갔는지, 수술까지 갔는지, 얼마를 냈는지는
       화면을 옮겨 다니며 차트번호로 다시 찾아야 했음. 이 화면은 그 조회를 <b>한 행으로 접어</b> 붙여 둔 것임.</p>

    <div class="note">
      <div class="h">읽을 때의 약속</div>
      <p>행 1개 = <b>예약 1건</b>(<code>RESERVE_NUM</code> 하나)이지 사람 1명이 아님.
         같은 사람이 한 달에 두 번 예약하면 두 행임. 사람 수를 세려면 차트번호로 접어야 함.</p>
    </div>
  `,

  s3: `
    <p>위에 필터 바 한 줄, 아래는 화면 끝까지 차는 표 하나. 표 안에서만 스크롤하고 머리글은 고정됨.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-08 ▾</span>
        <span class="seg"><span class="on">전체</span><span>콜</span><span>온라인</span></span>
        <span class="ui grow ph">고객명 · 차트번호</span>
        <span class="ui">조회건수 <b>1,284건</b></span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>예약등록일</th><th>시간</th><th>차트번호</th><th>고객명</th><th>채널</th>
            <th>내원동기(대)</th><th>내원동기(중)</th><th>상태</th><th>검사등록일</th><th>검사중단</th>
            <th>수술등록일</th><th>수술명(우)</th><th>수술명(좌)</th><th>수술금액</th><th>메모</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-08-01</td><td>10:24</td><td>2231045</td><td class="link">김○○</td>
              <td><span class="pill g-lasik">인콜</span></td><td>광고</td><td>모두닥 †</td>
              <td><span class="pill g-smile">예약</span></td><td>2026-08-03</td><td>N</td>
              <td>2026-08-03</td><td>스마일프로</td><td>스마일프로</td><td>2,900,000</td><td class="ph">지인 소개로 문의</td>
            </tr>
            <tr>
              <td>2</td><td>2026-08-01</td><td>13:02</td><td>2231052</td><td class="link">이○○</td>
              <td><span class="pill g-icl">네이버</span></td><td>바이럴</td><td>인터넷검색(홈페이지)</td>
              <td><span class="pill st-wait">접수</span></td><td>2026-08-05</td>
              <td><span class="invalid">Y</span></td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">산동거부</td>
            </tr>
            <tr>
              <td>3</td><td>2026-08-02</td><td>09:11</td><td>2231060</td><td class="link">박○○</td>
              <td><span class="pill g-lasek">홈페이지</span></td><td style="color:#b45309">소개직원</td>
              <td style="color:#b45309">한○○ *</td>
              <td><span class="pill st-no">취소</span></td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">일정 변경 요청</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="shot-bar">
        <span><b>1,284건</b> · 1-50</span>
        <span class="grow"></span>
        <span class="ui">이전</span><span>1 / 26</span><span class="ui">다음</span>
        <span>행 수</span><span class="ui">50건 ▾</span>
      </div>
    </div>
    <p class="shot-cap">필터 바 · 표 · 페이지네이션. 채널에서 <b>콜</b> 또는 <b>온라인</b>을 고르면 그 자리에 세부 채널 칩이 한 줄 더 나옴.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기준 월</td><td>월 선택기</td><td>서버 조회 조건. 바꿔도 <b>[조회]를 눌러야</b> 반영됨</td></tr>
        <tr><td>채널</td><td>전체 · 콜 · 온라인 세그먼트</td><td>화면에서 즉시 거름(재조회 없음)</td></tr>
        <tr><td>세부 채널</td><td>콜 → 인콜·아웃콜 / 온라인 → 홈페이지·앱·네이버·카카오</td><td>채널을 고를 때만 나타남. 즉시 반영</td></tr>
        <tr><td>검색어</td><td>고객명 · 차트번호 한 칸</td><td>서버가 아니라 <b>조회된 행 안에서</b> 찾음. [조회]를 눌러야 적용</td></tr>
        <tr><td>조회건수</td><td>필터까지 적용된 행 수</td><td>표 아래 건수·페이지 표시와 같은 값</td></tr>
        <tr><td>표</td><td>16컬럼 · 머리글 고정 · 머리글 클릭 정렬</td><td>오름 → 내림 → 해제 순환. No 는 행 번호라 정렬 제외</td></tr>
        <tr><td>페이지네이션</td><td>이전/다음 · 행 수 50·100·200</td><td>정렬·필터가 바뀌면 1페이지로 되돌림</td></tr>
        <tr><td>CSV</td><td>현재 조회·필터·정렬 결과 <b>전체</b></td><td>보이는 페이지가 아니라 전체. 파일명 <code>예약자리스트_YYYY-MM.csv</code></td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">CSV 만 이름을 가림</div>
      <p>화면은 레거시와 같이 고객명을 그대로 보여주지만 <b>CSV 는 마스킹</b>해서 내보냄(<code>maskName</code>).
         파일은 PC 에 남고 메신저로 옮겨 다니므로 위험이 화면과 다름.
         상태 칸도 CSV 에서는 코드(Y/I/H/C) 대신 라벨로, 금액은 콤마 없는 숫자로 나감 — 엑셀에서 바로 합계를 내야 함.</p>
    </div>
  `,

  s4: `
    <h3>서버가 받는 것은 기간뿐</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서 거르나</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기준 월</td><td><b>서버</b></td><td><code>from</code>=1일, <code>to</code>=말일. 다만 <b>진행 중인 달은 오늘까지</b>로 잘라 보냄</td></tr>
        <tr><td>채널 · 세부 채널</td><td>화면</td><td><code>channelGroup</code> / <code>channel</code> 문자열 일치</td></tr>
        <tr><td>고객명 · 차트번호</td><td>화면</td><td>이름은 소문자 부분일치, 차트번호는 부분일치</td></tr>
        <tr><td>정렬</td><td>화면</td><td>한글·숫자 자연 정렬(<code>localeCompare(ko, numeric)</code>)</td></tr>
      </tbody>
    </table>
    <p>기본값은 <b>이번 달</b>이고, 처음 들어오면 아무것도 조회하지 않음 —
       "기준 월을 선택한 뒤 조회 버튼을 눌러주세요"가 표 자리에 뜸. 한 번에 <b>366일</b>을 넘겨 조회할 수 없음.</p>

    <h3>기준 날짜는 등록일임</h3>
    <div class="note">
      <div class="h">예약일이 아니라 예약을 <b>잡은</b> 날</div>
      <p>조회 기준은 <code>RESERVATION.InsertedDateTime</code>(예약등록일)임. 8월에 전화해서 9월 검사를 예약하면
         <b>8월 명단</b>에 들어감. 예약통계·예약 종합도 같은 기준이라 세 화면의 숫자가 맞음.
         검사일 기준으로 보고 싶으면 검사자 리스트를 봐야 함 — 모집단이 다름.</p>
    </div>
  `,

  s5: `
    <h3>모집단 — 무엇이 한 행이 되는가</h3>
    <p>행 1개 = <code>RESERVATION</code> 의 <b>검사예약 1건</b>. 아래 조건을 모두 만족한 행만 담음.</p>
    <table>
      <thead><tr><th>조건</th><th>값</th><th>왜</th></tr></thead>
      <tbody>
        <tr><td><code>RESERVE_FLAG</code></td><td><code>'M'</code></td><td>검사예약만. 수술예약(<code>'O'</code>)은 뺌</td></tr>
        <tr><td><code>RESERVE_JINRYO</code></td><td><code>''·5·6·7·24·25</code></td><td>시력교정·백내장 계열 진료구분</td></tr>
        <tr><td><code>RESERVE_PATH</code></td><td>CTI · CRM · ONLINE · APP · NAVER</td><td><b>KAKAO 는 뺌</b> — 아래 참조</td></tr>
        <tr><td><code>RESERVE_SEQ</code></td><td><code>8·5</code> 제외</td><td>집계 대상이 아닌 예약 순번</td></tr>
        <tr><td>고객명 · 차트번호</td><td>테스트 계정 제외</td><td><code>%테스트%</code> · <code>%TEST%</code> · <code>8888888888888</code></td></tr>
        <tr><td>메모</td><td>재검 · 중복 · 시뮬 · 차트있음 · B2B(군인) 제외</td><td>신규 예약이 아님</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">'재검' 제외는 안내 문구를 걷어낸 뒤에 판정함</div>
      <p>"산동거부(추후 재검가능성ok)" 같은 <b>신규 예약 메모</b>가 재검으로 오인돼 빠지던 문제가 있었음
         (2026-01~08 실측 오탐 17건). 지금은 공백을 없앤 사본에서 안내 문구 6종
         (재검가능성 · 재검사안내 · 재검안내 · 재검사필요 · 재검필요 · 재검사진행)을 지운 뒤
         그래도 '재검'이 남는 건만 제외함.</p>
    </div>

    <div class="note bad">
      <div class="h">카카오는 명단에 없음</div>
      <p>카카오(해피톡) 예약은 <code>RESERVATION</code> 에 남지 않아 <b>행으로 실리지 않음</b>.
         API 는 <code>kakaoCount</code> 를 따로 내려주지만 <b>명단 합계에는 더하지 않음</b> —
         예약 종합도 카카오를 빼고 세므로, 그래야 두 화면의 숫자가 같아짐.
         채널 필터에 '카카오'가 있는 건 값 목록을 맞춰 둔 것이고 보통 0건임.</p>
    </div>

    <h3>채널 — <code>RESERVE_PATH</code> 를 두 단으로 접음</h3>
    <table>
      <thead><tr><th>채널그룹</th><th>채널</th><th><code>RESERVE_PATH</code></th></tr></thead>
      <tbody>
        <tr><td rowspan="2">콜</td><td>인콜</td><td><code>CTI</code></td></tr>
        <tr><td>아웃콜</td><td><code>CRM</code></td></tr>
        <tr><td rowspan="4">온라인</td><td>홈페이지</td><td><code>ONLINE</code></td></tr>
        <tr><td>앱</td><td><code>APP</code></td></tr>
        <tr><td>네이버</td><td><code>NAVER</code></td></tr>
        <tr><td>카카오</td><td><code>KAKAO</code> — 모집단에서 제외돼 실제로는 안 나옴</td></tr>
      </tbody>
    </table>

    <h3>내원동기 — 소스 3종을 우선순위로 하나만 고름</h3>
    <p>대(大)와 중(中)은 <b>짝</b>이라 반드시 같은 소스에서 뽑음. 섞으면 대=CRM·중=메모 같은 어긋난 조합이 나옴.
       어느 소스에서 왔는지는 <code>motiveMSource</code> 로 내려오고 화면에서 <b>색과 마커</b>로 구분함.</p>
    <table>
      <thead><tr><th>순위</th><th>소스</th><th><code>motiveMSource</code></th><th>화면 표기</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>①</td><td>텔레매니저 TM 배정 DB (모두닥 이벤트 리드)</td><td><code>TMDB</code></td><td><span style="color:#0369a1">파랑 + †</span></td><td>대=광고 · 중=모두닥 고정</td></tr>
        <tr><td>②</td><td>CRM 등록값 (<code>MOTIVE_NEW01/02</code>)</td><td><code>CRM</code></td><td>검정</td><td>등록된 값 그대로</td></tr>
        <tr><td>③</td><td>예약 메모에서 추출</td><td><code>MEMO</code></td><td><span style="color:#b45309">주황 + *</span></td><td>정형 문구 우선, 없으면 아래 fallback</td></tr>
      </tbody>
    </table>
    <p>메모 fallback 은 <b>매체명이 분명한 것과 검증된 소개만</b> 씀 — 모두닥 · 크리에이트립 · 직원소개(재직자 우선 매칭) · 소개고객.
       그 밖의 문구는 추측이라 아예 채우지 않음(빈 값으로 둠).</p>

    <div class="note">
      <div class="h">색이 붙은 값을 CRM 값과 섞어 세면 안 됨</div>
      <p>주황(<code>MEMO</code>)은 <b>추정</b>이고 파랑(<code>TMDB</code>)은 <b>다른 시스템의 확정</b>임.
         "CRM 에 등록된 내원동기 분포"를 내려면 <code>motiveMSource='CRM'</code> 만 세야 함.</p>
    </div>

    <h3>컬럼 정의 — 16개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>No</td><td>—</td><td>—</td><td>—</td><td>행 번호(페이지 반영). 정렬 불가</td></tr>
        <tr><td>2</td><td>예약등록일</td><td><code>registeredAt</code></td><td><code>registered_at</code></td><td><code>RESERVATION.InsertedDateTime</code></td><td><b>조회 기준 날짜</b></td></tr>
        <tr><td>3</td><td>예약등록시간</td><td><code>registeredTime</code></td><td><code>registered_time</code></td><td>같은 컬럼의 HH:MM</td><td>—</td></tr>
        <tr><td>4</td><td>차트번호</td><td><code>chartNo</code></td><td><code>chart_no</code></td><td><code>CUST_NUM</code></td><td>CSV 는 텍스트로 — 앞 0 이 날아감</td></tr>
        <tr><td>5</td><td>고객명</td><td><code>name</code></td><td><code>name</code></td><td><code>CUST_NAME</code></td><td>CSV 만 마스킹</td></tr>
        <tr><td>6</td><td>채널</td><td><code>channel</code></td><td><code>channel</code></td><td><code>RESERVE_PATH</code> 변환</td><td>배지. <code>channelGroup</code> 은 화면에 없고 필터에만 씀</td></tr>
        <tr><td>7</td><td>내원동기(대)</td><td><code>motiveL</code></td><td><code>motive_l</code></td><td>TMDB · <code>MOTIVE_NEW01</code> · 메모</td><td>중과 같은 소스에서만</td></tr>
        <tr><td>8</td><td>내원동기(중)</td><td><code>motiveM</code></td><td><code>motive_m</code></td><td>TMDB · <code>MOTIVE_NEW02</code> · 메모</td><td>소스에 따라 색·마커</td></tr>
        <tr><td>9</td><td>상태</td><td><code>reserveState</code></td><td><code>reserve_state</code></td><td><code>RESERVE_STATE</code></td><td>Y 예약 · I 접수 · H 퇴원 · C 취소</td></tr>
        <tr><td>10</td><td>검사등록일</td><td><code>examRegDate</code></td><td><code>exam_reg_date</code></td><td><code>EXAM.EXAM_DATE</code></td><td><b>등록일이 아니라 검사일</b> — EXAM 에 등록 시각 컬럼이 없음</td></tr>
        <tr><td>11</td><td>검사중단</td><td><code>examStop</code></td><td><code>exam_stop</code></td><td><code>EXAM.STOP_YN</code></td><td>검사가 없으면 빈칸(—)</td></tr>
        <tr><td>12</td><td>수술등록일</td><td><code>surgeryRegDate</code></td><td><code>surgery_reg_date</code></td><td>수술예약(<code>FLAG='O'</code>)의 등록일</td><td>취소(C) 제외. 날짜만</td></tr>
        <tr><td>13</td><td>수술명(우)</td><td><code>surgeryR</code></td><td><code>surgery_r</code></td><td><code>OPERATIONDATA</code> · <code>Cataract_Operationdata</code></td><td rowspan="2">수술자 리스트와 <b>같은 원천·같은 제외목록</b>이라 표기가 일치함</td></tr>
        <tr><td>14</td><td>수술명(좌)</td><td><code>surgeryL</code></td><td><code>surgery_l</code></td><td>같음</td></tr>
        <tr><td>15</td><td>수술금액</td><td><code>surgeryPayment</code></td><td><code>surgery_payment</code></td><td><code>COSTPRICE</code> 합</td><td>(고객, 수술일) 합계. <code>PayStt='A'</code>(취소) 제외. 0 이면 대시</td></tr>
        <tr><td>16</td><td>메모</td><td><code>comment</code></td><td><code>comment</code></td><td><code>RESERVATION.COMMENT</code></td><td>한 줄로 잘리고 마우스를 올리면 전문</td></tr>
      </tbody>
    </table>

    <h3>예약 이후 흐름 3종을 붙이는 규칙</h3>
    <p>검사등록일 · 수술등록일 · 수술명은 <b>이 예약 이후의 첫 건</b>만 붙임. 예약일 이전 기록은 다른 건이므로 보지 않음.
       10~15번 칸이 비어 있다는 것은 "아직 안 왔다"이지 "데이터가 없다"가 아님.</p>

    <div class="note">
      <div class="h">연락처는 마트에만 있음</div>
      <p>배치는 휴대폰(<code>CALL_NUM2</code>)과 이메일을 <b>마트에 싣지만 화면·CSV 로는 내보내지 않음</b>.
         같은 사람을 중복으로 세지 않기 위한 판별용이고, 표기 차이로 갈라지지 않도록 하이픈·공백을 지워 저장함.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>T-1 신선도</b></td><td>오늘 잡힌 예약은 안 보임. 매일 03시 배치가 넣음</td><td>당일 확인이 필요하면 CRM 을 봄</td></tr>
        <tr><td><b>카카오 미포함</b></td><td>해피톡 예약이 명단에 없음</td><td><code>kakaoCount</code> 로 건수만 알 수 있음. 명단은 낼 수 없음</td></tr>
        <tr><td><b>검사등록일 = 검사일</b></td><td>"언제 등록했나"를 못 봄</td><td><code>EXAM</code> 에 등록 시각 컬럼이 없음. 원천이 바뀌어야 풀림</td></tr>
        <tr><td><b>내원동기 결측</b></td><td>CRM 등록값이 비어 대시(—)로 남는 행</td><td>메모·TM DB 로 메우되 <b>추측은 하지 않음</b>. 남은 결측은 결측으로 둠</td></tr>
        <tr><td><b>스냅샷 드리프트</b></td><td>지난달 명단이 나중에 달라질 수 있음</td><td>예약 이후 흐름(검사·수술·금액)이 뒤에 채워지기 때문. 월 마감 스냅샷 방침으로 대응 예정</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>카카오 명단 확보</td><td>해피톡 원천을 마트로 끌어올지 여부. 지금은 건수만 있어 채널 비교가 반쪽임</td></tr>
        <tr><td>메모 fallback 확장</td><td>매체명이 분명한 2종(모두닥·크리에이트립) 외에 더 넣을지. 넣는 만큼 <b>추정이 섞임</b></td></tr>
        <tr><td>사람 단위 집계</td><td>지금은 예약 건 단위임. 같은 사람의 재예약을 접어 볼 화면이 따로 필요한지</td></tr>
        <tr><td>월 마감 시점</td><td>어느 시점의 값을 그 달의 확정값으로 볼지 (<a href="../db/지표정의.md">db/지표정의.md §3</a> 방침과 맞물림)</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p>숫자가 레거시와 안 맞으면 먼저 볼 것 —
       <a href="../점검/홈페이지-CRM-예약수-비교_2026-07.md">홈페이지 vs CRM 예약수 비교</a>(건별 1:1 대조),
       <a href="../db/예약통계_백내장-데이터소스-분석.md">예약통계_백내장 데이터소스 분석</a>(§6.2 채널 합산 공식·네이버 과다 원인).</p>
  `,
}
