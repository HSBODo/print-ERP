package com.bviit.analytics.surgery.service;

import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.surgery.dto.ReoperationDecisionRow;
import com.bviit.analytics.surgery.dto.ReoperationDecisionSaveRequest;
import com.bviit.analytics.surgery.repository.ReoperationDecisionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 재수술 판정 저장·조회 계약.
 *   - (chartNo, opDate) 유니크로 upsert 된다
 *   - 기간 조회는 opDate 기준
 *   - updatedBy 는 saveBatch 호출 시 인자로 들어온 값이 저장된다
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-reoperation-decision-tests-123456",
        "spring.h2.console.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:reoperation-decision-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        "app.dreamlens-ledger.seed-enabled=false"
})
class ReoperationDecisionServiceTest {

    @Autowired private ReoperationDecisionService service;
    @Autowired private ReoperationDecisionRepository repository;

    @BeforeEach
    void clear() {
        repository.deleteAll();
    }

    private ReoperationDecisionSaveRequest batch(ReoperationDecisionSaveRequest.Item... items) {
        ReoperationDecisionSaveRequest request = new ReoperationDecisionSaveRequest();
        request.setDecisions(List.of(items));
        return request;
    }

    private ReoperationDecisionSaveRequest.Item item(String chartNo, String date, boolean isReop) {
        ReoperationDecisionSaveRequest.Item item = new ReoperationDecisionSaveRequest.Item();
        item.setChartNo(chartNo);
        item.setOpDate(LocalDate.parse(date));
        item.setIsReoperation(isReop);
        return item;
    }

    @Test
    void 신규_판정은_저장되고_updatedBy_가_기록된다() {
        service.saveBatch(batch(item("12345", "2026-07-15", true)), "tester");

        List<ReoperationDecisionRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-31"));
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).getChartNo()).isEqualTo("12345");
        assertThat(rows.get(0).isReoperation()).isTrue();
        assertThat(rows.get(0).getUpdatedBy()).isEqualTo("tester");
    }

    @Test
    void 같은_chartNo_opDate_는_upsert_로_갱신된다() {
        service.saveBatch(batch(item("12345", "2026-07-15", true)), "first");
        service.saveBatch(batch(item("12345", "2026-07-15", false)), "second");

        List<ReoperationDecisionRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-31"));
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).isReoperation()).isFalse();
        assertThat(rows.get(0).getUpdatedBy()).isEqualTo("second");
    }

    @Test
    void 배치는_여러_행을_한번에_upsert_한다() {
        service.saveBatch(batch(
                item("A", "2026-07-01", true),
                item("B", "2026-07-15", false),
                item("C", "2026-07-30", true)
        ), "tester");

        List<ReoperationDecisionRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-31"));
        assertThat(rows).hasSize(3);
    }

    @Test
    void 조회는_opDate_기준으로_필터한다() {
        service.saveBatch(batch(
                item("A", "2026-06-30", true),
                item("B", "2026-07-15", true),
                item("C", "2026-08-01", true)
        ), "tester");

        List<ReoperationDecisionRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-31"));
        assertThat(rows).extracting(ReoperationDecisionRow::getChartNo).containsExactly("B");
    }

    @Test
    void 시작일이_종료일보다_늦으면_거부한다() {
        assertThatThrownBy(() -> service.findRows(LocalDate.parse("2026-08-02"), LocalDate.parse("2026-08-01")))
                .isInstanceOf(InvalidPeriodException.class)
                .hasMessageContaining("늦을 수 없습니다");
    }
}
