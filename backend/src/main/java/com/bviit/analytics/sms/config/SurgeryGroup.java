package com.bviit.analytics.sms.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 발송 문구·시점이 같은 수술 묶음.
 *
 * 왜 그룹이 필요한가 — 회복 속도가 수술마다 달라서 <b>1차 안내 시점이 다르다</b>.
 * 라섹은 렌즈를 빼야 세안이 되므로 D+5, 렌즈삽입은 D+3, 스마일·라식은 D+1 이다.
 * 2·3차는 네 그룹 모두 D+7 · D+14 로 같다.
 * (수술 후 고객케어 TF 확정안 v5, 2026-07-27)
 *
 * ⚠️ 그룹 판정은 마트의 <code>surgery_op_type()</code> 분류 코드로 한다.
 *    CRM 에 등록된 수술명은 100 종이 넘어 손으로 고를 수 없지만, 그 100 종이 이미
 *    15 개 코드로 정규화되어 있으므로 코드만 매핑하면 된다. 이 매핑은 수술 통계·채널
 *    분석과 같은 기준이라 화면끼리 숫자가 어긋나지 않는다.
 */
public record SurgeryGroup(
        /** 설정 키. env 는 SOLAPI_TPL_{code}_{tier}_ID 형태로 읽는다. */
        String code,
        String label,
        /** 이 그룹에 속한 op_type 코드. 화면이 행마다 그룹을 찾을 때 쓴다. */
        List<String> opTypes,
        /** 1·2·3차 오프셋(일). 길이는 항상 3이다. */
        List<Integer> offsets
) {

    /* ── TF 확정안의 네 그룹 ── 순서가 화면 표기 순서다. */

    /** 스마일라식과 스마일프로가 같은 템플릿을 쓴다(TF 확정안). */
    public static final SurgeryGroup SMILE =
            new SurgeryGroup("SMILE", "스마일수술", List.of("smilePro", "smile"), List.of(1, 7, 14));

    public static final SurgeryGroup LASIK =
            new SurgeryGroup("LASIK", "라식", List.of("lasik"), List.of(1, 7, 14));

    /** 렌즈를 제거해야 세안이 되므로 1차가 D+5 로 가장 늦다. */
    public static final SurgeryGroup LASEK =
            new SurgeryGroup("LASEK", "라섹", List.of("lasek"), List.of(5, 7, 14));

    /** ICL 계열에 KPL·VIVA 까지 묶는다 — 셋 다 안에 렌즈를 넣어 회복 경과와 주의사항이 같다. */
    public static final SurgeryGroup ICL =
            new SurgeryGroup("ICL", "렌즈삽입", List.of("icl", "tIcl", "kpl", "tKpl", "viva"), List.of(3, 7, 14));

    /**
     * TF 범위 밖(백내장·재수술·프레스비욘드 등)과 분류 실패분이 떨어지는 자리.
     *
     * 시점은 스마일과 같게 두되 <b>문구 슬롯은 따로</b>다. 채우지 않으면 이 그룹은
     * '설정 미완료'로 표시되고 발송되지 않는다 — 조용히 남의 문구가 나가는 것보다
     * 안 나가는 편이 안전하다.
     */
    public static final SurgeryGroup ETC =
            new SurgeryGroup("ETC", "기타", List.of(), List.of(1, 7, 14));

    public static final List<SurgeryGroup> ALL = List.of(SMILE, LASIK, LASEK, ICL, ETC);

    private static final Map<String, SurgeryGroup> BY_OP_TYPE = buildIndex();

    private static Map<String, SurgeryGroup> buildIndex() {
        Map<String, SurgeryGroup> index = new LinkedHashMap<>();
        for (SurgeryGroup g : ALL) {
            for (String opType : g.opTypes()) index.put(opType, g);
        }
        return Map.copyOf(index);
    }

    /** 분류할 수 없으면 ETC. null·빈 값·미등록 코드 전부 여기로 온다. */
    public static SurgeryGroup of(String opType) {
        if (opType == null || opType.isBlank()) return ETC;
        return BY_OP_TYPE.getOrDefault(opType, ETC);
    }

    public static SurgeryGroup byCode(String code) {
        return ALL.stream().filter(g -> g.code().equalsIgnoreCase(code)).findFirst().orElse(ETC);
    }

    /** tier 는 1..3. 벗어나면 가장 가까운 차수로 잘라 쓴다. */
    public int offsetOf(int tier) {
        int idx = Math.min(Math.max(tier, 1), offsets.size()) - 1;
        return offsets.get(idx);
    }
}
