export default {
  s2: `
    <h3>레거시 구글시트를 그대로 옮긴 표</h3>
    <p>해외 예약통계는 오래 <b>구글 시트</b>로 관리됐음. 국가그룹 × 채널 × 지표가 가로로 길게 늘어선 표인데,
       그 <b>그룹·채널 구성을 그대로</b> 화면으로 옮겼음. 시트를 쓰던 사람이 그대로 읽을 수 있어야 하기 때문임.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>국가별 채널 확인</td><td>영미·중화·베트남·몽골 각각 어느 채널로 들어오는지 봄</td></tr>
        <tr><td>문의 → 예약 전환</td><td>채널마다 문의와 예약이 짝으로 붙어 있음</td></tr>
        <tr><td>수치 보정</td><td>자동 집계가 틀린 칸을 <b>화면에서 직접 고침</b></td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ 이 화면은 셀을 직접 고칠 수 있음</div>
      <p>대시보드에서 <b>집계값을 사람이 덮어쓸 수 있는</b> 거의 유일한 화면임.
         해외 문의는 카톡·왓츠앱·위챗처럼 시스템에 안 남는 경로가 많아, 자동 집계만으로는 채워지지 않음.
         <b>일 행에서만</b> 고칠 수 있고 월·주 행은 합계라 잠겨 있음.</p>
    </div>
  `,

  s3: `
    <p>툴바(연도 · 월 · 보기 단위) + 가로로 매우 긴 표. 국가그룹마다 머리글 색이 다름.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">2026 ▾</span>
        <span class="ui">8월 ▾</span>
        <span class="seg"><span>월간</span><span>주간</span><span>주차</span><span class="on">일간</span><span>전체</span></span>
        <span class="grow ph" style="font-size:11px">2026-08-23까지 레거시 시트 숫자 · 이후는 접수리스트 자동 집계 · 일 행은 셀 클릭으로 수정</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead>
            <tr>
              <th rowspan="2">일자</th>
              <th colspan="5" style="background:#f1f5f9">총</th>
              <th colspan="4" style="background:#eff6ff">영미</th>
              <th colspan="4" style="background:#fff1f2">중화</th>
              <th>…</th>
            </tr>
            <tr>
              <th>총 문의</th><th>총 예약</th><th>총 검사</th><th>총 수술</th><th>총 외래</th>
              <th>총 문의</th><th>총 예약</th><th>홈페이지</th><th>예약</th>
              <th>총 문의</th><th>총 예약</th><th>위챗</th><th>예약</th>
              <th>…</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>8/1 (금)</td><td>12</td><td>7</td><td>5</td><td>2</td><td>3</td><td>4</td><td>2</td><td>2</td><td>1</td><td>6</td><td>4</td><td>3</td><td>2</td><td class="ph">…</td></tr>
            <tr><td>8/2 (토)</td><td>8</td><td>5</td><td>3</td><td>1</td><td>2</td><td>3</td><td>2</td><td>1</td><td>1</td><td>4</td><td>2</td><td>2</td><td>1</td><td class="ph">…</td></tr>
            <tr><td>8/3 (일)</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">국가그룹 6개(총·영미·중화·베트남·몽골·에이전시)가 색으로 갈림. 채널마다 <b>문의·예약이 짝</b>으로 붙음.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>보기 단위</td><td>월간 · 주간 · 주차 · 일간 · 전체</td><td><a href="reservation-stats-system.html">예약통계_시력교정</a>과 <b>같은 5단 구성</b></td></tr>
        <tr><td>연도 · 월</td><td>선택</td><td>주간·일간·전체는 월에 종속됨</td></tr>
        <tr><td>표</td><td>국가그룹 6 × 채널 × 지표</td><td>가로 스크롤. 그룹마다 머리글 색</td></tr>
        <tr><td>셀 수정</td><td>일 행만</td><td>클릭 → 입력 → 저장. 월·주 행은 <b>합계라 잠김</b></td></tr>
        <tr><td>안내 문구</td><td>툴바 우측</td><td>전환 시점과 수정 가능 여부를 화면이 직접 말함</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">주간과 주차가 둘 다 있음</div>
      <p><b>주간</b> = 그 달의 달력 주(1~5주), <b>주차</b> = ISO 연간 주차.
         시트 시절에는 달력 주로 봤고, 다른 통계 화면은 ISO 주차를 씀.
         둘을 다 두어 <b>과거 방식과 현재 방식을 모두</b> 볼 수 있게 했음.</p>
    </div>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>연도</td><td><b>서버</b></td><td>—</td></tr>
        <tr><td>월</td><td>화면</td><td>주간·일간·전체 보기에서만 의미가 있음</td></tr>
        <tr><td>보기 단위</td><td>화면</td><td>일별 값을 받아 <b>화면에서 묶음</b> — 재조회하지 않음</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">모든 보기가 같은 일별 데이터를 묶은 것임</div>
      <p>월간·주간·주차·전체는 전부 <b>일 값의 합</b>임. 그래서 일 행을 고치면
         상위 모든 행이 함께 바뀜 — 합계를 따로 저장하지 않기 때문임.</p>
    </div>
  `,

  s5: `
    <h3>국가그룹 6개와 채널</h3>
    <table>
      <thead><tr><th>그룹</th><th>채널</th></tr></thead>
      <tbody>
        <tr><td>총</td><td>채널 없음 — 문의 · 예약 · 검사 · 수술 · 외래 합계만</td></tr>
        <tr><td>영미</td><td>홈페이지 · 이메일 · 카카오톡 · 왓츠앱 · Meta-DM · 전화 · 컨택센터 · 기타</td></tr>
        <tr><td>중화</td><td>홈/메일/전화 · 위챗 · 샤오홍슈 · 라인 · Insta/Tiktok · Creatrip · 컨택센터 · 기타</td></tr>
        <tr><td>베트남</td><td>메타 · 전화 · 기타</td></tr>
        <tr><td>몽골</td><td>페북 · 인스타 · 전화 · 기타</td></tr>
        <tr><td>에이전시</td><td>문의 · Creatrip</td></tr>
      </tbody>
    </table>
    <p>총 그룹을 뺀 5개 그룹은 각각 <b>총 문의 · 총 예약 + (채널별 문의·예약) + 검사 · 수술 · 외래</b> 구성임.
       채널 목록이 그룹마다 다른 것은 <b>시트가 그랬기 때문</b>임 — 지역마다 실제로 쓰는 메신저가 다름.</p>

    <h3>데이터 출처가 날짜로 갈림</h3>
    <table>
      <thead><tr><th>구간</th><th>출처</th><th>성격</th></tr></thead>
      <tbody>
        <tr><td><b>2026-08-23 까지</b></td><td>레거시 구글시트 숫자</td><td>이관된 고정값</td></tr>
        <tr><td>그 이후</td><td><a href="overseas-marketing-receptions.html">접수리스트</a> 자동 집계</td><td>매일 계산됨</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">전환 시점(cutover)은 서버가 알려줌</div>
      <p>날짜를 화면에 박아 두지 않고 API 응답의 <code>cutover</code> 값을 그대로 문구에 넣음.
         전환일이 바뀌어도 화면을 고칠 필요가 없음.</p>
    </div>

    <h3>수동 보정</h3>
    <table>
      <thead><tr><th>규칙</th><th>내용</th></tr></thead>
      <tbody>
        <tr><td>대상</td><td><b>일 행만</b>. 월·주·전체 행은 합계라 수정 불가</td></tr>
        <tr><td>저장 단위</td><td>(날짜, 그룹키, 지표키) 한 칸</td></tr>
        <tr><td>우선순위</td><td>수동 입력값이 자동 집계보다 <b>우선</b></td></tr>
      </tbody>
    </table>
    <div class="note">
      <div class="h">왜 수동 보정이 필요한가</div>
      <p>해외 문의는 <b>왓츠앱·위챗·샤오홍슈처럼 시스템에 안 남는 경로</b>가 많음.
         접수리스트에 등록되지 않은 문의는 자동 집계가 셀 수 없으므로, 담당자가 아는 값을 직접 넣음.
         자동 집계만 믿으면 문의 수가 실제보다 적게 나옴.</p>
    </div>

    <h3>컬럼 정의 — 공통 지표 8개</h3>
    <p>일별 값만 받고 월간 · 주간 · 합계는 화면이 더함.
       셀 값은 수동 수정 &gt; 레거시 시드 &gt; 자동 집계 순으로 정해짐.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>구분</td><td><code>buckets[].bucket</code> (<code>YYYY-MM-DD</code>)</td><td><code>overseas_reservation_stats.stat_date</code> / 접수 행의 날짜</td><td>—</td><td>행 라벨은 프론트가 만듦 — 월간 <code>N월</code> · 주간 <code>N주</code>(달력 주, 월요일 시작) · 주차 <code>N주차</code>(ISO) · 일간 <code>M/D (요일)</code> · 전체 = 주 행 + 일 행. 일 행만 셀 클릭 수정</td></tr>
        <tr><td>2</td><td>총 문의</td><td><code>values["그룹.inq"]</code></td><td><code>value</code> (<code>metric_key='inq'</code>) / 자동: <code>inquiry_date</code></td><td>시드 구간 업로드(레거시 시트) / 자동: 업로드 (시트 B열)</td><td>자동 = 문의일 당일 그 그룹 접수 행 수. 총 그룹은 자동 구간에서 5개 그룹 합(저장값 없을 때), 시드 구간은 시트값 그대로</td></tr>
        <tr><td>3</td><td>총 예약</td><td><code>values["그룹.rsv"]</code></td><td><code>value</code> (<code>'rsv'</code>) / 자동: <code>inquiry_date</code> + <code>exam_date</code>·<code>snapshot.examDate</code></td><td>시드 업로드 / 자동: 업로드 (시트 O열) 또는 <code>RESERVATION.RESERVE_DATE</code></td><td>자동 = 문의 행 중 <b>검사일이 있는 행</b>을 문의일 당일에 셈(예약일 개념 없음). 검사일이 나중에 채워지면 과거 문의일 값이 올라감</td></tr>
        <tr><td>4</td><td>채널명 (문의)</td><td><code>values["그룹.채널_inq"]</code></td><td><code>value</code> (<code>'&lt;채널&gt;_inq'</code>) / 자동: <code>channel</code> · <code>online_channel</code> · <code>nationality</code></td><td>시드 업로드 / 자동: 업로드 (시트 R·S·H열)</td><td>화면 헤더는 채널 이름(홈페이지 · 위챗 …). 자동 = 총 문의를 채널 키로 나눈 것. 채널 키 규칙은 다음 표</td></tr>
        <tr><td>5</td><td>예약 (채널별)</td><td><code>values["그룹.채널_rsv"]</code></td><td><code>value</code> (<code>'&lt;채널&gt;_rsv'</code>) / 자동: 위 + 검사일</td><td>시드 업로드 / 자동: 위와 같음</td><td>각 채널 문의 열 오른쪽의 「예약」 열. 자동 = 총 예약을 채널 키로 나눈 것</td></tr>
        <tr><td>6</td><td>검사 (총 검사)</td><td><code>values["그룹.exam"]</code></td><td><code>value</code> (<code>'exam'</code>) / 자동: <code>exam_date</code> → 비어 있으면 <code>snapshot.examDate</code></td><td>시드 업로드 / 자동: 업로드 (시트 O열) 또는 <code>RESERVATION.RESERVE_DATE</code> (FLAG='M', 미취소, 최신)</td><td>자동 = <b>검사일 당일</b>에 셈(문의일 아님). 자유 문자열에서 첫 <code>YYYY-MM-DD</code> 만 해석</td></tr>
        <tr><td>7</td><td>수술 (총 수술)</td><td><code>values["그룹.surgery"]</code></td><td><code>value</code> (<code>'surgery'</code>) / 자동: <code>surgery_date</code> → 비어 있으면 <code>snapshot.surgeryDate</code></td><td>시드 업로드 / 자동: 업로드 (시트 P열) 또는 <code>OPERATIONDATA.OPERATION_DATE</code> (최신)</td><td>자동 = 수술일 당일에 셈</td></tr>
        <tr><td>8</td><td>외래 (총 외래)</td><td><code>values["그룹.outpatient"]</code></td><td><code>value</code> (<code>'outpatient'</code>) / 자동: <code>snapshot.status</code></td><td>시드 업로드 / 자동: <code>RESERVATION.RESERVE_FLAG</code> F/E → 「외래문의」</td><td>자동 = 스냅샷 상태가 <code>외래문의</code> 인 접수 행을 <b>문의일 당일</b>에 셈. 미매칭 행은 상태가 없어 0</td></tr>
      </tbody>
    </table>
    <p>저장 테이블 <code>overseas_reservation_stats</code> 는 PK <code>(stat_date, group_key, metric_key)</code> 에 <code>value</code> · <code>source</code>(<code>seed</code>/<code>manual</code>) · <code>updated_by</code> · <code>updated_at</code> 임.
       시드는 <code>V66</code> 마이그레이션이 2026-03-01~08-23 일별 값을 <code>ON CONFLICT DO NOTHING</code> 으로 넣음. 자동 집계 값은 저장하지 않고 조회 때마다 계산함.</p>

    <h3>컬럼 정의 — 그룹·채널 키 31개</h3>
    <p>헤더 1단이 그룹, 2단이 채널임.
       분류는 CRM 이 아니라 업로드된 국적 · 유입경로 · 온라인채널로 정함.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>총</td><td><code>total.*</code></td><td><code>group_key='total'</code></td><td>—</td><td>채널 열 없음(총 문의 · 총 예약 · 총 검사 · 총 수술 · 총 외래 5열). 자동 구간은 5개 그룹 합</td></tr>
        <tr><td>2</td><td>영미</td><td><code>anglo.*</code></td><td><code>group_key='anglo'</code></td><td>—</td><td>분류 기본값 — 아래 어느 그룹에도 안 걸리면 영미</td></tr>
        <tr><td>3</td><td>영미 › 홈페이지</td><td><code>anglo.homepage_inq</code> · <code>_rsv</code></td><td><code>metric_key='homepage_*'</code></td><td>—</td><td>유입경로 = <code>홈페이지</code></td></tr>
        <tr><td>4</td><td>영미 › 이메일</td><td><code>anglo.email_*</code></td><td><code>'email_*'</code></td><td>—</td><td>유입경로 = <code>이메일</code></td></tr>
        <tr><td>5</td><td>영미 › 카카오톡</td><td><code>anglo.kakao_*</code></td><td><code>'kakao_*'</code></td><td>—</td><td>유입경로 = <code>카카오톡</code></td></tr>
        <tr><td>6</td><td>영미 › 왓츠앱</td><td><code>anglo.whatsapp_*</code></td><td><code>'whatsapp_*'</code></td><td>—</td><td>유입경로 = <code>왓츠앱</code></td></tr>
        <tr><td>7</td><td>영미 › Meta-DM</td><td><code>anglo.meta_dm_*</code></td><td><code>'meta_dm_*'</code></td><td>—</td><td>유입경로 = <code>Meta</code> 또는 <code>DM</code></td></tr>
        <tr><td>8</td><td>영미 › 전화</td><td><code>anglo.phone_*</code></td><td><code>'phone_*'</code></td><td>—</td><td>유입경로 = <code>전화</code></td></tr>
        <tr><td>9</td><td>영미 › 컨택센터</td><td><code>anglo.contact_center_*</code></td><td><code>'contact_center_*'</code></td><td>—</td><td>유입경로 = <code>고객지원실</code></td></tr>
        <tr><td>10</td><td>영미 › 기타</td><td><code>anglo.etc_*</code></td><td><code>'etc_*'</code></td><td>—</td><td>위에 없는 유입경로 전부(빈 값 포함)</td></tr>
        <tr><td>11</td><td>중화</td><td><code>china.*</code></td><td><code>group_key='china'</code></td><td>—</td><td>국적 ∈ {중국, 대만, 홍콩, 마카오}. 국적이 비어 있어도 유입경로가 위챗·샤오홍슈·라인이면 중화. 크리에이트립 유입 + 중화 국적도 여기</td></tr>
        <tr><td>12</td><td>중화 › 홈/메일/전화</td><td><code>china.web_mail_phone_*</code></td><td><code>'web_mail_phone_*'</code></td><td>—</td><td>유입경로 = <code>홈페이지</code> · <code>이메일</code> · <code>전화</code> 합침</td></tr>
        <tr><td>13</td><td>중화 › 위챗</td><td><code>china.wechat_*</code></td><td><code>'wechat_*'</code></td><td>—</td><td>유입경로 = <code>위챗</code></td></tr>
        <tr><td>14</td><td>중화 › 샤오홍슈</td><td><code>china.xiaohongshu_*</code></td><td><code>'xiaohongshu_*'</code></td><td>—</td><td>유입경로 = <code>샤오홍슈</code></td></tr>
        <tr><td>15</td><td>중화 › 라인</td><td><code>china.line_*</code></td><td><code>'line_*'</code></td><td>—</td><td>유입경로 = <code>라인</code></td></tr>
        <tr><td>16</td><td>중화 › Insta/Tiktok</td><td><code>china.insta_tiktok_*</code></td><td><code>'insta_tiktok_*'</code></td><td>—</td><td>유입경로 = <code>Meta</code> 또는 <code>DM</code>(틱톡 값은 따로 안 봄)</td></tr>
        <tr><td>17</td><td>중화 › Creatrip</td><td><code>china.creatrip_*</code></td><td><code>'creatrip_*'</code></td><td>—</td><td>유입경로 = <code>크리에이트립</code> + 중화 국적</td></tr>
        <tr><td>18</td><td>중화 › 컨택센터</td><td><code>china.contact_center_*</code></td><td><code>'contact_center_*'</code></td><td>—</td><td>유입경로 = <code>고객지원실</code></td></tr>
        <tr><td>19</td><td>중화 › 기타</td><td><code>china.etc_*</code></td><td><code>'etc_*'</code></td><td>—</td><td>나머지</td></tr>
        <tr><td>20</td><td>베트남</td><td><code>vietnam.*</code></td><td><code>group_key='vietnam'</code></td><td>—</td><td>국적 = <code>베트남</code>(<code>배트남</code> 포함)</td></tr>
        <tr><td>21</td><td>베트남 › 메타</td><td><code>vietnam.meta_*</code></td><td><code>'meta_*'</code></td><td>—</td><td>유입경로 = <code>Meta</code> 또는 <code>DM</code></td></tr>
        <tr><td>22</td><td>베트남 › 전화</td><td><code>vietnam.phone_*</code></td><td><code>'phone_*'</code></td><td>—</td><td>유입경로 = <code>전화</code></td></tr>
        <tr><td>23</td><td>베트남 › 기타</td><td><code>vietnam.etc_*</code></td><td><code>'etc_*'</code></td><td>—</td><td>나머지</td></tr>
        <tr><td>24</td><td>몽골</td><td><code>mongolia.*</code></td><td><code>group_key='mongolia'</code></td><td>—</td><td>국적 = <code>몽골</code></td></tr>
        <tr><td>25</td><td>몽골 › 페북</td><td><code>mongolia.facebook_*</code></td><td><code>'facebook_*'</code></td><td>—</td><td>온라인채널에 <code>페이스</code> 포함 또는 유입경로 = <code>페이스북</code>. 유일하게 <code>online_channel</code>(시트 S열)을 보는 분류</td></tr>
        <tr><td>26</td><td>몽골 › 인스타</td><td><code>mongolia.insta_*</code></td><td><code>'insta_*'</code></td><td>—</td><td>유입경로 = <code>Meta</code> 또는 <code>DM</code></td></tr>
        <tr><td>27</td><td>몽골 › 전화</td><td><code>mongolia.phone_*</code></td><td><code>'phone_*'</code></td><td>—</td><td>유입경로 = <code>전화</code></td></tr>
        <tr><td>28</td><td>몽골 › 기타</td><td><code>mongolia.etc_*</code></td><td><code>'etc_*'</code></td><td>—</td><td>나머지</td></tr>
        <tr><td>29</td><td>에이전시</td><td><code>agency.*</code></td><td><code>group_key='agency'</code></td><td>—</td><td>유입경로 = <code>에이전시</code>, 또는 <code>크리에이트립</code> 인데 국적이 중화권이 아님. 국적보다 먼저 판정</td></tr>
        <tr><td>30</td><td>에이전시 › 문의</td><td><code>agency.direct_*</code></td><td><code>'direct_*'</code></td><td>—</td><td>크리에이트립이 아닌 에이전시 유입 전부</td></tr>
        <tr><td>31</td><td>에이전시 › Creatrip</td><td><code>agency.creatrip_*</code></td><td><code>'creatrip_*'</code></td><td>—</td><td>유입경로 = <code>크리에이트립</code></td></tr>
      </tbody>
    </table>
    <p>분류 규칙은 서버 주석에 「초안 — 실측 검증 후 조정 예정」 으로 남아 있음. 규칙에 없는 유입경로 값(예: 영미 그룹에 <code>페이스북</code>·<code>인스타그램</code> 으로 적힌 행)은 전부 「기타」 로 몰림 — 실제 시트 값 분포는 확인 필요.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>구간 경계</b></td><td>2026-08-23 전후로 숫자의 성격이 다름</td><td>안내 문구를 함께 읽음. 경계를 걸친 비교는 조심</td></tr>
        <tr><td><b>수동 입력 의존</b></td><td>담당자가 안 넣으면 문의가 적게 나옴</td><td>메신저 문의를 접수리스트에 올리는 것이 근본 해결임</td></tr>
        <tr><td><b>수정 이력 없음</b></td><td>누가 언제 무엇을 고쳤는지 화면에서 모름</td><td>—</td></tr>
        <tr><td><b>표가 매우 넓음</b></td><td>가로 스크롤이 길어짐</td><td>시트 구성을 그대로 따른 결과임</td></tr>
        <tr><td><b>주간·주차 혼용</b></td><td>두 주 개념이 한 화면에 있음</td><td>의도된 것임. 어느 쪽을 보는지 늘 확인해야 함</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>수정 이력·권한</td><td>표에 <code>updated_by</code>·<code>updated_at</code> 이 있어 <b>마지막으로 고친 사람과 시각은 남음</b>. 다만 <b>직전 1건만</b> 남고 화면에서 볼 수 없음 — 값이 바뀐 내력을 쌓을지, 권한을 좁힐지</td></tr>
        <tr><td>자동 집계 커버리지</td><td>메신저 문의를 어떻게 시스템에 남길지. 안 풀리면 수동 보정이 영구화됨</td></tr>
        <tr><td>채널 목록 변경</td><td>새 메신저가 뜨면 그룹마다 칼럼을 늘려야 함. 지금은 코드 수정임</td></tr>
        <tr><td><a href="overseas-marketing-statistics.html">통계</a>와의 관계</td><td>같은 해외 유입을 두 화면이 각각 셈. 문의 수가 다를 수 있고 <b>어느 쪽이 정본인지 정해지지 않았음</b></td></tr>
      </tbody>
    </table>
  `,
}
