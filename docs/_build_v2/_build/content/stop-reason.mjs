export default {
  s2: `
    <h3>왜 멈췄는지를 7개로 나눠 봄</h3>
    <p><a href="stop-rate.html">중단률</a>이 "얼마나 멈췄나"라면 이 화면은 <b>"왜 멈췄나"</b>임.
       중단 건을 사유 7버킷으로 분해하고, 그 버킷을 다시 <b>수술 불가</b>와 <b>잠정 중단</b> 두 그룹으로 묶음.</p>

    <div class="note">
      <div class="h">두 그룹의 뜻이 다름</div>
      <p><b>수술 불가</b> — 의학적으로 수술이 안 되는 경우. 다시 올 일이 거의 없음.<br />
         <b>잠정 중단</b> — 지금은 아니지만 <b>나중에 다시 올 수 있는</b> 경우.<br />
         후속 관리의 대상이 완전히 다르므로 색으로 갈라 놓았음.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>중단 증가 원인 찾기</td><td>어느 사유가 늘었는지 봄</td></tr>
        <tr><td>재유치 대상 파악</td><td>잠정 중단 그룹이 다시 올 수 있는 사람들임</td></tr>
        <tr><td>레포트 대조</td><td>월간·주차 레포트의 「중단 사유」 도표와 같은 값임</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>연·월 선택 + 사유별 막대. 두 그룹이 색으로 갈림.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026년 ▾</span>
        <span class="ui">7월 ▾</span>
        <span class="grow"></span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:2px"></span> 잠정 중단</span>
        <span><span style="display:inline-block;width:10px;height:10px;background:#dc2626;border-radius:2px"></span> 수술 불가</span>
      </div>
      <div style="padding:14px">
        <table>
          <tbody>
            <tr><td style="width:120px">기타</td><td><span style="display:inline-block;height:12px;width:60%;background:#f59e0b;border-radius:2px"></span></td><td style="width:40px">24</td></tr>
            <tr><td>불가-녹내장</td><td><span style="display:inline-block;height:12px;width:20%;background:#f59e0b;border-radius:2px"></span></td><td>8</td></tr>
            <tr><td>불가-시력변화</td><td><span style="display:inline-block;height:12px;width:15%;background:#f59e0b;border-radius:2px"></span></td><td>6</td></tr>
            <tr><td>불가-수술권유X</td><td><span style="display:inline-block;height:12px;width:30%;background:#dc2626;border-radius:2px"></span></td><td>12</td></tr>
            <tr><td>불가-렌즈삽입불가</td><td><span style="display:inline-block;height:12px;width:25%;background:#dc2626;border-radius:2px"></span></td><td>10</td></tr>
            <tr><td>불가-원추각막</td><td><span style="display:inline-block;height:12px;width:18%;background:#dc2626;border-radius:2px"></span></td><td>7</td></tr>
            <tr><td>불가-아벨리노</td><td><span style="display:inline-block;height:12px;width:10%;background:#dc2626;border-radius:2px"></span></td><td>4</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">잠정 중단 3종이 위, 수술 불가 4종이 아래임. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>연·월 선택</td><td>드롭다운 2개</td><td>한 달씩 봄</td></tr>
        <tr><td>차트</td><td>사유 7개 막대</td><td>그룹별 색 — 잠정 중단 / 수술 불가</td></tr>
        <tr><td>순서</td><td>잠정 중단 3 → 수술 불가 4</td><td>그룹이 섞이지 않게 고정</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도 · 월</td><td><b>서버</b></td><td><code>GET /api/stats/stop-reason/monthly</code></td></tr>
      </tbody>
    </table>
    <p>기준 날짜는 <b>검사일</b>임. 레포트에서는 이 도표만 <b>월을 따로 고름</b> —
       다른 도표가 월별 추이인데 이건 한 달의 구성이라서임.</p>
  `,

  s5: `
    <div class="note">
      <div class="h">정의의 정본</div>
      <p><a href="../db/중단사유-분류-정의.md">db/중단사유-분류-정의.md</a> — 매핑 변경 절차와 검증 쿼리가 있음.
         요약은 <a href="../지표정의/3-전환율-중단율.md">지표정의/3-전환율-중단율.md §4</a>.</p>
    </div>

    <h3>분류 원천 — 상담사가 고른 코드</h3>
    <p>중단 건(<code>STOP_YN='Y'</code>)을 <b>상담사가 드롭다운에서 고른 정형 코드</b>
       <code>EXAM.CANCEL_CD</code>(char(3))로 분류함. 코드 마스터는 <code>CANCEL_CFG</code> 임.
       메모를 키워드로 뒤지는 방식이 아니라 <b>코드 기반</b>이라 재현성이 있음.</p>

    <h3>7버킷 매핑</h3>
    <table>
      <thead><tr><th>버킷</th><th>라벨</th><th>코드</th><th>그룹</th></tr></thead>
      <tbody>
        <tr><td><code>recommendX</code></td><td>불가-수술권유X</td><td>121 · 305</td><td>수술 불가</td></tr>
        <tr><td><code>lensImpossible</code></td><td>불가-렌즈삽입불가</td><td>122 · 306 · 399</td><td>수술 불가</td></tr>
        <tr><td><code>keratoconus</code></td><td>불가-원추각막</td><td>124 · 125 · 308 · 309</td><td>수술 불가</td></tr>
        <tr><td><code>avellino</code></td><td>불가-아벨리노</td><td>126 · 310</td><td>수술 불가</td></tr>
        <tr><td><code>glaucoma</code></td><td>불가-녹내장</td><td>114 · 303</td><td><b>잠정 중단</b></td></tr>
        <tr><td><code>visionChange</code></td><td>불가-시력변화</td><td>111 · 302</td><td><b>잠정 중단</b></td></tr>
        <tr><td><code>other</code></td><td>기타</td><td>107 · 199 · 117 · 304 · 127 · 311 · <b>미지 코드</b></td><td><b>잠정 중단</b></td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">코드군이 두 벌임 — <code>1xx</code> 와 <code>3xx</code></div>
      <p>같은 사유가 두 코드로 들어옴(<code>1xx</code> 검사 중단 / <code>3xx</code> 같은 라벨 세트).
         <b>새 코드를 추가할 때 짝이 있는지 반드시 확인</b>해야 함. 한쪽만 넣으면 절반이 기타로 샘.</p>
    </div>

    <div class="note">
      <div class="h">라벨이 '불가'인데 잠정 중단으로 보낸 코드가 있음</div>
      <p><code>117</code>·<code>304</code>(불가_백내장FU), <code>127</code>·<code>311</code>(불가_기타 각막병증)은
         라벨이 <code>불가_</code> 로 시작하지만 <b>검토 결과 기타(잠정 중단)로 귀속하기로 결정</b>했음(2026-07-15).
         라벨을 그대로 따르지 않은 <b>의도된 예외</b>임.</p>
    </div>

    <div class="note bad">
      <div class="h">⚠️ 함정 ① — <code>ELSE</code> 로 떨어지는 코드는 조용히 기타가 됨</div>
      <p>운영에 새 <code>CANCEL_CD</code> 가 생겨도 <b>에러 없이 기타만 부풀어 오름</b>.
         골든 대조에서 기타가 늘면 이걸 먼저 의심함.<br />
         검토를 마친 코드는 <code>ELSE</code> 에 흘리지 말고 <code>WHEN</code> 으로 명시해야
         <b>"검토해서 기타로 정한 코드"와 "몰라서 샌 코드"가 구분됨</b>.</p>
    </div>

    <div class="note bad">
      <div class="h">⚠️ 함정 ② — <code>CANCEL_CD</code> 는 이름과 달리 취소 플래그가 아님</div>
      <p>이 쿼리에서는 <b>중단 사유 코드</b>로 쓰지만, 다른 쿼리들은 같은 컬럼을
         <b>취소 판정</b>(<code>ISNULL(e.CANCEL_CD,'') = ''</code>)에 씀.
         <b>한쪽 의미로만 알고 고치면 다른 쪽이 깨짐.</b></p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>미지 코드가 기타로 샘</b></td><td>기타가 조용히 커짐</td><td>기타 급증 시 <code>CANCEL_CD</code> 신규 값을 확인. 검증 쿼리가 분류 정의 문서에 있음</td></tr>
        <tr><td><b>상담사 입력 의존</b></td><td>코드를 안 고르면 분류가 안 됨</td><td>원천 입력 관행 문제임</td></tr>
        <tr><td><b>한 달씩만 봄</b></td><td>추세를 보려면 달을 바꿔 가며 봐야 함</td><td>구성 비교용 화면이라 그럼</td></tr>
        <tr><td><b>시력교정만</b></td><td>백내장 중단은 안 나옴</td><td>백내장은 분류 '중단'으로 따로 셈</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>기타 세분화</td><td>기타가 가장 큰 버킷임. 쪼개려면 코드 검토가 더 필요함</td></tr>
        <tr><td>월별 추이 보기</td><td>구성뿐 아니라 사유별 추세를 볼 화면이 필요한지</td></tr>
        <tr><td>잠정 중단 후속</td><td>재유치 대상 명단을 낼 수 있는데 화면이 없음</td></tr>
        <tr><td>백내장 통합</td><td>두 진료의 중단을 한 화면에서 볼지</td></tr>
      </tbody>
    </table>
  `,
}
