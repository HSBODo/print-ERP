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

    <p>같은 표 안에서도 % 의 뜻이 다르므로 <b>세로로 더해 100% 가 되는 묶음</b>이 무엇인지 확인해야 함 — 아래 컬럼 정의의 비고에 칼럼마다 분모를 적음. 값이 0 이면 '-', 아니면 「N (P%)」 꼴이고 % 는 정수 반올림임.</p>

    <div class="note bad">
      <div class="h">⚠️ PIOL 합계는 유형별 합산이 아님</div>
      <p>PIOL 합계는 원천이 세어 준 <b>DISTINCT 환자 수</b>임.
         <code>icl + tIcl + kpl + tKpl + viva</code> 로 더하면 <b>양안에 다른 렌즈를 넣은 환자가 이중 계상</b>됨
         — 2026-07 실측: 합산 168 vs 실인원 <b>148</b>.
         표에서 렌즈 5종을 더해 PIOL 합계와 안 맞는 것은 <b>정상</b>임.</p>
    </div>

    <h3>컬럼 정의 — 28개</h3>
    <p>조회 경로는 마트 <code>mart_surgery_daily</code> 임.
       주 · 월 · 전체 행과 % 는 화면이 일별 값을 더해 계산함.</p>
    <table>
      <thead><tr><th>#</th><th>화면 라벨</th><th>응답 필드</th><th>마트 컬럼</th><th>CRM 원천</th><th>비고</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>구분</td><td><code>date</code>(행 키)</td><td><code>dt</code></td><td>수술일 — <code>OPERATION_DATE</code> · <code>OPERATIONR/L_DATE</code> · <code>REOP_DATE</code></td><td>일별 = 「N일 (요일)」, 주별 = 「N주」(달력 주, 일요일 시작), 주차 = 「NN주차」 + 기간(ISO 8601, 월~일, 한 해 전체), 월별/전체 = 「N월」/「TOTAL」/「YYYY년」. 전부 0 인 행은 회색</td></tr>
        <tr><td>2</td><td>합계</td><td><code>total</code></td><td><code>total</code></td><td>시력교정 인원 + 백내장 안수 + 재수술 포함건</td><td>건수만. 같은 사람·날이 수술과 재수술에 함께 잡히는 중복은 걸러내지 않음(레포트와 같은 기준)</td></tr>
        <tr><td>3</td><td>시력교정</td><td><code>visionPatients</code></td><td><code>vision_patients</code></td><td><code>list_surgery</code> 시력교정 행의 사람×수술일 DISTINCT ← <code>OPERATIONDATA</code></td><td>건수만. <b>4 · 5 · 6 · 12 · 13 · 14 의 분모</b>. 주/월 값은 일별 DISTINCT 의 합</td></tr>
        <tr><td>4</td><td>스마일</td><td><code>smile</code></td><td><code>smile</code></td><td>시력교정 눈 시술명 SMILE(<code>op_type='smile'</code>) 환자 DISTINCT</td><td>÷ 시력교정</td></tr>
        <tr><td>5</td><td>스마일프로</td><td><code>smilePro</code></td><td><code>smile_pro</code></td><td>SMILE Pro · SMILEpro · SMILE PRO</td><td>÷ 시력교정</td></tr>
        <tr><td>6</td><td>PIOL 합계</td><td><code>piolPatients</code></td><td><code>piol_patients</code></td><td><code>op_type</code> ∈ icl · tIcl · kpl · tKpl · viva 인 환자 DISTINCT</td><td>÷ 시력교정. 5종 합이 아니라 실인원(위 노트). 대표유형 규칙이라 현재는 7~11 의 합과 같음</td></tr>
        <tr><td>7</td><td>ICL</td><td><code>icl</code></td><td><code>icl</code></td><td>ICL · IPCL · ARF · ART · ARTIFLEX · GLAZE · ECHO — 환자당 대표유형(우안 우선) 1건</td><td>건수만, % 없음</td></tr>
        <tr><td>8</td><td>T-ICL</td><td><code>tIcl</code></td><td><code>t_icl</code></td><td>T-ICL · T-IPCL · T-GLAZE · T-ECHO — 대표유형</td><td>건수만</td></tr>
        <tr><td>9</td><td>KPL</td><td><code>kpl</code></td><td><code>kpl</code></td><td>KPL (T-KPL 제외) — 대표유형</td><td>건수만</td></tr>
        <tr><td>10</td><td>T-KPL</td><td><code>tKpl</code></td><td><code>t_kpl</code></td><td>T-KPL — 대표유형</td><td>건수만</td></tr>
        <tr><td>11</td><td>VIVA</td><td><code>viva</code></td><td><code>viva</code></td><td>VIVA — 대표유형</td><td>건수만</td></tr>
        <tr><td>12</td><td>PRESBYOND</td><td><code>presbyond</code></td><td><code>presbyond</code></td><td>PRESBYOND (판정 1순위 — Mono+PRESBYOND 도 여기) 환자 DISTINCT</td><td>÷ 시력교정. 노랑 밴드, PIOL 밖 독립. 월별 시드 2026-04 이전은 0(미백필)</td></tr>
        <tr><td>13</td><td>라식계</td><td><code>lasik</code></td><td><code>lasik</code></td><td>FLAP LIFT · OPTI · iFS · VISU · fs200 · Micro+ · Hybrid</td><td>÷ 시력교정</td></tr>
        <tr><td>14</td><td>라섹계 합계</td><td><code>lasekEx</code> + <code>lasekRed</code></td><td><code>lasek_ex</code> + <code>lasek_red</code></td><td>시술명에 EYECLE 이 있으면서 EX500 / RED 를 포함하는 환자</td><td>÷ 시력교정. 프론트 합산. <b>응답의 <code>lasek</code>(라섹계 유형)은 이 표에서 쓰지 않음</b> — EYECLE+EX500 · EYECLE+RED 조합만 셈</td></tr>
        <tr><td>15</td><td>라섹계 EX</td><td><code>lasekEx</code></td><td><code>lasek_ex</code></td><td>EYECLE ∧ EX500</td><td>÷ 라섹계 합계</td></tr>
        <tr><td>16</td><td>라섹계 Red</td><td><code>lasekRed</code></td><td><code>lasek_red</code></td><td>EYECLE ∧ RED</td><td>÷ 라섹계 합계</td></tr>
        <tr><td>17</td><td>재수술 합계</td><td><code>reoperation</code></td><td><code>reoperation</code></td><td><code>list_reoperation</code> 의 포함 판정 건 ← <code>RE_OPERATION</code></td><td>건 단위(사람 아님). 저장 판정 우선 — 뷰가 조회 시점에 <code>reoperation_decision</code> 을 조인하고, 판정 저장 후 마트를 다시 적재함</td></tr>
        <tr><td>18</td><td>재수술 레이저</td><td><code>reopLaser</code></td><td><code>reop_laser</code></td><td>포함건 중 <code>is_lens = false</code></td><td>÷ 재수술 합계</td></tr>
        <tr><td>19</td><td>재수술 렌즈</td><td><code>reopLens</code></td><td><code>reop_lens</code></td><td>포함건 중 <code>is_lens = true</code> — 자바 <code>ReoperationOverlay</code> 패턴 remo · exch · icl · kpl · arf · art · evo · echo · glaze · precizon · lisa · gemetric · encla</td><td>÷ 재수술 합계. 수술자 리스트의 프론트 판정 목록에는 <code>kpl</code> 이 없어 KPL 재수술만큼 어긋날 수 있음 — 확인 필요</td></tr>
        <tr><td>20</td><td>엑스트라</td><td><code>xtra</code></td><td><code>xtra</code></td><td>시술명에 <code>+X</code> 포함 환자 DISTINCT</td><td>건수만. 옵션 축 — 유형과 별개라 세로합이 100% 가 되지 않음</td></tr>
        <tr><td>21</td><td>퍼스널</td><td><code>personal</code></td><td><code>personal</code></td><td><code>P.E</code></td><td>건수만. 옵션 축</td></tr>
        <tr><td>22</td><td>콘트라</td><td><code>contra</code></td><td><code>contra</code></td><td><code>CONT</code></td><td>건수만. 옵션 축</td></tr>
        <tr><td>23</td><td>웨이브비전</td><td><code>waveVision</code></td><td><code>wave_vision</code></td><td><code>W.V</code></td><td>건수만. 옵션 축</td></tr>
        <tr><td>24</td><td>모노비전</td><td><code>monoVision</code></td><td><code>mono_vision</code></td><td><code>MONO</code> 로 시작</td><td>건수만. 옵션 축</td></tr>
        <tr><td>25</td><td>백내장 수술수</td><td><code>cataractPatients</code></td><td><code>cataract_patients</code></td><td><code>list_surgery</code> 백내장 행의 눈 COUNT(*) ← <code>Cataract_Operationdata</code></td><td><b>안(眼) 단위</b>. 26~28 의 분모이고 다초점 + 프리미엄 + 단초점 = 수술수</td></tr>
        <tr><td>26</td><td>다초점</td><td><code>catMulti</code></td><td><code>cat_multi</code></td><td>백내장 눈 시술명 Clareon · Panoptix · RESTOR · Lara · LISA · CTR(M) · T-CTR · Precizon · LAL 등</td><td>÷ 백내장 수술수</td></tr>
        <tr><td>27</td><td>프리미엄</td><td><code>catEdof</code></td><td><code>cat_edof</code></td><td>EDOF · Vivity · Eyhance · PureSee · Isopure · Symfony — 먼저 판정</td><td>÷ 백내장 수술수. <a href="surgery-ratio.html">주요 수술별 비중</a> 라벨은 「백내장(연속초점)」</td></tr>
        <tr><td>28</td><td>단초점</td><td><code>catMono</code></td><td><code>cat_mono</code></td><td>나머지 백내장 눈(K-flex 포함)</td><td>÷ 백내장 수술수</td></tr>
      </tbody>
    </table>
    <p>유형 판정 규칙은 <a href="surgery-list.html">수술자 리스트 5장</a>과 같음(마트 함수 <code>surgery_op_type</code>, 대소문자 무시). 응답의 <code>lasek</code> 은 이 표에서 쓰지 않음.</p>
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
