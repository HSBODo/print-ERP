export default {
  s2: `
    <h3>숫자가 아니라 결론을 담는 화면</h3>
    <p>퍼널과 수익성이 <b>채널이 지금 어떤 숫자인지</b>를 보여준다면, 이 화면은
       <b>그 숫자를 어떻게 읽어야 하는지</b>를 담음. 채널마다 고객이 누구이고 객단가가 왜 그런지를
       실측으로 검증한 분석 문서 10편임.</p>

    <div class="note">
      <div class="h">왜 조회를 하지 않는가</div>
      <p>본문 수치는 <b>실측 시점의 값을 고정</b>했음. 매달 갱신되는 화면으로 만들면
         <b>숫자만 바뀌고 결론의 근거가 사라짐</b> — "그때 이 숫자를 보고 이렇게 판단했다"가 남지 않음.
         이 화면의 값어치는 <b>어떤 가설이 검증되고 어떤 가설이 죽었는지</b>에 있음.
         최신 수치는 <a href="reservation-channel.html">예약 퍼널</a>·<a href="channel-profit.html">채널별 수익성</a>이 담당함.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>채널 판단 근거 확인</td><td>"모두닥은 왜 객단가가 낮은가" 같은 물음의 검증 결과를 봄</td></tr>
        <tr><td>신규 인력 온보딩</td><td>채널마다 무엇이 다른지 한 번에 읽힘</td></tr>
        <tr><td>가설 재검토</td><td>죽은 가설을 다시 꺼내지 않게 함</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>좌측 채널 목록 + 우측 문서. 문서 안에는 표·차트가 섞여 있고 일부 채널만 상단 추세 차트가 최신 데이터를 조회함.</p>

    <div class="shot">
      <div style="display:flex; gap:0">
        <div style="width:170px; border-right:1px solid #eaeaec; padding:10px 12px; font-size:12px">
          <div class="ph" style="font-weight:700; margin-bottom:6px">채널</div>
          <div style="background:#efebff; color:#5b3fd1; border-radius:6px; padding:4px 8px; font-weight:700">인콜</div>
          <div style="padding:4px 8px">네이버</div>
          <div style="padding:4px 8px">홈페이지</div>
          <div style="padding:4px 8px">아웃콜</div>
          <div style="padding:4px 8px">모두닥</div>
          <div style="padding:4px 8px">앱</div>
          <div style="padding:4px 8px">카페</div>
          <div style="padding:4px 8px">크리에이트립</div>
          <div style="padding:4px 8px">해외에이전시</div>
          <div style="padding:4px 8px">자사해외</div>
        </div>
        <div style="flex:1; padding:14px">
          <div style="font-size:14px; font-weight:700">인콜</div>
          <div class="ph" style="font-size:11.5px; margin-top:2px">실측 기준 · 2026-01~08</div>
          <div style="border:1px solid #eaeaec; border-radius:10px; height:90px; margin-top:10px; background:repeating-linear-gradient(135deg,#fafafa,#fafafa 10px,#f2f2f4 10px,#f2f2f4 20px)"></div>
          <div style="font-size:12px; font-weight:700; margin-top:12px">누가 오는가</div>
          <div class="ph" style="font-size:11.5px">연령·직업 구성과 그 근거…</div>
          <div style="font-size:12px; font-weight:700; margin-top:10px">객단가가 왜 그런가</div>
          <div class="ph" style="font-size:11.5px">시술 구성·렌즈 비중으로 설명…</div>
        </div>
      </div>
    </div>
    <p class="shot-cap">채널 순서는 <b>수술 완료 인원(2026-01~08) 많은 순</b>임. 10개 채널 전부 문서가 있음.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>채널 목록</td><td>10개</td><td>고르면 우측 문서가 바뀜</td></tr>
        <tr><td>문서</td><td>채널마다 별도 컴포넌트</td><td>표·차트·서술이 섞인 자유 형식</td></tr>
        <tr><td>추세 차트</td><td>일부 채널만</td><td>이 부분만 최신 데이터를 조회함 (예: 모두닥 월별 예약→수술 퍼널)</td></tr>
        <tr><td>준비 중 자리</td><td>문서가 없는 채널</td><td>목록에는 남김 — <b>무엇이 안 됐는지 보이게</b></td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">채널을 늘리는 법</div>
      <p><code>CHANNELS</code> 에 한 줄 넣고 <code>doc</code> 에 컴포넌트를 붙임.
         <code>doc</code> 이 없으면 자동으로 <b>'준비 중'</b>으로 표시되고 클릭해도 안내만 나옴 —
         빈 채널을 목록에서 지우지 않는 것이 규칙임.</p>
    </div>
  `,

  s4: `
    <h3>조회 조건이 없음</h3>
    <p>기간·필터가 없음. <b>정적 문서 모음</b>이라 고를 것이 채널 하나뿐임.</p>
    <table>
      <thead><tr><th>항목</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>채널 선택</td><td>좌측 목록. 문서 전환만 함</td></tr>
        <tr><td>기간</td><td><b>없음</b> — 본문 수치는 실측 시점 고정</td></tr>
        <tr><td>추세 차트</td><td>일부 채널에서만, 문서가 정한 범위로 자체 조회</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">본문 숫자에는 기준 시점이 붙어 있어야 함</div>
      <p>고정값이므로 <b>"언제 기준인지"가 문서 안에 없으면 읽을 수 없음</b>.
         새 채널 문서를 쓸 때 반드시 실측 기간을 명시함.</p>
    </div>
  `,

  s5: `
    <h3>채널 10개</h3>
    <table>
      <thead><tr><th>순서</th><th>채널</th><th>성격</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>인콜</td><td rowspan="4">예약 경로에서 바로 나오는 기본 채널</td></tr>
        <tr><td>2</td><td>네이버</td></tr>
        <tr><td>3</td><td>홈페이지</td></tr>
        <tr><td>4</td><td>아웃콜</td></tr>
        <tr><td>5</td><td>모두닥</td><td rowspan="3">내원동기(중)에 매체명이 직접 적힌 경우 잡히는 채널</td></tr>
        <tr><td>6</td><td>앱</td></tr>
        <tr><td>7</td><td>카페</td></tr>
        <tr><td>8</td><td>크리에이트립</td><td rowspan="3">해외 유입 계열. 표본이 작아 수익성 화면에서는 평가 제외되는 달이 많음</td></tr>
        <tr><td>9</td><td>해외에이전시</td></tr>
        <tr><td>10</td><td>자사해외</td></tr>
      </tbody>
    </table>
    <p>순서는 <b>수술 완료 인원(2026-01~08) 많은 순</b>임. 채널 판정 규칙 자체는
       <a href="reservation-channel.html">예약 퍼널 5장</a>에 있음 — 이 화면은 판정하지 않음.</p>

    <h3>문서 한 편이 답해야 할 것</h3>
    <table>
      <thead><tr><th>물음</th><th>왜 필요한가</th></tr></thead>
      <tbody>
        <tr><td>누가 오는가</td><td>연령·직업·지역 구성. 객단가 차이의 절반은 여기서 설명됨</td></tr>
        <tr><td>객단가가 왜 그런가</td><td>시술 구성·렌즈 비중으로 설명함. "채널이 나쁘다"와 "고객군이 다르다"는 다른 말임</td></tr>
        <tr><td>검증된 가설 / 죽은 가설</td><td><b>이 화면의 핵심</b>. 같은 논의를 반복하지 않게 함</td></tr>
        <tr><td>실측 기간</td><td>고정값이라 시점이 없으면 못 읽음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">이 화면은 상태가 <code>complete</code> 임</div>
      <p>조회가 없는 정적 문서인데도 미구현이 아님 — <b>수치가 본문에 박혀 있어 API 없이 완결</b>이기 때문임.
         구현 상태는 "화면이 제 역할을 하는가"를 뜻하지 "API 가 붙었는가"가 아님.</p>
    </div>

    <h3>컬럼 정의 — 모두닥 문서 월별 퍼널 차트 시리즈 7개</h3>
    <p>문서 10편은 정적이라 컬럼이 없고, 모두닥 문서의 월별 퍼널 차트만 조회함.
       예약 퍼널 화면은 사람 수를, 이 차트는 <b>건수</b>를 써서 두 숫자가 다름.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>예약</td><td><code>reserved</code></td><td><code>reserved</code> (COUNT(*))</td><td><code>RESERVATION.InsertedDateTime</code> 이 그 달인 모두닥 채널 예약 건</td><td>모두닥 채널 = 내원동기(중)이 '모두닥'인 건</td></tr>
        <tr><td>2</td><td>취소 제외</td><td><code>notCancel</code></td><td><code>not_cancel</code></td><td><code>RESERVE_STATE &lt;&gt; 'C'</code></td><td>—</td></tr>
        <tr><td>3</td><td>접수</td><td><code>visited</code></td><td><code>visited</code></td><td><code>RESERVE_STATE IN ('I','H')</code></td><td>—</td></tr>
        <tr><td>4</td><td>검사</td><td><code>examined</code></td><td><code>examined</code></td><td>그중 <code>EXAM.EXAM_DATE</code> 있음</td><td>—</td></tr>
        <tr><td>5</td><td>중단 제외</td><td><code>notStop</code></td><td><code>not_stop</code></td><td>그중 <code>EXAM.STOP_YN ≠ 'Y'</code></td><td>—</td></tr>
        <tr><td>6</td><td>수술등록</td><td><code>surgery</code></td><td><code>surgery</code></td><td>그중 수술예약(<code>RESERVE_FLAG='O'</code>) 등록일 있음</td><td>—</td></tr>
        <tr><td>7</td><td>수술완료</td><td><code>surgeryDone</code></td><td><code>surgery_done</code></td><td>그중 실제 수술일(<code>OPERATIONDATA</code>) 있음</td><td>재수술(<code>reop</code>)은 이 차트에 없음</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 「단계별 월 건수」 표 3개</h3>
    <p>차트 아래 표. 행 = 위 시리즈 7개, 열 = 1월~12월 + 합계.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>단계</td><td>— (시리즈 라벨)</td><td>—</td><td>—</td><td>색 칩 + 라벨. 순서는 퍼널 순서</td></tr>
        <tr><td>2</td><td>1월 ~ 12월</td><td>월별 호출의 해당 시리즈 값</td><td>—</td><td>—</td><td>연도는 <code>MODOODOC_FUNNEL_YEAR</code>(2026) 고정. 도래하지 않은 달은 0</td></tr>
        <tr><td>3</td><td>합계</td><td>— (프론트 합)</td><td>—</td><td>—</td><td>1~12월 전체 합. 건수 기준이라 사람 수 합계와 다름</td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>본문이 낡음</b></td><td>실측 시점이 지나면 숫자가 현재와 다름</td><td><b>의도된 설계</b>임. 최신 수치는 퍼널·수익성에서 봄</td></tr>
        <tr><td><b>갱신 주기가 없음</b></td><td>언제 다시 써야 하는지 화면이 말하지 않음</td><td>문서 안의 실측 기간으로 판단할 수밖에 없음</td></tr>
        <tr><td><b>형식이 자유</b></td><td>채널마다 문서 구조가 다를 수 있음</td><td>컴포넌트라 자유도가 높음. 일관성은 사람이 지켜야 함</td></tr>
        <tr><td><b>코드가 곧 문서</b></td><td>내용을 고치려면 <code>.tsx</code> 를 고치고 배포해야 함</td><td>비개발자가 못 고침</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>갱신 주기</td><td>반기? 연간? 채널 전략이 바뀔 때? 정해지지 않았음</td></tr>
        <tr><td>문서 버전 표기</td><td>개정 이력을 화면에 남길지. 지금은 본문에 시점만 있음</td></tr>
        <tr><td>편집 경로</td><td>코드 배포 없이 고칠 수 있게 할지. 그러면 정적 고정이라는 성격이 흔들림</td></tr>
        <tr><td>문서 틀 통일</td><td>4개 물음(5장)을 필수 절로 강제할지</td></tr>
      </tbody>
    </table>
  `,
}
