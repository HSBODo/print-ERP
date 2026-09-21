export default {
  s5: `
    <p>월 × 연도 단위의 <b>집계 화면</b>임. 행 단위 명단은 없고, 응답 1행 = 1개월임.
       화면은 마트 <code>mart_b2b_revenue_monthly</code> 를 읽고, 마트는 배치(<code>EtcMartJob</code>)가
       CRM 원천 SQL(<code>sql/softcrm/etc/select-b2b-*.sql</code>)로 적재함. 정의는 레거시 BCRM
       <code>routes/b2b-corp-settlement.js</code>(B2B 기업 정산)를 그대로 옮긴 것임.</p>

    <h3>세는 대상 — B2B 판정</h3>
    <table>
      <thead><tr><th>항목</th><th>규칙</th><th>원천</th></tr></thead>
      <tbody>
        <tr><td>B2B 고객</td><td>내원동기에 <code>B2B(기업)</code> 이 들어 있거나, 1차 추천인이 <b>이상광 · 유연환 · 이재형</b> 중 하나</td><td><code>MOTIVE_NEW01.motive01</code> · <code>motive02</code> · <code>recommender01</code></td></tr>
        <tr><td>내원동기 보정</td><td>수술 행은 동기가 B2B(기업·군인)가 아니면 <code>MOTIVE_NEW02</code> 의 대/중/소 분류명(<code>category01~03_name</code>)으로 바꿔 판정함. 백내장 검사 행은 <code>MOTIVE_NEW01</code> 원값으로 판정함</td><td><code>select-b2b-motive-subquery.sql</code></td></tr>
        <tr><td>지정 / 비지정</td><td><code>CUSTOM.Level = 'G'</code> 이면 <b>비지정</b>, 그 외(빈 값 · NULL 포함) 전부 <b>지정</b></td><td><code>CUSTOM.Level</code></td></tr>
      </tbody>
    </table>

    <h3>집계 단위와 날짜 기준 — 세 갈래를 합침</h3>
    <table>
      <thead><tr><th>갈래</th><th>1건 =</th><th>날짜 기준</th><th>원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>시력교정 수술</td><td>고객 × 수술일</td><td><code>OPERATIONDATA.OPERATION_DATE</code></td><td><code>OPERATIONDATA</code></td><td>백내장 수술 이력(<code>Cataract_Operationdata</code>)이 <b>기간 무관하게</b> 있는 고객은 제외</td></tr>
        <tr><td>백내장 수술</td><td>고객 × 눈별 수술일</td><td><code>OPERATIONL_DATE</code> · <code>OPERATIONR_DATE</code> 를 UNION</td><td><code>Cataract_Operationdata</code></td><td>양안을 <b>같은 날</b> 하면 1건, <b>다른 날</b> 하면 2건</td></tr>
        <tr><td>백내장 검사</td><td>고객 × 검사일</td><td><code>Cataract_Exam.EXAM_DATE</code></td><td><code>Cataract_Exam</code></td><td>수술 여부와 무관하게 검사만으로 1건</td></tr>
      </tbody>
    </table>
    <p>조회 범위는 요청 연도 중 <b>최소 연도 1월 1일 ~ 최대 연도 12월 31일</b>임(사이 연도 포함). 결과가 없는 달은 서비스가 0 으로 채워 12개월을 맞춤.</p>

    <h3>매출 = 수가항목 7종의 합</h3>
    <p>금액은 <code>COSTPRICE</code> ⨝ <code>PrcItmLst</code>(<code>CUST_NUM = PrcCusNum AND SEQ = prcseq</code>)에서
       <code>PrcItmQty × PrcItmPrc</code> 를 수가코드(<code>PrcCod</code>)별로 더함. 공통 조건은 <code>PayStt &lt;&gt; 'a'</code>(수납 취소 제외) · <code>PrcItmPrc &lt;&gt; 0</code>.</p>
    <table>
      <thead><tr><th>응답 필드</th><th>화면 라벨</th><th>PrcCod</th><th>수술 행 — 어느 수납을 읽나</th><th>검사 행</th></tr></thead>
      <tbody>
        <tr><td><code>opCost</code></td><td>수술비</td><td><code>O</code></td><td>해당 코드가 찍힌 <b>가장 최근 수납일</b> 1일치 — <b>날짜 제한 없음</b>(수술일 이후 수납도 읽음)</td><td rowspan="7">고객의 <b>전 기간 누적</b> 합계 (날짜 조건 없음)</td></tr>
        <tr><td><code>examCost</code></td><td>검사비</td><td><code>33</code></td><td rowspan="6">수술일 <b>이전(당일 포함)</b> 수납 중 해당 코드가 찍힌 가장 최근 수납일 1일치 — <code>COST_DATE &lt;= 수술일</code></td></tr>
        <tr><td><code>dnaCost</code></td><td>DNA</td><td><code>D</code></td></tr>
        <tr><td><code>prpCost</code></td><td>PRP</td><td><code>Q</code> · <code>32</code></td></tr>
        <tr><td><code>etcCost</code></td><td>기타/약</td><td><code>V</code></td></tr>
        <tr><td><code>presbyopiaCost</code></td><td>노안</td><td><code>z</code> · <code>Y</code> · <code>H</code></td></tr>
        <tr><td><code>hospitalSupplyCost</code></td><td>병원물품</td><td><code>U</code> · <code>3</code> · <code>1</code> · <code>K</code> · <code>2</code> · <code>7</code> · <code>8</code> · <code>9</code></td></tr>
      </tbody>
    </table>
    <p>수가코드 분류표의 정본은 <a href="../db/tables/COSTPRICE.html">db/tables/COSTPRICE.md</a> 「PrcCod 분류 체계」임.</p>

    <h3>컬럼 정의 — 응답 20개</h3>
    <p>API <code>GET /api/stats/b2b-revenue?years=</code> 의 응답 항목(<code>B2bRevenueMonthlyItem</code>). 금액은 원, 건수는 건. 빈 달은 모두 0.</p>
    <table>
      <thead><tr><th>#</th><th>응답 필드</th><th>마트 컬럼</th><th>계산식 (CRM 원천 SQL)</th><th>화면 사용</th></tr></thead>
      <tbody>
        <tr><td>1</td><td><code>year</code></td><td><code>yr</code></td><td><code>YEAR(operation_date)</code></td><td>기간 축</td></tr>
        <tr><td>2</td><td><code>month</code></td><td><code>mo</code></td><td><code>MONTH(operation_date)</code></td><td>기간 축</td></tr>
        <tr><td>3</td><td><code>totalRevenue</code></td><td><code>total_revenue</code></td><td>7종 합의 SUM</td><td>총 B2B 매출</td></tr>
        <tr><td>4</td><td><code>caseCount</code></td><td><code>case_count</code></td><td><code>COUNT(*)</code> — 세 갈래 행 수</td><td>B2B 건수</td></tr>
        <tr><td>5</td><td><code>avgRevenuePerCase</code></td><td><code>avg_revenue_per_case</code></td><td><code>CAST(SUM(매출) / COUNT(*) AS INT)</code> — 버림</td><td>건당 매출 — 단 화면은 이 값을 쓰지 않고 <b>반올림으로 다시 계산</b>함(아래)</td></tr>
        <tr><td>6</td><td><code>visionRevenue</code></td><td><code>vision_revenue</code></td><td>시력교정 행의 매출 합</td><td>시력교정 매출</td></tr>
        <tr><td>7</td><td><code>cataractRevenue</code></td><td><code>cataract_revenue</code></td><td>백내장 수술 + 백내장 검사 행의 매출 합</td><td>백내장 매출</td></tr>
        <tr><td>8</td><td><code>visionCount</code></td><td><code>vision_count</code></td><td>시력교정 행 수</td><td>화면 미사용</td></tr>
        <tr><td>9</td><td><code>cataractCount</code></td><td><code>cataract_count</code></td><td>백내장 수술 + 검사 행 수</td><td>화면 미사용</td></tr>
        <tr><td>10</td><td><code>designatedRevenue</code></td><td><code>designated_revenue</code></td><td>지정 행의 매출 합</td><td>지정 매출</td></tr>
        <tr><td>11</td><td><code>nonDesignatedRevenue</code></td><td><code>non_designated_revenue</code></td><td>비지정 행의 매출 합</td><td>지정 vs 비지정 차트</td></tr>
        <tr><td>12</td><td><code>designatedCount</code></td><td><code>designated_count</code></td><td>지정 행 수</td><td>화면 미사용</td></tr>
        <tr><td>13</td><td><code>nonDesignatedCount</code></td><td><code>non_designated_count</code></td><td>비지정 행 수</td><td>화면 미사용</td></tr>
        <tr><td>14</td><td><code>opCost</code></td><td><code>op_cost</code></td><td>PrcCod <code>O</code></td><td>수가항목 7종 구성</td></tr>
        <tr><td>15</td><td><code>examCost</code></td><td><code>exam_cost</code></td><td>PrcCod <code>33</code></td><td>〃</td></tr>
        <tr><td>16</td><td><code>dnaCost</code></td><td><code>dna_cost</code></td><td>PrcCod <code>D</code></td><td>〃</td></tr>
        <tr><td>17</td><td><code>prpCost</code></td><td><code>prp_cost</code></td><td>PrcCod <code>Q</code> · <code>32</code></td><td>〃</td></tr>
        <tr><td>18</td><td><code>etcCost</code></td><td><code>etc_cost</code></td><td>PrcCod <code>V</code></td><td>〃</td></tr>
        <tr><td>19</td><td><code>presbyopiaCost</code></td><td><code>presbyopia_cost</code></td><td>PrcCod <code>z</code> · <code>Y</code> · <code>H</code></td><td>〃</td></tr>
        <tr><td>20</td><td><code>hospitalSupplyCost</code></td><td><code>hospital_supply_cost</code></td><td>PrcCod <code>U</code> · <code>3</code> · <code>1</code> · <code>K</code> · <code>2</code> · <code>7</code> · <code>8</code> · <code>9</code></td><td>〃</td></tr>
      </tbody>
    </table>
    <p>마트에는 적재 시각 <code>loaded_at</code> 이 추가로 있고, 키는 <code>(yr, mo)</code> 임(UPSERT).</p>

    <h3>화면에서 계산하는 지표</h3>
    <table>
      <thead><tr><th>화면 라벨</th><th>계산식</th><th>분모가 0 일 때</th></tr></thead>
      <tbody>
        <tr><td>건당 매출</td><td><code>round(totalRevenue / caseCount)</code> — 월 비교는 해당 월, 연도 비교는 12개월 합으로 다시 나눔</td><td>0</td></tr>
        <tr><td>지정 매출 비중</td><td><code>designatedRevenue / totalRevenue × 100</code> (소수 1자리 %)</td><td>0.0%</td></tr>
        <tr><td>시력교정 매출 비중</td><td><code>visionRevenue / totalRevenue × 100</code> (소수 1자리 %)</td><td>0.0%</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">원천 SQL 구조에서 오는 확인 필요 사항</div>
      <ul>
        <li><b>수술비 중복 가능</b> — 수술비(<code>O</code>)는 날짜 제한 없이 「고객의 최근 수납일」을 읽으므로, 백내장 양안을 다른 날 수술하면 <b>같은 수술비가 두 건에 각각</b> 잡힘.</li>
        <li><b>검사 행이 누적 전액을 읽음</b> — 백내장 검사 행은 7종을 <b>전 기간 누적</b>으로 읽어 수술비(<code>O</code>)까지 포함함. 같은 고객의 검사 행과 수술 행이 모두 기간에 들면 금액이 겹칠 수 있음.</li>
        <li><b>지정 판정 기준이 다른 화면과 다름</b> — 이 화면은 <code>CUSTOM.Level = 'G'</code> 를 비지정으로 봄. 레거시 주간보고의 「수술지정비율」은 <code>CUSTOM.VIP_CODE = '05'</code>(지정) 기준이고, 테이블 카탈로그는 <code>Level</code> 을 고객 등급(V/G/S/R)으로 설명함. <a href="designated-doctor.html">지정의 수술 비율</a> 기획과 기준을 맞춰야 함.</li>
        <li><b>추천인 이름 하드코딩</b> — 이상광 · 유연환 · 이재형 3명이 SQL 에 박혀 있어, B2B 담당 추천인이 바뀌면 코드 수정이 필요함.</li>
      </ul>
      <p>레거시 정산 원본과 같은 구조를 옮긴 것이므로, 수치 확정 전 BCRM B2B 기업 정산 화면과 월 합계를 대조할 것.</p>
    </div>
  `,
}
