export default {
  s2: `
    <h3>다른 시스템의 명단을 가져온 화면</h3>
    <p>홈페이지 온라인 예약 신청 명단임. 이 데이터는 <b>대시보드 DB 가 아니라 레거시 PHP 홈페이지의 MariaDB</b>에 있음.
       레거시 관리자 화면 <code>counsel/online_list.php</code> 를 <b>조회 전용</b>으로 옮겼음.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>온라인 신청 확인</td><td>홈페이지로 들어온 예약 신청을 봄</td></tr>
        <tr><td>UTM · 추천인 확인</td><td>어느 캠페인에서 왔는지 — <b>CRM 에는 없는 정보</b>임</td></tr>
        <tr><td>CRM 대조</td><td>홈페이지 신청과 CRM 예약수의 차이를 봄</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ <a href="reservation-list.html">예약자 리스트</a>의 홈페이지 채널과 다른 것임</div>
      <p>이 화면 = <b>홈페이지에 신청한 건</b>(레거시 홈페이지 DB)<br />
         예약자 리스트의 '홈페이지' 채널 = <b>CRM 에 예약으로 등록된 건</b><br />
         신청이 곧 예약은 아니라 <b>두 숫자는 다름</b>. 건별 대조 기록이 점검 문서에 있음.</p>
    </div>
  `,

  s3: `
    <p>대시보드 공통 리스트 툴바 + 12칼럼 표. 상단에 <b>데이터 신선도 배너</b>가 붙음.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-08 ▾</span>
        <span class="ui">구분 전체 ▾</span>
        <span class="ui">예약상태 전체 ▾</span>
        <span class="ui grow ph">이름 · 휴대폰번호</span>
        <span class="ui">↺ 초기화</span><span class="ui blue">🔍 조회</span><span class="ui green">⤓ CSV</span>
      </div>
      <div class="shot-bar" style="background:#ecfdf5; color:#047857">
        <span>● 실시간 — 마트가 매일 적재한 최신 데이터입니다</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>구분</th><th>이름</th><th>휴대폰번호</th><th>예약일</th><th>예약시간</th>
            <th>UTM</th><th>추천인코드</th><th>진료구분</th><th>당일수술</th><th>예약상태</th><th>등록일</th>
          </tr></thead>
          <tbody>
            <tr><td>388</td><td>온라인</td><td class="link">김○○</td><td class="link">010-****-1234</td>
                <td>2026-08-12</td><td>10:30</td><td>naver_brand</td><td class="ph">—</td><td>시력교정</td><td class="ph">—</td><td>예약</td><td>2026-08-05</td></tr>
            <tr><td>387</td><td>온라인</td><td class="link">이○○</td><td class="link">010-****-5678</td>
                <td>2026-08-14</td><td>14:00</td><td class="ph">—</td><td>REF2026</td><td>백내장</td><td>Y</td><td>예약</td><td>2026-08-05</td></tr>
            <tr><td>386</td><td>온라인</td><td class="link">박○○</td><td class="link">010-****-9012</td>
                <td>2026-08-10</td><td>11:00</td><td>google_pmax</td><td class="ph">—</td><td class="ph"></td><td class="ph">—</td><td>취소</td><td>2026-08-04</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">3행의 진료구분이 빈 것은 <b>레거시에도 라벨이 없는 코드</b>(진료구분=1)라 그럼. No 는 총건수에서 1씩 줄어드는 표시용 번호임.</p>

    <h3>레거시와 의도적으로 다르게 만든 것</h3>
    <table>
      <thead><tr><th>항목</th><th>결정</th><th>이유</th></tr></thead>
      <tbody>
        <tr><td>삭제 · 체크박스</td><td><b>제외</b></td><td>조회 전용으로 옮겼음. 쓰기 액션은 가져오지 않았음</td></tr>
        <tr><td>CSV</td><td><b>제공</b></td><td>다른 리스트와 동일. <b>개인정보가 원문으로 나감</b></td></tr>
        <tr><td>검색</td><td>이름 + <b>휴대폰번호</b> 통합</td><td>레거시는 휴대폰 검색이 안 돼 운영 불편이 있었음</td></tr>
        <tr><td>개인정보</td><td><b>화면은 원문 · CSV 는 마스킹</b></td><td>다른 명단 화면과 같은 방식임</td></tr>
        <tr><td>신선도 배너</td><td><b>신규 추가</b></td><td>레거시엔 없음 — 아래 참조</td></tr>
        <tr><td>필터 UI</td><td>공통 툴바</td><td>레거시 4블록 라디오 폼 대신</td></tr>
        <tr><td>필터 적용</td><td>구분·예약구분·검색은 <b>즉시</b>, [조회]는 등록일 재조회 전용</td><td>—</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 배너를 지우지 말 것</div>
      <p>스냅샷 소스일 때 <b>조회 기간이 스냅샷 범위를 넘으면 에러 없이 건수가 모자라게</b> 나옴.
         화면이 마지막 등록일과 비교해 <b>경고 배너</b>를 띄워 이 조용한 실패를 드러냄.
         실시간 소스에서는 천장이 없어 같은 비교가 거짓 경고가 되므로 <code>live</code> 플래그로만 끔 —
         <b>배너 자체를 지우면 안 됨.</b></p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td><b>등록일</b> 기준. [조회]를 눌러야 재조회함</td></tr>
        <tr><td>구분 · 예약상태</td><td>화면</td><td>즉시 반영</td></tr>
        <tr><td>이름 · 휴대폰번호</td><td>화면</td><td>통합 단일 입력. 즉시 반영</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">정렬은 등록일이 아니라 PK 역순임</div>
      <p><code>ORDER BY legacy_no DESC</code> — 레거시 동작을 그대로 따랐음.
         등록일로 정렬하면 <b>같은 날 안의 순서가 레거시와 달라짐</b>.</p>
    </div>
  `,

  s5: `
    <h3>원천 — 대시보드 밖의 시스템</h3>
    <table>
      <thead><tr><th>항목</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>DB</td><td><b>MariaDB</b> — 레거시 PHP 홈페이지의 운영 DB (<code>bseyecom_db</code>)</td></tr>
        <tr><td>테이블</td><td><code>TBL_COUNSEL</code> — 7개 상담 채널을 한 테이블에 담음</td></tr>
        <tr><td>필터</td><td><code>CATEGORY='COUNSELONLINE'</code>(온라인 예약만) · <code>DEL_TF='N'</code>(삭제 제외)</td></tr>
        <tr><td>접근</td><td>내부망, SSH 터널 경유. 앱은 <code>localhost:&lt;터널포트&gt;</code> 로 붙음</td></tr>
        <tr><td>설정</td><td><code>HOMEPAGE_DATASOURCE_URL</code> 하나로 SQLite 스냅샷 / MariaDB 직결을 <b>URL 접두사로 자동 스위칭</b></td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">현재 경로 — 배치가 마트에 적재함</div>
      <p>지금은 <b>배치가 MariaDB 를 읽어 <code>mart_list_reservation_homepage</code> 에 적재</b>하고
         화면은 마트를 조회함. <b>조회 시점 원본 직결은 더 이상 표준 경로가 아님.</b><br />
         1단계(직결)는 실증용이었고 <b>"운영 실시간이 필요하면 마트 ETL 쪽이 맞다"</b>는 판단대로 2단계로 갔음.</p>
    </div>

    <h3>레거시 동작을 그대로 따른 것 — 바꾸면 건수가 틀어짐</h3>
    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td><code>del_tf='N'</code> 하드코딩</td><td>삭제건(281건)은 조회 대상이 아님</td></tr>
        <tr><td><code>ORDER BY legacy_no DESC</code></td><td>등록일이 아니라 <b>PK 역순</b></td></tr>
        <tr><td>No 컬럼</td><td><b>총건수에서 1씩 감소</b>하는 표시용 번호. 저장값이 아님 — 식별자는 <code>legacyNo</code></td></tr>
        <tr><td>진료구분 <code>1</code></td><td>59건 — <b>레거시에도 라벨이 없어 빈칸</b>임. 결측이 아님</td></tr>
      </tbody>
    </table>

    <h3>컬럼 12개</h3>
    <p>No · 구분 · 이름 · 휴대폰번호 · 예약일 · 예약시간 · <b>UTM</b> · <b>추천인코드</b> ·
       진료구분 · 당일수술 · 예약상태 · 등록일.<br />
       <b>UTM 과 추천인코드는 CRM 에 없는 정보</b>임 — 홈페이지에서만 남음.</p>

    <div class="note warn">
      <div class="h"><code>DefaultDataSourceConfig</code> 를 지우지 말 것</div>
      <p>여러 데이터소스가 공존하는 구조를 유지하는 설정임. 자세한 배경은
         <a href="../databatch/legacy-homepage-source-strategy.md">소스 접근 전략 §2-6</a>.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>소스 미설정 시 503</b></td><td>화면이 안 뜸</td><td><code>HOMEPAGE_DATASOURCE_URL</code> 이 필요함. 다른 통계 화면의 데이터소스 부재와 같은 패턴</td></tr>
        <tr><td><b>스냅샷 조용한 실패</b></td><td>건수가 모자라게 나옴</td><td>경고 배너가 유일한 방어선임</td></tr>
        <tr><td><b>개인정보 원문</b></td><td>이름·휴대폰이 그대로 보이고 CSV 로도 나감</td><td>레거시와 동일하게 두기로 한 결정임</td></tr>
        <tr><td><b>CRM 예약수와 다름</b></td><td>홈페이지 신청 ≠ CRM 예약</td><td>건별 대조 기록이 있음</td></tr>
        <tr><td><b>진료구분 1 은 빈칸</b></td><td>결측처럼 보임</td><td>레거시에도 라벨이 없음 — 정상</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>개인정보 마스킹</td><td>화면은 원문, CSV 는 마스킹 — <b>다른 리스트와 같은 방식임</b>. 남은 선택은 화면에도 마스킹을 걸지인데, 걸면 상담 후속 연락을 못 하게 되므로 업무와 맞바꾸는 결정임</td></tr>
        <tr><td>UTM 활용</td><td>CRM 에 없는 유입 정보인데 <b>채널 분석과 연결되지 않았음</b> — 이으면 광고 귀속이 개선됨</td></tr>
        <tr><td>레거시 홈페이지 교체</td><td>홈페이지가 바뀌면 이 화면의 원천이 통째로 사라짐</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/홈페이지-CRM-예약수-비교_2026-07.md">홈페이지 vs CRM 예약수 비교</a> — 건별 1:1 대조.
       구조와 결정 배경은 <a href="../databatch/legacy-homepage-source-strategy.md">소스 접근 전략</a>.</p>
  `,
}
