export default {
  s2: `
    <h3>대시보드에서 유일하게 '입력하는' 원장</h3>
    <p>다른 화면은 CRM 을 읽어 보여주는데, 드림렌즈 장부는 <b>이 화면이 원천</b>임.
       엑셀 시트로 관리하던 D/L 장부를 그대로 옮겨, 행 추가·수정·삭제를 화면에서 함.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>렌즈 처방 기록</td><td>고객·검사자·좌우 렌즈·색상·BOX 를 적음</td></tr>
        <tr><td>매출 집계</td><td>신규/재구매 · 보증금 · 피팅비 · 용품 · 진료비를 칸별로 넣음</td></tr>
        <tr><td><b>리콜 관리</b></td><td>1·2차 리콜 예약과 부재문자 발송 여부를 추적함</td></tr>
        <tr><td>반납·반품</td><td>좌우 각각 날짜를 남김</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 배치·마트를 타지 않음</div>
      <p><code>dreamlens_ledger</code> 테이블에 <b>JPA 로 직접 CRUD</b> 함.
         스키마는 <code>ddl-auto: update</code> 가 만들고, 초기 10행은 시더가 <b>표가 비었을 때만</b> 넣음.
         CRM 에서 오는 값이 아니므로 <b>지우면 복구할 원천이 없음</b>.</p>
    </div>
  `,

  s3: `
    <p>툴바 + <b>2단 머리글</b> 표. 그룹 6개가 색으로 갈리고, 왼쪽 「고객」 그룹은 <b>가로 스크롤에도 고정</b>됨.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-08 ▾</span>
        <span class="ui grow ph">고객명 · 고객번호 · 렌즈명</span>
        <span class="ui green">＋ 행 추가</span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
        <span class="ui">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th colspan="4" style="background:#f1f5f9">고객</th>
              <th colspan="2" style="background:#eff6ff">기본 정보</th>
              <th colspan="3" style="background:#f0fdfa">R 렌즈</th>
              <th colspan="3" style="background:#fef2f2">L 렌즈</th>
              <th colspan="3" style="background:#fefce8">매출</th>
              <th colspan="2" style="background:#faf5ff">리콜 관리</th>
            </tr>
            <tr>
              <th style="background:#f1f5f9">날짜</th><th style="background:#f1f5f9">진료구분</th>
              <th style="background:#f1f5f9">고객번호</th><th style="background:#f1f5f9">이름</th>
              <th style="background:#eff6ff">검사자</th><th style="background:#eff6ff">주소·구매구분</th>
              <th style="background:#f0fdfa">렌즈명</th><th style="background:#f0fdfa">BOX</th><th style="background:#f0fdfa">색상</th>
              <th style="background:#fef2f2">렌즈명</th><th style="background:#fef2f2">BOX</th><th style="background:#fef2f2">색상</th>
              <th style="background:#fefce8">D/L 신규</th><th style="background:#fefce8">보증금</th><th style="background:#fefce8">피팅비</th>
              <th style="background:#faf5ff">1차 리콜</th><th style="background:#faf5ff">1차 부재문자</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2026-08-03</td><td>DL</td><td>2198220</td><td class="link">최○○</td>
              <td>한지희</td><td>서울/신규</td>
              <td>DL-A</td><td>2</td><td>블루</td>
              <td>DL-A</td><td>2</td><td>블루</td>
              <td>480,000</td><td>100,000</td><td>50,000</td>
              <td>2026-08-17</td><td class="ph">—</td>
            </tr>
            <tr>
              <td>2026-08-05</td><td>DL</td><td>2231060</td><td class="link">박○○</td>
              <td>윤지원</td><td>경기/재구매</td>
              <td>DL-B</td><td>1</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td>50,000</td>
              <td>2026-08-19</td><td>Y</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="shot-bar">
        <span><b>48건</b></span><span class="grow"></span>
        <span class="ui">이전</span><span class="ui dark">1</span><span class="ui">2</span><span class="ui">다음</span>
        <span class="ui">50건 ▾</span>
      </div>
    </div>
    <p class="shot-cap">셀을 클릭하면 그 자리에서 편집됨. 컬럼 타입에 따라 날짜·숫자·자유입력이 갈림.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>월 선택</td><td>날짜 기준 조회</td></tr>
        <tr><td>행 추가</td><td>빈 행 삽입</td><td>바로 편집함</td></tr>
        <tr><td>셀 편집</td><td>날짜 · 숫자 · 텍스트</td><td>텍스트는 <b>제안 목록</b>이 뜨지만 강제하지 않음</td></tr>
        <tr><td>삭제</td><td>행 단위</td><td>—</td></tr>
        <tr><td>고정 열</td><td>「고객」 그룹</td><td>가로 스크롤에도 남음 — <b>그룹 단위로만</b> 고정 가능</td></tr>
        <tr><td>매출 합계</td><td>파생 칸</td><td>매출 칸들의 합</td></tr>
        <tr><td>CSV · 페이지네이션</td><td>다른 리스트와 같은 규격</td><td>—</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">제안은 하되 강제하지 않음</div>
      <p>검사자·렌즈명 같은 텍스트 칸은 실데이터에서 뽑은 후보를 <code>datalist</code> 로 제안함.
         <b><code>select</code> 로 막지 않는 이유</b> — 장부 표기가 자유로워 목록에 없는 값을 못 넣게 되면
         현장에서 기록 자체를 포기함.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간(월)</td><td><b>서버</b></td><td><code>GET /api/dreamlens-ledger?from&amp;to</code> — 장부의 <b>날짜</b> 기준</td></tr>
        <tr><td>검색어</td><td>화면</td><td>고객명 · 고객번호 · 렌즈명 등</td></tr>
        <tr><td>정렬 · 페이지</td><td>화면</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>쓰기 API</h3>
    <table>
      <thead><tr><th>동작</th><th>엔드포인트</th></tr></thead>
      <tbody>
        <tr><td>행 추가</td><td><code>POST /api/dreamlens-ledger</code></td></tr>
        <tr><td>행 수정</td><td><code>PUT /api/dreamlens-ledger/{id}</code> — <b>전체 필드 교체</b></td></tr>
        <tr><td>행 삭제</td><td><code>DELETE /api/dreamlens-ledger/{id}</code></td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">수정이 부분 갱신이 아니라 전체 교체임</div>
      <p>한 칸만 고쳐도 <b>행 전체를 다시 보냄</b>. 두 사람이 같은 행의 다른 칸을 동시에 고치면
         <b>나중에 저장한 쪽이 이김</b>.</p>
    </div>
  `,

  s5: `
    <h3>그룹 6개</h3>
    <table>
      <thead><tr><th>그룹</th><th>칼럼</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>고객</td><td>날짜 · 진료구분 · 고객번호 · 이름</td><td><b>가로 스크롤 고정</b></td></tr>
        <tr><td>기본 정보</td><td>검사자 · 주소·구매구분</td><td>제안 목록 있음</td></tr>
        <tr><td>R 렌즈</td><td>렌즈명 · BOX · R렌즈 · 색상 · <b>반납&amp;반품날짜(R)</b></td><td rowspan="2">좌우가 완전히 대칭임</td></tr>
        <tr><td>L 렌즈</td><td>렌즈명 · BOX · L렌즈 · 색상 · <b>반납&amp;반품날짜(L)</b></td></tr>
        <tr><td>매출</td><td>D/L 신규 · D/L 재구매 · M 신규 · M FU 재구매 · H/L 신규 · H/L 재구매 · 보증금 · 피팅비 · 용품 · 진료비 · <b>렌즈 정가(참고)</b></td><td>합계는 파생</td></tr>
        <tr><td>리콜 관리</td><td>다음예약 · 1차~3차 × (리콜 · 리콜예약 · 부재문자)</td><td>후속 관리 축</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">매출 칸이 11개인 이유</div>
      <p>렌즈 종류(D/L · M · H/L) × 신규/재구매 6칸 + 부대 수입 4칸 + 참고용 정가.
         <b>합계 하나로 받으면 어떤 매출인지 사라짐</b> — 시트가 칸을 나눠 쓰던 방식을 그대로 지켰음.</p>
    </div>

    <h3>입력 상한</h3>
    <p>텍스트 칸의 길이 상한은 <b>백엔드 <code>@Size</code>·엔티티 <code>@Column(length)</code> 와 같은 값</b>을 화면에 둠.
       화면에서 안 막으면 길게 붙여넣었을 때 <b>DB 제약에 걸려 원인을 알 수 없는 실패</b>로 보임.</p>

    <div class="note warn">
      <div class="h">화면에 B2B 매출 API 도 함께 잡힘</div>
      <p>자동 추출된 API 목록에 <code>/api/stats/b2b-revenue</code> 가 섞여 있는데,
         드림렌즈 장부 화면이 B2B 매출 컴포넌트와 코드를 공유하기 때문임.
         <b>장부 자체는 <code>/api/dreamlens-ledger</code> 만 씀.</b></p>
    </div>

    <h3>컬럼 정의 — 40개</h3>
    <p>마트가 아니라 사용자 입력 테이블 <code>dreamlens_ledger</code> 임.
       CRM 원천은 배치가 자동 초안 행을 채울 때만 해당하고, 수기 행은 덮지 않음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>(선택)</td><td>—</td><td>—</td><td>—</td><td>체크박스. 헤더 체크는 <b>보이는 페이지만</b> 선택. 삭제 대상 지정용</td></tr>
        <tr><td>2</td><td>구분</td><td><code>source</code></td><td><code>source</code></td><td>—</td><td>AUTO → 「자동」(호박색 배지 · 행 배경) · 그 외 「수기」. null(구버전 행)은 MANUAL 로 응답. 어느 셀이든 고치면 서버가 MANUAL 로 승격해 배지가 바뀜</td></tr>
        <tr><td>3</td><td>날짜</td><td><code>entryDate</code></td><td><code>entry_date</code></td><td><code>RESERVATION.RESERVE_DATE</code> (<code>RESERVE_FLAG='D'</code>, <code>RESERVE_STATE IN ('I','H')</code>)</td><td><b>조회 기준</b>(일별·주차·월별). 기본 정렬 최신 날짜 위(같은 날짜면 나중 입력이 위). 좌측 고정. 새 행은 오늘(조회 구간 밖이면 종료일)</td></tr>
        <tr><td>4</td><td>진료구분</td><td><code>visitType</code></td><td><code>visit_type</code></td><td><code>MEDICAL_SUB_CFG.SUB_NAME</code> → 신규 · 재구매 · FU · 하드 신규 · 하드 재구매 · MiSight 신규/재구매/FU (미지 유형은 원문)</td><td>제안 목록 신규·재진(강제 아님). ≤50자. 좌측 고정</td></tr>
        <tr><td>5</td><td>고객번호</td><td><code>customerNo</code></td><td><code>customer_no</code></td><td><code>RESERVATION.CUST_NUM</code></td><td>초안 upsert 키(고객번호 + 날짜). CSV 텍스트 강제. 검색 대상. ≤50자. 좌측 고정</td></tr>
        <tr><td>6</td><td>이름</td><td><code>customerName</code></td><td><code>customer_name</code></td><td><code>CUSTOM.CUST_NAME</code></td><td>CSV 만 마스킹. 검색 대상. ≤100자. 좌측 고정</td></tr>
        <tr><td>7</td><td>검사자</td><td><code>examiner</code></td><td><code>examiner</code></td><td><code>EMPLOYEE.EMP_NAME</code> ← <code>AssignList.MRID1</code>(<code>custid</code>·<code>MedDate</code> 매칭)</td><td>제안 목록 21명. 검사자 필터·검색 대상. ≤100자</td></tr>
        <tr><td>8</td><td>주소·구매구분</td><td><code>purchaseType</code></td><td><code>purchase_type</code></td><td>—</td><td>시트 「주소」 컬럼 — 구매구분 5종 제안값과 실제 배송 주소가 섞여 있음. CSV 는 5종 밖의 값(주소)만 마스킹. ≤200자</td></tr>
        <tr><td>9</td><td>R 렌즈 · 렌즈명</td><td><code>rLensName</code></td><td><code>r_lens_name</code></td><td>—</td><td>제안 목록(CRT · Misight · T-CRT …), 자유 입력. ≤100자</td></tr>
        <tr><td>10</td><td>R 렌즈 · BOX</td><td><code>rBox</code></td><td><code>r_box</code></td><td>—</td><td>≤50자</td></tr>
        <tr><td>11</td><td>R 렌즈 · R렌즈</td><td><code>rLensSpec</code></td><td><code>r_lens_spec</code></td><td>—</td><td>렌즈 스펙 자유 입력. ≤100자</td></tr>
        <tr><td>12</td><td>R 렌즈 · 색상</td><td><code>rColor</code></td><td><code>r_color</code></td><td>—</td><td>제안 G·R·V·Y·P·B. ≤50자</td></tr>
        <tr><td>13</td><td>R 렌즈 · 반납&amp;반품날짜(R)</td><td><code>rReturnDate</code></td><td><code>r_return_date</code></td><td>—</td><td>날짜 입력. 빈 값 허용</td></tr>
        <tr><td>14</td><td>L 렌즈 · 렌즈명</td><td><code>lLensName</code></td><td><code>l_lens_name</code></td><td>—</td><td>제안 목록(CRT · Misight · T-CRT …), 자유 입력. ≤100자</td></tr>
        <tr><td>15</td><td>L 렌즈 · BOX</td><td><code>lBox</code></td><td><code>l_box</code></td><td>—</td><td>≤50자</td></tr>
        <tr><td>16</td><td>L 렌즈 · L렌즈</td><td><code>lLensSpec</code></td><td><code>l_lens_spec</code></td><td>—</td><td>렌즈 스펙 자유 입력. ≤100자</td></tr>
        <tr><td>17</td><td>L 렌즈 · 색상</td><td><code>lColor</code></td><td><code>l_color</code></td><td>—</td><td>제안 G·R·V·Y·P·B. ≤50자</td></tr>
        <tr><td>18</td><td>L 렌즈 · 반납&amp;반품날짜(L)</td><td><code>lReturnDate</code></td><td><code>l_return_date</code></td><td>—</td><td>날짜 입력. 빈 값 허용</td></tr>
        <tr><td>19</td><td>D/L 신규</td><td><code>dlNewRevenue</code></td><td><code>dl_new_revenue</code></td><td>진료구분이 D/L_신규 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>원 단위. 0 은 빈칸. 합계행·행 합계 포함</td></tr>
        <tr><td>20</td><td>D/L 재구매</td><td><code>dlRepurchaseRevenue</code></td><td><code>dl_repurchase_revenue</code></td><td>진료구분이 D/L_재구매 · D/L_FU · 그 외 미지 유형 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>미지 유형은 초안이므로 검안사가 조정</td></tr>
        <tr><td>21</td><td>M 신규</td><td><code>mNewRevenue</code></td><td><code>m_new_revenue</code></td><td>진료구분이 MiSight_신규 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>진료구분이 D/L_신규인데 MiSight 를 산 경우는 CRM 으로 구분 불가 — 초안이 D/L 신규에 잡히므로 검안사가 옮김</td></tr>
        <tr><td>22</td><td>M FU 재구매</td><td><code>mRepurchaseRevenue</code></td><td><code>m_repurchase_revenue</code></td><td>진료구분이 MiSight_재구매 · MiSight_FU 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>—</td></tr>
        <tr><td>23</td><td>H/L 신규</td><td><code>hlNewRevenue</code></td><td><code>hl_new_revenue</code></td><td>진료구분이 H/L_신규 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>—</td></tr>
        <tr><td>24</td><td>H/L 재구매</td><td><code>hlRepurchaseRevenue</code></td><td><code>hl_repurchase_revenue</code></td><td>진료구분이 H/L_재구매 일 때 렌즈 실수납 합 — <code>COSTPRICE</code>+<code>PrcItmLst.PrcSumPrc</code>(<code>PrcCod IN ('F','I','17')</code>, <code>PayStt</code> 취소 제외, <code>COST_DATE</code> = 내원일)</td><td>—</td></tr>
        <tr><td>25</td><td>보증금</td><td><code>depositRevenue</code></td><td><code>deposit_revenue</code></td><td>—</td><td>초안 없음 — 수기 입력</td></tr>
        <tr><td>26</td><td>피팅비</td><td><code>fittingRevenue</code></td><td><code>fitting_revenue</code></td><td>—</td><td>수기 입력</td></tr>
        <tr><td>27</td><td>용품</td><td><code>supplyRevenue</code></td><td><code>supply_revenue</code></td><td>—</td><td>수기 입력</td></tr>
        <tr><td>28</td><td>진료비</td><td><code>treatmentRevenue</code></td><td><code>treatment_revenue</code></td><td>링크드서버 <code>[220.85.109.240].IPLUS.dbo.PAOSUNAB.실수납액</code> 합 (<code>PTNTIDNO</code> = 고객번호, <code>수납일자</code> = 내원일)</td><td>링크드서버 장애 시 장부 초안 적재만 실패(B2B 매출 적재와 격리)</td></tr>
        <tr><td>29</td><td>렌즈 정가(참고)</td><td><code>lensListPrice</code></td><td><code>lens_list_price</code></td><td><code>PrcItmLst.PrcItmQty × PrcItmPrc</code> 합 (위와 같은 조건)</td><td>합계행에는 나오지만 <b>행 합계(<code>totalRevenue</code>)에는 미포함</b>. 실수납과 다르면 할인·분납이 있었다는 뜻</td></tr>
        <tr><td>30</td><td>다음예약</td><td><code>nextReservation</code></td><td><code>next_reservation</code></td><td>—</td><td>≤200자 자유 텍스트</td></tr>
        <tr><td>31</td><td>1차 리콜</td><td><code>recall1</code></td><td><code>recall1</code></td><td>—</td><td>≤200자 자유 텍스트(날짜·메모 섞임)</td></tr>
        <tr><td>32</td><td>1차 리콜예약</td><td><code>recall1Reservation</code></td><td><code>recall1_reservation</code></td><td>—</td><td>≤200자</td></tr>
        <tr><td>33</td><td>1차 부재문자</td><td><code>recall1Absent</code></td><td><code>recall1_absent</code></td><td>—</td><td>≤200자</td></tr>
        <tr><td>34</td><td>2차 리콜</td><td><code>recall2</code></td><td><code>recall2</code></td><td>—</td><td>≤200자 자유 텍스트(날짜·메모 섞임)</td></tr>
        <tr><td>35</td><td>2차 리콜예약</td><td><code>recall2Reservation</code></td><td><code>recall2_reservation</code></td><td>—</td><td>≤200자</td></tr>
        <tr><td>36</td><td>2차 부재문자</td><td><code>recall2Absent</code></td><td><code>recall2_absent</code></td><td>—</td><td>≤200자</td></tr>
        <tr><td>37</td><td>3차 리콜</td><td><code>recall3</code></td><td><code>recall3</code></td><td>—</td><td>≤200자 자유 텍스트(날짜·메모 섞임)</td></tr>
        <tr><td>38</td><td>3차 리콜예약</td><td><code>recall3Reservation</code></td><td><code>recall3_reservation</code></td><td>—</td><td>≤200자</td></tr>
        <tr><td>39</td><td>3차 부재문자</td><td><code>recall3Absent</code></td><td><code>recall3_absent</code></td><td>—</td><td>≤200자. 시트 헤더는 3차 구간이 「2차」 로 잘못 복사돼 있었고 여기서 recall3 로 바로잡음</td></tr>
        <tr><td>40</td><td>행 합계 (CSV 전용)</td><td><code>totalRevenue</code></td><td>— (저장 안 함)</td><td>—</td><td>매출 10종 합(렌즈 정가 제외) — 서버 계산. 화면에는 열이 없고 필터 결과 전체를 더한 하단 합계행만 있음</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>원천이 여기뿐</b></td><td>지우면 복구할 곳이 없음</td><td>CRM 백업이 없음. <b>삭제에 확인 절차가 필요함</b></td></tr>
        <tr><td><b>전체 교체 저장</b></td><td>동시 편집 시 나중 저장이 이김</td><td>여러 명이 같이 쓰면 덮어쓰기가 생김</td></tr>
        <tr><td><b>자유 텍스트</b></td><td>같은 렌즈명이 여러 표기로 쌓임</td><td>제안만 하고 강제하지 않는 설계의 대가임</td></tr>
        <tr><td><b>수정 이력 없음</b></td><td>누가 언제 고쳤는지 모름</td><td>—</td></tr>
        <tr><td><b>스키마가 <code>ddl-auto</code></b></td><td>컬럼 변경이 조용히 반영됨</td><td>마이그레이션 파일이 없어 이력 추적이 어려움</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>삭제 보호</td><td>원천이 하나뿐인데 삭제가 즉시 반영됨. 소프트 삭제·휴지통이 필요한지</td></tr>
        <tr><td>수정 이력</td><td>장부 성격상 감사 추적이 필요할 수 있음</td></tr>
        <tr><td>렌즈 마스터</td><td>자유 텍스트를 코드로 정규화할지. 하면 입력이 무거워짐</td></tr>
        <tr><td>매출 지표 연계</td><td>이 장부의 매출이 다른 매출 지표와 어떻게 이어지는지 정의되지 않았음</td></tr>
      </tbody>
    </table>
  `,
}
