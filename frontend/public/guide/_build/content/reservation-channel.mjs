export default {
  s2: `
    <h3>채널이 얼마나 데려오고, 어디서 놓치는가</h3>
    <p><a href="reservation-list.html">예약자 리스트</a>를 <b>유입 채널로 묶어</b> 예약 → 수술까지 단계별로 좁혀 봄.
       합계는 예약자 리스트와 같고, 보는 각도만 다름.</p>

    <table>
      <thead><tr><th>쓰는 장면</th><th>하는 일</th></tr></thead>
      <tbody>
        <tr><td>채널 효율 비교</td><td>어느 채널이 <b>수술까지</b> 데려오는지 봄 — 예약만 많은 채널을 걸러냄</td></tr>
        <tr><td>이탈 지점 찾기</td><td>단계 사이 낙차가 큰 곳이 그 채널의 약점임</td></tr>
        <tr><td>수술 대기 파악</td><td>수술등록 − 수술완료 = 아직 안 한 사람</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">짝이 되는 화면</div>
      <p>퍼널이 <b>얼마나 오나</b>(전환 축)라면, <a href="channel-profit.html">채널별 수익성</a>은 <b>얼마 버나</b>(가치 축)임.
         두 화면은 같은 뷰(<code>v_reservation_channel</code>)를 읽어 <b>인원이 일치</b>함.
         채널의 성격 해석은 <a href="channel-analysis.html">채널별 분석</a>에 있음.</p>
    </div>

    <div class="note warn">
      <div class="h">2026-08-06 에 예약 → 마케팅으로 옮겼음</div>
      <p>예약 그룹에 있었지만 실제로 보는 것은 <b>유입 채널의 효율</b>이라 마케팅 섹션이 더 맞음.</p>
    </div>
  `,

  s3: `
    <p>기간 툴바 + 퍼널 밴드 + 채널별 카드/표. 밴드가 전체 흐름, 표가 채널별 내역임.</p>

    <div class="shot">
      <div class="shot-bar">
        <span class="ui">📅 2026-07 ▾</span><span>~</span><span class="ui">📅 2026-07 ▾</span>
        <span class="ui">↺ 초기화</span>
        <span class="ui blue">🔍 조회</span>
      </div>
      <div style="padding:14px">
        <div style="display:flex; align-items:flex-end; gap:3px; height:90px">
          <div style="flex:1; background:#1e3a8a; height:100%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#2563eb; height:96%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#0ea5e9; height:61%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#10b981; height:61%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#14b8a6; height:58%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#f59e0b; height:48%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#f97316; height:38%; border-radius:4px 4px 0 0"></div>
          <div style="flex:1; background:#dc2626; height:2%; border-radius:4px 4px 0 0"></div>
        </div>
        <div style="display:flex; gap:3px; font-size:10.5px; text-align:center; margin-top:4px">
          <div style="flex:1">예약<br/><b>1,540</b></div>
          <div style="flex:1">취소 제외<br/><b>1,478</b></div>
          <div style="flex:1">접수<br/><b>933</b></div>
          <div style="flex:1">검사<br/><b>936</b></div>
          <div style="flex:1">중단 제외<br/><b>896</b></div>
          <div style="flex:1">수술등록<br/><b>735</b></div>
          <div style="flex:1">수술완료<br/><b>579</b></div>
          <div style="flex:1">재수술<br/><b>0</b></div>
        </div>
      </div>
      <div class="scroll-x">
        <table>
          <thead><tr>
            <th>채널</th><th>예약</th><th>취소 제외</th><th>접수</th><th>검사</th><th>중단 제외</th>
            <th>수술등록</th><th>수술완료</th><th style="color:#b45309">수술대기</th><th>재수술</th><th>최종 전환</th>
          </tr></thead>
          <tbody>
            <tr><td>인콜</td><td>612</td><td>590</td><td>371</td><td>372</td><td>356</td><td>295</td><td>232</td><td style="color:#b45309">63</td><td>0</td><td>48.2%</td></tr>
            <tr><td>홈페이지</td><td>388</td><td>374</td><td>235</td><td>236</td><td>226</td><td>184</td><td>145</td><td style="color:#b45309">39</td><td>0</td><td>47.4%</td></tr>
            <tr><td>모두닥</td><td>121</td><td>115</td><td>68</td><td>68</td><td>65</td><td>51</td><td>39</td><td style="color:#b45309">12</td><td>0</td><td>42.1%</td></tr>
            <tr><td>크리에이트립</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">0</td><td class="ph">—</td></tr>
            <tr style="font-weight:700"><td>합계</td><td>1,540</td><td>1,478</td><td>933</td><td>936</td><td>896</td><td>735</td><td>579</td><td style="color:#b45309">156</td><td>0</td><td>47.7%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="shot-cap">수술대기는 <b>수술완료 뒤</b>에 있고 색이 다름 — 퍼널 단계가 아니라 파생 칸이기 때문임. 숫자는 2026-07 실측 기준의 예시임.</p>

    <h3>구성 요소</h3>
    <table>
      <thead><tr><th>영역</th><th>구성</th><th>동작</th></tr></thead>
      <tbody>
        <tr><td>기간</td><td>시작월 ~ 끝월</td><td>월 단위 <b>범위</b> 조회임. 한 달만 볼 수도, 여러 달을 합칠 수도 있음</td></tr>
        <tr><td>퍼널 밴드</td><td>8단계</td><td>단계 사이 낙차를 이탈로 그림</td></tr>
        <tr><td>채널 표</td><td>9칸 (8단계 + 수술대기)</td><td>정렬 가능. 합계행은 <b>채널 값을 더하지 않음</b> — 5장 참조</td></tr>
        <tr><td>최종 전환</td><td>수술등록 ÷ 예약</td><td>재수술까지 세면 0 이라 <b>수술등록</b>이 기준임</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">수술대기를 퍼널 밴드에 넣지 않은 이유</div>
      <p>대기는 등록의 부분집합이라 <b>완료와 형제</b>임. 밴드에 끼우면 735 → 156 → 579 로
         줄었다 늘어 <b>퍼널이 거짓말을 함</b>. 완료 뒤에 두면 735 → 579 → 156 으로 계속 줄어 자연스러움.<br />
         등록과 완료 <b>사이</b>에 두는 것도 틀림 — "대기를 거쳐 완료로 간다"로 읽히는데,
         대기와 완료는 서로 배타이고 완료한 사람도 전부 대기를 거쳤음.
         대기는 <b>오늘 기준 아직 안 한 사람의 스냅샷</b>임. 그래서 이탈의 빨강이 아니라 노랑·점선으로 그림.</p>
    </div>
  `,

  s4: `
    <h3>조회는 월 범위 하나</h3>
    <table>
      <thead><tr><th>조건</th><th>어디서</th><th>규칙</th></tr></thead>
      <tbody>
        <tr><td>시작월 ~ 끝월</td><td><b>서버</b></td><td>예약 <b>등록일</b> 기준. <code>GET /api/stats/reservation-channel</code></td></tr>
        <tr><td>수술 유형</td><td>서버 (별도 API)</td><td><code>/op-types</code> — 채널별 수술 유형 분해</td></tr>
      </tbody>
    </table>
    <p>채널 필터가 없음 — <b>모든 채널이 항상 행으로 나옴</b>. 유입이 0 인 채널도 포함함.</p>

    <div class="note">
      <div class="h">0 인 채널을 왜 남기나</div>
      <p>빼면 <b>"채널이 없는 것"과 "이번 달 0명"이 구분되지 않음</b>.
         게다가 달을 바꿀 때마다 행 수가 흔들려 표를 읽기 어려움.
         채널 목록은 뷰 <b>전 기간</b>의 값에서 뽑으므로 화면에 이름을 하드코딩하지 않음 —
         분류 규칙을 뷰에서 고치면 목록도 따라옴.</p>
    </div>
  `,

  s5: `
    <h3>단계 8개 — 뒤로 갈수록 앞의 부분집합</h3>
    <table>
      <thead><tr><th>단계</th><th>조건</th></tr></thead>
      <tbody>
        <tr><td>예약</td><td>등록일 기준 전체 예약</td></tr>
        <tr><td>취소 제외</td><td>상태 취소(C) 제외</td></tr>
        <tr><td>접수</td><td>미내원(Y)까지 제외 → 접수(I)·퇴원(H). <b>실제 내원한 건</b></td></tr>
        <tr><td>검사</td><td>검사등록일이 있음</td></tr>
        <tr><td>중단 제외</td><td>그중 검사중단(Y)이 아닌 건</td></tr>
        <tr><td>수술등록</td><td>수술등록일이 있음 = <b>수술예약을 잡은 사람</b>. 수술한 날이 아님</td></tr>
        <tr><td>수술완료</td><td>그중 실제 수술일이 있음</td></tr>
        <tr><td>재수술</td><td>그중 나중에 재수술까지 간 건</td></tr>
      </tbody>
    </table>

    <div class="note">
      <div class="h">중단 제외가 검사와 수술등록 사이에 있는 이유</div>
      <p>2026-07 실측 — 검사 936건 중 중단 40건이고 <b>그 40건은 수술등록이 0건</b>임.
         중단하면 수술로 가지 않으므로 순서상 여기가 맞음.</p>
    </div>

    <div class="note bad">
      <div class="h">⚠️ 이 화면은 <b>사람 수</b>만 셈</div>
      <p>같은 사람이 취소 후 다시 잡아도 1명임. "실제 몇 명이 왔나"가 알고 싶은 값이라서임.
         API 는 건수도 함께 주지만 화면은 쓰지 않음 — 숫자가 두 벌이면 읽기 어려움.
         (2026-07: 예약 1,555건 / 1,540명, 접수 935건 / 933명)</p>
    </div>

    <div class="note bad">
      <div class="h">⚠️ 합계행은 채널 값을 더한 것이 아님</div>
      <p>사람 수는 <b>채널별 DISTINCT</b> 라 한 사람이 두 채널로 예약하면 채널마다 1명씩 세어짐.
         그래서 <b>채널 합계 ≠ 전체 사람 수</b> 임. 전체 기준 값을 서버가 따로 실어 보내고,
         화면 합계행은 그 값을 그대로 씀. 표를 CSV 로 받아 세로합을 내면 합계행과 다르게 나옴 — 정상임.</p>
    </div>

    <h3>사람 식별 — 4순위로 판정함</h3>
    <table>
      <thead><tr><th>순위</th><th>키</th><th>인정 조건</th></tr></thead>
      <tbody>
        <tr><td>①</td><td>휴대폰</td><td>숫자 <b>9자리 이상</b>이면서 0 만으로 이뤄지지 않을 것</td></tr>
        <tr><td>②</td><td>이메일</td><td><code>@</code> 가 있을 것</td></tr>
        <tr><td>③</td><td>차트번호</td><td>더미(<code>9999999999999</code>)가 아닐 것</td></tr>
        <tr><td>④</td><td>이름</td><td>—</td></tr>
      </tbody>
    </table>
    <div class="note warn">
      <div class="h">더미 번호를 거르는 이유</div>
      <p>연락처를 모르는 예약에 0 을 채워 넣는 관행이 있음. 2026-07 에 <code>00000000000</code> 74건 ·
         <code>0000</code> 9건 · <code>0</code> 4건이 있었음. 거르지 않으면 <b>서로 다른 87명이 3명으로 뭉개짐</b>.
         식별 커버리지는 99.9% 임.</p>
    </div>

    <h3>채널 판정 — 3순위</h3>
    <table>
      <thead><tr><th>순위</th><th>근거</th><th>예</th></tr></thead>
      <tbody>
        <tr><td>①</td><td>내원동기(중)에 <b>매체명이 직접</b> 적힌 경우</td><td>모두닥 · 카페 · 크리에이트립 · 에이젼시(외국)→해외에이전시 · 강남언니/바비톡→기타플랫폼</td></tr>
        <tr><td>②</td><td>직원 설정표(<code>reservation_channel_staff</code>)</td><td>자사 해외 등 — DB 로 관리해 코드 수정 없이 늘림</td></tr>
        <tr><td>③</td><td>예약 경로</td><td>인콜 · 아웃콜 · 홈페이지 · 앱 · 네이버</td></tr>
      </tbody>
    </table>
    <p><b>판정은 뷰가 하고 화면은 하지 않음.</b> 규칙을 바꾸려면 <code>v_reservation_channel</code> 만 고치면
       이 화면과 <a href="channel-profit.html">채널별 수익성</a>이 함께 따라옴.</p>

    <div class="note warn">
      <div class="h">재수술은 코호트 기준임</div>
      <p>"그 달에 <b>예약한 사람</b>이 나중에 재수술까지 갔나"를 셈.
         "그 달에 재수술한 사람"이 아님. 재수술은 원수술 몇 달~몇 년 뒤에 일어나는데
         원천이 2026-01 부터라 <b>최근 코호트일수록 0</b> 임(2026-01 코호트 3명, 07 코호트 0명).
         정상이며 데이터가 쌓일수록 채워짐.</p>
    </div>
  `,

  s10: `
    <h3>구조에서 오는 제약</h3>
    <table>
      <thead><tr><th>제약</th><th>화면에서 어떻게 보이나</th><th>대응</th></tr></thead>
      <tbody>
        <tr><td><b>채널 합계 ≠ 전체</b></td><td>세로합이 합계행과 다름</td><td>중복 소속이라 그럼. 합계행 값을 씀</td></tr>
        <tr><td><b>재수술이 최근 달에 0</b></td><td>마지막 단계가 늘 비어 보임</td><td>코호트 기준 + 원천이 2026-01 부터. 시간이 해결함</td></tr>
        <tr><td><b>접수 &lt; 검사</b></td><td>단계가 늘어나는 것처럼 보이는 달이 있음</td><td>예약 없이 내원해 검사만 받은 건이 섞임. 실측 936 vs 933 처럼 작은 차이임</td></tr>
        <tr><td><b>사람 식별의 한계</b></td><td>연락처·이메일·차트가 다 없으면 <b>이름</b>으로 묶음</td><td>동명이인이 한 명으로 뭉갤 수 있음. 커버리지 99.9% 라 영향은 작음</td></tr>
        <tr><td><b>수술대기는 오늘 기준</b></td><td>과거 달을 봐도 '지금 대기 중'인 수가 나옴</td><td>스냅샷이라 과거 시점의 대기가 아님</td></tr>
      </tbody>
    </table>

    <h3>아직 정하지 못한 것</h3>
    <table>
      <thead><tr><th>미결</th><th>무엇이 걸려 있나</th></tr></thead>
      <tbody>
        <tr><td>채널 분류 확장</td><td>새 매체가 생기면 뷰의 매체명 목록이나 직원 설정표에 넣어야 함. <b>누가 관리할지</b>가 정해지지 않았음</td></tr>
        <tr><td>건수 노출</td><td>API 는 주는데 화면이 안 씀 — <b>「숫자가 두 벌이면 읽기 어렵다」는 이유로 사람 수만 보임</b>. 광고 효율(채널이 몇 번 일했나)에는 건수가 맞음 — 보여줄지</td></tr>
        <tr><td>기간 단위</td><td>지금은 월 범위임. 주·일 단위 요구가 나오면 코호트 정의가 흔들림</td></tr>
        <tr><td>재수술 코호트 표기</td><td><b>툴팁에는 설명이 있음</b>(「재수술은 몇 달~몇 년 뒤라 최근 달일수록 0 이다」). 표면의 0 만 보면 여전히 「없음」으로 읽힘 — 표에 드러낼지</td></tr>
      </tbody>
    </table>
  `,
}
