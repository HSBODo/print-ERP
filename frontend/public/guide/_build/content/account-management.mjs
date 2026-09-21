/* 계정 관리 — 2026-09-16 작성. 정본: docs/auth/permissions.md · auth/controller/UserAdminController · pages/admin/AccountManagementPage.tsx */
export default {
  s2: `
    <h3>화면이 아니라 도구임</h3>
    <p>대시보드에 로그인할 <b>계정을 만들고 고치고 지우는</b> 화면임. 지표는 없음.
       ADMIN 롤(개발자)만 열 수 있고, 다른 롤은 사이드바에도 보이지 않으며 API 도 403 임.</p>
    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td><b>입사 · 신규 사용자</b></td><td>아이디·이름·이메일·권한·부서·초기 비밀번호를 넣어 계정을 만들고, 아이디와 초기 비밀번호를 본인에게 전달함</td></tr>
        <tr><td>부서 이동 · 승진</td><td>권한(롤)이나 부서를 바꿈. 마케팅 → 메디컬처럼 <b>보이는 메뉴 자체가 바뀜</b></td></tr>
        <tr><td>비밀번호 분실</td><td>편집 창에서 새 비밀번호를 넣어 초기화함. 사용자가 스스로 바꾸는 화면은 없음(10장)</td></tr>
        <tr><td>퇴사</td><td>계정을 삭제함. 되돌릴 수 없음</td></tr>
      </tbody>
    </table>

    <h3>이 화면이 대체한 것</h3>
    <p>권한 2축(롤 × 부서)을 도입하기 전에는 계정이 <code>ADMIN/USER</code> 둘뿐이라 개발자가 DB 에 직접 넣었음.
       부서별로 보이는 메뉴가 갈리면서(메디컬 · 마케팅 · 해외마케팅) 계정 하나에 정할 것이 늘어, 조합 규칙을 화면이 검사하게 했음.
       초기 ADMIN 한 명은 앱 기동 시 환경변수로 만들어지고(<code>DataInitializer</code>), 그 뒤부터는 이 화면이 유일한 입구임.</p>

    <div class="note bad">
      <div class="h">⚠️ 자기 자신에게는 손대지 못하게 막아 둠</div>
      <p>로그인한 관리자 본인의 <b>롤·부서 변경</b>과 <b>삭제</b>는 서버가 400 으로 거절함(자기 롤을 STAFF 로 낮추면 그 자리에서 잠김).
         <b>마지막 ADMIN</b> 도 지울 수 없음 — ADMIN 이 0명이 되면 정책 조작이 완전히 막히기 때문임.</p>
    </div>
  `,

  s3: `
    <p>툴바 + 표 + 다이얼로그 두 개(계정 폼 · 삭제 확인). 한 화면에 목록과 편집이 다 있음.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui blue">+ 신규 계정</span>
        <span class="ui" style="min-width:200px; color:#8a909a">아이디·이름·이메일 검색</span>
        <span class="ui">권한 · 전체 ▾</span><span class="ui">부서 · 전체 ▾</span><span class="ui">↺ 초기화</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>아이디</th><th>이름</th><th>이메일</th><th>권한</th><th>부서</th><th>액션</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>admin</td><td>관리자</td><td>admin@bnviit.com</td><td><span class="pill">ADMIN</span></td><td><span class="pill">ALL</span></td><td>✎ <span class="ph">🗑 (본인 · 비활성)</span></td></tr>
          <tr><td>2</td><td>director01</td><td>홍원장</td><td>director@bnviit.com</td><td><span class="pill">DIRECTOR</span></td><td><span class="pill">ALL</span></td><td>✎ 🗑</td></tr>
          <tr><td>3</td><td>mkt.kim</td><td>김마케팅</td><td>kim@bnviit.com</td><td><span class="pill">MANAGER</span></td><td><span class="pill">MARKETING</span></td><td>✎ 🗑</td></tr>
          <tr><td>4</td><td>nurse.lee</td><td>이간호</td><td>lee@bnviit.com</td><td><span class="pill">STAFF</span></td><td><span class="pill">MEDICAL</span></td><td>✎ 🗑</td></tr>
        </tbody>
      </table>
      <div class="shot-bar" style="border-top:1px solid #eaeaec"><span class="ph">이전 · 1 / 1 · 다음 · 행 수</span></div>
    </div>
    <p class="shot-cap">이름·이메일은 예시임. 권한·부서는 색 배지(ADMIN 빨강 계열 · DIRECTOR 보라 · MANAGER 파랑 · STAFF 회색 등)로 구분함.</p>

    <h3>계정 폼 다이얼로그</h3>
    <div class="shot">
      <div style="padding:14px">
        <div style="font-size:13px; font-weight:700; margin-bottom:8px">신규 계정</div>
        <div class="shot-bar" style="border:0; padding:0; flex-wrap:wrap; gap:8px">
          <span class="ui">아이디 <span class="ph">영문 소문자·숫자</span></span>
          <span class="ui">이메일</span>
          <span class="ui">이름</span>
          <span class="ui">권한 · STAFF ▾</span>
          <span class="ui">부서 · MEDICAL ▾</span>
          <span class="ui">비밀번호 <span class="ph">8자 이상</span></span>
        </div>
        <div class="shot-bar" style="border:0; padding:10px 0 0"><span class="ui">취소</span><span class="ui blue">저장</span></div>
      </div>
    </div>
    <p class="shot-cap">편집 모드에서는 아이디를 바꿀 수 없고, 비밀번호는 <b>비워 두면 유지</b>됨. 권한·부서 조합이 규칙에 어긋나면 저장 전에 화면이 막음(5장).</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>신규 계정</td><td>버튼</td><td>빈 폼을 염</td></tr>
        <tr><td>검색 · 필터</td><td>검색어 · 권한 · 부서 · 초기화</td><td>타이핑 즉시 반영. 검색은 아이디·이름·이메일 부분일치</td></tr>
        <tr><td>표</td><td>7열</td><td>편집(✎) · 삭제(🗑). 본인 행의 삭제는 비활성 + "자기 자신은 삭제할 수 없습니다" 툴팁</td></tr>
        <tr><td>삭제 확인</td><td>다이얼로그</td><td>아이디를 보여 주고 확인을 받음. 성공 시 토스트</td></tr>
        <tr><td>페이지</td><td>화면 페이지네이션</td><td>목록은 서버에서 한 번에 받음</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <p>조회 기간 개념이 없는 화면임. 목록은 <code>GET /api/admin/users</code> 로 <b>전체를 한 번에</b> 받고, 검색·필터·페이지는 전부 화면에서 함.</p>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>검색어</td><td>화면</td><td>아이디 · 이름 · 이메일 부분일치(대소문자 무시)</td></tr>
        <tr><td>권한</td><td>화면</td><td>ADMIN · DIRECTOR · MANAGER · STAFF 중 하나</td></tr>
        <tr><td>부서</td><td>화면</td><td>ALL · MEDICAL · MARKETING · OVERSEAS_MARKETING 중 하나</td></tr>
        <tr><td>쓰기</td><td><b>서버</b></td><td><code>POST /api/admin/users</code> · <code>PUT /api/admin/users/{id}</code> · <code>DELETE /api/admin/users/{id}</code>. 저장 뒤 목록을 다시 받음</td></tr>
      </tbody>
    </table>
    <p>사용자 수가 수십 명 규모라 서버 페이지네이션·서버 검색은 두지 않았음. 늘어나면 그때 옮김.</p>
  `,

  s5: `
    <h3>계정 필드</h3>
    <table>
      <thead><tr><th>필드</th><th>규칙(화면 검증)</th><th>서버 · 저장</th></tr></thead>
      <tbody>
        <tr><td>아이디 <code>loginId</code></td><td>2~50자 · 영문·숫자·<code>. _ -</code> 만. 생성 시에만 입력</td><td>소문자로 정규화해 저장. 중복이면 400</td></tr>
        <tr><td>이메일 <code>email</code></td><td>이메일 형식</td><td>—</td></tr>
        <tr><td>이름 <code>name</code></td><td>1~100자</td><td>—</td></tr>
        <tr><td>권한 <code>role</code></td><td>ADMIN · DIRECTOR · MANAGER · STAFF</td><td>기본 STAFF</td></tr>
        <tr><td>부서 <code>department</code></td><td>ALL · MEDICAL · MARKETING · OVERSEAS_MARKETING</td><td>기본 MEDICAL</td></tr>
        <tr><td>비밀번호 <code>password</code></td><td>8자 이상. 편집 시 빈 값이면 유지</td><td>BCrypt 해시로 저장. 평문은 어디에도 남지 않음 — 잊으면 재설정뿐</td></tr>
      </tbody>
    </table>

    <h3>권한 × 부서 조합 — 화면과 DB 가 같은 규칙을 봄</h3>
    <table>
      <thead><tr><th>권한 \\ 부서</th><th>ALL</th><th>MEDICAL</th><th>MARKETING</th><th>OVERSEAS_MARKETING</th></tr></thead>
      <tbody>
        <tr><td><b>ADMIN</b></td><td>✅ 개발자 · 전권</td><td>🚫</td><td>🚫</td><td>🚫</td></tr>
        <tr><td><b>DIRECTOR</b></td><td>✅ 임원 · 전 그룹 열람(시스템 조작 X)</td><td>🚫</td><td>🚫</td><td>🚫</td></tr>
        <tr><td><b>MANAGER</b></td><td>🚫</td><td>✅ 실장·본부장</td><td>✅ 마케팅 팀장</td><td>✅ 해외마케팅 팀장</td></tr>
        <tr><td><b>STAFF</b></td><td>🚫</td><td>✅ 상담사·간호사·원장</td><td>✅ 마케팅 실무자</td><td>✅ 해외마케팅 실무자</td></tr>
      </tbody>
    </table>
    <p>ADMIN·DIRECTOR ↔ ALL, MANAGER·STAFF ↔ 부서 3종. 화면(Zod)이 먼저 막고 DB 의 CHECK 제약(<code>users_role_department_scope_ck</code>)이 다시 막음.
       MANAGER 는 지금 STAFF 와 권한이 같고 자리만 있음 — 롤·부서의 뜻은 <a href="../db/mart-inventory.md">db 문서</a>가 아니라 레포의 <code>docs/auth/permissions.md</code> 가 정본임.</p>

    <h3>부서가 정하는 것</h3>
    <table>
      <thead><tr><th>부서</th><th>보이는 메뉴</th></tr></thead>
      <tbody>
        <tr><td>ALL</td><td>전부(부서 gate 우회)</td></tr>
        <tr><td>MEDICAL</td><td>홈 + 메디컬 그룹(예약·검사·수술·전환·외래·레포트·기타·관리자)</td></tr>
        <tr><td>MARKETING</td><td>홈 + 마케팅 그룹(예약 퍼널·채널별 수익성·채널별 분석·누적 안수·문자 발송) + 해외마케팅 3종</td></tr>
        <tr><td>OVERSEAS_MARKETING</td><td>홈 + 해외마케팅 3종만</td></tr>
      </tbody>
    </table>

    <h3>서버가 거절하는 조작</h3>
    <table>
      <thead><tr><th>조작</th><th>결과</th><th>이유</th></tr></thead>
      <tbody>
        <tr><td>자기 자신의 롤·부서 변경</td><td>400</td><td>자기 롤을 낮추면 그 자리에서 잠김. 다른 관리자에게 요청</td></tr>
        <tr><td>자기 자신 삭제</td><td>400</td><td>로그인 상태에서 튕겨남</td></tr>
        <tr><td>마지막 ADMIN 삭제</td><td>400</td><td>ADMIN 0명이면 정책 조작이 잠김</td></tr>
        <tr><td>규칙에 어긋난 롤·부서 조합</td><td>400 (DB CHECK)</td><td>화면을 우회한 호출도 막음</td></tr>
      </tbody>
    </table>
    <h3>계정 목록 표</h3>
    <p>앱 DB(Postgres) 의 <code>users</code> 테이블을 JPA 로 읽음(<code>GET /api/admin/users</code> · 응답 <code>UserRow</code>). 마트도 CRM 도 거치지 않으므로
       「마트 컬럼」 칸에는 <code>users</code> 컬럼을 적고 CRM 원천은 비움. <code>password</code>(BCrypt 해시)는 응답에 실리지 않음.
       목록은 한 번에 전부 받고 검색(아이디 · 이름 · 이메일 부분일치) · 권한 · 부서 필터 · 페이지(20 · 50 · 100)는 화면에서 처리함.</p>
    <h3>컬럼 정의 — 7개</h3>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>#</td><td>—</td><td>—</td><td>—</td><td>페이지 안 순번((페이지−1) × 행 수 + i + 1). 정렬 없음 — 서버가 준 순서 그대로</td></tr>
        <tr><td>2</td><td>아이디</td><td><code>loginId</code></td><td><code>login_id</code> UNIQUE NOT NULL</td><td>—</td><td>소문자로 정규화해 저장. 고정폭 글꼴. 로그인한 본인 행은 <b>나</b> 배지와 파란 배경</td></tr>
        <tr><td>3</td><td>이름</td><td><code>name</code></td><td><code>name</code> NOT NULL</td><td>—</td><td>—</td></tr>
        <tr><td>4</td><td>이메일</td><td><code>email</code></td><td><code>email</code> UNIQUE NOT NULL</td><td>—</td><td>—</td></tr>
        <tr><td>5</td><td>권한</td><td><code>role</code></td><td><code>role</code> VARCHAR(20) DEFAULT 'STAFF'</td><td>—</td><td><code>ADMIN</code> · <code>DIRECTOR</code> · <code>MANAGER</code> · <code>STAFF</code> 배지(빨강 · 보라 · 파랑 · 회색)</td></tr>
        <tr><td>6</td><td>부서</td><td><code>department</code></td><td><code>department</code> VARCHAR(20) DEFAULT 'MEDICAL'</td><td>—</td><td><code>ALL</code> · <code>MEDICAL</code> · <code>MARKETING</code> · <code>OVERSEAS_MARKETING</code> 배지. 부서 필터 select 에는 <code>OVERSEAS_MARKETING</code> 항목이 없음(검색어로만 좁힘) — 확인 필요</td></tr>
        <tr><td>7</td><td>액션</td><td><code>id</code> (편집 · 삭제 호출 키)</td><td><code>id</code> IDENTITY</td><td>—</td><td>편집 · 삭제 아이콘. 본인 행은 삭제 비활성. 삭제는 확인 다이얼로그를 거쳐 <code>DELETE /api/admin/users/{id}</code></td></tr>
      </tbody>
    </table>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>삭제는 되돌릴 수 없음</b></td><td>비활성화가 아니라 행 삭제임. 삭제 확인 다이얼로그 하나뿐</td><td>퇴사자를 잠시 막고 싶으면 비밀번호를 바꿔 두는 수밖에 없음</td></tr>
        <tr><td><b>이력이 없음</b></td><td>누가 언제 계정을 만들고 바꿨는지 기록이 없음(생성·수정 시각 컬럼 없음)</td><td>필요하면 감사 컬럼·로그 추가 — 아래 미결</td></tr>
        <tr><td><b>셀프 서비스 없음</b></td><td>사용자가 자기 비밀번호를 바꾸는 화면이 없음. 전부 ADMIN 을 거침</td><td>비밀번호 분실 = 관리자 재설정</td></tr>
        <tr><td><b>비밀번호 정책이 길이뿐</b></td><td>8자 이상만 검사. 복잡도·만료·재사용 제한 없음</td><td>내부 사용자 전제. 외부 개방 시 재검토</td></tr>
        <tr><td><b>세션 즉시 반영 안 됨</b></td><td>롤·부서를 바꿔도 그 사람이 들고 있는 JWT 가 만료될 때까지는 이전 권한으로 동작할 수 있음</td><td>급하면 본인에게 재로그인을 요청</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td><b>소속(회사·법인) 축</b></td><td>부서와 별개로 관계사·법인 축을 추가할 예정. 필드 이름을 부서(department)로 분리해 둔 이유임</td></tr>
        <tr><td><b>MANAGER 전용 조작</b></td><td>예산·목표 편집, KPI export 등 STAFF 와 갈라질 조작이 정해지지 않음. 정해지면 gating 을 하나씩 옮김</td></tr>
        <tr><td>VIEWER 롤</td><td>외부 열람 전용 롤은 일부러 뺐음. 요청이 오면 그때 추가</td></tr>
        <tr><td>감사 로그</td><td>계정 변경 이력을 남길지, 남기면 어디에(테이블 · 배치 로그) 둘지</td></tr>
        <tr><td>비활성화(soft delete)</td><td>삭제 대신 잠금 상태를 둘지</td></tr>
      </tbody>
    </table>
  `,
}
