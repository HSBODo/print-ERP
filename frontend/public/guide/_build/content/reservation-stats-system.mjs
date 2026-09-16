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
    <h3>33칼럼 · 6그룹</h3>
    <table>
      <thead><tr><th>그룹</th><th>칼럼 수</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>콜 &gt; 검사 인입콜</td><td>8</td><td>인입콜 · 응대콜 · <b>응대율</b> · 신규예약문의 · 신규문의 비율 · 예약수 · <b>신규문의 대비 예약율</b> · <b>예약율</b></td></tr>
        <tr><td>콜 &gt; TM</td><td>10</td><td>총 DB · 유효 DB · 예약수 · <b>유효 DB 예약율</b> · <b>예약율</b> · 재상담 · <b>총 DB 중 재상담비율</b> · 재상담 유효수 · 예약수 · <b>예약율</b></td></tr>
        <tr><td>온라인 &gt; 홈페이지</td><td>3</td><td>예약접수 · 예약수 · <b>예약율</b></td></tr>
        <tr><td>온라인 &gt; 네이버</td><td>6</td><td>예약접수 · <b>파트너거절</b> · 유효접수 · 예약수 · <b>유효접수 예약율</b> · <b>예약율</b></td></tr>
        <tr><td>채팅 &gt; 카카오톡</td><td>3</td><td>문의 · 예약수 · <b>예약율</b></td></tr>
        <tr><td>취소</td><td>3</td><td>콜·네이버 · 홈페이지 · 카톡</td></tr>
      </tbody>
    </table>
    <p>굵은 칸이 <b>비율</b>이고 화면에서 빨강으로 강조됨.</p>

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
