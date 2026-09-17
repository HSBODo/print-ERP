package com.bviit.analytics.accounting.service;

import com.bviit.analytics.accounting.dto.MedicalMonthlyItem;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MedicalMonthlyFolderTest {

    private static Map<String, Object> part(String src, String ym, long cnt, long v1, long v2, long v3, long v4, long v5) {
        return Map.of("src", src, "ym", ym, "cnt", cnt, "v1", v1, "v2", v2, "v3", v3, "v4", v4, "v5", v5);
    }

    @Test
    void 외래_입원_결제_건생비_조각을_한_달로_접고_레거시_순액_공식을_적용한다() {
        // 2026-07 운영 실측 조각 (외래 5290 · 입원 45)
        List<MedicalMonthlyItem> folded = MedicalMonthlyFolder.fold(List.of(
                part("out", "2026-07", 5290, 137_649_970, 139_054_220, 197_675_320, 78_091_920, 0),
                part("in", "2026-07", 45, 114_997_100, 39_299_060, 49_066_310, 132_131_630, 0),
                part("pt", "2026-07", 0, 217_500, 215_700, 274_900, 0, 0),
                part("pt80", "2026-07", 0, 95_700, 0, 0, 0, 0),
                part("gs", "2026-07", 0, 6_000, 0, 0, 0, 0),
                part("out", "2026-06", 10, 1_000, 0, 0, 0, 0)));

        assertThat(folded).extracting(MedicalMonthlyItem::month).containsExactly(6, 7);
        MedicalMonthlyItem july = folded.get(1);
        assertThat(july.year()).isEqualTo(2026);
        assertThat(july.count()).isEqualTo(5335);
        assertThat(july.copayDue()).isEqualTo(252_647_070L);
        assertThat(july.claimAmount()).isEqualTo(178_353_280L);
        assertThat(july.nonCovered()).isEqualTo(210_223_550L);
        // 수납할금액 + 미수회수 − 미수발생 − 환불금 − 건생비 + 환불발생
        assertThat(july.net()).isEqualTo(252_647_070L + 217_500 - 274_900 - 215_700 - 6_000 + 95_700);
    }

    @Test
    void 조각이_없으면_빈_목록이다() {
        assertThat(MedicalMonthlyFolder.fold(List.of())).isEmpty();
    }
}
