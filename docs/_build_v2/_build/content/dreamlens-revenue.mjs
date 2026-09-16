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
        <tr><td>리콜 관리</td><td>다음예약 · 1차 리콜 · 1차 리콜예약 · 1차 부재문자 · 2차 리콜 · 2차 리콜예약 · 2차 부재문자</td><td>후속 관리 축</td></tr>
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
