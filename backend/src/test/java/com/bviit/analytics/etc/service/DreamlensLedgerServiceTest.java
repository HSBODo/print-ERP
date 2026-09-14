package com.bviit.analytics.etc.service;

import com.bviit.analytics.common.exception.InvalidPeriodException;
import com.bviit.analytics.etc.dto.DreamlensLedgerRequest;
import com.bviit.analytics.etc.dto.DreamlensLedgerRow;
import com.bviit.analytics.etc.repository.DreamlensLedgerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 드림렌즈 장부 CRUD·정렬 계약.
 *
 * 정렬(최신 날짜 우선)은 리포지토리 메서드 <b>이름</b>으로만 표현되어 있어
 * 실수로 Asc 로 되돌려도 컴파일은 통과한다 — 그래서 테스트로 잠근다.
 * 조회 구간 상한도 없으면 20년치 2.4만 행이 한 번에 나가므로 함께 고정한다.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=test-jwt-secret-value-for-ledger-service-tests-123456",
        "spring.h2.console.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:dreamlens-ledger-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "app.seed.enabled=false",
        // 시드 10행이 끼면 정렬·건수 단언이 흔들린다
        "app.dreamlens-ledger.seed-enabled=false"
})
class DreamlensLedgerServiceTest {

    @Autowired private DreamlensLedgerService service;
    @Autowired private DreamlensLedgerRepository repository;

    @BeforeEach
    void clear() {
        repository.deleteAll();
    }

    private DreamlensLedgerRequest request(String date, String name) {
        DreamlensLedgerRequest request = new DreamlensLedgerRequest();
        request.setEntryDate(LocalDate.parse(date));
        request.setCustomerName(name);
        return request;
    }

    @Test
    void 최신_날짜가_먼저_나오고_같은_날짜면_나중_입력이_먼저다() {
        service.create(request("2026-07-01", "가장오래된"));
        DreamlensLedgerRow sameDayFirst = service.create(request("2026-08-02", "같은날_먼저"));
        DreamlensLedgerRow sameDayLater = service.create(request("2026-08-02", "같은날_나중"));
        service.create(request("2026-07-15", "중간"));

        List<DreamlensLedgerRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-08-31"));

        assertThat(rows).extracting(DreamlensLedgerRow::getCustomerName)
                .containsExactly("같은날_나중", "같은날_먼저", "중간", "가장오래된");
        // 같은 날짜 안에서는 id 내림차순
        assertThat(rows.get(0).getId()).isEqualTo(sameDayLater.getId());
        assertThat(rows.get(1).getId()).isEqualTo(sameDayFirst.getId());
    }

    @Test
    void 조회_구간_밖의_행은_나오지_않는다() {
        service.create(request("2026-06-30", "구간전"));
        service.create(request("2026-07-15", "구간안"));
        service.create(request("2026-08-01", "구간후"));

        List<DreamlensLedgerRow> rows = service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-07-31"));

        assertThat(rows).extracting(DreamlensLedgerRow::getCustomerName).containsExactly("구간안");
    }

    @Test
    void 시작일이_종료일보다_늦으면_거부한다() {
        assertThatThrownBy(() -> service.findRows(LocalDate.parse("2026-08-02"), LocalDate.parse("2026-08-01")))
                .isInstanceOf(InvalidPeriodException.class)
                .hasMessageContaining("늦을 수 없습니다");
    }

    @Test
    void 조회_구간은_92일_3개월_까지만_허용한다() {
        LocalDate from = LocalDate.parse("2025-01-01");

        // 92일(경계)은 통과
        assertThat(service.findRows(from, from.plusDays(91))).isEmpty();

        // 93일부터 거부 — 없으면 20년 전 구간 조회가 그대로 나간다
        assertThatThrownBy(() -> service.findRows(from, from.plusDays(92)))
                .isInstanceOf(InvalidPeriodException.class)
                .hasMessageContaining("최대 92일");
    }

    @Test
    void 연속_3개월_전체는_막히지_않는다() {
        // 7·8·9월 = 31+31+30 = 92일. 상한을 90 으로 잡으면 이 분기 조회가 막힌다.
        assertThat(service.findRows(LocalDate.parse("2026-07-01"), LocalDate.parse("2026-09-30"))).isEmpty();
    }

    @Test
    void 수정은_전_필드를_교체하고_총매출을_다시_계산한다() {
        DreamlensLedgerRow created = service.create(request("2026-08-02", "수정전"));
        assertThat(created.getTotalRevenue()).isZero();

        DreamlensLedgerRequest update = request("2026-08-03", "수정후");
        update.setExaminer("한지희");
        update.setRLensName("CRT");
        update.setDlNewRevenue(1_000_000);
        update.setMNewRevenue(300_000);
        update.setTreatmentRevenue(41_800);

        DreamlensLedgerRow updated = service.update(created.getId(), update);

        assertThat(updated.getId()).isEqualTo(created.getId());
        assertThat(updated.getCustomerName()).isEqualTo("수정후");
        assertThat(updated.getEntryDate()).isEqualTo(LocalDate.parse("2026-08-03"));
        assertThat(updated.getExaminer()).isEqualTo("한지희");
        assertThat(updated.getRLensName()).isEqualTo("CRT");
        assertThat(updated.getTotalRevenue()).isEqualTo(1_341_800);
    }

    @Test
    void 요청에_없는_필드는_비워진다() {
        DreamlensLedgerRequest initial = request("2026-08-02", "이름있음");
        initial.setExaminer("한지희");
        initial.setDlNewRevenue(500_000);
        DreamlensLedgerRow created = service.create(initial);

        // 전체 교체 계약 — 이름만 담아 보내면 나머지는 비워져야 한다
        DreamlensLedgerRow updated = service.update(created.getId(), request("2026-08-02", "이름만"));

        assertThat(updated.getExaminer()).isNull();
        assertThat(updated.getDlNewRevenue()).isZero();
        assertThat(updated.getTotalRevenue()).isZero();
    }

    @Test
    void 삭제하면_조회에서_사라진다() {
        DreamlensLedgerRow created = service.create(request("2026-08-02", "삭제대상"));

        service.delete(created.getId());

        assertThat(service.findRows(LocalDate.parse("2026-08-01"), LocalDate.parse("2026-08-31"))).isEmpty();
    }

    @Test
    void 없는_행을_수정하거나_삭제하면_거부한다() {
        assertThatThrownBy(() -> service.update(999_999L, request("2026-08-02", "없음")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("찾을 수 없습니다");

        assertThatThrownBy(() -> service.delete(999_999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("찾을 수 없습니다");
    }
}
