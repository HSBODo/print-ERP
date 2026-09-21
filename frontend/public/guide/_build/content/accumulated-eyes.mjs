/* 누적 안수 — 2026-09-16 작성. 마트 V58 · pages/marketing/AccumulatedEyesPage.tsx · sql/mart/surgery/select-list-accumulated-eyes.sql */
export default {
  s2: `
    <h3>누가 여는가</h3>
    <p>「지금까지 병원 전체에서 몇 번째 눈을 수술했는가」— <b>누적 안수(眼数)</b> 번호표를 눈 단위로 보는 명단임.
       마케팅 그룹 메뉴(MARKETING 부서와 ALL 부서)에 열려 있고, 홈 대시보드의 <b>「총 누적 안수」 KPI</b> 도 같은 마트를 읽음.</p>
    <table>
      <thead><tr><th>쓰는 사람</th><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>마케팅</td><td>기념 안수 앞뒤</td><td>"n만 안수 돌파" 같은 시점을 잡고, 그 번호를 받은 고객을 찾아 기념·홍보 소재로 씀</td></tr>
        <tr><td>마케팅</td><td>월간</td><td>홈 KPI 숫자의 근거를 확인함 — 어느 수술이 몇 번째였는지</td></tr>
        <tr><td>수술 데스크 · 상담</td><td>고객 문의 시</td><td>이름·차트번호·전화로 그 고객의 안수 번호와 좌우 눈, 수술 코드를 찾음</td></tr>
        <tr><td>데이터 점검</td><td>번호가 이상할 때</td><td>가중치 코드 배지로 그 수술이 +1 인지 +2·+3 인지 눈으로 확인함</td></tr>
      </tbody>
    </table>

    <h3>이 화면이 대체한 것</h3>
    <p>안수 번호는 CRM 이 매일 새벽 만들어 <code>OPERATION_ACCUMULATED_EYE_COUNT</code> 표에 쌓아 두는데, 화면이 없어 DB 툴로 열어 보던 것을
       기간·검색이 되는 리스트로 옮긴 것임. 규칙 자체는 원천이 정하고, 이 화면은 <b>번호를 보여 주고 규칙을 설명</b>함.</p>

    <div class="note">
      <div class="h">고객별 번호가 아님</div>
      <p>안수는 고객마다 세는 게 아니라 병원 전체를 통틀어 이어지는 <b>하나의 번호표</b>임.
         같은 사람 양안이면 R/L 두 행이 각각 번호를 받음. 옵션이 붙은 수술은 번호가 한 번에 2~3 씩 뛰어서 중간 번호가 비어 보임(5장).</p>
    </div>
  `,

  s3: `
    <p>위에서부터 규칙 안내 카드 · 조회 카드 · 표. 카드 하나가 화면의 절반을 차지하는 건 번호 규칙을 묻는 일이 많아서임.</p>

    <div class="shot">
      <div style="padding:12px 14px; border-bottom:1px solid #eaeaec">
        <div style="font-size:13px; font-weight:700">누적 안수 규칙 안내 <span class="ph">정의 · 계산식 · 정렬 · 중복 처리</span></div>
        <div class="ph" style="font-size:11.5px; margin-top:4px">📌 이 숫자, 무슨 뜻인가요? · ⏰ 처리 순서 · 🧮 계산식(현재 규칙 최대 +3 / 2024 이전 레거시 최대 +5) · 📌 실전 예시 · 🔁 중복 처리 · ⚠️ 유의사항</div>
      </div>
      <div class="shot-bar">
        <span class="ph">기간(수술일)</span><span class="ui">2026-08-17</span><span>~</span><span class="ui">2026-09-16</span>
        <span class="ph">검색</span><span class="ui">전체 ▾</span><span class="ui" style="min-width:220px; color:#8a909a">예: 조승우 · 2233873 · 0109669 · 627122</span>
        <span class="ui">↺ 초기화</span><span class="ui blue">조회</span>
      </div>
      <table>
        <thead><tr><th>No</th><th>수술일</th><th>차트번호</th><th>이름</th><th>연락처</th><th>구분</th><th>수술 코드</th><th>가중치 코드</th><th>가중치</th><th>안(R/L)</th><th>누적 안수 ▾</th><th>수정 시각</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>2026-09-15</td><td>2233873</td><td>조○우</td><td>0109669****</td><td><span class="pill">시력교정술</span></td><td>SMILE+X(P)</td><td><span class="pill">기본</span> <span class="pill">+X(P)</span></td><td>2</td><td>R</td><td style="text-align:right">627,122</td><td>2026-09-16 00:31</td></tr>
          <tr><td>2</td><td>2026-09-15</td><td>2233873</td><td>조○우</td><td>0109669****</td><td><span class="pill">시력교정술</span></td><td>SMILE+X(P)</td><td><span class="pill">기본</span> <span class="pill">+X(P)</span></td><td>2</td><td>L</td><td style="text-align:right">627,124</td><td>2026-09-16 00:31</td></tr>
          <tr><td>3</td><td>2026-09-15</td><td>2240011</td><td>김○수</td><td>0102233****</td><td><span class="pill">렌즈삽입</span></td><td>ICL</td><td><span class="pill">기본</span></td><td>1</td><td>R</td><td style="text-align:right">627,125</td><td>2026-09-16 00:31</td></tr>
        </tbody>
      </table>
      <div class="shot-bar" style="border-top:1px solid #eaeaec"><span class="ph">312건 · 이전 · 1 / 7 · 다음 · 행 수 50/100/200</span></div>
    </div>
    <p class="shot-cap">숫자·이름은 예시임. 처음 열면 표는 비어 있고 [조회] 를 눌러야 채워짐.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>규칙 안내 카드</td><td>6개 소제목</td><td>정의(번호표) · 처리 순서(매일 00:30 어제 수술 처리, 같은 날 양안은 수술코드 알파벳순) · 계산식 · 예시 · 중복 처리 · 유의사항. 접히지 않는 고정 카드임</td></tr>
        <tr><td>기간</td><td>시작일 ~ 종료일</td><td><b>수술일</b> 기준. 기본 최근 30일</td></tr>
        <tr><td>검색</td><td>필드 선택 + 입력</td><td>전체 · 이름 · 차트 · 전화 · 안수. 필드를 바꾸면 입력창의 예시 문구가 바뀜</td></tr>
        <tr><td>표</td><td>12열</td><td>머리글 클릭 정렬(No·가중치 두 열 제외). 기본은 누적 안수 내림차순. 구분·가중치 코드는 색 배지</td></tr>
        <tr><td>페이지</td><td>50 · 100 · 200</td><td>화면 페이지네이션(서버는 전체를 한 번에 줌)</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td><code>GET /api/accumulated-eyes?from&amp;to</code> — 수술일(<code>operation_date</code>) 범위. 기본 최근 30일 ~ 오늘</td></tr>
        <tr><td>검색어 · 필드</td><td><b>서버</b></td><td><code>query</code> + <code>field</code>(all · name · chart · phone · eyes). 이름·전화는 대소문자 무시 부분일치, 차트번호·안수는 부분일치에 더해 <b>숫자만 입력하면 정확일치</b>도 함께 봄(인덱스를 탐). 허용 외 필드값은 all 로 취급</td></tr>
        <tr><td>비활성 제외</td><td><b>서버</b></td><td><code>is_active = TRUE</code> 고정 — 원천에서 폐기된 행은 마트에는 남지만 화면엔 안 나옴</td></tr>
        <tr><td>정렬 · 페이지</td><td>화면</td><td>서버는 최신 수술일 → 같은 날 안수 오름차순으로 주고, 화면이 다시 정렬함</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">범위 상한이 검색어 유무로 달라짐</div>
      <p>검색어가 <b>없으면 366일</b>(대량 결과 방지), 검색어가 <b>있으면 3,660일</b>(한 사람의 10년 이력 조회). 넘기면 400.</p>
    </div>
    <p>[조회] 를 눌러야 조회함 — 진입 직후에는 표가 비어 있음. 조회 단위는 일 하나뿐이고 주·월 집계는 없음(통계 화면은 별도 예정 · 10장).</p>
  `,

  s5: `
    <h3>단위와 날짜</h3>
    <table>
      <thead><tr><th>항목</th><th>정의</th></tr></thead>
      <tbody>
        <tr><td><b>행 1개</b></td><td><b>눈 1개</b>. 양안 수술이면 R/L 두 행. PK 는 원천 UUID(<code>id</code>)</td></tr>
        <tr><td><b>날짜 기준</b></td><td><b>수술일</b>(<code>OPERATION_DATE</code>). 번호를 만든 실행일이 아님 — 레거시 판정(2024-01-01)도 수술일로 가름</td></tr>
        <tr><td><b>누적 안수</b></td><td>이 수술까지 포함해 병원 전체 통틀어 몇 번째 안수인가. 원천 배치가 부여한 값을 <b>그대로</b> 보여 줌</td></tr>
        <tr><td><b>총 누적 안수(홈 KPI)</b></td><td><code>GET /api/accumulated-eyes/total</code> — 마트의 최댓값</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 12개</h3>
    <p>조회 경로는 CRM 누적 안수 테이블 → 마트 <code>list_accumulated_eyes</code> 임.
       활성 행만 보이고 기본 정렬은 누적 안수 내림차순임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>No</td><td>—</td><td>—</td><td>—</td><td>정렬 후 순번(페이지 반영). 정렬 불가. CSV 제외</td></tr>
        <tr><td>2</td><td>수술일</td><td><code>operationDate</code></td><td><code>operation_date</code></td><td><code>OPERATION_DATE</code></td><td><b>조회 기준</b>(from ≤ 날짜 &lt; to + 1일). YYYY-MM-DD. 서버 기본 정렬 1순위(내림차순)</td></tr>
        <tr><td>3</td><td>차트번호</td><td><code>custNum</code></td><td><code>cust_num</code> (BIGINT)</td><td><code>CUST_NUM</code></td><td>응답은 문자열. 「차트」 검색 대상 — 부분일치 + 숫자면 정확일치</td></tr>
        <tr><td>4</td><td>이름</td><td><code>customName</code></td><td><code>custom_name</code></td><td><code>CUSTOM_NAME</code></td><td>「이름」 검색 대상(대소문자 무시 부분일치). 마스킹 없음</td></tr>
        <tr><td>5</td><td>연락처</td><td><code>customPhone</code></td><td><code>custom_phone</code></td><td><code>CUSTOM_PHONE</code></td><td>「전화」 검색 대상. 마스킹 없음</td></tr>
        <tr><td>6</td><td>구분</td><td><code>operationCategory</code></td><td><code>operation_category</code></td><td><code>OPERATION_CATEGORY</code></td><td>원문 그대로 배지: 시력교정술 · 렌즈삽입 · 백내장 · 드림렌즈 · 재수술 · 노안. 그 외 값은 회색</td></tr>
        <tr><td>7</td><td>수술 코드</td><td><code>operationCode</code></td><td><code>operation_code</code></td><td><code>OPERATION_CODE</code></td><td>예: <code>SMILE+X(P)</code> · <code>REMO+X+CTR</code>. 가중치 판정의 입력</td></tr>
        <tr><td>8</td><td>가중치 코드</td><td>—</td><td>—</td><td>—</td><td>화면 파생 — 수술 코드를 대문자로 바꿔 부분 문자열 판정한 규칙 배지(기본 · +X(P) 또는 +X · REMO+CTR · 수술일 2024-01-01 이전만 +W.V · +CONT). 정렬 불가. CSV 는 라벨을 ' | ' 로 이음</td></tr>
        <tr><td>9</td><td>가중치</td><td>—</td><td>—</td><td>—</td><td>화면 파생 — 8번 배지 개수(+N). 설명용이며 원천 번호를 다시 계산하지 않음. 정렬 불가. CSV 숫자</td></tr>
        <tr><td>10</td><td>안(R/L)</td><td><code>eyePosition</code></td><td><code>eye_position</code></td><td><code>EYE_POSITION</code></td><td>'R' | 'L'. 빈 값이면 표기 없음</td></tr>
        <tr><td>11</td><td>누적 안수</td><td><code>accumulatedEyeCount</code></td><td><code>accumulated_eye_count</code></td><td><code>ACCUMULATED_EYE_COUNT</code></td><td>화면 기본 정렬(내림차순 → 클릭마다 오름차순 → 서버 순). 천 단위 콤마. 「안수」 검색 대상(부분일치 + 숫자면 정확일치)</td></tr>
        <tr><td>12</td><td>수정 시각</td><td><code>lastModifiedDate</code></td><td><code>last_modified_date</code></td><td><code>LASTMODIFIED_DATE</code></td><td>YYYY-MM-DD HH:MM:SS. 원천 배치가 마지막으로 손댄 시각</td></tr>
      </tbody>
    </table>
    <p>응답의 <code>id</code>(원천 UUID, 행 key) 와 <code>createDate</code> 는 화면에 없음. 목록 위 「총 N행」은 조회 결과 행 수(눈 단위)임.</p>

    <h3>가중치 — 수술 1건당 번호 증가값</h3>
    <table>
      <thead><tr><th>규칙</th><th>조건(수술 코드)</th><th>증가</th><th>적용</th></tr></thead>
      <tbody>
        <tr><td>기본</td><td>수술 그 자체</td><td>+1</td><td>항상</td></tr>
        <tr><td>+X(P) 또는 +X</td><td><code>+X(P)</code> 가 있으면 그것, 아니면 <code>+X</code>. 둘 다 있어도 하나만</td><td>+1</td><td>항상</td></tr>
        <tr><td>REMO+CTR</td><td><code>REMO</code> 와 <code>CTR</code> 이 동시에</td><td>+1</td><td>항상 (현재 규칙 최대 +3)</td></tr>
        <tr><td>+W.V</td><td><code>+W.V</code></td><td>+1</td><td><b>2024-01-01 이전</b> 수술일만(레거시)</td></tr>
        <tr><td>+CONT</td><td><code>+CONT</code></td><td>+1</td><td><b>2024-01-01 이전</b> 수술일만(레거시 · 최대 +5)</td></tr>
      </tbody>
    </table>
    <p>예: <code>SMILE</code> → 1 안수 · <code>SMILE+X(P)</code> → 2 안수 · <code>REMO+X+CTR</code> → 3 안수.
       같은 (고객번호 · 수술코드 · 좌우) 가 다시 들어오면 <b>번호가 늘지 않음</b>(중복 처리). 그래서 옵션 수술마다 번호가 건너뛰어 <b>gap</b> 이 생기는 게 정상임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>이중 배치 지연</b></td><td>원천 배치(00:30 · 어제 수술)가 번호를 만들고, 마트 배치(03:00 · D-1)가 그것을 옮김. 어제 수술은 오늘 새벽 두 단계를 다 지나야 보임</td><td>당일 수술 번호는 아직 없음. 화면의 「데이터 기준」과 수정 시각으로 확인</td></tr>
        <tr><td><b>번호는 원천이 정함</b></td><td>화면의 가중치 배지는 같은 규칙을 <b>다시 계산해 설명</b>하는 것. 두 값이 어긋나면 원천이 맞고 화면 규칙이 낡은 것임</td><td>규칙이 바뀌면 원천과 화면(규칙 카드·배지)을 함께 고침</td></tr>
        <tr><td><b>비활성 행</b></td><td>원천에서 폐기(<code>isActive=false</code>)된 눈은 마트에 남고 화면에서만 숨김. 그래서 「총 누적 안수」 최댓값은 폐기된 번호도 포함할 수 있음</td><td>KPI 정의 미결(아래)</td></tr>
        <tr><td><b>소급 변동</b></td><td>수술 기록이 나중에 고쳐지면 좌우·번호가 재발급될 수 있음. 마트는 원천 UUID 를 PK 로 잡아 같은 id 가 두 번 들어오면 바로 드러남</td><td>매월 1일 보정이 전월을 다시 읽음. 그보다 오래된 변동은 배치 관리에서 수동 재적재</td></tr>
        <tr><td><b>테스트 고객 제외</b></td><td>원천 배치 몫이라 화면·마트는 걸러 주지 않음</td><td>이상한 이름이 보이면 원천 배치 설정을 확인</td></tr>
        <tr><td><b>대량 조회</b></td><td>검색어 없이 1년을 조회하면 수만 행을 한 번에 받음(서버 페이지 없음)</td><td>기간을 좁히거나 검색어를 넣음</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>통계 화면</b></td><td>월별 안수 증가 추이·구분별 비중은 별도 페이지로 두기로 함(마트 재사용). 어떤 도표가 필요한지 마케팅이 정해야 함</td></tr>
        <tr><td><b>총 누적 안수의 정의</b></td><td>마트 최댓값(폐기 포함) vs 활성 행의 최댓값 vs 활성 행 수. 홈 KPI 에 어느 것을 쓸지</td></tr>
        <tr><td>기념 번호 알림</td><td>특정 번호(예: 65만) 도달 시 누구에게 어떻게 알릴지. 지금은 사람이 조회해서 확인</td></tr>
        <tr><td>연락처 마스킹</td><td>전체 번호가 그대로 보임. 마케팅 실무자 화면에서 가릴지</td></tr>
      </tbody>
    </table>
  `,
}
