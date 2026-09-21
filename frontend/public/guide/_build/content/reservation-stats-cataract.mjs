export default {
  s2: `
    <h3>백내장판 예약 종합표</h3>
    <p><a href="reservation-stats-system.html">예약통계_시력교정</a>과 같은 골격이지만
       <b>채널 구성과 칼럼이 다름</b>. 백내장(노안 포함) 검사예약을
       인바운드(컨택센터) · 아웃바운드(TM) · 채팅 · 온라인 · 취소로 나눔.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>백내장 유입 확인</td><td>백내장·노안을 갈라 보고 합계로도 봄</td></tr>
        <tr><td>컨택센터 성과</td><td>응대율 · 재문의 비율 · <b>신환</b> 수를 봄</td></tr>
        <tr><td>TM 성과</td><td>총 DB / 유효 DB 두 기준의 예약율</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">시력교정판과 무엇이 다른가</div>
      <p>시력교정은 <b>신규문의</b> 중심이고, 백내장은 <b>신환·재문의</b> 중심임.
         백내장은 재문의가 많아(고령 환자가 여러 번 상담) 그 비율 자체가 지표가 됨.
         또 백내장에는 <b>온라인 부도수</b> 칸이 있음.</p>
    </div>
  `,

  s3: `
    <p>시력교정판과 같은 툴바·3단 머리글 표. 그룹 6개.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span><span>~</span><span class="ui">📅 2026-07 ▾</span>
        <span class="seg"><span class="on">월별</span><span>주별</span><span>주차</span><span>일별</span><span>전체</span></span>
        <span class="grow"></span>
        <span class="ui">🔍 진단</span><span class="ui">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="3">구분</th>
              <th colspan="3" style="background:#f1f5f9">총예약</th>
              <th colspan="5" style="background:#eff6ff">인바운드(컨택센터)</th>
              <th colspan="3" style="background:#eef2ff">아웃바운드(TM)</th>
              <th colspan="2" style="background:#f0fdfa">온라인예약</th>
            </tr>
            <tr>
              <th style="background:#f1f5f9">백내장</th><th style="background:#f1f5f9">노안</th><th style="background:#f1f5f9">합계</th>
              <th style="background:#eff6ff">총 인입콜</th><th style="background:#eff6ff">응대콜</th><th style="background:#eff6ff">응대율</th>
              <th style="background:#eff6ff">신규 재문의</th><th style="background:#eff6ff">★신환</th>
              <th style="background:#eef2ff">총 DB</th><th style="background:#eef2ff">유효 DB</th><th style="background:#eef2ff">예약수</th>
              <th style="background:#f0fdfa">예약수</th><th style="background:#f0fdfa">부도수</th>
            </tr>
            <tr><th colspan="13" style="background:#fafafa; font-weight:400; font-size:10px; color:#9aa0a6">… 실제로는 25칼럼</th></tr>
          </thead>
          <tbody>
            <tr><td>2026-07</td><td>57</td><td>45</td><td><b>102</b></td><td>412</td><td>388</td><td style="color:#dc2626">94.2%</td><td>96</td><td><b>62</b></td><td>310</td><td>188</td><td>44</td><td>18</td><td>2</td></tr>
            <tr><td class="ph">　1주</td><td>14</td><td>11</td><td>25</td><td>102</td><td>96</td><td style="color:#dc2626">94.1%</td><td>24</td><td>15</td><td>76</td><td>46</td><td>11</td><td>4</td><td class="ph">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">★신환이 이 표의 주요 지표임. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <p>툴바 · 단위 5종 · 3단 머리글 · 셀 편집 · 진단 모달 · CSV —
       <a href="reservation-stats-system.html">시력교정판 3장</a>과 <b>같은 규격</b>임.
       다른 것은 칼럼 구성뿐임.</p>

    <div class="note">
      <div class="h">편집 가능 조건이 더 좁음</div>
      <p>일(day) 행이면서 <b>확정 스냅샷</b>이고 <b>데이터가 있는 날</b>(미음영)일 때만 고칠 수 있음.
         라이브 조회 상태에서는 저장 대상이 없어 편집이 열리지 않음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간(월 범위)</td><td><b>서버</b></td><td>—</td></tr>
        <tr><td>단위</td><td>화면</td><td>월별 · 주별 · 주차 · 일별 · 전체</td></tr>
        <tr><td>편집</td><td>—</td><td>일 행 + <b>확정 스냅샷 또는 마트(D-1 배치)</b> + 단일 월</td></tr>
        <tr><td>진단</td><td>—</td><td><b>단일 월</b>. 스냅샷이 없으면 진단 자체가 불가함</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">시드 폴백이 없음</div>
      <p>운영 데이터(확정 스냅샷·라이브)가 없으면 <b>가짜 값을 채우지 않고 안내만</b> 띄움.
         빈 표를 보여주는 편이 틀린 숫자를 보여주는 것보다 낫다는 판단임.</p>
    </div>
  `,

  s5: `
    <h3>컬럼 정의 — 33개</h3>
    <p>표 하나(가로 스크롤)이며, API 는 일자별 원시 건수만 주고 비율 · 합계는 화면이 계산함.
       콜 · 온라인 건은 등록일, 내원 · 부도 · 취소는 예약일 기준임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>(월) Date</td><td><code>date</code></td><td><code>stat_date</code></td><td>각 항목의 기준일</td><td>행 라벨. 월/주/일/전체 단위 전환. 손보정 셀은 <code>manualEdits</code> 마커</td></tr>
        <tr><td>2</td><td>총 예약(아웃바운드 포함) › 백내장</td><td><code>totalCataract</code></td><td><code>total_cataract</code></td><td>백내장_신환 + 백내장_추가예약 + 카톡_검사예약 + 백내장_온라인예약 + TM_예약</td><td>화면은 응답값을 쓰지 않고 <b>★신환 + TM 예약수 + 카톡 백내장 검사예약 + 온라인 예약수</b>로 재계산함(원천 공식과 같은 값). 따라서 이 칸을 직접 손보정해도 화면에 반영되지 않음 — 구성 칸을 고쳐야 함</td></tr>
        <tr><td>3</td><td>노안</td><td><code>totalPresbyopia</code></td><td><code>total_presbyopia</code></td><td>없음 — CRM 쿼리가 0 고정</td><td>손보정으로만 채워지는 칸</td></tr>
        <tr><td>4</td><td>합계</td><td>— (<code>totalSum</code>)</td><td>—</td><td>백내장 + 노안</td><td>다른 화면에서 말하는 '백내장 총예약'은 보통 이 값</td></tr>
        <tr><td>5</td><td>인바운드(컨택센터) › 총 인입콜</td><td><code>inboundCall</code></td><td><code>inbound_call</code></td><td>EICN <code>stat_user_inbound_bseye.in_total</code> — <code>group_code='0016'</code>(백내장팀 2명)</td><td>큐가 아니라 <b>응대 상담원 그룹</b> 기준. 팀원 부재 시 오버플로 콜이 시력교정팀으로 가 과소집계 → 그런 날은 수기 보정</td></tr>
        <tr><td>6</td><td>응대콜</td><td><code>answeredCall</code></td><td><code>answered_call</code></td><td>같은 행의 <code>in_success</code></td><td>—</td></tr>
        <tr><td>7</td><td>응대율</td><td>— (<code>answerRate</code>)</td><td>—</td><td>응대콜 ÷ 총 인입콜</td><td>정수 %. 빨강 강조</td></tr>
        <tr><td>8</td><td>백내장 › 총 신규검사문의</td><td><code>newExamInquiry</code></td><td><code>new_exam_inquiry</code></td><td><code>CtiRptLst</code>(<code>CtiRgtDtm</code>) 중 '백내장_신규문의'(S/9/21/21 에서 Cod3≠28, 또는 Cod2 32·9) + '백내장_신환'</td><td>추가예약(A/H/10/31)은 넣지 않음</td></tr>
        <tr><td>9</td><td>신규 재문의</td><td><code>newReInquiry</code></td><td><code>new_re_inquiry</code></td><td><code>CtiRptLst</code> S/9/21/21 이고 Cod3=28, 수신(<code>ClgIOF='I'</code>)</td><td>발신 재문의는 어디에도 집계되지 않음</td></tr>
        <tr><td>10</td><td>재문의 비율</td><td>— (<code>reInquiryRate</code>)</td><td>—</td><td>신규 재문의 ÷ 총 신규검사문의</td><td>빨강 강조</td></tr>
        <tr><td>11</td><td>★신환</td><td><code>newPatient</code></td><td><code>new_patient</code></td><td>'백내장_신환'(A/H/10/28·32, S/9/21/41, M/H/7/5) + '백내장_추가예약'(A/H/10/31)</td><td>총예약과 예약 종합(콜) 합산에 쓰이는 칸</td></tr>
        <tr><td>12</td><td>예약율</td><td>— (<code>inboundReservationRate</code>)</td><td>—</td><td>★신환 ÷ 총 신규검사문의</td><td>빨강 강조. 시력교정과 달리 분모가 총예약이 아님</td></tr>
        <tr><td>13</td><td>아웃바운드(TM) › 백내장 › 총 DB</td><td><code>tmTotalDb</code></td><td><code>tm_total_db</code></td><td><code>DB_CUSTOM</code>(<code>assign_date</code>) 중 <code>TM_EMP</code> 백내장 TM 4명, <code>Gubun</code> B2B 제외</td><td>시력교정 표가 제외한 4명이 여기 옴</td></tr>
        <tr><td>14</td><td>유효 DB</td><td><code>tmValidDb</code></td><td><code>tm_valid_db</code></td><td>그중 <code>TM_Gubun IN ('1000','2000')</code></td><td>—</td></tr>
        <tr><td>15</td><td>예약수</td><td><code>tmReservation</code></td><td><code>tm_reservation</code></td><td>그중 <code>TM_Gubun='1000'</code></td><td>—</td></tr>
        <tr><td>16</td><td>총 DB 예약율</td><td>— (<code>tmTotalDbRate</code>)</td><td>—</td><td>예약수 ÷ 총 DB</td><td>빨강 강조</td></tr>
        <tr><td>17</td><td>유효 DB 예약율</td><td>— (<code>tmValidDbRate</code>)</td><td>—</td><td>예약수 ÷ 유효 DB</td><td>빨강 강조</td></tr>
        <tr><td>18</td><td>아웃바운드 총 예약수</td><td>— (<code>tmOutboundReservation</code>)</td><td>—</td><td>= 예약수(15번)</td><td>같은 값을 강조 칸으로 한 번 더 보여줌</td></tr>
        <tr><td>19</td><td>채팅(카카오톡) › 총문의(모든)</td><td><code>kakaoTotalInquiry</code></td><td><code>kakao_total_inquiry</code></td><td><code>HappyTalk_Counsel_List</code>(<code>InsertedDateTime</code>) 중 <code>Category01 IN ('백내장검사','백내장외래')</code> 전건</td><td>외래 문의·취소까지 포함한 전체 수</td></tr>
        <tr><td>20</td><td>백내장 검사예약</td><td><code>kakaoCataractReservation</code></td><td><code>kakao_cataract_reservation</code></td><td>그중 <code>Category01='백내장검사'</code> 이고 <code>Category02 LIKE '★신환%'</code></td><td>빨강 강조. 총예약 구성 칸</td></tr>
        <tr><td>21</td><td>노안 검사예약</td><td><code>kakaoPresbyopiaReservation</code></td><td><code>kakao_presbyopia_reservation</code></td><td>그중 <code>Category02='노안'</code></td><td>총예약에는 넣지 않음(3번 노안과 별개)</td></tr>
        <tr><td>22</td><td>온라인예약 › 예약수</td><td><code>onlineReservation</code></td><td><code>online_reservation</code></td><td><code>RESERVATION</code> FLAG H · <code>RESERVE_PATH IN ('ONLINE','APP','NAVER')</code> · <code>RESERVE_STATE&lt;&gt;'C'</code> · JINRYO≠16, <code>InsertedDateTime</code> 기준</td><td>예약수정 시 <code>InsertedDateTime</code> 이 갱신되므로 확정한 날에 잡힘(레거시와 정합)</td></tr>
        <tr><td>23</td><td>부도수</td><td><code>onlineNoShow</code></td><td><code>online_no_show</code></td><td>= 30번 예약(부도)와 같은 값(경로 무관 전체 부도)</td><td>라벨은 온라인이지만 온라인 경로만 세지 않음 — 레거시 정합</td></tr>
        <tr><td>24</td><td>취소 › 온라인</td><td><code>cancelOnline</code></td><td><code>cancel_online</code></td><td><code>RESERVATION.RESERVE_DATE</code> 기준 FLAG H · <code>RESERVE_STATE='C'</code> · 경로 ONLINE/APP/NAVER. JINRYO 16·13 제외, <code>RESERVE_HISTORY.MEMO='예약저장'</code> 있는 건</td><td><b>예약일 기준</b></td></tr>
        <tr><td>25</td><td>컨택센터 현장(CRM)</td><td><code>cancelCrm</code></td><td><code>cancel_crm</code></td><td>같은 조건, 그 외 경로</td><td>—</td></tr>
        <tr><td>26</td><td>카톡</td><td><code>cancelKakao</code></td><td><code>cancel_kakao</code></td><td>HappyTalk <code>Category02='예약취소'</code></td><td>—</td></tr>
        <tr><td>27</td><td>예약 종합 › 총예약건</td><td>— (<code>totalReservationCount</code>)</td><td>—</td><td>내원 + 예약(부도) + 취소</td><td>—</td></tr>
        <tr><td>28</td><td>내원</td><td><code>visit</code></td><td><code>visit</code></td><td><code>RESERVATION.RESERVE_DATE</code> 기준 FLAG H · <code>RESERVE_STATE IN ('I','H')</code> 이고 (JINRYO 1·2 또는 같은 날 <code>Cataract_Exam</code> 기록(중단 제외) 보유)</td><td>재검·수술당일·진료실 슬롯은 검사기록 없으면 제외</td></tr>
        <tr><td>29</td><td>내원율</td><td>— (<code>visitRate</code>)</td><td>—</td><td>내원 ÷ 총예약건</td><td>소수 1자리</td></tr>
        <tr><td>30</td><td>예약(부도)</td><td><code>noShowReservation</code></td><td><code>no_show_reservation</code></td><td>FLAG H · <code>RESERVE_STATE='Y'</code> 이고 <code>RESERVE_DATE &lt;</code> 오늘. JINRYO 16·13 제외</td><td>—</td></tr>
        <tr><td>31</td><td>부도율</td><td>— (<code>noShowRate</code>)</td><td>—</td><td>부도 ÷ 총예약건</td><td>소수 1자리 · 빨강 강조</td></tr>
        <tr><td>32</td><td>취소</td><td><code>cancel</code></td><td><code>cancel</code></td><td>FLAG H · <code>RESERVE_STATE='C'</code></td><td>= 24 + 25</td></tr>
        <tr><td>33</td><td>취소율</td><td>— (<code>cancelRate</code>)</td><td>—</td><td>취소 ÷ 총예약건</td><td>소수 1자리 · 빨강 강조</td></tr>
      </tbody>
    </table>
    <p>CSV 는 화면 행 그대로(총예약 · 그룹별 채널 · 종합)임. 손보정은 원시 카운트 21개(2·3·5·6·8·9·11·13~15·19~26·28·30·32)만 가능하고 비율·합계 칸은 자동 재계산됨.</p>

    <div class="note">
      <div class="h">백내장과 노안을 나눠 세고 합계도 냄</div>
      <p>노안(백내장 계열의 노안 교정)은 별개 수요라 따로 봄.
         다만 <b>합계가 이 표의 총예약</b>이고, 다른 화면에서 "백내장"이라 하면
         보통 이 합계를 뜻함 — 어느 쪽인지 확인해야 함.</p>
    </div>

    <div class="note warn">
      <div class="h">★신환이 별표를 단 이유</div>
      <p>백내장은 재문의가 많아 <b>문의 수만으로는 신규 수요를 못 읽음</b>.
         신환이 실제 유입 규모에 가장 가까운 값이라 표에서 강조함.</p>
    </div>

    <div class="note">
      <div class="h">채팅의 '총문의(모든)'</div>
      <p>카카오톡 문의 전체 수임 — <b>백내장이 아닌 문의도 포함</b>함.
         그 아래 백내장·노안 검사예약이 실제 성과임. 총문의를 분모로 쓸 때 주의함.</p>
    </div>

    <h3>데이터 소스</h3>
    <p>정의와 소스 분석은 <a href="../db/예약통계_백내장-데이터소스-분석.md">db/예약통계_백내장-데이터소스-분석.md</a> 가 정본임.
       <b>§6.2 에 채널 합산 공식과 네이버 과다 원인</b>이 정리돼 있음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>스냅샷 전용에 가까움</b></td><td>스냅샷이 없으면 편집·진단이 막힘</td><td>운영 데이터가 있어야 쓸 수 있는 화면임</td></tr>
        <tr><td><b>수기 입력 의존</b></td><td>콜·TM·카톡 값이 시스템 밖임</td><td>시력교정판과 같은 문제</td></tr>
        <tr><td><b>백내장/노안 경계</b></td><td>다른 화면의 '백내장'과 범위가 다를 수 있음</td><td>합계인지 백내장만인지 확인</td></tr>
        <tr><td><b>표가 넓음</b></td><td>가로 스크롤</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>승인·마감 절차</td><td>시력교정판과 같은 쟁점임</td></tr>
        <tr><td>노안 분리 기준</td><td>어디까지를 노안으로 볼지가 원천 코드에 의존함. <a href="all-exam-list.html">전체 검사자 리스트</a>의 '노안/FU' 분류와도 맞물림</td></tr>
        <tr><td>두 예약통계의 통합</td><td>시력교정판과 칼럼이 달라 한 화면으로 못 합침. 그대로 둘지</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../db/예약통계_백내장-데이터소스-분석.md">예약통계_백내장 데이터소스 분석</a> —
       숫자가 안 맞을 때 먼저 볼 문서임.</p>
  `,
}
