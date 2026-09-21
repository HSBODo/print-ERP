export default {
  s2: `
    <h3>퍼널의 짝 — 얼마나 오나 vs 얼마 버나</h3>
    <p><a href="reservation-channel.html">예약 퍼널</a>이 전환 축이라면 이 화면은 <b>가치 축</b>임.
       같은 뷰(<code>v_reservation_channel</code>)를 읽으므로 <b>인원이 항상 맞음</b>.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>채널 우선순위</td><td>수납액·객단가·공헌이익으로 <b>어느 채널을 키울지</b> 정함</td></tr>
        <tr><td>광고 예산 판단</td><td>광고비를 넣은 매체의 CPA·ROAS 를 봄</td></tr>
        <tr><td>렌즈 원가 관리</td><td>렌즈삽입률·렌즈원가로 매출 대비 원가 구조를 봄</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 이 화면은 <b>추정</b>을 다룸 — 그 사실을 화면이 직접 말함</div>
      <p>광고 성과 귀속에 쓸 수 있는 <b>유료 클릭 식별자(캠페인·클릭 ID·UTM·광고 전용 번호)가 지금 어느 매체에도 없음</b>.
         그래서 ROAS 는 전부 추정이고, 화면이 매체마다 <b>어떤 추정인지·무엇이 섞여 있는지</b>를 툴팁으로 밝힘.
         숫자만 떼어 쓰면 안 되는 화면임.</p>
    </div>
  `,

  s3: `
    <h3>탭이 둘인 이유</h3>
    <p>유입채널과 광고매체는 <b>같은 축이 아님</b>. 광고는 모두닥·네이버 두 곳에만 집행하므로
       나머지 9개 채널은 광고비가 0원임. 한 표에 섞으면 <b>ROAS 칸의 9할이 비어 "성과 없음"으로 오독</b>됨.</p>
    <table>
      <thead><tr><th>탭</th><th>대상</th><th>내는 지표</th></tr></thead>
      <tbody>
        <tr><td>① 유입채널 수익성</td><td>채널 11개 <b>전부</b></td><td>광고비와 무관한 수익성만</td></tr>
        <tr><td>② 광고매체 효율</td><td>광고비가 있는 상품만</td><td><b>여기서만</b> CPA · ROAS</td></tr>
      </tbody>
    </table>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span>
        <span class="ui blue">🔍 조회</span>
        <span class="grow"></span>
        <span class="pill g-smile">성과 확정 · 월말 +25일</span>
      </div>
      <div class="shot-bar">
        <span class="seg"><span class="on">유입채널 수익성</span><span>광고매체 효율</span></span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>채널</th><th>수술완료</th><th>수납액</th><th>객단가</th>
            <th>예약→수술</th><th>렌즈삽입률</th><th>렌즈원가</th><th>재수술</th><th>공헌이익(렌즈만)</th>
          </tr></thead>
          <tbody>
            <tr><td>인콜</td><td>232</td><td>6.8억</td><td>293만</td><td>37.9%</td><td>18.5%</td><td>3,870만</td><td>0</td><td><b>6.4억</b></td></tr>
            <tr><td>홈페이지</td><td>145</td><td>4.2억</td><td>290만</td><td>37.4%</td><td>17.2%</td><td>2,240만</td><td>0</td><td><b>4.0억</b></td></tr>
            <tr><td>모두닥</td><td>39</td><td>1.1억</td><td>282만</td><td>32.2%</td><td>15.4%</td><td>580만</td><td>0</td><td><b>1.0억</b></td></tr>
            <tr><td>크리에이트립 <span class="pill st-wait" style="font-size:10px">표본 부족</span></td><td>7</td><td class="ph">2,010만</td><td class="ph">287만</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td>0</td><td class="ph">—</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">우상단의 <b>코호트 성숙도 배지</b>가 이 달 숫자를 다른 달과 비교해도 되는지 알려줌. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>월 하나</td><td>진행 중인 달은 <b>오늘까지</b>로 자름</td></tr>
        <tr><td>코호트 성숙도</td><td>성과 확정 · 거의 확정 · 관찰 중 · 미성숙</td><td>월말로부터 며칠 지났는지로 자동 판정 — 5장</td></tr>
        <tr><td>탭1 표</td><td>8칸. 성과 / 전환 / 원가·품질 세 묶음으로 구분선</td><td>정렬 가능</td></tr>
        <tr><td>탭2 표</td><td>광고비 · CPA · ROAS + <b>귀속 근거 배지</b></td><td>귀속 불가 매체는 <b>ROAS 를 내지 않음</b></td></tr>
        <tr><td>광고비 입력</td><td>화면에서 직접 저장</td><td>CRM 에 없는 값이라 사람이 넣음</td></tr>
        <tr><td>렌즈 단가 입력</td><td>화면에서 직접 저장</td><td>같은 이유</td></tr>
        <tr><td>표본 배지</td><td>30명 미만 = 평가 제외, 30~99 = 주의</td><td>렌즈 환자 몇 명이 객단가를 좌우함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">화면은 계산 규칙을 갖지 않음</div>
      <p>채널 판정은 <b>뷰</b>가, 지표 계산은 <b><code>channelProfitModel.ts</code></b> 가 함.
         단위 변환과 귀속 규칙이 대부분이라 테스트가 필요해 화면에서 떼어 뒀음.</p>
    </div>
  `,

  s4: `
    <h3>조회 조건과 입력값</h3>
    <table>
      <thead><tr><th>항목</th><th>어디서 오나</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>기간(월)</td><td>서버 조회</td><td>예약 <b>등록일</b> 기준 코호트</td></tr>
        <tr><td>인원·수납액</td><td>서버 (<code>v_reservation_channel</code>)</td><td>퍼널과 같은 원천</td></tr>
        <tr><td><b>광고비</b></td><td><b>화면 입력</b></td><td>CRM 에 없음. 매체·월별로 저장</td></tr>
        <tr><td><b>렌즈 단가</b></td><td><b>화면 입력</b></td><td>렌즈 종류별 단가. 안수를 곱해 원가를 냄</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">사람이 넣는 값이 둘 있음</div>
      <p>광고비와 렌즈 단가는 <b>입력하지 않으면 그 칸이 비어 있음</b>. 0 이 아니라 미입력임.
         단가가 없는 렌즈 안수가 하나라도 있으면 <b>렌즈원가·공헌이익을 아예 내지 않음</b>(<code>null</code>) —
         일부만 반영된 원가는 있는 것보다 나쁨.</p>
    </div>
  `,

  s5: `
    <h3>코호트 성숙도 — 이 화면 읽기의 전제</h3>
    <p>이 화면은 <b>예약 코호트</b>임. "그 달에 예약한 사람이 (언제든) 수술까지 갔나"를 셈.
       그래서 <b>최근 달일수록 아직 수술 전인 사람이 많아</b> 전환율·수납액·ROAS 가 구조적으로 낮게 나옴.
       그걸 실적 악화로 읽으면 오판임.</p>

    <p>관찰기간을 90일 같은 임의값으로 두지 않고 <b>실측 분포</b>로 정했음 —
       2026-01~06 코호트 5,008건의 예약등록일 → 수술일 소요:
       평균 13.9일 · <b>p50 7일 · p80 21일 · p90 33일 · p95 47일</b>.</p>

    <table>
      <thead><tr><th>배지</th><th>조건</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td>성과 확정</td><td>월말 +47일 이상</td><td>95% 이상이 수술을 마쳤음. 비교해도 됨</td></tr>
        <tr><td>거의 확정</td><td>월말 +33일 이상</td><td>약 90%. 남은 건이 반영되면 조금 올라감</td></tr>
        <tr><td>관찰 중</td><td>월말 +21일 이상</td><td>약 80%. 전환율·ROAS 가 실제보다 낮게 보임</td></tr>
        <tr><td>미성숙 코호트</td><td>그 미만 · 진행 중인 달</td><td><b>다른 달과 비교하면 안 됨</b></td></tr>
      </tbody>
    </table>

    <h3>공헌이익(렌즈만) — 이름에 범위를 박은 이유</h3>
    <p><b>공헌이익 = 수납액 − 렌즈 매입원가</b>. 변동비 중 렌즈 하나만 뺀 값이라 <b>회계상 공헌이익이 아님</b>.
       약품·수술재료·결제수수료·건별 인센티브는 원가 데이터가 없어 빠져 있고, 그만큼 실제보다 높음.</p>
    <div class="note">
      <div class="h">그래도 쓸 수 있는 이유</div>
      <p>빠진 비용이 대체로 <b>수술 건수에 비례</b>하므로 <b>채널 간 비교는 유효</b>함. 절대값을 믿으면 안 됨.
         원가 항목이 들어오면 라벨의 '(렌즈만)' 만 떼면 됨.</p>
    </div>
    <div class="note">
      <div class="h">인건비는 데이터가 생겨도 넣지 않기로 했음</div>
      <p>순매출의 <b>0.2% 규모</b>라 채널 순위를 바꾸지 못함
         (예약 11,076건 × 4,200원 ≈ 4,650만원 vs 순매출 215억).
         게다가 소요시간 측정 데이터가 없어 <b>가정을 숫자로 포장</b>하게 됨.</p>
    </div>

    <div class="note">
      <div class="h">할인·환불은 빼지 않음 — 뺄 것이 없음</div>
      <p>2026-01~08 수술 6,521명·수납 15,590행 전수 확인 결과
         <code>PrcDicPrc</code>·<code>PrcRfdPrc</code> 가 전부 0원이고 정가합(215.7억) ≈ 실납부합(215.6억)임.
         즉 <b>수납액이 곧 순매출</b>임.</p>
    </div>

    <h3>컬럼 정의 — KPI 4개</h3>
    <p>퍼널 · 렌즈 원가 · 광고비 API 셋을 합쳐 그림.
       광고비와 렌즈 단가는 사람이 입력하는 값이라 CRM 원천이 없음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>전체 수술완료</td><td><code>totalSurgeryDonePersons</code></td><td><code>total_surgery_done_persons</code></td><td>기간 예약자 중 실제 수술일 있는 DISTINCT <code>person</code>(채널 무관)</td><td>명. 채널 값을 더하지 않음. 힌트 = 채널 수</td></tr>
        <tr><td>2</td><td>귀속 수술수납액</td><td>Σ <code>surgeryAmount</code> ÷ 10,000</td><td><code>surgery_amount</code></td><td><code>COSTPRICE</code> 합(<code>PayStt='A'</code> 제외)</td><td>억. 채널 행의 합(수납액은 사람 중복이 없어 합산 가능). 회계매출 아님</td></tr>
        <tr><td>3</td><td>공헌이익(렌즈만)</td><td>2번 − Σ <code>lensCostManwon</code></td><td><code>lens_cost_manwon</code></td><td>—</td><td>억. 어느 채널이든 단가 미입력 안수(<code>lensEyesUnpriced</code>)가 있으면 — 와 '렌즈 단가 미입력'</td></tr>
        <tr><td>4</td><td>표본 주의 채널</td><td>— (프론트 집계)</td><td>—</td><td>—</td><td>수술완료 100명 미만인 채널 수</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 탭1 「유입채널 수익성」 9개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>채널</td><td><code>channel</code></td><td><code>v_reservation_channel.channel</code></td><td>내원동기(중) › 직원 설정표 › <code>RESERVE_PATH</code></td><td>30명 미만은 <code>n=</code> 배지, 30~99명은 '표본 주의' 배지. '비교 가능 표본만' 을 켜면 30명 미만 행 숨김. 기본 정렬 수납액 내림차순, <code>null</code> 은 항상 아래</td></tr>
        <tr><td>2</td><td>수술완료</td><td><code>surgeryDonePersons</code></td><td><code>surgery_done_persons</code></td><td>실제 수술일 있는 DISTINCT <code>person</code></td><td>명. 표본 등급의 기준</td></tr>
        <tr><td>3</td><td>수납액</td><td><code>surgeryAmount</code> → 만원 반올림</td><td><code>surgery_amount</code></td><td><code>COSTPRICE</code> 합</td><td>억 표시(1억 미만은 소수 2자리)</td></tr>
        <tr><td>4</td><td>객단가</td><td>수납액(만원) ÷ <code>surgeryPaidPersons</code></td><td><code>surgery_paid_persons</code></td><td>수납 &gt; 0 인 DISTINCT <code>person</code></td><td>만원 정수. 분모 0 이면 —. 합계행은 <code>totalSurgeryPaidPersons</code> 로 나눔</td></tr>
        <tr><td>5</td><td>예약→수술</td><td><code>surgeryDonePersons ÷ reservedPersons</code></td><td><code>reserved_persons</code></td><td><code>RESERVATION.InsertedDateTime</code> 기준 예약자</td><td>% 소수 1자리. 합계행은 —. 코호트 성숙도 배지의 영향을 가장 크게 받는 칸</td></tr>
        <tr><td>6</td><td>렌즈삽입률</td><td><code>lensEyes ÷ surgeryDonePersons</code></td><td><code>lens_eyes</code></td><td><code>op_type_r</code>·<code>op_type_l</code> 이 <code>lens_cost</code> 에 있는 유형(icl · tIcl · kpl · tKpl · viva)인 눈의 수</td><td>% 정수. 안 단위라 양안이면 100% 초과 가능. 합계행 —</td></tr>
        <tr><td>7</td><td>렌즈원가</td><td><code>lensCostManwon</code></td><td><code>lens_cost_manwon</code> = Σ <code>lens_cost.unit_cost_manwon</code></td><td>없음(단가는 사람 입력)</td><td>억 표시. 0 이면 —. 단가 0 인 유형의 안수는 <code>lensEyesUnpriced</code> 로 따로 옴</td></tr>
        <tr><td>8</td><td>재수술</td><td><code>reopPersons</code></td><td><code>reop_persons</code></td><td><code>list_reoperation</code> 자동판정 행과 차트번호 조인(수술일 이후)</td><td>건 표시, 0 이면 —. 코호트 기준이라 최근 달은 0. 합계행 —</td></tr>
        <tr><td>9</td><td>공헌이익(렌즈만)</td><td>수납액(만원) − 렌즈원가</td><td>—</td><td>—</td><td>억 표시. <code>lensEyesUnpriced &gt; 0</code> 이면 —(0 원가로 부풀리지 않음). 합계행은 전 채널 합, 하나라도 미입력이면 —</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 탭2 「광고매체 효율」 10개</h3>
    <p>행은 광고 상품 3개로 고정되고, 성과 칸은 연결된 채널의 탭1 값을 가져옴.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>매체·상품</td><td><code>media</code> (naver_reserve · naver_search · modoodoc)</td><td><code>ad_spend.media</code></td><td>—</td><td>라벨·부제·배지(N/M)는 프론트 상수</td></tr>
        <tr><td>2</td><td>광고성과 귀속 수준</td><td>— (프론트 <code>attribution</code>)</td><td>—</td><td>—</td><td>예약경로 기반 추정 / 귀속 불가 / 내원동기 기반 추정. 툴팁에 무엇이 섞이는지 표시. 검색광고는 성과 칸 전부 — 와 'ROAS 산출 보류' 안내</td></tr>
        <tr><td>3</td><td>예약</td><td>귀속 채널의 <code>reservedPersons</code></td><td><code>reserved_persons</code></td><td>탭1 5번과 동일</td><td>귀속 채널 없으면 —</td></tr>
        <tr><td>4</td><td>수술완료</td><td>귀속 채널의 <code>surgeryDonePersons</code></td><td><code>surgery_done_persons</code></td><td>탭1 2번과 동일</td><td>—</td></tr>
        <tr><td>5</td><td>전환율</td><td>수술완료 ÷ 예약</td><td>—</td><td>—</td><td>% 소수 1자리</td></tr>
        <tr><td>6</td><td>광고비(만원)</td><td><code>amountManwon</code></td><td><code>ad_spend.amount_manwon</code> (PK <code>ym</code>, <code>media</code>)</td><td>없음(사람 입력)</td><td>입력칸. 저장은 <code>PUT /api/stats/channel-profit/ad-spend</code>. 입력 전이면 0</td></tr>
        <tr><td>7</td><td>예약 CPA</td><td>광고비 ÷ 예약</td><td>—</td><td>—</td><td>만원. 광고비 0 또는 예약 0 이면 —</td></tr>
        <tr><td>8</td><td>수술 CPA</td><td>광고비 ÷ 수술완료</td><td>—</td><td>—</td><td>만원. 조건 동일</td></tr>
        <tr><td>9</td><td>수납 ROAS</td><td>귀속 채널 수납액(만원) ÷ 광고비</td><td>—</td><td>—</td><td>배 표시(소수 1자리). 1.0배 = 광고비 회수선이지 손익분기 아님</td></tr>
        <tr><td>10</td><td>공헌이익 ROAS(렌즈만)</td><td>귀속 채널 공헌이익 ÷ 광고비</td><td>—</td><td>—</td><td>공헌이익이 — 이면 —</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 렌즈 매입 단가 입력 2개</h3>
    <p>탭2 하단의 입력 영역. 수술 유형 목록은 미리 들어가 있고 단가만 0 일 수 있음.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>유형</td><td><code>opType</code></td><td><code>lens_cost.op_type</code></td><td>—</td><td>icl · tIcl · kpl · tKpl · viva(<code>surgery_op_type()</code> 코드). 레이저 계열은 행이 없음 = 렌즈 없음</td></tr>
        <tr><td>2</td><td>단가</td><td><code>unitCostManwon</code></td><td><code>lens_cost.unit_cost_manwon</code></td><td>없음(사람 입력)</td><td>안(眼) 1개당 만원. 0 이면 미입력으로 보아 그 유형 안수는 <code>lensEyesUnpriced</code> 에 들어감. 저장하면 채널 렌즈원가 캐시 무효화</td></tr>
      </tbody>
    </table>

    <h3>광고 귀속 — 매체마다 다르고, 다르다고 말함</h3>
    <table>
      <thead><tr><th>매체</th><th>귀속 채널</th><th>귀속 수준</th><th>무엇이 섞이나</th></tr></thead>
      <tbody>
        <tr><td>네이버 예약광고</td><td>네이버</td><td>예약경로 기반 <b>추정</b></td><td>자연검색·지도·플레이스·재방문 환자도 네이버 예약을 씀 → <b>실제 기여보다 크게</b> 잡힘</td></tr>
        <tr><td>모두닥 광고</td><td>모두닥</td><td>내원동기 기반 <b>추정</b></td><td>환자 자기신고임. 유료 리드인지 자연 노출인지 구분되지 않음</td></tr>
        <tr><td><b>네이버 검색광고</b></td><td><b>없음</b></td><td><b>귀속 불가</b></td><td>유입이 홈페이지·인콜·네이버 예약으로 흩어짐 — <b>비용만 기록</b></td></tr>
      </tbody>
    </table>
    <div class="note bad">
      <div class="h">검색광고에 ROAS 를 내지 않는 이유</div>
      <p>2026-01~08 실측 — 포털 유입으로 보이는 내원동기 1,582건 중 네이버 채널에 잡힌 건 <b>440건뿐</b>이고
         나머지는 홈페이지·인콜·아웃콜로 흩어짐. <b>분모는 광고비 전액인데 분자는 일부</b>라
         ROAS 를 내면 네이버가 실제보다 나쁘게 나오고, <b>그 숫자로 예산을 줄이면 오판</b>임.
         그래서 값을 내지 않고 비용만 남김.</p>
    </div>

    <h3>표본 임계</h3>
    <table>
      <thead><tr><th>등급</th><th>인원</th><th>취급</th></tr></thead>
      <tbody>
        <tr><td>표본 부족</td><td>30명 미만</td><td><b>순위·색상 평가에서 뺌</b></td></tr>
        <tr><td>표본 주의</td><td>30~99명</td><td>값은 보여주되 신뢰도를 낮게 봄</td></tr>
        <tr><td>정상</td><td>100명 이상</td><td>—</td></tr>
      </tbody>
    </table>
    <p>렌즈 환자 <b>몇 명이 객단가를 좌우</b>하기 때문임. 작은 채널의 객단가가 1위로 뜨는 것을 막음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>유료 클릭 식별자 부재</b></td><td>ROAS 가 전부 '추정' 배지를 달고 있음</td><td>UTM·광고 전용 번호·클릭 ID 중 하나가 들어와야 풀림. <b>이 화면의 근본 한계</b></td></tr>
        <tr><td><b>공헌이익이 렌즈만</b></td><td>실제보다 높음</td><td>채널 간 비교로만 씀. 절대값 금지</td></tr>
        <tr><td><b>미성숙 코호트</b></td><td>최근 달의 전환율·ROAS 가 낮음</td><td>배지를 먼저 봄. 미성숙이면 비교하지 않음</td></tr>
        <tr><td><b>수기 입력 의존</b></td><td>광고비·렌즈 단가가 비면 지표가 안 나옴</td><td>매달 넣어야 함. 안 넣으면 조용히 공란임</td></tr>
        <tr><td><b>렌즈삽입률 &gt; 100%</b></td><td>이상해 보임</td><td>양안 수술이면 정상임. 분모가 인원, 분자가 안수임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>광고 추적 식별자 도입</td><td>UTM·광고 전용 번호 중 무엇을 넣을지. 넣기 전까지 ROAS 는 계속 추정임</td></tr>
        <tr><td>나머지 원가 항목</td><td>약품·수술재료·결제수수료. 원가 데이터를 어디서 받을지</td></tr>
        <tr><td>광고비 입력 주체·시점</td><td>지금은 화면에서 아무나 넣음. 마감 절차가 없음</td></tr>
        <tr><td>귀속 불가 매체 표기</td><td>비용만 있고 성과가 없는 행을 어떻게 읽게 할지 — 지금은 배지와 툴팁뿐임</td></tr>
      </tbody>
    </table>
  `,
}
