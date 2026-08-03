package com.bviit.analytics.surgery.service;

import com.bviit.analytics.surgery.entity.ReoperationDecision;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import static com.bviit.analytics.common.util.NumberUtils.toInt;

/**
 * 재수술 판정 오버레이 + 렌즈/레이저 분류.
 *
 * find-reoperation-candidates.sql 의 raw 후보에 저장 판정을 얹어 최종 재수술 여부를 결정하고,
 * 시술명(AGAIN_R, AGAIN_L) 패턴으로 렌즈/레이저를 나눈다. 시술명 패턴은 예전에 3개 SQL
 * (find-reoperation-monthly.sql · find-reoperation-daily.sql · find-reoperation-candidates.sql)
 * 에 흩어져 있던 걸 여기로 모았다.
 */
public final class ReoperationOverlay {

    private ReoperationOverlay() {
    }

    /** 렌즈로 분류할 시술명 패턴. 하나라도 매칭되면 lens, 아니면 laser. */
    private static final String[] LENS_PATTERNS = {
            "remo", "exch", "icl", "arf", "art", "evo", "echo", "glaze",
            "precizon", "lisa", "gemetric", "encla"
    };

    /** (chartNo, opDate) → 저장된 판정 여부. */
    public static Map<String, Boolean> decisionMap(List<ReoperationDecision> decisions) {
        Map<String, Boolean> map = new HashMap<>(decisions.size() * 2);
        for (ReoperationDecision d : decisions) {
            map.put(key(d.getChartNo(), d.getOpDate().toString()), d.isReoperation());
        }
        return map;
    }

    public static String key(String chartNo, String opDate) {
        return chartNo + "|" + opDate;
    }

    /** 시술명(양안) 중 하나라도 렌즈 패턴에 매칭되면 렌즈. 대소문자 무시. */
    public static boolean isLensCategory(String againR, String againL) {
        String combined = ((againR == null ? "" : againR) + "|" + (againL == null ? "" : againL))
                .toLowerCase(Locale.ROOT);
        for (String p : LENS_PATTERNS) {
            if (combined.contains(p)) return true;
        }
        return false;
    }

    /**
     * 최종 재수술 여부 — 저장 판정이 있으면 그 값, 없으면 자동판정.
     * (chartNo, opDate) 는 candidates 결과의 컬럼 그대로.
     */
    public static boolean isReoperation(
            Map<String, Boolean> decisionMap,
            String chartNo,
            String opDate,
            Map<String, Object> candidateRow
    ) {
        Boolean saved = decisionMap.get(key(chartNo, opDate));
        if (saved != null) return saved;
        return toInt(candidateRow.get("autoIncluded")) == 1;
    }

    /** 후보 조회 기간의 min/max REOP_DATE 를 LocalDate 로. 저장 판정 조회 범위 산출용. */
    public static LocalDate parseDate(String yyyyMmDd) {
        return LocalDate.parse(yyyyMmDd);
    }
}
