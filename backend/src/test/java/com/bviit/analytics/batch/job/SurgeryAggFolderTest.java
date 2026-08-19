package com.bviit.analytics.batch.job;

import com.bviit.analytics.surgery.dto.SurgeryDailyItem;
import com.bviit.analytics.surgery.dto.SurgeryMonthlyItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 일별 → 월별 접기 검증.
 *
 * 이 로직이 틀리면 배치는 "성공"으로 끝나고 월별 숫자만 조용히 망가진다.
 * 실제로 2026-08-06 판정 저장 직후 갱신에서 7월 총 수술수가 861 → 34 로 무너졌다.
 */
class SurgeryAggFolderTest {

    private static SurgeryDailyItem day(String date, int vision, int cataract, int reop, int total) {
        return SurgeryDailyItem.builder()
                .date(date)
                .visionPatients(vision).cataractPatients(cataract)
                .reoperation(reop).reopLens(reop).total(total)
                .smile(1).catMulti(cataract).piolPatients(2)
                .build();
    }

    @Test
    @DisplayName("같은 달의 여러 날을 모두 더한다")
    void 같은_달을_전부_더한다() {
        List<SurgeryMonthlyItem> out = SurgeryAggFolder.aggregateByMonth(List.of(
                day("2026-07-01", 32, 0, 2, 34),
                day("2026-07-02", 40, 3, 1, 44),
                day("2026-07-03", 28, 2, 0, 30)
        ));

        assertThat(out).hasSize(1);
        SurgeryMonthlyItem m = out.get(0);
        assertThat(m.getYear()).isEqualTo(2026);
        assertThat(m.getMonth()).isEqualTo(7);
        assertThat(m.getVisionPatients()).as("32+40+28").isEqualTo(100);
        assertThat(m.getCataractPatients()).as("0+3+2").isEqualTo(5);
        assertThat(m.getReoperation()).as("2+1+0").isEqualTo(3);
        assertThat(m.getTotal()).as("34+44+30").isEqualTo(108);
        assertThat(m.getSmile()).as("1+1+1").isEqualTo(3);
        assertThat(m.getPiolPatients()).as("2+2+2").isEqualTo(6);
        assertThat(m.getCatMulti()).as("0+3+2").isEqualTo(5);
        assertThat(m.getReopLens()).as("2+1+0").isEqualTo(3);
    }

    @Test
    @DisplayName("하루치만 접으면 그 달이 하루 값이 된다 — 그래서 월별은 달 전체를 다시 읽어야 한다")
    void 하루치만_접으면_월이_하루가_된다() {
        // SurgeryMartJob 이 daily 를 그대로 접으면 안 되는 이유를 고정한다.
        // 이 잡은 하루짜리 범위로도 불린다(매일 03시 D-1 배치 · 재수술 판정 저장 직후 재빌드).
        // 2026-08-06 실제로 이 경로로 7월 총 수술수가 861 → 34 로 무너졌다.
        // 접기 함수 자체는 정상이고, **입력 범위**가 달 전체여야 한다는 것이 요점이다.
        List<SurgeryMonthlyItem> oneDay = SurgeryAggFolder.aggregateByMonth(List.of(
                day("2026-07-01", 32, 0, 2, 34)
        ));
        assertThat(oneDay.get(0).getTotal())
                .as("하루만 넣으면 월 합계가 그 하루 값이 된다 — 월별 적재 시 달 전체를 읽을 것")
                .isEqualTo(34);

        List<SurgeryMonthlyItem> wholeMonth = SurgeryAggFolder.aggregateByMonth(List.of(
                day("2026-07-01", 32, 0, 2, 34),
                day("2026-07-02", 40, 3, 1, 44)
        ));
        assertThat(wholeMonth.get(0).getTotal()).isEqualTo(78);
    }

    @Test
    @DisplayName("달이 다르면 따로 접는다")
    void 달_경계를_나눈다() {
        List<SurgeryMonthlyItem> out = SurgeryAggFolder.aggregateByMonth(List.of(
                day("2026-06-30", 10, 1, 1, 12),
                day("2026-07-01", 20, 2, 2, 24)
        ));

        assertThat(out).hasSize(2);
        assertThat(out.get(0).getMonth()).isEqualTo(6);
        assertThat(out.get(0).getTotal()).isEqualTo(12);
        assertThat(out.get(1).getMonth()).isEqualTo(7);
        assertThat(out.get(1).getTotal()).isEqualTo(24);
    }
}
