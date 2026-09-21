export default {
  s2: `
    <h3>접수리스트를 숫자로 접은 화면</h3>
    <p><a href="overseas-marketing-receptions.html">접수리스트</a>가 명단이라면 이 화면은 그 명단의 <b>흐름과 매출</b>임.
       해외마케팅 유입이 검사·수술로 얼마나 이어지고 얼마를 남겼는지 봄.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>해외 실적 보고</td><td>유입 → 검사 → 수술 흐름을 기간별로 봄</td></tr>
        <tr><td>매출 구성 확인</td><td>수납을 검사·수술·외래·렌즈로 나눠 봄</td></tr>
        <tr><td>국가 우선순위</td><td>수술 건수 상위 10개국을 봄</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">매칭된 사람만 매출이 잡힘</div>
      <p>매출·수술 정보는 CRM 에서 오므로 <b>CRM 과 매칭된 접수만</b> 숫자에 들어감.
         접수리스트의 <b>미매칭·확인필요를 줄이는 일이 곧 이 화면의 정확도</b>임.</p>
    </div>
  `,

  s3: `
    <p>툴바(연도 · 집계 단위) + 탭 4개. 탭마다 차트나 표 하나를 보여줌.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026 ▾</span>
        <span class="seg"><span class="on">월별</span><span>주차별</span><span>일별</span></span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
      </div>
      <div class="shot-bar">
        <span class="seg"><span class="on">유입·검사·수술</span><span>매출 구성</span><span>국가별 수술 Top 10</span><span>매출</span></span>
      </div>
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700">유입·검사·수술</div>
        <div class="ph" style="font-size:11.5px; margin-top:2px">해외마케팅 접수부터 실제 검사와 수술까지의 흐름입니다.</div>
        <div style="border:1px solid #eaeaec; border-radius:10px; height:140px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
      </div>
    </div>
    <p class="shot-cap">연도는 <b>[조회]를 눌러야</b> 적용되고, 집계 단위는 즉시 반영됨.</p>

    <h3>탭 4개</h3>
    <table>
      <thead><tr><th>탭</th><th>보는 것</th><th>형태</th></tr></thead>
      <tbody>
        <tr><td>유입·검사·수술</td><td>접수부터 검사·수술까지의 흐름</td><td>꺾은선</td></tr>
        <tr><td>매출 구성</td><td>수납을 검사·수술·외래·렌즈로 분류한 기간별 합계</td><td>막대</td></tr>
        <tr><td>국가별 수술 Top 10</td><td>매칭된 해외고객의 수술 건수 상위 10개국</td><td>막대</td></tr>
        <tr><td>매출</td><td>기간별 문의·검사·수술 건수와 매출 상세</td><td>표</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">연도만 [조회]가 필요한 이유</div>
      <p>통계는 <b>CRM 병합이 무거워</b> 조회 버튼을 눌렀을 때만 요청함.
         집계 단위(월/주차/일)는 이미 받은 데이터를 다시 묶는 것이라 즉시 반영됨.
         예약통계 화면들과 같은 툴바 패턴임.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>최근 7년 중 하나. <b>[조회] 필요</b></td></tr>
        <tr><td>집계 단위</td><td>서버 파라미터</td><td>월별 · 주차별 · 일별 — 즉시 반영</td></tr>
        <tr><td>탭</td><td>화면</td><td>같은 응답의 다른 부분을 그림</td></tr>
      </tbody>
    </table>
    <p>처음 들어오면 조회하지 않음 — 연도를 고르고 [조회]를 눌러야 첫 요청이 나감.</p>
  `,

  s5: `
    <h3>무엇을 세는가</h3>
    <table>
      <thead><tr><th>지표</th><th>원천</th><th>단위</th></tr></thead>
      <tbody>
        <tr><td>유입(문의)</td><td>접수리스트 행</td><td>건</td></tr>
        <tr><td>검사 · 수술</td><td>CRM 스냅샷의 검사일 · 수술일</td><td>건</td></tr>
        <tr><td>매출</td><td>CRM 수납</td><td>원</td></tr>
        <tr><td>국가</td><td>접수리스트의 국적</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>매출 4분류</h3>
    <table>
      <thead><tr><th>분류</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>검사</td><td>검사비</td></tr>
        <tr><td>수술</td><td>수술비</td></tr>
        <tr><td>외래</td><td>외래 진료비</td></tr>
        <tr><td>렌즈</td><td>드림렌즈 등 렌즈 매출</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 미매칭 접수는 매출이 0 임</div>
      <p>CRM 과 이어지지 않은 접수는 <b>문의에는 잡히지만 검사·수술·매출에는 안 잡힘</b>.
         그래서 전환율이 실제보다 낮게 나올 수 있음. 접수리스트의 <b>확인필요 건수를 함께 봐야</b> 해석이 됨.</p>
    </div>

    <div class="note warn">
      <div class="h">숫자가 언제든 바뀔 수 있음</div>
      <p>매출·수술 정보는 접수리스트의 <b>CRM 스냅샷</b>에서 옴. 스냅샷은 [CRM 동기화]를 눌러야 갱신되므로,
         <b>동기화를 안 하면 과거 달의 숫자도 계속 낡은 상태</b>로 남음.
         반대로 동기화를 하면 이미 보고한 과거 수치가 올라갈 수 있음.</p>
    </div>

    <h3>표시 규칙</h3>
    <table>
      <thead><tr><th>대상</th><th>표기</th></tr></thead>
      <tbody>
        <tr><td>금액</td><td>본문은 원 단위 콤마, 축은 <b>1억 이상 "N.N억" · 1만 이상 "N만"</b></td></tr>
        <tr><td>건수</td><td>천 단위 콤마</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 매출 표 9개</h3>
    <p>접수리스트와 같은 데이터를 문의일 기준 연도로 집계함.
       「매출」 탭의 월별 표가 유일한 표이고 나머지 탭은 차트임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>월 / 주차 / 일자</td><td><code>buckets[].bucket</code></td><td>—</td><td>—</td><td>라벨은 <code>N월</code> · <code>WN</code>(ISO 주차) · <code>MM-DD</code>. 연초~연말 버킷을 미리 만들어 <b>0 행도 표시</b>. 하단 「합계」 행은 프론트 합</td></tr>
        <tr><td>2</td><td>문의</td><td><code>inquiries</code></td><td><code>inquiry_date</code></td><td>업로드 (시트 B열) / 수기 입력</td><td>문의일이 그 버킷에 속한 접수 행 수. 미매칭 포함. <b>문의일이 조회 연도 밖인 행은 응답 전체에서 빠짐</b>(검사·수술·매출도 안 셈)</td></tr>
        <tr><td>3</td><td>검사</td><td><code>exams</code></td><td><code>exam_date</code> → 비어 있으면 <code>snapshot.examDate</code></td><td>업로드 (시트 O열) / <code>RESERVATION.RESERVE_DATE</code> (FLAG='M', 미취소, 최신)</td><td>(고객번호 또는 rowId) + 검사일 조합으로 중복 제거. 값이 <code>YYYY-MM</code> 으로 시작해야 셈(주차·일 단위는 <code>YYYY-MM-DD</code>)</td></tr>
        <tr><td>4</td><td>수술</td><td><code>surgeries</code></td><td><code>surgery_date</code> → 비어 있으면 <code>snapshot.surgeryDate</code></td><td>업로드 (시트 P열) / <code>OPERATIONDATA.OPERATION_DATE</code> (최신)</td><td>검사와 같은 중복 제거·날짜 해석. 국가별 Top 10 의 밑값</td></tr>
        <tr><td>5</td><td>검사 매출</td><td><code>examRevenue</code></td><td><code>snapshot.examCost</code></td><td><code>PrcItmLst</code> <code>PrcCod='33'</code> 합, 품목이 없으면 <code>COSTPRICE</code> 중 수술일이 아닌 날 합</td><td><b>검사일 버킷</b>에 귀속. 고객당 1회만 합산(같은 고객 접수가 여러 행이어도 첫 행만). 문자열에서 숫자만 추출</td></tr>
        <tr><td>6</td><td>수술 매출</td><td><code>surgeryRevenue</code></td><td><code>snapshot.surgeryCost</code> (스냅샷 없으면 <code>surgery_cost</code>)</td><td><code>PrcItmLst</code> <code>PrcCod='O'</code> 합 / 폴백 <code>COSTPRICE</code> 수술일 합 / 미매칭은 업로드 (시트 Q열)</td><td><b>수술일 버킷</b>에 귀속. 미매칭 행도 시트 수술비에 숫자가 있으면 합산됨(위 「미매칭 = 매출 0」 은 검사비·외래비에만 해당)</td></tr>
        <tr><td>7</td><td>외래 매출</td><td><code>outpatientRevenue</code></td><td><code>snapshot.outpatient1~3Cost</code> · <code>snapshot.outpatient1~3Date</code></td><td><code>SUM(COSTPRICE.COST_PRICE)</code> — 외래 방문일(FLAG F/D · 미취소 · 수술일 아님) 당일</td><td>각 방문일의 버킷에 따로 귀속. 방문 3건까지만(접수리스트와 같은 한계)</td></tr>
        <tr><td>8</td><td>렌즈 매출</td><td><code>lensRevenue</code></td><td>—</td><td>—</td><td><b>항상 0</b> — 서버 집계 코드가 값을 더하지 않음(<code>MutableBucket.lensRevenue</code> 미사용). 렌즈 원천 미구현. 확인 필요</td></tr>
        <tr><td>9</td><td>합계</td><td>— (프론트 <code>totalRevenue</code>)</td><td>—</td><td>—</td><td>검사+수술+외래+렌즈 매출 합. 하단 합계 행은 「총 매출 N원」 으로 표기</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 차트 시리즈 8개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>유입·검사·수술 › 문의 유입</td><td><code>buckets[].inquiries</code></td><td><code>inquiry_date</code></td><td>업로드</td><td>선 그래프. 표의 「문의」 와 같은 값. 툴팁 「N건」</td></tr>
        <tr><td>2</td><td>유입·검사·수술 › 검사</td><td><code>buckets[].exams</code></td><td><code>exam_date</code> / <code>snapshot.examDate</code></td><td>업로드 / <code>RESERVATION.RESERVE_DATE</code></td><td>표의 「검사」 와 같음</td></tr>
        <tr><td>3</td><td>유입·검사·수술 › 수술</td><td><code>buckets[].surgeries</code></td><td><code>surgery_date</code> / <code>snapshot.surgeryDate</code></td><td>업로드 / <code>OPERATIONDATA.OPERATION_DATE</code></td><td>표의 「수술」 과 같음</td></tr>
        <tr><td>4</td><td>매출 구성 › 검사</td><td><code>buckets[].examRevenue</code></td><td><code>snapshot.examCost</code></td><td><code>PrcItmLst</code>/<code>COSTPRICE</code></td><td>누적 막대. 축은 억/만 축약, 툴팁은 원 단위</td></tr>
        <tr><td>5</td><td>매출 구성 › 수술</td><td><code>buckets[].surgeryRevenue</code></td><td><code>snapshot.surgeryCost</code> / <code>surgery_cost</code></td><td><code>PrcItmLst</code>/<code>COSTPRICE</code> / 업로드</td><td>—</td></tr>
        <tr><td>6</td><td>매출 구성 › 외래</td><td><code>buckets[].outpatientRevenue</code></td><td><code>snapshot.outpatient1~3Cost</code></td><td><code>COSTPRICE.COST_PRICE</code></td><td>—</td></tr>
        <tr><td>7</td><td>매출 구성 › 렌즈</td><td><code>buckets[].lensRevenue</code></td><td>—</td><td>—</td><td>항상 0 이라 막대에 안 보임. 범례에는 남음</td></tr>
        <tr><td>8</td><td>국가별 수술 Top 10 › 수술</td><td><code>topCountries[].surgeries</code> (축 <code>nationality</code>)</td><td><code>nationality</code> · <code>surgery_date</code></td><td>업로드 (시트 H열) / <code>OPERATIONDATA.OPERATION_DATE</code></td><td>수술로 센 행의 국적별 건수. 빈 국적은 「미등록」. 건수 내림차순 → 국적명 오름차순 상위 10. 데이터 없으면 안내 문구</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>미매칭 누락</b></td><td>전환율·매출이 실제보다 낮음</td><td>접수리스트에서 매칭을 채워야 함</td></tr>
        <tr><td><b>스냅샷 의존</b></td><td>동기화 전까지 옛 값</td><td>[CRM 동기화]가 수동임</td></tr>
        <tr><td><b>사후 변동</b></td><td>보고한 과거 수치가 올라감</td><td>매칭이 늘면 그 달 매출이 늘어남. <b>마감 개념이 없음</b></td></tr>
        <tr><td><b>조회가 무거움</b></td><td>[조회]를 눌러야 나옴</td><td>CRM 병합 비용 때문임</td></tr>
        <tr><td><b>국적 표기</b></td><td>같은 나라가 여러 표기로 갈릴 수 있음</td><td>접수 원천이 자유입력임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>마감 시점</td><td>매칭이 계속 늘어 과거 값이 변함. 어느 시점을 확정으로 볼지</td></tr>
        <tr><td>미매칭 표시</td><td>화면에 "이 중 N건은 매칭 안 됨"을 함께 보일지 — 지금은 알 수 없음</td></tr>
        <tr><td>국적 코드화</td><td>자유입력을 코드로 정규화할지</td></tr>
        <tr><td><a href="overseas-reservation-stats.html">예약통계</a>와의 관계</td><td>둘 다 해외 유입을 세는데 원천 구간이 다름 — 어느 쪽이 정본인지 명시가 필요함</td></tr>
      </tbody>
    </table>
  `,
}
