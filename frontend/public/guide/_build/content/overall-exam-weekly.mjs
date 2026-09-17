export default {
  s2: `
    <h3>월별 종합지표의 주 단위 판</h3>
    <p><a href="overall-exam.html">월별 검사자 종합지표</a>와 <b>같은 9블록 35칼럼</b>을 주(월~일) 단위로 봄.
       칼럼 정의·순서·파생 산식이 전부 같고, <b>가로 축의 단위와 데이터 경로만</b> 다름.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>월 중간 점검</td><td>달이 끝나기 전에 흐름이 어느 쪽인지 봄</td></tr>
        <tr><td>주 단위 이상 탐지</td><td>월 합계로는 상쇄돼 안 보이는 특정 주의 급변을 찾음</td></tr>
        <tr><td>월 합계 검증</td><td><b>그 달 주 합계 = 월별 표의 그 달 값</b>이어야 함</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
      <p>월별판과 같은 이유임 — 경영 지표를 한 장에 다 폄.</p>
    </div>
  `,

  s3: `
    <p>월별판과 같은 2단 머리글 표. 행이 연월 대신 <b>연·월·주차</b>임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span>조회 연도</span>
        <span class="seg"><span>2024</span><span>2025</span><span class="on">2026</span></span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="2">주</th><th rowspan="2">기간</th><th rowspan="2">총검사자</th>
              <th colspan="3">소개유형</th><th colspan="3">직업</th>
              <th colspan="2">시력교정 수술예약</th><th colspan="2">중단</th><th>…</th>
            </tr>
            <tr>
              <th>일반고객</th><th>고객소개</th><th>직원소개</th>
              <th>직장인</th><th>학생</th><th>기타</th>
              <th>예약</th><th>예약률<br/>(중단포함)</th>
              <th>중단수</th><th>중단율</th><th>…</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>2026-08 1주</td><td>08.01~08.09</td><td>318</td><td>266</td><td>37</td><td>15</td><td>214</td><td>73</td><td>31</td><td>134</td><td>48%</td><td>17</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 2주</td><td>08.10~08.16</td><td>261</td><td>219</td><td>30</td><td>12</td><td>176</td><td>60</td><td>25</td><td>110</td><td>48%</td><td>14</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 3주</td><td>08.17~08.23</td><td>274</td><td>230</td><td>31</td><td>13</td><td>184</td><td>63</td><td>27</td><td>116</td><td>49%</td><td>15</td><td>6%</td><td class="ph">…</td></tr>
            <tr><td>2026-08 4주 <span class="pill st-wait" style="font-size:10px">진행중</span></td><td>08.24~08.30</td><td>88</td><td>74</td><td>10</td><td>4</td><td>59</td><td>20</td><td>9</td><td>37</td><td>42%</td><td>5</td><td>6%</td><td class="ph">…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">1주의 기간이 08.01~08.09 인 것에 주목 — 1일이 토요일이라 선행 부분 구간을 첫 정규 주에 합쳤음(4장). 숫자는 예시임.</p>

    <h3>월별판과 다른 점</h3>
    <table>
      <thead><tr><th>영역</th><th>월별</th><th>주간</th></tr></thead>
      <tbody>
        <tr><td>행 단위</td><td>연·월</td><td>연·월·주차 + 기간 표기</td></tr>
        <tr><td>연도 선택</td><td>전체 · 연도별</td><td><b>연도 하나</b>만 (행이 4~5배로 늘어남)</td></tr>
        <tr><td>데이터 경로</td><td>24·25 는 마트 시드</td><td><b>전 구간 운영 DB 라이브 집계</b></td></tr>
        <tr><td>비율 자릿수</td><td>소수점 1자리</td><td>기본 정수(%)</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>주 정의 — ISO 주차가 아님</h3>
    <div class="note bad">
      <div class="h">⚠️ 주차 레포트의 주차와 다른 규칙임</div>
      <p><a href="weekly-report.html">주차 레포트</a>는 <b>ISO 8601 연간 주차</b>(첫 목요일이 든 주가 1주차, 한 해 52/53주)를 씀.<br />
         이 화면은 <b>그 달의 주차</b>임 — 월 경계에서 잘라 각 달에 귀속시킴.
         이름이 비슷하다고 같은 주로 읽으면 안 됨.</p>
    </div>

    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>주의 시작</td><td>월요일 ~ 일요일</td></tr>
        <tr><td>월 경계</td><td>걸친 주는 <b>각 달로 잘라</b> 귀속. 그래야 월 합계 = 그 달 주 합계가 성립함</td></tr>
        <tr><td>선행 부분 구간</td><td>1일부터 첫 월요일 직전까지는 <b>첫 정규 주에 합쳐</b> 1주로 만듦</td></tr>
        <tr><td>부분 주</td><td><b>마지막 주만</b> 부분일 수 있음</td></tr>
      </tbody>
    </table>
    <p>예) 2026-02 은 1일이 일요일이라 1주 = 02.01~02.08, 2주 = 02.09~02.15 … 로 잡힘.
       정의의 정본은 <a href="../db/지표정의.md">db/지표정의.md §6</a>.</p>

    <h3>조회 조건</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td><code>GET /api/stats/overall-exam/weekly</code> — 한 해씩</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>칼럼은 월별판과 같음</h3>
    <p>그룹 9개 · 칼럼 35개 · 파생 산식 전부 <a href="overall-exam.html">월별 검사자 종합지표 5장</a>과 동일함.
       원시 카운트를 백엔드가 주고 <b>비율은 화면이 계산</b>하는 구조도 같음.</p>

    <h3>다른 것은 데이터 경로 하나임</h3>
    <table>
      <thead><tr><th>연도</th><th>월별판</th><th>주간판</th></tr></thead>
      <tbody>
        <tr><td>2024 · 2025</td><td>마트 시드 (레거시 확정값, 월 단위)</td><td rowspan="2"><b>운영 DB 라이브 집계</b> — 주 단위로 쪼개려면 원천을 직접 읽어야 함</td></tr>
        <tr><td>2026 ~</td><td>배치 적재 마트</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">그래서 24·25 는 두 화면 값이 다를 수 있음</div>
      <p>월별판의 24·25 는 <b>레거시가 확정한 숫자</b>이고, 주간판은 <b>지금 규칙으로 원천을 다시 센 값</b>임.
         집계 규칙이 그 사이 바뀐 만큼 차이가 남. 버그가 아니라 <b>정의의 역사</b>임.</p>
    </div>

    <div class="note">
      <div class="h">2026 이후는 맞아야 함</div>
      <p>같은 규칙·같은 원천이므로 <b>그 달 주 합계 = 월별판 그 달 값</b>이 성립해야 함.
         안 맞으면 주 경계 처리나 배치 적재를 의심함.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>24·25 가 월별판과 다름</b></td><td>같은 달인데 합계가 안 맞음</td><td>경로가 다름(5장). 과거 값 대조에는 월별판을 씀</td></tr>
        <tr><td><b>주차 개념 혼동</b></td><td>주차 레포트와 주 번호가 어긋남</td><td>규칙이 다름(4장). 두 화면의 주를 직접 비교하면 안 됨</td></tr>
        <tr><td><b>라이브 집계 부하</b></td><td>조회가 마트보다 느릴 수 있음</td><td>주 단위 분해가 마트에 없어 원천을 읽음</td></tr>
        <tr><td><b>진행 중인 주</b></td><td>마지막 주가 작음</td><td>부분 주는 마지막 하나뿐임</td></tr>
        <tr><td><b>빈 칸 둘</b></td><td>「중단제외」·「노안」 비율</td><td>월별판과 같은 이유임</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>주차 개념 통일</td><td>ISO 와 '그 달의 주차'가 공존함. 통일하면 월 합계 = 주 합계가 깨지거나, 주차 레포트의 연간 축이 깨짐 — <b>둘 다 못 가짐</b></td></tr>
        <tr><td>24·25 주 단위 복원</td><td>레거시 확정값을 주로 쪼갤 원천이 있는지</td></tr>
        <tr><td>마트화</td><td>주 단위 집계를 마트에 넣을지. 넣으면 빨라지지만 주 경계 규칙이 배치에 박힘</td></tr>
      </tbody>
    </table>
  `,
}
