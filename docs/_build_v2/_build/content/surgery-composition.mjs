export default {
  s2: `
    <h3>수술 구성을 표 하나로 끝까지</h3>
    <p>시술별 건수와 <b>그룹 내 비중</b>을 27칼럼 표로 봄.
       월별 · 주차(ISO) · 주별 · 일별 · 전체 중 <b>보는 단위를 고름</b>.</p>

    <div class="note">
      <div class="h"><a href="surgery-ratio.html">주요 수술별 비중</a>과의 분담</div>
      <p>그쪽은 <b>차트로 요약</b>(주요 지표·점유율·추이), 이쪽은 <b>표로 상세</b>(일 단위까지).
         같은 원천을 보지만 답하는 질문이 다름.</p>
    </div>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>일별 확인</td><td>특정 날짜에 어떤 수술이 몇 건인지 봄</td></tr>
        <tr><td>PIOL 구성</td><td>렌즈 계열 5종의 내역을 봄</td></tr>
        <tr><td>재수술 비중</td><td>레이저/렌즈로 나눠 봄</td></tr>
      </tbody>
    </table>
  `,

  s3: `
    <p>기준 월 + 단위 선택 + <b>3단 머리글</b> 표. 그룹마다 밴드 색이 다름.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span>
        <span class="seg"><span class="on">월별</span><span>주차</span><span>주별</span><span>일별</span><span>전체</span></span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="3">구분</th><th rowspan="3">합계</th>
              <th colspan="8" style="background:#dbeafe; color:#1e40af">시력교정수술</th>
              <th colspan="4" style="background:#ede9fe; color:#5b21b6">백내장</th>
            </tr>
            <tr>
              <th rowspan="2" style="background:#eff6ff">시력교정</th>
              <th rowspan="2" style="background:#eff6ff">스마일</th>
              <th rowspan="2" style="background:#eff6ff">스마일프로</th>
              <th colspan="3" style="background:#eff6ff">PIOL</th>
              <th rowspan="2" style="background:#fef9c3; color:#854d0e; font-size:9px">PRESBYOND</th>
              <th rowspan="2" style="background:#eff6ff">라식계</th>
              <th rowspan="2" style="background:#f5f3ff">다초점</th>
              <th rowspan="2" style="background:#f5f3ff">프리미엄</th>
              <th rowspan="2" style="background:#f5f3ff">단초점</th>
              <th rowspan="2" style="background:#f5f3ff">합계</th>
            </tr>
            <tr>
              <th style="background:#eff6ff">합계</th><th style="background:#eff6ff">ICL</th><th style="background:#eff6ff">T-ICL</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2026-07</td><td><b>798</b></td><td><b>726</b></td><td>18%</td><td>38%</td><td><b>148</b></td><td>96</td><td>34</td><td>2%</td><td>9%</td><td>18</td><td>14</td><td>11</td><td>43</td></tr>
            <tr><td class="ph">　1주</td><td>186</td><td>170</td><td>17%</td><td>39%</td><td>35</td><td>23</td><td>8</td><td>2%</td><td>8%</td><td>4</td><td>3</td><td>3</td><td>10</td></tr>
            <tr><td class="ph">　2주</td><td>203</td><td>184</td><td>19%</td><td>37%</td><td>38</td><td>25</td><td>9</td><td>1%</td><td>10%</td><td>5</td><td>4</td><td>2</td><td>11</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">「…」 없이도 넓음 — 실제로는 27칼럼임. PRESBYOND 는 PIOL 밖 독립 항목이라 <b>노란색</b>으로 갈라 뒀음. 숫자는 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기준 월</td><td>월 선택기</td><td>단위에 따라 이 달 안에서 쪼갬</td></tr>
        <tr><td>단위</td><td>월별 · <b>주차</b> · <b>주별</b> · 일별 · 전체</td><td>주차와 주별이 <b>다른 개념</b>임 — 4장</td></tr>
        <tr><td>표</td><td>3단 머리글 · 27칼럼</td><td>그룹 밴드: 시력교정 파랑 · 백내장 보라 · PRESBYOND 노랑</td></tr>
        <tr><td>행 계층</td><td>월 · 주 · 일</td><td>색으로 구분함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">PRESBYOND 를 노란색으로 뺀 이유</div>
      <p>노안 레이저라 <b>PIOL 그룹 밖의 독립 항목</b>임. 파란 밴드 안에 두면 렌즈 계열로 읽힘.
         칼럼 라벨도 한글('프레스비욘드') 대신 영문을 씀 — 한글 6자가 칼럼 폭을 과하게 벌림.</p>
    </div>
  `,

  s4: `
    <h3>단위 5종 — 주차와 주별이 다름</h3>
    <table>
      <thead><tr><th>단위</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td>월별</td><td>그 달 하나의 합</td></tr>
        <tr><td><b>주차</b></td><td><b>ISO 8601 연간 주차</b> — 월~일, 첫 목요일이 든 주가 1주차</td></tr>
        <tr><td><b>주별</b></td><td>그 달 안의 주</td></tr>
        <tr><td>일별</td><td>날짜별</td></tr>
        <tr><td>전체</td><td>기간 전체 합</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">주차 개념이 이 시스템에 셋 있음</div>
      <p>ISO 주차(이 화면의 '주차' · <a href="weekly-report.html">주차 레포트</a>) /
         그 달의 주차(<a href="overall-exam-weekly.html">주간 검사자 종합지표</a> · 이 화면의 '주별') /
         월별. 이름이 비슷하니 어느 쪽을 보는지 확인함.</p>
    </div>

    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기준 월</td><td><b>서버</b></td><td><code>mart_surgery_daily</code> 를 조회함</td></tr>
        <tr><td>단위</td><td>화면</td><td>일별 값을 받아 화면에서 묶음</td></tr>
      </tbody>
    </table>
    <div class="note">
      <div class="h">파일 스냅샷을 폐지했음</div>
      <p>종전에는 파일 스냅샷을 읽었는데 지금은 <code>mart_surgery_daily</code> 를 직접 조회함.
         일별 값이 마트에 있어 어떤 단위로든 화면에서 묶을 수 있음.</p>
    </div>
  `,

  s5: `
    <h3>칼럼 27개 — 값의 성격이 두 가지임</h3>
    <table>
      <thead><tr><th>표기</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td>숫자</td><td>건수 또는 인원</td></tr>
        <tr><td>%</td><td>그 칼럼의 <b>분모 대비 비중</b> — <b>분모가 칼럼마다 다름</b></td></tr>
      </tbody>
    </table>

    <h3>분모가 칼럼마다 다름</h3>
    <table>
      <thead><tr><th>칼럼</th><th>분모</th></tr></thead>
      <tbody>
        <tr><td>스마일 · 스마일프로 · PIOL 합계 · PRESBYOND · 라식계 · 라섹계 합계</td><td><b>시력교정 인원</b></td></tr>
        <tr><td>라섹계 EX · 라섹계 Red</td><td><b>라섹계 합계</b></td></tr>
        <tr><td>재수술 레이저 · 재수술 렌즈</td><td><b>재수술 합계</b></td></tr>
        <tr><td>ICL · T-ICL · KPL · T-KPL · VIVA</td><td>비중을 내지 않음 — <b>건수만</b></td></tr>
        <tr><td>엑스트라 · 퍼스널 · 콘트라 · 웨이브비전 · 모노비전</td><td>수술명에 붙는 <b>옵션 표기</b> — 유형과 별개 축이라 세로합이 100% 가 되지 않음</td></tr>
      </tbody>
    </table>
    <p>같은 표 안에서도 % 의 뜻이 다르므로 <b>세로로 더해 100% 가 되는 묶음</b>이 무엇인지 확인해야 함.</p>

    <div class="note bad">
      <div class="h">⚠️ PIOL 합계는 유형별 합산이 아님</div>
      <p>PIOL 합계는 원천이 세어 준 <b>DISTINCT 환자 수</b>임.
         <code>icl + tIcl + kpl + tKpl + viva</code> 로 더하면 <b>양안에 다른 렌즈를 넣은 환자가 이중 계상</b>됨
         — 2026-07 실측: 합산 168 vs 실인원 <b>148</b>.
         표에서 렌즈 5종을 더해 PIOL 합계와 안 맞는 것은 <b>정상</b>임.</p>
    </div>

    <h3>그룹 구성</h3>
    <table>
      <thead><tr><th>밴드</th><th>칼럼</th></tr></thead>
      <tbody>
        <tr><td>합계</td><td>전체 수술</td></tr>
        <tr><td>시력교정(파랑)</td><td>시력교정 인원 · 스마일 · 스마일프로 · PIOL(합계 + ICL·T-ICL·KPL·T-KPL·VIVA) · 라식계 · 라섹계(합계 + EX · Red)</td></tr>
        <tr><td>PRESBYOND(노랑)</td><td>노안 레이저 — PIOL 밖 독립</td></tr>
        <tr><td><b>옵션</b></td><td>엑스트라 · 퍼스널 · 콘트라 · 웨이브비전 · 모노비전 — 시력교정 수술에 붙는 옵션 표기(<code>+X</code> · <code>P.E</code> 등)</td></tr>
        <tr><td>백내장(보라)</td><td>다초점 · 프리미엄 · 단초점 · 합계</td></tr>
        <tr><td>재수술</td><td>합계 · 레이저 · 렌즈</td></tr>
      </tbody>
    </table>
    <p>유형 판정 규칙은 <a href="surgery-list.html">수술자 리스트 5장</a>과 같음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>PIOL 합계 ≠ 유형 합</b></td><td>더하면 안 맞음</td><td>DISTINCT 환자 수라 정상임</td></tr>
        <tr><td><b>% 의 분모가 섞여 있음</b></td><td>세로합이 100% 가 아닌 묶음이 있음</td><td>칼럼별 분모를 확인(5장)</td></tr>
        <tr><td><b>표가 매우 넓음</b></td><td>가로 스크롤</td><td>27칼럼을 한 판에 담은 결과임</td></tr>
        <tr><td><b>주차/주별 혼동</b></td><td>두 단위가 나란히 있음</td><td>ISO 와 달력 주임</td></tr>
        <tr><td><b>한 달씩만</b></td><td>여러 달을 이어 못 봄</td><td>'전체' 단위가 기간 합을 줌</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>% 분모 표기</td><td>칼럼 머리글에 분모를 적을지. 적으면 표가 더 넓어짐</td></tr>
        <tr><td>PIOL 대표유형 안내</td><td>PIOL 합계 칸의 <b>툴팁에는 설명이 있음</b>(「환자당 대표유형 한 곳에만 집계되므로 오른쪽 값들의 합과 같습니다」). 다만 표면에 드러나지 않아 툴팁을 안 보면 오해함 — 표 안에 남길지</td></tr>
        <tr><td>수술 화면 4개의 역할</td><td><a href="surgery.html">수술 건수</a>·<a href="surgery-ratio.html">주요 수술별 비중</a>과 겹침</td></tr>
      </tbody>
    </table>
  `,
}
