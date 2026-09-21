export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>수술 건수가 이룬 <b>명단</b>을 폄. 검사자 리스트와 짝이고 컬럼 구성도 거의 같지만,
       기준 날짜가 <b>수술일</b>이고 수술방법·집도의·수납금액이 앞쪽에 옴.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>총수술 대조</td><td>「전체」 탭 조회건수가 월간 레포트 <b>총수술</b>과 같은지 봄</td></tr>
        <tr><td>수술 유형 확인</td><td>스마일·ICL·라섹계 등으로 좁혀 그 달 어떤 수술이 늘었는지 사람 단위로 봄</td></tr>
        <tr><td>재수술 판정</td><td>자동 판정이 애매한 건을 <b>화면에서 직접 뒤집음</b> — 아래 참조</td></tr>
        <tr><td>수납 확인</td><td>견적가·수술가율·수납금액으로 실제 결제를 되짚음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">이 화면만 데이터를 고칠 수 있음</div>
      <p>다른 리스트는 전부 읽기 전용인데, 이 화면에는 <b>재수술 판정을 저장하는 기능</b>이 있음.
         자동 판정(<code>REASON_CD</code> 기반)이 놓치거나 잘못 잡은 건을 사람이 뒤집어 저장하면,
         그 판정이 자동 판정보다 <b>우선</b>함.</p>
    </div>

    <h3>수술 유형은 '받은 사람' 기준임</h3>
    <p>한 사람이 좌우에 다른 수술을 받으면 통계는 대표유형 하나로 접지만,
       이 리스트는 <b>그 유형을 받은 사람이면 다 보여줌</b>
       (2026-07 ICL: 받은 사람 44명 / 대표유형 41명). 사람을 찾는 화면이라 그쪽이 자연스러움 —
       그래서 <b>유형별 건수를 더해도 전체와 안 맞음</b>. 통계로 쓰면 안 됨.</p>
  `,

  s3: `
    <p>기간 줄 + 수술구분 탭 + <b>탭에 따라 바뀌는</b> 유형 필터 줄. 아래는 44컬럼 표.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">일별</span><span>월별</span></span>
        <span class="ui">2026-07-01</span><span>~</span><span class="ui">2026-07-31</span>
        <span class="seg"><span>1주</span><span>2주</span><span>3주</span><span>4주</span><span>월별</span></span>
        <span class="ui">수술구분 전체 ▾</span>
        <span class="ui grow ph">고객명 · 차트번호 · 휴대전화</span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui green">⤓ CSV</span>
      </div>
      <div class="shot-bar">
        <span class="seg"><span class="on">전체</span><span>스마일</span><span>스마일프로</span><span>ICL</span><span>T-ICL</span><span>KPL</span><span>라식계</span><span>라섹계</span></span>
        <span class="seg"><span class="on">전체</span><span>엑스트라</span><span>퍼스널</span><span>콘트라</span></span>
        <span class="seg"><span class="on">전체</span><span>다초점</span><span>프리미엄</span><span>단초점</span></span>
        <span class="seg"><span class="on">전체</span><span>레이저</span><span>렌즈</span></span>
        <span class="ui amber">⚖ 재수술 판정</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>수술일</th><th>검사일</th><th>수술분류</th><th>신/구환</th><th>차트번호</th><th>고객명</th>
            <th>수술방법R</th><th>수술방법L</th><th>집도의</th><th>수술예약일</th><th>견적가</th><th>수술가율</th><th>수납금액</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-07-01</td><td>2026-06-24</td><td><span class="pill g-icl">시력교정</span></td>
              <td><span class="pill st-wait">구환</span></td><td>2229810</td><td class="link">김○○</td>
              <td>SMILE Pro +X</td><td>SMILE Pro +X</td><td>박원장</td><td>2026-06-24</td>
              <td>2,900,000</td><td>100%</td><td>2,900,000</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td>2026-07-01</td><td>2026-06-11</td><td><span class="pill g-lasek">백내장</span></td>
              <td><span class="pill st-wait">구환</span></td><td>2119004</td><td class="link">정○○</td>
              <td>T-Clareon Vivity</td><td class="ph">—</td><td>이원장</td><td>2026-06-11</td>
              <td>4,400,000</td><td>100%</td><td>4,400,000</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td>2026-07-02</td><td class="ph">—</td><td><span class="pill g-lasik">재수술</span></td>
              <td><span class="pill st-wait">구환</span></td><td>2087713</td><td class="link">오○○</td>
              <td>Enhance PRK</td><td class="ph">—</td><td>박원장</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">필터 줄이 <b>탭에 따라 나타났다 사라짐</b> — 백내장 탭에서는 시력교정 유형 필터가 아예 안 보임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>일별·월별 토글 + 빠른 기간 5종</td><td>기준 = <b>수술일</b>. 검사일은 보조 컬럼일 뿐 조회 조건이 아님</td></tr>
        <tr><td>수술구분</td><td>전체 · 시력교정 · 백내장 · 재수술</td><td><b>[조회]가 필요한 조건</b> — 재수술은 다른 API 를 부름</td></tr>
        <tr><td>시력교정 유형</td><td>스마일 · 스마일프로 · ICL · T-ICL · KPL · T-KPL · VIVA · PRESBYOND · 라식계 · 라섹계</td><td>즉시 반영. 시력교정·전체 탭에서만 보임</td></tr>
        <tr><td>옵션</td><td>엑스트라 · 퍼스널 · 콘트라 · 웨이브 · 모노</td><td>수술명에 붙는 표기로 판정(예: <code>+X</code> = 엑스트라)</td></tr>
        <tr><td>백내장 렌즈</td><td>다초점 · 프리미엄 · 단초점</td><td>백내장·전체 탭에서만</td></tr>
        <tr><td>재수술 종류</td><td>레이저 · 렌즈</td><td>재수술·전체 탭에서만</td></tr>
        <tr><td>재수술 판정</td><td>모달</td><td>후보 목록에서 포함/제외를 뒤집어 저장</td></tr>
        <tr><td>표</td><td>44컬럼 · 정렬 · 페이지 25·50·100·200</td><td>—</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">안 보이는 필터는 적용되지 않음</div>
      <p>백내장 탭으로 옮기면 시력교정 유형 필터가 사라지는데, <b>선택값도 함께 무시</b>함.
         그러지 않으면 이전 탭에서 고른 조건이 몰래 행을 걸러냄.</p>
    </div>
  `,

  s4: `
    <h3>서버 조회는 기간 + 탭 두 가지</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td><code>GET /api/surgery-list?from&amp;to</code> — 기준은 수술일</td></tr>
        <tr><td>수술구분 = 재수술</td><td><b>서버</b></td><td><code>GET /api/stats/surgery/reoperation-candidates</code> — <b>다른 테이블</b>임</td></tr>
        <tr><td>수술구분 = 전체</td><td>서버 둘 다</td><td>수술자 리스트 + 재수술 후보를 합쳐 수술일 순으로 정렬</td></tr>
        <tr><td>유형·옵션·렌즈·재수술종류</td><td>화면</td><td>수술명 문자열을 분류 함수에 넣어 판정</td></tr>
        <tr><td>검색어</td><td>화면</td><td>고객명 · 차트번호 · 휴대전화</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">재수술은 다른 테이블에 있음</div>
      <p>재수술은 <code>RE_OPERATION</code> 에 따로 기록돼 <code>OPERATIONDATA</code>·<code>Cataract_Operationdata</code> 기반
         수술자 리스트에 <b>들어 있지 않음</b>. 그래서 탭을 바꾸면 호출하는 API 자체가 달라짐.</p>
    </div>
  `,

  s5: `
    <h3>모집단 — 세 원천을 탭으로 나눔</h3>
    <table>
      <thead><tr><th>탭</th><th>원천</th><th>단위</th></tr></thead>
      <tbody>
        <tr><td>시력교정</td><td><code>OPERATIONDATA</code></td><td>고객 × 수술일</td></tr>
        <tr><td>백내장</td><td><code>Cataract_Operationdata</code></td><td>고객 × 수술일 (좌·우가 각각 날짜를 가짐)</td></tr>
        <tr><td>재수술</td><td><code>RE_OPERATION</code></td><td>자동 포함 판정된 건만</td></tr>
        <tr><td><b>전체</b></td><td>위 셋을 더함</td><td><b>월간 레포트 총수술과 같은 가산 기준</b></td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">불변식 — 전체 탭 = 레포트 총수술</div>
      <p>2026-07 기준 726(시력교정) + 43(백내장) + 29(재수술) = <b>798</b> = 레포트 총수술.
         같은 사람·같은 날이 수술자 리스트와 재수술에 <b>함께</b> 잡히는 건이 있지만
         (2026-07 6건 — 렌즈 제거+삽입처럼 한 세션이 두 테이블에 각각 기록된 경우),
         <b>레포트도 같은 방식으로 더하므로</b> 여기서 걷어내지 않음. 일부러 남긴 중복임.</p>
    </div>

    <h3>재수술 자동 판정 — 사유코드로 가름</h3>
    <table>
      <thead><tr><th><code>REASON_CD</code></th><th>뜻</th><th>재수술로 세나</th></tr></thead>
      <tbody>
        <tr><td><code>01</code></td><td>Irrigation (세척)</td><td><b>아님</b></td></tr>
        <tr><td><code>07</code></td><td>Lens Reposition (재위치)</td><td><b>아님</b></td></tr>
        <tr><td><code>10</code></td><td>CATARACT (백내장)</td><td><b>아님</b> — 백내장 탭이 따로 셈</td></tr>
        <tr><td>그 외</td><td>—</td><td>셈</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">사유코드에도 오입력이 있음</div>
      <p>시술명이 <code>Irrigation…</code> 으로 시작하면 사유코드가 <code>02 ENHANCE</code> 로 잘못 들어와 있어도 <b>함께 제외</b>함.
         제외 사유는 추측이 아니라 <b>실제 <code>REASON_CD</code>/<code>REOP_REASON</code> 값</b>으로 표기함 —
         "세척(Irrigation) · 사유코드 오입력" 처럼.</p>
    </div>

    <h3>사람이 뒤집은 판정이 이김</h3>
    <p>저장된 판정의 키는 <b>(차트번호, 수술일, 우안 시술명, 좌안 시술명)</b> 네 개임.
       같은 사람이 같은 날 시술명이 다른 재수술을 받으면 <b>별건으로 구분</b>하기 위해서임.
       저장이 없으면 자동 판정을 그대로 씀.</p>

    <h3>수술 유형 분류 — 판정 순서가 곧 정의임</h3>
    <p>수술명 문자열을 위에서 아래로 훑어 <b>먼저 걸리는 것</b>으로 정함.
       프론트의 <code>classifyVision()</code> 과 마트 함수 <code>surgery_op_type()</code> 이 <b>순서까지 같아야</b> 함.</p>
    <table>
      <thead><tr><th>순서</th><th>유형</th><th>걸리는 표기</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>PRESBYOND</td><td><code>PRESBYOND</code></td></tr>
        <tr><td>2</td><td>스마일프로</td><td><code>SMILE Pro</code> · <code>SMILEpro</code> · <code>SMILE PRO</code></td></tr>
        <tr><td>3</td><td>스마일</td><td><code>SMILE</code></td></tr>
        <tr><td>4</td><td>VIVA</td><td><code>VIVA</code></td></tr>
        <tr><td>5</td><td>T-ICL</td><td><code>T-ICL</code> · <code>T-IPCL</code> · <code>T-GLAZE</code> · <code>T-ECHO</code></td></tr>
        <tr><td>6</td><td>ICL</td><td><code>ICL</code> · <code>IPCL</code> · <code>ARF</code> · <code>ART</code> · <code>ARTIFLEX</code> · <code>GLAZE</code> · <code>ECHO</code></td></tr>
        <tr><td>7 · 8</td><td>T-KPL · KPL</td><td><code>T-KPL</code> / <code>KPL</code></td></tr>
        <tr><td>9</td><td>라식계</td><td><code>FLAP LIFT</code> · <code>OPTI</code> · <code>iFS</code> · <code>VISU</code> · <code>fs200</code> · <code>Micro+</code> · <code>Hybrid</code></td></tr>
        <tr><td>10</td><td>라섹계</td><td><code>EYECLE</code> · <code>T-prk</code> · <code>EYE CLE</code> · <code>EYE+</code> · <code>FLAP PRK</code> · <code>PtK</code> · <code>M-LE</code></td></tr>
        <tr><td>—</td><td>기타</td><td>위에 안 걸리는 전부 · 빈 값</td></tr>
      </tbody>
    </table>
    <p><b>스마일프로를 스마일보다 먼저</b> 보는 이유는 <code>SMILE Pro</code> 가 <code>SMILE</code> 을 포함하기 때문임. 순서를 뒤집으면 스마일프로가 전부 스마일로 떨어짐.</p>

    <h3>백내장 렌즈 — EDOF 를 먼저 봄</h3>
    <table>
      <thead><tr><th>구분</th><th>걸리는 표기</th></tr></thead>
      <tbody>
        <tr><td>프리미엄 (EDOF)</td><td><code>EDOF</code> · <code>Vivity</code> · <code>Eyhance</code> · <code>PureSee</code> · <code>Isopure</code> · <code>Symfony</code></td></tr>
        <tr><td>다초점</td><td><code>Clareon</code> · <code>Panoptix</code> · <code>RESTOR</code> · <code>Lara</code> · <code>LISA</code> · <code>CTR(M)</code> · <code>T-CTR</code> · <code>Precizon</code> · <code>LAL</code> 등</td></tr>
        <tr><td>단초점</td><td>그 외 전부</td></tr>
      </tbody>
    </table>
    <p><code>T-Clareon Vivity</code> 처럼 <b>두 목록에 다 걸리는 이름</b>이 있어 EDOF 를 먼저 판정함.</p>

    <h3>재수술 종류</h3>
    <p><code>remo</code> · <code>exch</code> · <code>ICL</code> · <code>ARF</code> · <code>ART</code> · <code>EVO</code> · <code>ECHO</code> ·
       <code>GLAZE</code> · <code>precizon</code> · <code>Lisa</code> · <code>Gemetric</code> · <code>encla</code> 중 하나라도 있으면 <b>렌즈</b>,
       아니면 <b>레이저</b>. 이진 판정임.</p>

    <h3>수납금액</h3>
    <p>(고객, 수술일)의 <code>COSTPRICE</code> 합. <code>PayStt='A'</code>(취소분)는 뺌.
       예약자 리스트의 수술금액과 <b>같은 규칙</b>이라 두 화면의 금액이 일치함.</p>

    <h3>컬럼 정의 — 44개</h3>
    <p>조회 경로는 마트 <code>list_surgery</code> 임.
       재수술 행은 별도 API 로 받아 10칸만 채우고 나머지는 빈칸임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>No</td><td>—</td><td>—</td><td>—</td><td>행 번호(페이지 반영). 정렬하면 원래 순서 기준. CSV 는 숫자</td></tr>
        <tr><td>2</td><td>수술일</td><td><code>surgeryDate</code></td><td><code>surgery_date</code></td><td><code>OPERATIONDATA.OPERATION_DATE</code> · <code>Cataract_Operationdata.OPERATIONR_DATE</code>/<code>OPERATIONL_DATE</code> · 재수술은 <code>RE_OPERATION.REOP_DATE</code></td><td><b>조회 기준 날짜</b>. 백내장은 좌·우 날짜가 다르면 행이 갈라지고 같으면 1행(2안). 기본 정렬 1순위</td></tr>
        <tr><td>3</td><td>검사일</td><td><code>examDate</code></td><td><code>exam_date</code></td><td><code>EXAM.EXAM_DATE</code> · <code>Cataract_Exam.EXAM_DATE</code></td><td>수술일 이전 최신 검사 1건, 없으면 이후 최신 1건. 조회 조건 아님. 재수술 행은 빈칸</td></tr>
        <tr><td>4</td><td>수술분류</td><td><code>surgeryCategory</code></td><td><code>surgery_category</code></td><td>원천 테이블별 고정값</td><td>시력교정 · 백내장 · 재수술(프론트 고정). 배지. <code>Cataract_Operationdata</code> 에 행이 있는 고객은 시력교정 모집단에서 뺌(<code>NOT EXISTS</code>)</td></tr>
        <tr><td>5</td><td>신/구환</td><td><code>patientType</code></td><td><code>patient_type</code></td><td><code>CUSTOM.FIRST_DAY</code></td><td>첫 내원일이 적재 쿼리의 <code>:from~:to</code> 안이면 신환, 아니면 구환. 배치는 D-1 하루 범위로 돌므로 <b>판정 범위는 적재 범위</b>이지 화면 조회 기간이 아님 — 확인 필요</td></tr>
        <tr><td>6</td><td>예약시간</td><td><code>surgeryTime</code></td><td><code>surgery_time</code></td><td><code>RESERVATION.START_TIME</code></td><td>수술예약(<code>RESERVE_FLAG='O'</code>, 취소 제외) 중 수술일과 같은 날 우선, 없으면 최신 1건</td></tr>
        <tr><td>7</td><td>차트번호</td><td><code>chartNo</code></td><td><code>chart_no</code></td><td><code>CUSTOM.CUST_NUM</code></td><td>trim. CSV 텍스트 강제. 키워드 검색 대상</td></tr>
        <tr><td>8</td><td>고객명</td><td><code>name</code></td><td><code>name</code></td><td><code>CUSTOM.CUST_NAME</code></td><td>이름에 테스트/test 가 든 고객은 원천에서 제외. CSV 만 마스킹. 검색 대상</td></tr>
        <tr><td>9</td><td>고객명(영)</td><td><code>nameEng</code></td><td><code>name_eng</code></td><td><code>CUSTOM.CUST_ENAME</code></td><td>CSV 만 마스킹</td></tr>
        <tr><td>10</td><td>수술방법R</td><td><code>surgeryR</code></td><td><code>surgery_r</code></td><td><code>OPERATIONDATA.OPERATIONR</code> · <code>Cataract_Operationdata.OPERATIONR</code> · <code>RE_OPERATION.AGAIN_R</code></td><td>X · OP불가 · 모든수술가능 · op x · Strabismus · TEST-TEST 는 빈 값 취급(양안 다 비면 행 제외). 유형·옵션·백내장·재수술 필터의 판정 대상 — 좌·우 중 한쪽만 맞아도 해당</td></tr>
        <tr><td>11</td><td>수술방법L</td><td><code>surgeryL</code></td><td><code>surgery_l</code></td><td><code>…OPERATIONL</code> · <code>AGAIN_L</code></td><td>같음</td></tr>
        <tr><td>12</td><td>집도의</td><td><code>surgeon</code></td><td><code>surgeon</code></td><td><code>OPERATIONDATA.OPERATION_DOC</code> · <code>Cataract_Operationdata.OPERATIONR_DOC</code>/<code>OPERATIONL_DOC</code> · <code>RE_OPERATION.AGAIN_DOCTOR</code> → <code>EMPLOYEE.EMP_NAME</code></td><td>백내장은 같은 날 좌·우 중 <code>MAX</code> 값 1개</td></tr>
        <tr><td>13</td><td>적절수술R</td><td><code>recommendedR</code></td><td><code>recommended_r</code></td><td><code>EXAM.OPERATIONR</code> · <code>Cataract_Exam.OPERATIONR</code></td><td>3번 검사일과 같은 검사 건</td></tr>
        <tr><td>14</td><td>적절수술L</td><td><code>recommendedL</code></td><td><code>recommended_l</code></td><td><code>EXAM.OPERATIONL</code> · <code>Cataract_Exam.OPERATIONL</code></td><td>같음</td></tr>
        <tr><td>15</td><td>수술예약일</td><td><code>surgeryReserveDate</code></td><td><code>surgery_reserve_date</code></td><td><code>RESERVATION.RESERVE_DATE</code></td><td>6번과 같은 예약 건</td></tr>
        <tr><td>16</td><td>수술예약등록일</td><td><code>surgeryRegDate</code></td><td><code>surgery_reg_date</code></td><td><code>RESERVATION.RESERVE_NUM</code> 앞 6자리(YYMMDD)</td><td>예약번호를 날짜로 파싱한 값. 6자리 미만이면 빈칸. 등록 시각 컬럼이 아님</td></tr>
        <tr><td>17</td><td>견적가</td><td><code>estimate</code></td><td><code>estimate</code></td><td><code>EXAM.OP_ESTIMATE</code> · 백내장은 <code>Cataract_Exam.OP_ESTIMATE_R</code> + '/' + <code>OP_ESTIMATE_L</code></td><td>문자열 그대로. 말줄임, 마우스 올리면 전문</td></tr>
        <tr><td>18</td><td>수술가율</td><td><code>surgeryRate</code></td><td><code>surgery_rate</code></td><td><code>EXAM.ExamPercent</code></td><td>백내장 행은 항상 빈칸</td></tr>
        <tr><td>19</td><td>수납금액</td><td><code>payment</code></td><td><code>payment</code></td><td><code>COSTPRICE.COST_PRICE</code> 합</td><td>(고객, <code>COST_DATE</code> = 수술일) 합계. <code>PayStt='A'</code> 제외. 0 이면 빈칸. 콤마 문자열이라 정렬은 문자 비교(numeric)</td></tr>
        <tr><td>20</td><td>상담사</td><td><code>counselor</code></td><td><code>counselor</code></td><td><code>CUSTOM.MY_COUNSELOR</code> → <code>EMPLOYEE.EMP_NAME</code></td><td>고객 마스터의 현재 담당자(수술 시점 아님)</td></tr>
        <tr><td>21</td><td>상담의</td><td><code>doctor</code></td><td><code>doctor</code></td><td><code>CUSTOM.MY_DOCTOR</code> → <code>EMPLOYEE.EMP_NAME</code></td><td>같음</td></tr>
        <tr><td>22</td><td>검안사</td><td><code>optometrist</code></td><td><code>optometrist</code></td><td><code>CUSTOM.MY_OPTOMETRIST</code> → <code>EMPLOYEE.EMP_NAME</code></td><td>같음</td></tr>
        <tr><td>23</td><td>등급</td><td><code>grade</code></td><td><code>grade</code></td><td><code>CUSTOM.LEVEL</code></td><td>배지 R · A · B · C · G. 그 외 값은 회색</td></tr>
        <tr><td>24</td><td>생년월일</td><td><code>birth</code></td><td><code>birth</code></td><td><code>CUSTOM.BIRTH_DAY</code></td><td>원문 그대로</td></tr>
        <tr><td>25</td><td>만나이</td><td>—</td><td>—</td><td>—</td><td>화면 파생 <code>calcAge(birth)</code> — 오늘 기준 만 나이. 생년월일이 YYYY-MM-DD 꼴이 아니거나 0~129 밖이면 —. 정렬은 숫자, CSV 도 파생값</td></tr>
        <tr><td>26</td><td>양/음</td><td><code>lunar</code></td><td><code>lunar</code></td><td><code>CUSTOM.LUNAR_YN</code></td><td>'Y' 면 음, 아니면 양</td></tr>
        <tr><td>27</td><td>휴대전화</td><td><code>phone2</code></td><td><code>phone2</code></td><td><code>CUSTOM.CALL_NUM2</code></td><td>CSV 마스킹·텍스트 강제. 검색 대상</td></tr>
        <tr><td>28</td><td>집전화</td><td><code>phone1</code></td><td><code>phone1</code></td><td><code>CUSTOM.CALL_NUM1</code></td><td>CSV 마스킹·텍스트 강제</td></tr>
        <tr><td>29</td><td>이메일</td><td><code>email</code></td><td><code>email</code></td><td><code>CUSTOM.EMAIL</code></td><td>말줄임</td></tr>
        <tr><td>30</td><td>예약경로</td><td><code>route</code></td><td><code>route</code></td><td><code>RESERVATION.RESERVE_PATH</code></td><td>6번과 같은 예약 건. 코드 변환 없이 원문</td></tr>
        <tr><td>31</td><td>섹션</td><td><code>section</code></td><td><code>section</code></td><td><code>MOTIVE_NEW02.section</code></td><td><code>Idx='1'</code> 최신 1건(<code>pkey DESC</code>)</td></tr>
        <tr><td>32</td><td>내원동기(대)</td><td><code>motiveL</code></td><td><code>motive_l</code></td><td><code>MOTIVE_NEW02.category01_name</code></td><td>31번과 같은 건</td></tr>
        <tr><td>33</td><td>내원동기(중)</td><td><code>motiveM</code></td><td><code>motive_m</code></td><td><code>MOTIVE_NEW02.category02_name</code></td><td>같음</td></tr>
        <tr><td>34</td><td>내원동기(세)</td><td><code>motiveS</code></td><td><code>motive_s</code></td><td><code>MOTIVE_NEW02.category03_name</code></td><td>같음</td></tr>
        <tr><td>35</td><td>동기메모</td><td><code>motiveMemo</code></td><td><code>motive_memo</code></td><td><code>MOTIVE_NEW01.comments</code>, 없으면 <code>MOTIVE_NEW02.name</code></td><td>말줄임</td></tr>
        <tr><td>36</td><td>직업</td><td><code>job</code></td><td><code>job</code></td><td><code>CUSTOM.JOB</code></td><td>—</td></tr>
        <tr><td>37</td><td>국적</td><td><code>nationality</code></td><td><code>nationality</code></td><td><code>CUSTOM.Nation_code</code> → <code>NationCustom_CFG.Nation_CodeName</code></td><td>—</td></tr>
        <tr><td>38</td><td>보험사</td><td><code>insurance</code></td><td><code>insurance</code></td><td><code>CUSTOM.InsuranceCode</code> → <code>EtcCfg.EtcCodNam</code> (<code>EtcBseCod='InsuranceCfg'</code>)</td><td>—</td></tr>
        <tr><td>39</td><td>우편번호</td><td><code>zip</code></td><td><code>zip</code></td><td><code>CUSTOM.ZIP_CODE</code></td><td>trim. CSV 텍스트 강제</td></tr>
        <tr><td>40</td><td>주소1</td><td><code>addr1</code></td><td><code>addr1</code></td><td><code>CUSTOM.ADDR1</code></td><td>말줄임</td></tr>
        <tr><td>41</td><td>주소2</td><td><code>addr2</code></td><td><code>addr2</code></td><td><code>CUSTOM.ADDR2</code></td><td>말줄임</td></tr>
        <tr><td>42</td><td>최근내원일</td><td><code>lastVisit</code></td><td><code>last_visit</code></td><td><code>CUSTOM.LAST_DAY</code></td><td>적재 시점 값</td></tr>
        <tr><td>43</td><td>검사특이사항</td><td><code>examMemo</code></td><td><code>exam_memo</code></td><td><code>EXAM.EXAM_MEMO</code> · <code>Cataract_Exam.EXAM_MEMO</code></td><td>3번과 같은 검사 건. 말줄임</td></tr>
        <tr><td>44</td><td>고객메모</td><td><code>memo</code></td><td><code>memo</code></td><td><code>CUSTOM.ETC</code></td><td>말줄임</td></tr>
      </tbody>
    </table>
    <p>툴바 숫자 두 개는 표에서 파생함 — 「조회건수」는 필터를 거친 행 수(사람×수술일), 백내장 탭의 「수술 N안」은 행의 수술방법R·L 이 채워진 개수 합(같은 날 양안 = 2안)임.
       재수술 구분 필터(레이저/렌즈)는 프론트 <code>classifyReoperation</code> 로 판정하는데 이 목록에는 <code>KPL</code> 이 없고, 마트 <code>is_lens</code>(자바 <code>ReoperationOverlay</code>)에는 <code>kpl</code> 이 있음 — 리스트 필터와 수술별 비중 표의 렌즈 건수가 KPL 재수술만큼 어긋날 수 있음. 확인 필요.</p>

    <h3>컬럼 정의 — 재수술 검토 팝업 8개</h3>
    <p>조회 경로는 마트 <code>list_reoperation</code> 이고, 사람이 저장한 판정은 <code>reoperation_decision</code> 테이블에 있음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>포함 체크</td><td><code>isReoperation</code>(판정) · <code>autoIncluded</code>(후보)</td><td><code>reoperation_decision.is_reoperation</code> · <code>list_reoperation.auto_included</code></td><td><code>RE_OPERATION.REASON_CD</code> · <code>AGAIN_R</code>/<code>AGAIN_L</code> 로 자동 판정</td><td>저장 판정이 있으면 그 값, 없으면 자동판정. 키는 (차트번호, 수술일, 우안, 좌안). 저장은 뒤집은 행만 batch upsert</td></tr>
        <tr><td>2</td><td>수술일</td><td><code>reopDate</code></td><td><code>reop_date</code></td><td><code>RE_OPERATION.REOP_DATE</code></td><td>조회 기준. 팝업은 MM-DD 만 표시</td></tr>
        <tr><td>3</td><td>차트번호</td><td><code>chartNo</code></td><td><code>chart_no</code></td><td><code>RE_OPERATION.CUST_NUM</code></td><td>trim</td></tr>
        <tr><td>4</td><td>고객명</td><td><code>name</code></td><td><code>name</code></td><td><code>CUSTOM.CUST_NAME</code></td><td>테스트 고객 제외. 빈 값 —</td></tr>
        <tr><td>5</td><td>수술방법 R</td><td><code>againR</code></td><td><code>again_r</code></td><td><code>RE_OPERATION.AGAIN_R</code></td><td>빈 값 —. 렌즈/레이저 판정 입력(마트 <code>is_lens</code>)</td></tr>
        <tr><td>6</td><td>수술방법 L</td><td><code>againL</code></td><td><code>again_l</code></td><td><code>RE_OPERATION.AGAIN_L</code></td><td>같음</td></tr>
        <tr><td>7</td><td>수납금액</td><td><code>payment</code></td><td><code>payment</code></td><td><code>COSTPRICE.COST_PRICE</code> 합 (<code>COST_DATE</code> = 재수술일, <code>PayStt≠'A'</code>)</td><td>콤마 문자열 + '원'. 0 이면 —. 요약바 「비용」은 체크된 행의 합</td></tr>
        <tr><td>8</td><td>제외 사유(그룹 제목)</td><td><code>excludeReason</code></td><td><code>exclude_reason</code></td><td><code>REASON_CD</code> 01/07/10 · 시술명 <code>Irrigation…</code> · 시술명 없음</td><td>자동 제외 행만 값이 있음. 값 종류 고정: 세척(Irrigation) · 재위치(Lens Reposition) · 백내장(CATARACT) · 세척(Irrigation) · 사유코드 오입력 · 시술명 없음 · 기타</td></tr>
      </tbody>
    </table>
    <p>응답의 <code>nameEng</code> · <code>patientType</code> · <code>surgeon</code> 은 팝업에 없고 리스트의 재수술 행(고객명(영) · 신/구환 · 집도의)에만 쓰임. 요약바 「재수술 N건」은 체크된 행 수, 「자동 N건」은 <code>autoIncluded=1</code> 행 수임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>유형별 건수 합 ≠ 전체</b></td><td>필터를 하나씩 눌러 더하면 전체보다 큼</td><td>'받은 사람' 기준이라 그럼. <b>통계로 쓰지 말 것</b> — 수술별 비중 화면을 봄</td></tr>
        <tr><td><b>전체 탭의 의도된 중복</b></td><td>같은 사람·같은 날이 두 번 나옴(2026-07 6건)</td><td>레포트와 맞추기 위한 것임. 사람 수를 세려면 차트번호로 접어야 함</td></tr>
        <tr><td><b>분류가 문자열 판정</b></td><td>새 수술명이 들어오면 '기타'로 떨어짐</td><td>새 시술 도입 시 <b>프론트·백엔드 두 곳</b>의 목록을 함께 늘려야 함</td></tr>
        <tr><td><b>재수술 사유코드 오입력</b></td><td>세척인데 ENHANCE 로 들어온 건</td><td>시술명 <code>Irrigation%</code> 예외로 막았지만 <b>다른 오입력은 못 막음</b> — 판정 모달로 수동 교정</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>오늘 수술은 안 보임</td><td>매일 03시 배치 이후</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>중복 표시</td><td>전체 탭에서 두 번 잡히는 건을 <b>표시</b>라도 할지. 지금은 티가 안 나 오해를 부름</td></tr>
        <tr><td>재수술 판정 이력</td><td>누가 언제 뒤집었는지 화면에서 볼 수 없음. 저장은 되지만 되짚을 수 없음</td></tr>
        <tr><td>분류 목록의 정본</td><td>마트 쪽은 <code>surgery_op_type()</code> 함수 하나로 모였으나(V47), 프론트 <code>classifyVision()</code> 과는 <b>여전히 두 벌</b>임. 한쪽만 고치면 조용히 어긋남 — 한 곳에서 생성할지</td></tr>
        <tr><td>유형별 사람/눈 단위</td><td>리스트는 사람, 통계는 눈·건. 두 단위를 오가는 혼동이 반복됨</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/재수술-분류_2026-01~07.md">재수술 분류 점검</a>(<code>REASON_CD</code> 전환 근거) ·
       <a href="../점검/시력교정-수술자_2026-07.md">시력교정 수술자 점검</a>(수술 유형 분류·PIOL 합계 대조).</p>
  `,
}
