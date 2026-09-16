export default {
  s2: `
    <h3>백내장판 검사 원장</h3>
    <p><a href="exam-list.html">검사자 리스트</a>의 백내장 짝임. 레거시 <b>BCRM &gt; 통계(C) &gt; 통계_백내장_내원동기</b> 화면을
       옮긴 것이고, <b>레거시 화면 건수와 1:1 로 맞음</b>(2026-07 = 102).</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>상담 후속</td><td>검사 후 수술로 안 간 사람을 추림</td></tr>
        <tr><td>IOL 확인</td><td>적절 IOL 과 실제 수술 IOL 을 비교함 — 시력교정 리스트에 없는 축임</td></tr>
        <tr><td>분류 확인</td><td>백내장 / 중단 / 노안·FU / 기타 4분류로 모집단을 가름</td></tr>
        <tr><td>레거시 대조</td><td>건수가 레거시와 맞는지 봄</td></tr>
      </tbody>
    </table>

    <div class="note bad">
      <div class="h">⚠️ ADMIN 전용</div>
      <p>주민번호·연락처·주소가 한 표에 있음. 검사자 리스트와 같은 이유임.</p>
    </div>

    <div class="note">
      <div class="h">시력교정 리스트와 무엇이 다른가</div>
      <p>수술 관련 칸이 <b>IOL(안내렌즈)</b> 축임 — 적절 IOL(R/L) · 수술 IOL(R/L).
         시력교정은 「적절수술 / 수술방법」인데 백내장은 렌즈 종류가 핵심이라 그러함.
         가율 라벨도 「수술가율」이 아니라 <b>「영업가율」</b>임.</p>
    </div>
  `,

  s3: `
    <p>검사자 리스트와 같은 골격 — 기간·필터 한 줄 + 넓은 표.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="seg"><span class="on">일별</span><span>월별</span></span>
        <span class="ui">2026-07-01</span><span>~</span><span class="ui">2026-07-31</span>
        <span class="seg"><span>1주</span><span>2주</span><span>3주</span><span>4주</span><span>월별</span></span>
        <span class="ui">분류 전체 ▾</span>
        <span class="ui grow ph">고객명 · 차트번호 · 휴대전화</span>
        <span class="ui">↺ 초기화</span><span class="ui blue">🔍 조회</span><span class="ui green">⤓ CSV</span>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>No</th><th>검사일</th><th>분류</th><th>신/구환</th><th>진료구분</th><th>차트번호</th><th>고객명</th>
            <th>만나이</th><th>상담사</th><th>검안사</th><th>적절IOL(R)</th><th>적절IOL(L)</th>
            <th>수술일</th><th>수술IOL(R)</th><th>견적가</th><th>수납금액</th><th>검사중단</th><th>…</th>
          </tr></thead>
          <tbody>
            <tr>
              <td>1</td><td>2026-07-02</td><td><span class="pill g-icl">백내장</span></td>
              <td><span class="pill st-wait">구환</span></td><td>C_일반</td><td>2119004</td><td class="link">정○○</td>
              <td>62</td><td>이상담</td><td>김검안</td><td>Clareon Vivity</td><td>Clareon Vivity</td>
              <td>2026-07-15</td><td>T-Clareon Vivity</td><td>4,400,000</td><td>4,400,000</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>2</td><td>2026-07-03</td><td><span class="pill st-no">중단</span></td>
              <td><span class="pill st-wait">구환</span></td><td>C_일반</td><td>2201773</td><td class="link">한○○</td>
              <td>58</td><td class="ph">BS미지정</td><td>박검안</td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="invalid">Y</td><td class="ph">…</td>
            </tr>
            <tr>
              <td>3</td><td>2026-07-05</td><td><span class="pill st-wait">노안/FU</span></td>
              <td><span class="pill st-wait">구환</span></td><td>C_노안</td><td>2188220</td><td class="link">서○○</td>
              <td>54</td><td class="ph">BS미지정</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td>
              <td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">—</td><td class="ph">…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">분류가 <b>검안사·상담사 배정 조합</b>으로 갈린다는 점이 표에서 읽힘 — 5장 참조.</p>

    <h3>구성 요소</h3>
    <p>기간 모드 · 빠른 기간 · 검색 · 정렬 · 페이지네이션 · CSV 마스킹은
       <a href="exam-list.html">검사자 리스트 3장</a>과 같음. 다른 것은 <b>분류 필터</b>임.</p>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>분류</td><td>백내장 · 중단 · 노안/FU · 기타</td><td>모집단을 가르는 핵심 필터</td></tr>
        <tr><td>IOL 칸</td><td>적절 R/L · 수술 R/L</td><td>백내장 전용</td></tr>
      </tbody>
    </table>
  `,

  s4: `
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td><b>서버</b></td><td>기준 = 백내장 검사일. 월별 모드면 월 1일~말일. 최대 366일</td></tr>
        <tr><td>분류</td><td>화면</td><td>4분류</td></tr>
        <tr><td>검색어</td><td>화면</td><td>고객명 · 차트번호 · 휴대전화</td></tr>
      </tbody>
    </table>
  `,

  s5: `
    <h3>모집단 — 백내장검사 예약 내원</h3>
    <table>
      <thead><tr><th>조건</th><th>값</th></tr></thead>
      <tbody>
        <tr><td>예약 구분</td><td><code>RESERVE_FLAG='H'</code> (백내장검사)</td></tr>
        <tr><td>진료구분</td><td><code>JINRYO &lt;&gt; '3'</code> — C_재검사 제외</td></tr>
        <tr><td>예약 순번</td><td><code>SEQ &lt;&gt; 3</code> — 수술 당일 검사 제외</td></tr>
        <tr><td>단위</td><td><b>고객 × 검사일 1행</b></td></tr>
      </tbody>
    </table>
    <p>레거시 원장(BCRM 통계_백내장_내원동기)과 <b>1:1 로 맞음</b> — 2026-07 = 102행.</p>

    <div class="note bad">
      <div class="h">⚠️ 리스트 전체 행수를 백내장 검사수로 쓰면 안 됨</div>
      <p>월간 레포트의 백내장 검사수는 <b>분류 「백내장」 + 「중단」</b> 만임(2026-07 = 45 + 11 = <b>56</b>).
         나머지 46(노안/FU · 기타)은 <b>전체 검사수에만</b> 더해짐.
         종전에는 이 리스트가 56행만 실어 레거시 102행 중 46행이 화면에서 사라졌었고,
         2026-08-05 개편에서 전부 싣고 <b>분류로 가르는</b> 방식으로 바꿨음.</p>
    </div>

    <h3>분류 4종 — 검안사·상담사 조합으로 가름</h3>
    <table>
      <thead><tr><th>분류</th><th>검안사</th><th>상담사</th><th>레포트 검사수</th></tr></thead>
      <tbody>
        <tr><td>백내장</td><td>O</td><td>O</td><td><b>포함</b></td></tr>
        <tr><td>중단</td><td>O</td><td><code>BS0808</code>(BS미지정)</td><td><b>포함</b></td></tr>
        <tr><td>노안/FU</td><td>X</td><td><code>BS0808</code></td><td>제외 <span class="tag t-draft">레거시 라벨 'F/U'</span></td></tr>
        <tr><td>기타</td><td colspan="2">그 외 조합</td><td>제외</td></tr>
      </tbody>
    </table>

    <div class="note warn">
      <div class="h">라벨을 곧이곧대로 읽지 말 것</div>
      <p><b>'노안/FU'는 술후 추적이 아님</b> — 2026-07 40건 전부 과거 백내장 수술기록이 없고 수술 연계도 0건임
         (37건은 기간 내 백내장 검사기록 보유, 진료실도 전부 '노안/백내장 1·2·3').
         원천에 노안 전용 코드(C_노안원데이·C_노안레이저)로 잡힌 건은 0건이라 <b>'노안'은 정황 판단</b>임.<br />
         <b>'기타'를 '미검사'로 부르지 말 것</b> — 2026-01~07 총 11건 중 2건은 백내장 검사기록이 있음.</p>
    </div>

    <h3>원데이 판정</h3>
    <p>그 날 백내장검사 예약의 진료구분이 <b>C_원데이(7)·C_노안원데이(9)</b> 면 원데이임.
       시력교정의 원데이 판정(같은 날 검사OP 예약)과 규칙이 다름.</p>

    <h3>컬럼</h3>
    <p>검사 정보(검사일 · 분류 · 신구환 · 진료구분 · 검사시간) + 고객 정보 + 직원(상담사 · 상담의 · 검안사) +
       <b>IOL 4칸</b>(적절 R/L · 수술 R/L) + 수술(수술예약일 · 수술일 · 집도의) +
       금액(견적가 · <b>영업가율</b> · 수납금액) + 상태(수술불가 · 검사중단 · 취소사유 · 취소메모) +
       유입(예약경로 · 섹션 · 내원동기 3단 · 동기메모) + 인적(직업 · 국적 · 보험사 · 주민번호 · 주소).</p>
    <p>컬럼 ↔ DB 매핑은
       <a href="../db/검사자리스트-컬럼정의.md">db/검사자리스트-컬럼정의.md</a> 의 <b>【백내장판】</b> 절이 정본임.</p>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>분류 라벨의 오해</b></td><td>'노안/FU'·'기타'를 이름대로 읽으면 틀림</td><td>판정 규칙을 봄(5장)</td></tr>
        <tr><td><b>전체 행수 ≠ 검사수</b></td><td>102 vs 56</td><td>분류로 가름. <a href="all-exam-list.html">전체 검사자 리스트</a>는 이걸 토글로 만들어 뒀음</td></tr>
        <tr><td><b>늦은 입력 누락</b></td><td>있었을 검사가 없음</td><td><a href="exam-list.html">검사자 리스트 10장</a>과 같은 갭임</td></tr>
        <tr><td><b>신/구환이 기간에 흔들림</b></td><td>—</td><td>정의상 그러함</td></tr>
        <tr><td><b>T-1 신선도</b></td><td>—</td><td>—</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>'노안/FU' 라벨</td><td>실측과 이름이 안 맞음. 바꾸면 레거시 라벨(F/U)과 어긋남</td></tr>
        <tr><td>'기타' 정체</td><td>11건 중 2건이 검사기록 보유. 남은 9건이 무엇인지 미규명</td></tr>
        <tr><td>IOL 표기 정규화</td><td>렌즈명이 자유 표기라 분류(다초점·프리미엄·단초점)가 문자열 판정에 의존함</td></tr>
      </tbody>
    </table>

    <h3>이미 조사된 것</h3>
    <p><a href="../점검/인수인계_2026-08-05_백내장검사.md">백내장 검사 개편 인수인계</a> —
       모집단 102 · 분류 4종 · 아이리더. §1~§5 배경·함정과 부록A 검사수 점검 이력.</p>
  `,
}
