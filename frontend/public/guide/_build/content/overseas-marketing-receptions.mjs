export default {
  s2: `
    <h3>두 개의 명단을 하나로 붙이는 화면</h3>
    <p>ECP 해외마케팅이 받은 <b>접수 명단</b>과 CRM 의 <b>기존 외국인 고객</b>은 원래 서로 모름.
       접수는 구글 시트로 들어오고 진료는 CRM 에 남음. 이 화면은 둘을 <b>사람 단위로 이어 붙여</b>,
       문의한 사람이 실제로 검사·수술까지 갔는지 한 줄에서 보이게 함.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>매칭 확인</td><td>자동 매칭이 애매하다고 표시한 건을 사람이 확정함</td></tr>
        <tr><td>진행 추적</td><td>문의 → 검사 → 수술 상태와 비용을 봄</td></tr>
        <tr><td>수기 추가</td><td>시트에 없는 접수를 화면에서 직접 넣음</td></tr>
        <tr><td>통계 원천</td><td>이 명단이 <a href="overseas-marketing-statistics.html">통계</a>·<a href="overseas-reservation-stats.html">예약통계</a>의 밑값이 됨</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">다른 리스트와 성격이 다름</div>
      <p>대시보드의 리스트는 대부분 <b>읽기 전용</b>인데, 이 화면은 <b>원천 데이터를 직접 만드는 화면</b>임.
         행 추가·수정·삭제·매칭이 전부 여기서 일어남. 그만큼 규칙이 많음.</p>
    </div>
  `,

  s3: `
    <p>필터 두 줄 + 표. 표에는 관리 버튼(수정·삭제)이 붙고, 고객번호 칸은 <b>눌러서 매칭</b>함.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">문의일 ▾</span>
        <span class="ui">📅 2026-08-01 ~ 2026-08-31 ▾</span>
        <span class="ui">상태 전체 ▾</span>
        <span class="seg"><span class="on">매칭 전체</span><span>접수</span><span>매칭</span><span>확인필요</span></span>
        <span class="ui grow ph">이름 · 연락처 · 고객번호</span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
      </div>
      <div class="shot-bar">
        <span class="ui green">＋ 행 추가</span>
        <span class="ui amber">⟳ CRM 동기화</span>
        <span class="ui">⟳ 시트 동기화</span>
        <span class="grow"></span>
        <span class="ui">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>관리</th><th>상태</th><th>등록일</th><th>문의일</th><th>고객번호</th>
            <th>이름</th><th>국적</th><th>성별</th><th>생년월일</th><th>연락처</th>
            <th>출국예정</th><th>검사일</th><th>수술일</th><th>수술비</th><th>유입경로</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td class="ph">✎ 🗑</td><td><span class="pill g-smile">수술완료</span></td>
              <td>2026-08-02</td><td>2026-07-28</td><td class="link">2231045</td>
              <td class="link">Wang ○○</td><td>중국</td><td>F</td><td>1994-03-11</td><td class="link">+86 ***</td>
              <td>2026-08-20</td><td>2026-08-12</td><td>2026-08-14</td><td>3,200,000</td><td>에이전시</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td class="ph">✎ 🗑</td><td><span class="pill st-wait">검사예약</span></td>
              <td>2026-08-05</td><td>2026-08-04</td>
              <td style="color:#b45309"><b>확인필요</b> 2229810 ?</td>
              <td class="link">Tanaka ○○</td><td>일본</td><td>M</td><td>1988-11-02</td><td class="link">+81 ***</td>
              <td>2026-09-03</td><td>2026-08-28</td><td class="ph">—</td><td class="ph">—</td><td>온라인</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td class="ph">✎ 🗑</td><td class="ph">미분류</td>
              <td>2026-08-07</td><td>2026-08-07</td><td class="ph">—</td>
              <td class="link">Nguyen ○○</td><td>베트남</td><td>F</td><td>2000-06-19</td><td class="link">+84 ***</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td>소개</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">2행처럼 <b>확인필요</b>인 건은 고객번호 칸이 주황임. 눌러서 팝업으로 확정함.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>날짜 기준</td><td>등록일 · 매칭일 · <b>문의일</b> · 출국예정 · 검사일 · 수술일</td><td>기본값 <b>문의일</b>. 어느 날짜로 볼지 고름</td></tr>
        <tr><td>기간</td><td>달력형 범위 선택기</td><td>기본 당월 1일~말일. 날짜 조건을 아예 끌 수도 있음</td></tr>
        <tr><td>상태</td><td>전체 · 미분류 · 검사예약 · 외래문의 · 수술완료</td><td>—</td></tr>
        <tr><td>매칭</td><td>전체 · 접수 · 매칭 · <b>확인필요</b></td><td>확인필요가 <b>사람이 할 일 목록</b>임</td></tr>
        <tr><td>행 추가</td><td>모달</td><td>시트에 없는 접수를 직접 넣음</td></tr>
        <tr><td>CRM 동기화</td><td>백그라운드 작업</td><td>매칭과 CRM 파생값을 갱신함 — 5장</td></tr>
        <tr><td>시트 동기화</td><td>백그라운드 작업</td><td>구글 시트에서 새 행을 가져옴. <b>환경변수로 숨길 수 있음</b>(이관 완료 후 끌 예정)</td></tr>
        <tr><td>고객번호 칸</td><td>클릭 → 매칭 팝업</td><td>후보를 확인하고 확정함</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <h3>날짜 기준을 고르는 것이 이 화면의 특징</h3>
    <p>다른 리스트는 기준 날짜가 하나로 고정인데, 여기는 <b>6종 중 하나를 고름</b>.
       접수 → 문의 → 출국 → 검사 → 수술이 <b>여러 달에 걸쳐</b> 일어나기 때문임.
       "8월에 문의한 사람"과 "8월에 수술한 사람"은 다른 명단임.</p>
    <table>
      <thead><tr><th>기준</th><th>무엇을 보나</th></tr></thead>
      <tbody>
        <tr><td>문의일 <b>(기본)</b></td><td>그 달의 유입 — 마케팅 관점</td></tr>
        <tr><td>등록일</td><td>그 달에 명단에 올라온 건</td></tr>
        <tr><td>매칭일</td><td>그 달에 CRM 과 이어 붙은 건</td></tr>
        <tr><td>출국예정</td><td>일정 관리</td></tr>
        <tr><td>검사일 · 수술일</td><td>그 달의 실제 진료 — 진료 관점</td></tr>
      </tbody>
    </table>

    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>날짜 기준 + 기간</td><td><b>서버</b></td><td>날짜 조건을 끄면 기간 무시</td></tr>
        <tr><td>상태 · 매칭 · 유입원</td><td><b>서버</b></td><td>—</td></tr>
        <tr><td>검색어</td><td>화면</td><td>이름 · 연락처 · 고객번호</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>매칭 3단계</h3>
    <table>
      <thead><tr><th>상태</th><th>조건</th><th>뜻</th></tr></thead>
      <tbody>
        <tr><td><b>매칭</b></td><td><code>customer_no</code> 가 있음</td><td>CRM 고객과 확정 연결됨</td></tr>
        <tr><td><b>확인필요</b></td><td><code>candidate_customer_no</code> 만 있음<br /><b>또는</b> 미매칭인데 <code>exam_date</code> 에 실제 날짜가 있음</td><td>후보는 있으나 확신이 없음 / 내원 이력이 있으니 어딘가에 붙어야 함</td></tr>
        <tr><td><b>접수</b></td><td>둘 다 없음</td><td>아직 CRM 에 붙지 않았음</td></tr>
      </tbody>
    </table>
    <div class="note">
      <div class="h">검사일이 있으면 자동으로 확인필요로 올림</div>
      <p>후보조차 없는데 <b>검사 기록이 있다</b>는 것은 CRM 어딘가에 이 사람이 있다는 뜻임.
         접수로 두면 아무도 안 봄. 그래서 <b>조회 시점에 승격</b>시켜 사람이 처리할 목록에 넣음.</p>
    </div>

    <h3>자동 매칭 규칙</h3>
    <table>
      <thead><tr><th>결과</th><th>조건</th></tr></thead>
      <tbody>
        <tr><td rowspan="2"><b>자동 매칭</b><br /><code>matched_by='CRM_Sync'</code></td>
            <td>이름 + 생일이 <b>유일하게</b> 일치 (월일 스왑 허용)</td></tr>
        <tr><td>전화 뒷8자리 또는 이메일로 <b>유일 후보</b> + 생일이 일치하거나 스왑</td></tr>
        <tr><td><b>확인필요</b></td><td>유일 후보인데 <b>생일이 다르거나 없음</b> — 근거를 <code>candidate_reason</code> 에 남김</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">월일 스왑을 허용하는 이유</div>
      <p>해외 접수는 날짜 표기가 <code>MM/DD</code> 와 <code>DD/MM</code> 로 섞여 들어옴.
         스왑을 허용하지 않으면 같은 사람이 계속 미매칭으로 남음.</p>
    </div>

    <h3>수동 매칭이 자동보다 강함</h3>
    <p>고객번호 칸을 눌러 팝업에서 확정하면 <code>matched_by</code> 에 <b>로그인 ID</b> 가 저장됨.
       이 매칭은 <b>행 수정·시트 재동기화에도 보존</b>됨.
       반면 <b>자동 매칭 행은 수정하면 매칭·스냅샷을 비워</b> 다음 CRM 동기화에서 다시 계산함 —
       사람이 고친 정보로 매칭이 달라질 수 있기 때문임.</p>

    <h3>조회는 마트만 읽음</h3>
    <table>
      <thead><tr><th>값</th><th>어디에 사나</th></tr></thead>
      <tbody>
        <tr><td>접수 원본</td><td><code>overseas_marketing_sheet</code> — 시트 이관분 + 수기 입력</td></tr>
        <tr><td>CRM 매칭</td><td><code>customer_no</code> · <code>matched_at</code></td></tr>
        <tr><td>파생값(상태·수술정보·비용·외래)</td><td><code>crm_snapshot</code> (JSON)</td></tr>
      </tbody>
    </table>
    <div class="note bad">
      <div class="h">⚠️ 화면은 CRM 을 실시간으로 보지 않음</div>
      <p>CRM 값은 <b>스냅샷</b>임. 갱신은 <b>[CRM 동기화] 버튼</b>으로만 일어남.
         CRM 에서 수술일이 바뀌어도 <b>동기화를 누르기 전까지 화면은 옛날 값</b>임.</p>
    </div>

    <h3>동기화가 지켜야 하는 것</h3>
    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>잠금</td><td>시트 동기화가 지나간 행은 <b>삭제 불가</b>(<code>locked_at</code>), 수정만 됨</td></tr>
        <tr><td>보존</td><td>시트 동기화는 <b>수기 행 · 화면에서 수정된 시트 행 · 수동 매칭 행</b>을 덮지 않음</td></tr>
        <tr><td>수기 행 표시</td><td><code>origin='manual'</code> + 추가자(<code>created_by</code> = 로그인 ID)</td></tr>
        <tr><td>수정 범위</td><td>시트 행은 <b>시트 원본 컬럼에 한정</b>해서만 고칠 수 있음</td></tr>
      </tbody>
    </table>

    <h3>컬럼 정의 — 41개</h3>
    <p>마트 <code>overseas_marketing_sheet</code> 한 테이블을 읽음.
       원천이 「업로드」 인 칸은 구글 시트나 수기 입력이고, <code>snapshot.xxx</code> 는 CRM 매칭 값임.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>No</td><td>—</td><td>—</td><td>—</td><td>행 번호(페이지 반영). 정렬 불가. CSV 는 순번</td></tr>
        <tr><td>2</td><td>관리</td><td>—</td><td><code>origin</code> · <code>locked_at</code></td><td>—</td><td>수정·삭제 버튼. <code>locked</code>(시트 행이거나 <code>locked_at</code> 있음)이면 삭제 비활성. CSV 제외</td></tr>
        <tr><td>3</td><td>상태</td><td><code>status</code></td><td><code>snapshot.status</code></td><td><code>RESERVATION.RESERVE_FLAG</code> → O 수술완료 · M/H/Z 검사예약 · F/E 외래문의</td><td>미취소(<code>RESERVE_STATE&lt;&gt;'C'</code>) 예약 중 O &gt; M &gt; 기타 우선. 미매칭이면 빈 값. 배지 색은 3종만</td></tr>
        <tr><td>4</td><td>등록일</td><td><code>registeredDate</code></td><td><code>synced_at</code> → 스냅샷 있으면 <code>snapshot.registeredDate</code></td><td><code>MIN(CUSTOM_HISTORY.Reg_Date)</code></td><td><b>조회 기준 「등록일」 필터는 <code>synced_at</code></b> 이고 표시값은 매칭 행이면 CRM 등록일로 바뀜 — 필터 범위 밖 날짜가 보일 수 있음</td></tr>
        <tr><td>5</td><td>매칭일</td><td><code>matchedDate</code></td><td><code>matched_at</code></td><td>—</td><td>자동(CRM 동기화) 또는 수동 확정 시각의 날짜. 미매칭이면 빈 값</td></tr>
        <tr><td>6</td><td>문의일</td><td><code>inquiryDate</code></td><td><code>inquiry_date</code></td><td>업로드 (시트 B열)</td><td>기본 정렬 키(내림차순). 시트의 <code>M/D</code> 는 A열 연도와 합쳐 <code>YYYY-MM-DD</code> 로 저장. 통계·예약통계의 「문의」 기준</td></tr>
        <tr><td>7</td><td>고객번호</td><td><code>customerNo</code></td><td><code>customer_no</code></td><td><code>CUSTOM.CUST_NUM</code></td><td>클릭하면 매칭 팝업. 없으면 <code>matchStatus</code> 에 따라 「확인필요」(<code>candidate_customer_no</code> 또는 검사일 있음) / 「미매칭」 배지. 정렬 시 빈 값은 매칭→확인필요→미매칭 순으로 뒤. CSV 는 텍스트</td></tr>
        <tr><td>8</td><td>이름</td><td><code>name</code></td><td><code>name</code></td><td>업로드 (시트 C열)</td><td>시트 이름이 비고 연락처·이메일만 있으면 <code>(미입력)</code>. 자동 매칭 키(이름+생일). CSV 만 마스킹</td></tr>
        <tr><td>9</td><td>국적</td><td><code>nationality</code></td><td><code>nationality</code></td><td>업로드 (시트 H열)</td><td><code>배트남</code> → <code>베트남</code> 보정. 예약통계의 국가그룹 분류 키</td></tr>
        <tr><td>10</td><td>성별</td><td><code>gender</code></td><td><code>gender</code></td><td>업로드 (시트 F열)</td><td>—</td></tr>
        <tr><td>11</td><td>생년월일</td><td><code>birthDate</code></td><td><code>dob</code></td><td>업로드 (시트 G열)</td><td>자유 문자열(30자). 자동 매칭에서 <code>CUSTOM.BIRTH_DAY</code> 와 대조(월일 스왑 허용)</td></tr>
        <tr><td>12</td><td>연락처</td><td><code>contact</code></td><td><code>contact</code></td><td>업로드 (시트 D열)</td><td>뒷 8자리로 <code>CUSTOM.CALL_NUM2</code> 후보 검색. CSV 는 <code>***-****-뒤4</code></td></tr>
        <tr><td>13</td><td>이메일</td><td><code>email</code></td><td><code>email</code></td><td>업로드 (시트 E열)</td><td>소문자로 <code>CUSTOM.EMAIL</code> 후보 검색. CSV 는 첫 글자만 남김</td></tr>
        <tr><td>14</td><td>민족</td><td><code>ethnicity</code></td><td><code>ethnicity</code></td><td>업로드 (시트 I열)</td><td>—</td></tr>
        <tr><td>15</td><td>직업</td><td><code>occupation</code></td><td><code>occupation</code></td><td>업로드 (시트 J열)</td><td>—</td></tr>
        <tr><td>16</td><td>콘택트렌즈</td><td><code>contactLens</code></td><td><code>contact_lens</code></td><td>업로드 (시트 K열)</td><td>—</td></tr>
        <tr><td>17</td><td>병력</td><td><code>medicalConditions</code></td><td><code>medical_conditions</code></td><td>업로드 (시트 L열)</td><td>TEXT. 셀은 한 줄로 잘라 보이고 전체는 툴팁</td></tr>
        <tr><td>18</td><td>복용약/알레르기</td><td><code>medicationAllergy</code></td><td><code>medication_allergy</code></td><td>업로드 (시트 M열)</td><td>TEXT</td></tr>
        <tr><td>19</td><td>출국예정</td><td><code>departureSchedule</code></td><td><code>departure_schedule</code></td><td>업로드 (시트 N열)</td><td>자유 문자열. 조회 기준 날짜로 쓸 때는 문자열 BETWEEN 이라 <code>YYYY-MM-DD</code> 로 적힌 값만 걸림</td></tr>
        <tr><td>20</td><td>검사일</td><td><code>examDate</code></td><td><code>exam_date</code> → 비어 있으면 <code>snapshot.examDate</code></td><td>업로드 (시트 O열) / <code>RESERVATION.RESERVE_DATE</code> (FLAG='M', 미취소, 최신 1건)</td><td><b>시트값 우선</b>. 자유 문자열이라 첫 <code>YYYY-MM-DD</code> 만 날짜로 해석. 미매칭인데 날짜가 있으면 확인필요로 승격</td></tr>
        <tr><td>21</td><td>수술일</td><td><code>surgeryDate</code></td><td><code>surgery_date</code> → 비어 있으면 <code>snapshot.surgeryDate</code></td><td>업로드 (시트 P열) / <code>OPERATIONDATA.OPERATION_DATE</code> (최신 1건)</td><td>시트값 우선. 검사일과 같은 해석 규칙</td></tr>
        <tr><td>22</td><td>수술비</td><td><code>surgeryCost</code></td><td><code>surgery_cost</code> → 스냅샷 있으면 <code>snapshot.surgeryCost</code> 로 <b>덮음</b></td><td>업로드 (시트 Q열) / <code>PrcItmLst</code> <code>PrcCod='O'</code> 수량×단가 합(<code>COSTPRICE.PayStt&lt;&gt;'a'</code>), 품목이 없으면 <code>COSTPRICE.COST_PRICE</code> 중 수술일과 같은 <code>COST_DATE</code> 합</td><td>매칭 행은 CRM 값(<code>₩1,234,000</code> 형식, 0 이면 빈 값), 미매칭 행은 시트 문자열 그대로. 정렬은 숫자 비교</td></tr>
        <tr><td>23</td><td>검사비</td><td><code>examCost</code></td><td><code>snapshot.examCost</code></td><td><code>PrcItmLst</code> <code>PrcCod='33'</code> 합, 품목이 없으면 <code>COSTPRICE</code> 중 수술일이 아닌 날 합</td><td>미매칭이면 빈 값. <code>costSource</code>(<code>prcitm</code>/<code>fallback</code>)는 응답에만 있음</td></tr>
        <tr><td>24</td><td>유입경로</td><td><code>channel</code></td><td><code>channel</code></td><td>업로드 (시트 R열)</td><td>예약통계의 채널 분류 키(홈페이지 · 이메일 · 카카오톡 · 왓츠앱 · Meta · DM · 전화 · 고객지원실 · 위챗 · 샤오홍슈 · 라인 · 크리에이트립 · 에이전시 · 페이스북)</td></tr>
        <tr><td>25</td><td>채널ID</td><td><code>channelId</code></td><td>—</td><td>—</td><td><b>항상 빈 값</b> — SQL 이 <code>''</code> 고정. 시트·마트에 대응 컬럼 없음. 확인 필요</td></tr>
        <tr><td>26</td><td>온라인채널</td><td><code>onlineChannel</code></td><td><code>online_channel</code></td><td>업로드 (시트 S열)</td><td>예약통계 몽골 그룹에서 「페이스」 포함 여부만 봄</td></tr>
        <tr><td>27</td><td>에이전트</td><td><code>agentChannel</code></td><td>—</td><td>—</td><td>항상 빈 값 — SQL 이 <code>''</code> 고정. 확인 필요</td></tr>
        <tr><td>28</td><td>에이전트ID</td><td><code>agentId</code></td><td>—</td><td>—</td><td>항상 빈 값 — SQL 이 <code>''</code> 고정. 확인 필요</td></tr>
        <tr><td>29</td><td>OP_R</td><td><code>operationRight</code></td><td><code>snapshot.operationRight</code></td><td><code>OPERATIONDATA.OPERATIONR</code> (최신 수술)</td><td>미매칭이면 빈 값</td></tr>
        <tr><td>30</td><td>OP_L</td><td><code>operationLeft</code></td><td><code>snapshot.operationLeft</code></td><td><code>OPERATIONDATA.OPERATIONL</code> (최신 수술)</td><td>미매칭이면 빈 값</td></tr>
        <tr><td>31</td><td>드림렌즈</td><td><code>dreamlens</code></td><td><code>snapshot.dreamlens</code></td><td><code>LENS</code>(SEQ=1) 의 <code>LENS_GUBUN</code>·<code>LENS_KIND</code> 를 <code>LENS_CFG.LENS_NM</code> 으로 바꿔 「구분명 종류명」</td><td>종류명이 없으면 구분명만</td></tr>
        <tr><td>32</td><td>소개</td><td><code>referral</code></td><td>—</td><td>—</td><td>항상 빈 값 — SQL 이 <code>''</code> 고정. 확인 필요</td></tr>
        <tr><td>33</td><td>외래1</td><td><code>outpatient1</code></td><td><code>snapshot.outpatient1</code></td><td><code>COSTPRICE.COST_MEMO</code> 를 <code>' / '</code> 로 이어붙임 — 외래 방문일 1번째</td><td>외래 방문일 = <code>RESERVATION</code> FLAG F/D · 미취소 · 수술일과 다른 날 · 그날 수납 &gt; 0. 방문일 오름차순 3건까지. 방문일(<code>outpatient1Date</code>)은 응답에만 있고 화면에 없음</td></tr>
        <tr><td>34</td><td>외래1비</td><td><code>outpatient1Cost</code></td><td><code>snapshot.outpatient1Cost</code></td><td><code>SUM(COSTPRICE.COST_PRICE)</code> — 방문일 당일</td><td><code>₩</code> 콤마 형식. 없으면 빈 값</td></tr>
        <tr><td>35</td><td>외래2</td><td><code>outpatient2</code></td><td><code>snapshot.outpatient2</code></td><td>외래1 과 같음 — 2번째 방문일</td><td>—</td></tr>
        <tr><td>36</td><td>외래2비</td><td><code>outpatient2Cost</code></td><td><code>snapshot.outpatient2Cost</code></td><td>외래1비 와 같음</td><td>—</td></tr>
        <tr><td>37</td><td>외래3</td><td><code>outpatient3</code></td><td><code>snapshot.outpatient3</code></td><td>외래1 과 같음 — 3번째 방문일</td><td>4번째 이후 방문은 안 보임</td></tr>
        <tr><td>38</td><td>외래3비</td><td><code>outpatient3Cost</code></td><td><code>snapshot.outpatient3Cost</code></td><td>외래1비 와 같음</td><td>—</td></tr>
        <tr><td>39</td><td>추가자</td><td><code>createdBy</code></td><td><code>created_by</code></td><td>—</td><td>수기 행은 로그인 ID. <code>GoogleSheet_Sync</code>·<code>CSV_Load</code>·NULL 은 <code>admin</code> 으로 표시</td></tr>
        <tr><td>40</td><td>수정자</td><td><code>modifiedBy</code></td><td><code>updated_by</code> (없으면 <code>created_by</code>)</td><td>—</td><td>같은 <code>admin</code> 치환 규칙</td></tr>
        <tr><td>41</td><td>비고</td><td><code>remark</code></td><td><code>remark</code></td><td>업로드 (시트 T열)</td><td>TEXT. 키워드 검색 대상</td></tr>
      </tbody>
    </table>
    <p>응답에는 있으나 화면 컬럼이 아닌 필드: <code>rowId</code>(<code>'sheet-'+행번호</code>) · <code>seq</code>(<code>sheet_row_number</code>, 수기 행은 1,000,000+) · <code>source</code>(항상 <code>manual</code>) · <code>origin</code> · <code>locked</code> · <code>candidateCustomerNo</code> · <code>candidateReason</code>(확인필요 배지 툴팁) · <code>matchedBy</code>(고객번호 툴팁) · <code>matchStatus</code> · <code>outpatient1~3Date</code> · <code>costSource</code>.
       매칭 필터·키워드 검색·정렬·페이지는 전부 <b>브라우저에서</b> 처리함. 서버 필터는 날짜 기준 6종(<code>dateType</code>) + 상태뿐임 — 명단 구분(<code>source</code>)·<code>unmatched</code> 는 파라미터로 받지만 <code>receptions.sql</code> 에서 쓰지 않음.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>CRM 값이 스냅샷</b></td><td>동기화 전까지 옛날 값</td><td>[CRM 동기화]를 눌러야 함. <b>자동 주기가 없음</b></td></tr>
        <tr><td><b>미매칭 잔량</b></td><td>접수 상태로 남는 행이 계속 있음</td><td>이름 표기·생일 결측이 원인. 수동 매칭으로 줄임</td></tr>
        <tr><td><b>전화 후보 탐색이 느림</b></td><td>동기화가 오래 걸림</td><td>뒷8자리 비교가 병목임 — 인덱스·전처리 여지가 있음</td></tr>
        <tr><td><b>잠금 행 삭제 불가</b></td><td>잘못 들어온 시트 행을 지울 수 없음</td><td>시트 재동기화로 되살아나는 것을 막기 위한 규칙임</td></tr>
        <tr><td><b>이름 표기 흔들림</b></td><td>같은 사람이 여러 철자로 들어옴</td><td>매칭 실패의 주원인. 원천 입력 규칙이 필요함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>CRM 동기화 자동화</td><td>지금은 수동 버튼임. 야간 배치로 돌릴지 — 매칭이 자동으로 바뀌는 것을 허용할지가 쟁점</td></tr>
        <tr><td>시트 동기화 종료</td><td>이관이 끝나면 버튼을 끔. <b>언제를 끝으로 볼지</b>가 정해지지 않았음</td></tr>
        <tr><td>미매칭 후속</td><td>끝내 안 붙는 건을 어떻게 처리할지 — 통계에서 빼는지, 별도 집단으로 세는지</td></tr>
        <tr><td>매칭 이력</td><td>행 출처(<code>origin</code>)·감사 컬럼(<code>updated_by</code>)·삭제 잠금(<code>locked_at</code>)은 <b>이미 있음</b>(V59). 남은 것은 <b>무엇을 근거로 확정했는지</b>와 그것을 화면에서 되짚는 경로임</td></tr>
      </tbody>
    </table>
  `,
}
