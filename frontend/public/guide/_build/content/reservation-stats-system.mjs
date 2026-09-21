export default {
  s2: `
    <h3>예약 하나를 33칸으로 쪼갠 표</h3>
    <p>예약 종합이 "얼마나 왔나"라면 이 화면은
       <b>"각 채널이 어떤 과정을 거쳐 그만큼 만들었나"</b>임.
       인입콜 → 응대 → 신규문의 → 예약처럼 <b>채널마다 중간 단계</b>가 있고, 그 단계마다 비율이 붙음.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>콜센터 성과</td><td>응대율 · 신규문의 대비 예약율로 병목을 찾음</td></tr>
        <tr><td>TM 성과</td><td>총 DB · 유효 DB · 재상담까지 나눠 봄</td></tr>
        <tr><td>온라인 채널</td><td>네이버는 파트너거절을 빼고 유효접수 기준으로 봄</td></tr>
        <tr><td>수치 보정</td><td>시스템에 안 남는 값을 <b>셀에 직접 입력</b>함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">이 표는 레거시 관리표를 옮긴 것임</div>
      <p>인입콜 수·TM DB 수처럼 <b>CRM 에 없는 값</b>이 섞여 있음. 그래서 자동 집계만으로 채워지지 않고,
         <b>스냅샷(확정값) + 라이브(재조회값)</b> 두 겹으로 관리함.</p>
    </div>
  `,

  s3: `
    <p>툴바 + 3단 머리글 표. 그룹 6개(콜>인입콜 · 콜>TM · 온라인>홈페이지 · 온라인>네이버 · 채팅>카카오톡 · 취소)로 묶임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span><span>~</span><span class="ui">📅 2026-07 ▾</span>
        <span class="seg"><span class="on">월별</span><span>주별</span><span>주차</span><span>일별</span><span>전체</span></span>
        <span class="grow"></span>
        <span class="ui">🔍 진단</span>
        <span class="ui">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="3">구분</th><th rowspan="3">총예약</th>
              <th colspan="4" style="background:#eff6ff">콜 &gt; 검사 인입콜</th>
              <th colspan="3" style="background:#eef2ff">콜 &gt; TM</th>
              <th colspan="3" style="background:#f0fdfa">온라인 &gt; 네이버</th>
              <th colspan="2" style="background:#fef2f2">취소</th>
            </tr>
            <tr>
              <th style="background:#eff6ff">인입콜</th><th style="background:#eff6ff">응대콜</th>
              <th style="background:#eff6ff">응대율</th><th style="background:#eff6ff">예약수</th>
              <th style="background:#eef2ff">총 DB</th><th style="background:#eef2ff">유효 DB</th><th style="background:#eef2ff">예약수</th>
              <th style="background:#f0fdfa">예약접수</th><th style="background:#f0fdfa">파트너거절</th><th style="background:#f0fdfa">유효접수</th>
              <th style="background:#fef2f2">콜·네이버</th><th style="background:#fef2f2">홈페이지</th>
            </tr>
            <tr><th colspan="12" style="background:#fafafa; font-weight:400; font-size:10px; color:#9aa0a6">… 실제로는 33칼럼</th></tr>
          </thead>
          <tbody>
            <tr><td>2026-07</td><td><b>1,555</b></td><td>2,140</td><td>1,982</td><td style="color:#dc2626">92.6%</td><td>612</td><td>1,840</td><td>1,102</td><td>388</td><td>452</td><td>38</td><td>414</td><td>41</td><td>14</td></tr>
            <tr><td class="ph">　1주</td><td>372</td><td>510</td><td>474</td><td style="color:#dc2626">92.9%</td><td>146</td><td>440</td><td>264</td><td>93</td><td>108</td><td>9</td><td>99</td><td>10</td><td>3</td></tr>
            <tr><td class="ph">　　7/1</td><td>62</td><td>85</td><td>79</td><td style="color:#dc2626">92.9%</td><td>24</td><td>73</td><td>44</td><td>15</td><td>18</td><td><span style="border-bottom:2px dotted #2563eb">2</span></td><td>16</td><td>2</td><td class="ph">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">비율 칸은 <b>빨강</b>으로 강조함. 점선 밑줄은 <b>사람이 고친 셀</b>임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>시작월 ~ 끝월</td><td>범위 조회. 한 달만 볼 때 편집·진단이 열림</td></tr>
        <tr><td>단위</td><td>월별 · 주별 · <b>주차</b> · 일별 · 전체</td><td>주별 = 그 달의 주 / 주차 = ISO 연간 주차</td></tr>
        <tr><td>표</td><td>3단 머리글 · 총예약 + 33칼럼</td><td>그룹 6개, 비율 칸 빨강 강조</td></tr>
        <tr><td>셀 편집</td><td>일 행의 지정 필드만</td><td>고친 셀에 표시가 남음</td></tr>
        <tr><td>진단</td><td>모달</td><td><b>확정 스냅샷 vs 라이브 재조회</b>를 일자·필드별로 비교</td></tr>
        <tr><td>CSV</td><td>그룹 구조를 살려 내보냄</td><td>—</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">진단 모달이 이 화면의 안전장치임</div>
      <p>스냅샷과 라이브가 갈라졌을 때 <b>어느 날 어느 필드가 얼마나 다른지</b>를 보여줌.
         차이 CSV · 드릴다운 CSV · 정합성 CSV 세 가지를 내려받을 수 있음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간(월 범위)</td><td><b>서버</b></td><td>등록일 기준. 범위가 유효한지 검사함</td></tr>
        <tr><td>단위</td><td>화면</td><td>일별 값을 받아 묶음</td></tr>
        <tr><td>편집·진단</td><td>—</td><td><b>단일 월</b>일 때만 의미가 있음</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">범위 조회인데 기능은 단일 월 전제임</div>
      <p>여러 달을 걸쳐 볼 수는 있지만, 셀 편집과 진단은 <b>한 달을 볼 때</b>를 전제로 만들어졌음.
         범위로 열어 두고 고치려 하면 동작이 자연스럽지 않음.</p>
    </div>
  `,

  s5: `
    <h3>컬럼 정의 — 42개</h3>
    <p>표 하나(가로 스크롤)이며, API 는 일자별 원시 건수만 주고 비율 · 합계는 화면이 계산함.
       콜 · 온라인 건은 등록일, 내원 · 부도 · 취소는 예약일 기준임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>(월) Date</td><td><code>date</code></td><td><code>stat_date</code></td><td>각 CH 의 기준일</td><td>행 라벨. 단위가 월/주/일/전체로 바뀌면 라벨만 바뀜. 일별은 달력 1~말일을 채우고 데이터 없는 날은 0(휴무 회색). 손보정된 셀은 <code>manualEdits</code> 로 마커 표시</td></tr>
        <tr><td>2</td><td>총예약</td><td>— (프론트 <code>totalReservation</code>)</td><td>—</td><td>CH04+CH07+CH10+CH12+CH16+CH18</td><td>검사 예약수 + TM 예약수 + TM 재상담 예약수 + 홈 예약수 + 네이버 예약수 + 카톡 예약수. <b>인입콜은 넣지 않음</b>. 채널별 '예약율' 6개의 공통 분모</td></tr>
        <tr><td>3</td><td>콜 › 검사 인입콜 › 인입콜</td><td><code>inboundCall</code></td><td><code>inbound_call</code></td><td>EICN(MySQL 링크드서버) <code>stat_user_inbound_bseye.in_total</code> 합 — <code>dcontext='hunt_context'</code>, 큐 2개(00000001121 · 07040180093)</td><td>CRM 밖 데이터. CH01. 손보정 대상</td></tr>
        <tr><td>4</td><td>응대콜</td><td><code>answeredCall</code></td><td><code>answered_call</code></td><td>같은 행의 <code>in_success</code> 합</td><td>CH02</td></tr>
        <tr><td>5</td><td>응대율</td><td>— (<code>answerRate</code>)</td><td>—</td><td>응대콜 ÷ 인입콜</td><td>정수 % 반올림, 분모 0 이면 0. 빨강 강조</td></tr>
        <tr><td>6</td><td>신규예약문의</td><td><code>newInquiry</code></td><td><code>new_inquiry</code></td><td><code>CtiRptLst</code>(<code>CtiRgtDtm</code>) 중 수신(<code>CtiClg.clgIOF='I'</code>)이고 코드 조합이 '검사_신규예약문의' 또는 '검사_예약'</td><td>CH03. 코드 조합은 SQL 의 CASE 참조(GbnCod/CtgCod/DtlCod2)</td></tr>
        <tr><td>7</td><td>신규문의 비율</td><td>— (<code>newInquiryRate</code>)</td><td>—</td><td>신규예약문의 ÷ 응대콜</td><td>—</td></tr>
        <tr><td>8</td><td>예약수</td><td><code>callReservation</code></td><td><code>call_reservation</code></td><td><code>CtiRptLst</code> '검사_예약' + '검사_추가예약'(<code>CtiRptMmo</code> 에 +1~+5)</td><td>CH04</td></tr>
        <tr><td>9</td><td>신규문의 대비 예약율</td><td>— (<code>reservationVsNewInquiry</code>)</td><td>—</td><td>예약수 ÷ 신규예약문의</td><td>빨강 강조</td></tr>
        <tr><td>10</td><td>예약율</td><td>— (<code>callReservationRate</code>)</td><td>—</td><td>예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>11</td><td>콜 › TM › 총 DB</td><td><code>tmTotalDb</code></td><td><code>tm_total_db</code></td><td><code>DB_CUSTOM</code>(<code>assign_date</code>) 전건. 백내장 TM 4명(<code>TM_EMP</code>) 제외, NULL 은 포함</td><td>CH05</td></tr>
        <tr><td>12</td><td>유효 DB</td><td><code>tmValidDb</code></td><td><code>tm_valid_db</code></td><td>그중 <code>TM_Gubun IN ('1000','2000')</code></td><td>CH06</td></tr>
        <tr><td>13</td><td>예약수</td><td><code>tmReservation</code></td><td><code>tm_reservation</code></td><td>그중 <code>TM_Gubun='1000'</code></td><td>CH07</td></tr>
        <tr><td>14</td><td>유효 DB 예약율</td><td>— (<code>tmValidDbRate</code>)</td><td>—</td><td>예약수 ÷ 유효 DB</td><td>빨강 강조</td></tr>
        <tr><td>15</td><td>예약율</td><td>— (<code>tmReservationRate</code>)</td><td>—</td><td>예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>16</td><td>재상담</td><td><code>tmRecounsel</code></td><td><code>tm_recounsel</code></td><td><code>DB_ReCounsel</code>(<code>InsertedDateTime</code>) 전건. 메모에 테스트/TEST 제외</td><td>CH08</td></tr>
        <tr><td>17</td><td>총 DB 중 재상담비율</td><td>— (<code>tmRecounselRatio</code>)</td><td>—</td><td>재상담 ÷ 총 DB</td><td>빨강 강조</td></tr>
        <tr><td>18</td><td>재상담 유효수</td><td><code>tmRecounselValid</code></td><td><code>tm_recounsel_valid</code></td><td>그중 <code>recounsel_state='6'</code> 또는 메모가 '…예약'</td><td>CH09</td></tr>
        <tr><td>19</td><td>예약수</td><td><code>tmRecounselReservation</code></td><td><code>tm_recounsel_reservation</code></td><td>그중 <code>ReCounsel_Memo LIKE '%예약'</code></td><td>CH10</td></tr>
        <tr><td>20</td><td>예약율</td><td>— (<code>tmRecounselRate</code>)</td><td>—</td><td>재상담 예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>21</td><td>온라인 › 홈페이지 › 예약접수</td><td><code>homeReceived</code></td><td><code>home_received</code></td><td><code>RESERVATION</code>(FLAG M · JINRYO '',5,6,7) ⋈ <code>RESERVE_HISTORY</code>(MEMO='예약저장') 중 <code>RESERVE_PATH IN ('ONLINE','APP')</code>. 날짜 = <code>RESERVE_NUM</code> 앞 6자리(YYMMDD)</td><td>CH11. 테스트·재검·차트있음·가상계정·B2B(군인)·더미고객 제외</td></tr>
        <tr><td>22</td><td>예약수</td><td><code>homeReservation</code></td><td><code>home_reservation</code></td><td>그중 <code>RESERVE_STATE &lt;&gt; 'C'</code></td><td>CH12</td></tr>
        <tr><td>23</td><td>예약율</td><td>— (<code>homeReservationRate</code>)</td><td>—</td><td>예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>24</td><td>온라인 › 네이버 › 예약접수</td><td><code>naverReceived</code></td><td><code>naver_received</code></td><td><code>RESERVATION</code>(PATH NAVER · FLAG M · <code>InsertedDateTime</code>) 전건 + 파트너거절 건</td><td>CH13. 접수 = 유효 + 거절</td></tr>
        <tr><td>25</td><td>파트너거절</td><td><code>naverRejected</code></td><td><code>naver_rejected</code></td><td><code>RESERVATION_NAVER</code>(<code>NrsRgtDtm</code>) 중 <code>RsvStt='C'</code> 이고 <code>RsvNum</code> 없음</td><td>CH14. 확정 전 거절이라 <code>RESERVATION</code> 에 없음</td></tr>
        <tr><td>26</td><td>유효접수</td><td><code>naverValid</code></td><td><code>naver_valid</code></td><td>접수 − 거절 = <code>RESERVATION</code> 네이버 전건(취소 포함)</td><td>CH15. 프론트에서 0 미만 클램프</td></tr>
        <tr><td>27</td><td>예약수</td><td><code>naverReservation</code></td><td><code>naver_reservation</code></td><td>그중 <code>RESERVE_STATE &lt;&gt; 'C'</code></td><td>CH16. 취소는 사유 무관 전부 사용자취소로 봄</td></tr>
        <tr><td>28</td><td>유효접수 예약율</td><td>— (<code>naverValidRate</code>)</td><td>—</td><td>예약수 ÷ 유효접수</td><td>빨강 강조</td></tr>
        <tr><td>29</td><td>예약율</td><td>— (<code>naverReservationRate</code>)</td><td>—</td><td>예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>30</td><td>채팅 › 카카오톡 › 문의</td><td><code>kakaoInquiry</code></td><td><code>kakao_inquiry</code></td><td><code>HappyTalk_Counsel_List</code>(<code>InsertedDateTime</code>) 중 <code>Category01='수술전'</code> 전건</td><td>CH17. PK 는 밀리초 시각이라 같은 시각 다건은 1건</td></tr>
        <tr><td>31</td><td>예약수</td><td><code>kakaoReservation</code></td><td><code>kakao_reservation</code></td><td>그중 <code>Category02='★신환'</code></td><td>CH18</td></tr>
        <tr><td>32</td><td>예약율</td><td>— (<code>kakaoReservationRate</code>)</td><td>—</td><td>예약수 ÷ 총예약</td><td>빨강 강조</td></tr>
        <tr><td>33</td><td>취소 › 콜·네이버</td><td><code>cancelCallNaver</code></td><td><code>cancel_call_naver</code></td><td><code>RESERVATION.RESERVE_DATE</code> 가 기간이고 <code>RESERVE_STATE='C'</code>, 경로가 ONLINE/APP 이 아닌 건</td><td>CH19. <b>예약일 기준</b></td></tr>
        <tr><td>34</td><td>홈페이지</td><td><code>cancelHome</code></td><td><code>cancel_home</code></td><td>같은 조건, 경로 ONLINE/APP</td><td>CH20</td></tr>
        <tr><td>35</td><td>카톡</td><td><code>cancelKakao</code></td><td><code>cancel_kakao</code></td><td>HappyTalk <code>Category02='예약취소'</code></td><td>CH21</td></tr>
        <tr><td>36</td><td>예약 종합 › 총예약건</td><td>— (<code>totalReservationCount</code>)</td><td>—</td><td>내원 + 예약(부도) + 취소</td><td>2번 총예약과 다른 값(예약일 기준 상태 합)</td></tr>
        <tr><td>37</td><td>내원</td><td><code>visit</code></td><td><code>visit</code></td><td><code>RESERVATION.RESERVE_DATE</code> 기준 <code>RESERVE_STATE IN ('I','H')</code></td><td>CH22</td></tr>
        <tr><td>38</td><td>내원율</td><td>— (<code>visitRate</code>)</td><td>—</td><td>내원 ÷ 총예약건</td><td>소수 1자리</td></tr>
        <tr><td>39</td><td>예약(부도)</td><td><code>noShowReservation</code></td><td><code>no_show_reservation</code></td><td><code>RESERVE_STATE='Y'</code> 이고 <code>RESERVE_DATE &lt;</code> 오늘</td><td>CH23. 아직 오지 않은 날은 세지 않음</td></tr>
        <tr><td>40</td><td>부도율</td><td>— (<code>noShowRate</code>)</td><td>—</td><td>부도 ÷ 총예약건</td><td>소수 1자리 · 빨강 강조</td></tr>
        <tr><td>41</td><td>취소</td><td><code>cancel</code></td><td><code>cancel</code></td><td><code>RESERVE_STATE='C'</code></td><td>CH24 = 33 + 34</td></tr>
        <tr><td>42</td><td>취소율</td><td>— (<code>cancelRate</code>)</td><td>—</td><td>취소 ÷ 총예약건</td><td>소수 1자리 · 빨강 강조</td></tr>
      </tbody>
    </table>
    <p>CSV 는 화면 행 그대로(총예약 · 그룹별 채널 · 종합)이며 휴무일은 빈 칸임. 손보정은 원시 카운트 24개(3·4·6·8·11~13·16·18·19·21·22·24~27·30·31·33~35·37·39·41)만 가능하고 비율 칸은 자동 재계산됨.</p>

    <div class="note">
      <div class="h">채널마다 '예약율'의 분모가 다름</div>
      <p>인입콜은 <b>인입콜 수</b>, TM 은 <b>총 DB</b>, 네이버는 <b>예약접수</b> 대비임.
         게다가 채널마다 <b>보조 비율</b>이 따로 있음 —
         신규문의 대비 예약율, 유효 DB 예약율, 유효접수 예약율.
         "예약율"이라는 같은 이름이 여섯 번 나오므로 <b>어느 그룹의 것인지</b> 확인해야 함.</p>
    </div>

    <div class="note warn">
      <div class="h">네이버는 파트너거절을 빼야 실제가 보임</div>
      <p>네이버 예약접수에는 <b>파트너가 거절한 건</b>이 섞여 있음.
         유효접수 = 예약접수 − 파트너거절이고, <b>유효접수 예약율</b>이 실제 성과에 가까움.</p>
    </div>

    <h3>스냅샷 + 라이브 두 겹</h3>
    <table>
      <thead><tr><th>층</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>스냅샷(RSS)</td><td>확정된 값. 사람이 고친 셀을 포함함</td></tr>
        <tr><td>라이브</td><td>지금 원천을 다시 조회한 값</td></tr>
      </tbody>
    </table>
    <p>둘이 갈라질 수 있어 <b>진단 모달</b>로 비교함. 이 화면이 신뢰를 유지하는 방식임.</p>

    <div class="note">
      <div class="h">왜 사람이 고칠 수 있어야 하나</div>
      <p>인입콜 수·TM DB 수·카톡 문의 수는 <b>CRM 에 남지 않음</b>.
         콜센터·TM·채팅 도구가 따로 있고 그 숫자는 담당자가 알고 있음.
         자동 집계만으로는 표가 채워지지 않음.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>수기 입력 의존</b></td><td>안 넣으면 칸이 빔</td><td>콜·TM·카톡 원천이 시스템 밖임</td></tr>
        <tr><td><b>스냅샷 vs 라이브 괴리</b></td><td>같은 달인데 값이 다름</td><td>진단 모달로 확인. <b>어느 쪽이 정본인지</b>는 운영 규칙임</td></tr>
        <tr><td><b>'예약율'이 여섯 개</b></td><td>이름만 보면 구분이 안 됨</td><td>그룹 머리글을 함께 읽음</td></tr>
        <tr><td><b>범위 조회 vs 단일 월 기능</b></td><td>여러 달을 열면 편집·진단이 어색함</td><td>한 달씩 다루는 것이 전제임</td></tr>
        <tr><td><b>표가 매우 넓음</b></td><td>가로 스크롤</td><td>레거시 표를 그대로 옮긴 결과임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>승인·마감 절차</td><td>스냅샷을 언제 확정으로 볼지. <a href="../db/지표정의.md">db/지표정의.md §3</a> 의 주간 승인 + 월 마감 방침과 맞물림</td></tr>
        <tr><td>수기 입력 자동화</td><td>콜센터·TM 도구를 연동할 수 있는지. 안 되면 수기가 영구화됨</td></tr>
        <tr><td>편집 이력</td><td>오버라이드는 <b>사유(<code>reason</code>)까지 행 단위로 쌓임</b> — <code>created_by</code>·<code>created_at</code> 포함. 다만 <b>조회 API 도 화면도 없어</b> DB 를 봐야만 되짚을 수 있음 — 화면에 낼지</td></tr>
        <tr><td>비율 이름</td><td>여섯 개의 '예약율'을 구분되는 이름으로 바꿀지 — 바꾸면 레거시 표와 어긋남</td></tr>
      </tbody>
    </table>
  `,
}
