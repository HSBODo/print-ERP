package com.bviit.analytics.marketing.service;

import com.bviit.analytics.common.exception.RowLockedException;
import com.bviit.analytics.marketing.dto.OverseasMarketingReceptionUpsertRequest;
import com.bviit.analytics.marketing.repository.OverseasMarketingRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 해외마케팅 접수 CRUD 의 삭제 잠금·감사 컬럼 규칙을 못 박는다.
 *
 * 왜 잠가두나 — 삭제 잠금이 조용히 풀리면 (a) 시트 이관분(origin='sheet')을 담당자가 실수로
 * 지워 이력이 유실되거나, (b) 이미 매칭·수정된 수기 행을 되돌릴 수 없게 된다.
 * updated_by·created_by 도 감사 목적이라 로그인 ID 가 자동으로 실려야 한다.
 */
class OverseasMarketingEditServiceTest {

    private final OverseasMarketingRepository repository = mock(OverseasMarketingRepository.class);
    private final OverseasMarketingEditService service = new OverseasMarketingEditService(repository);

    private static OverseasMarketingReceptionUpsertRequest sample() {
        return new OverseasMarketingReceptionUpsertRequest(
                "2026-09-01", "홍길동", "010-1111-2222", "gil@example.com",
                "M", "1990-08-15", "베트남", "", "", "", "", "",
                "", "2026-09-10", "", "", "", "", "");
    }

    @Test
    void 수기_행이고_잠기지_않았으면_삭제할_수_있다() {
        when(repository.findRowMeta(1_000_001L))
                .thenReturn(Map.of("origin", "manual"));  // locked_at 키 자체가 없음 = null
        when(repository.deleteManualRow(1_000_001L)).thenReturn(1);

        service.deleteRow(1_000_001L);

        verify(repository).deleteManualRow(1_000_001L);
    }

    @Test
    void 시트에서_이관된_행은_삭제_거부한다() {
        // origin='sheet' 는 항상 잠긴다 — 이력 보존 목적.
        when(repository.findRowMeta(42L))
                .thenReturn(Map.of("origin", "sheet", "locked_at", java.sql.Timestamp.valueOf("2026-09-09 12:00:00")));

        assertThatThrownBy(() -> service.deleteRow(42L))
                .isInstanceOf(RowLockedException.class)
                .hasMessageContaining("동기화를 거친 행");
    }

    @Test
    void 수기_행이라도_동기화가_한번_지나갔으면_삭제_거부한다() {
        // origin='manual' + locked_at != null → sync 잡이 지나가 잠긴 상태.
        // 되돌릴 수 없는 상태라 수정만 허용한다.
        when(repository.findRowMeta(1_000_002L))
                .thenReturn(Map.of("origin", "manual", "locked_at", java.sql.Timestamp.valueOf("2026-09-10 08:00:00")));

        assertThatThrownBy(() -> service.deleteRow(1_000_002L))
                .isInstanceOf(RowLockedException.class);
    }

    @Test
    void 존재하지_않는_행_삭제는_명확한_에러로_거부한다() {
        when(repository.findRowMeta(9999L)).thenReturn(null);

        assertThatThrownBy(() -> service.deleteRow(9999L))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 접수 행");
    }

    @Test
    void 수기_행_생성시_로그인ID를_createdBy에_자동으로_담는다() {
        when(repository.insertManualRow(any(MapSqlParameterSource.class))).thenReturn(1_000_003L);

        long created = service.createRow(sample(), "sbhan");

        assertThat(created).isEqualTo(1_000_003L);
        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(repository).insertManualRow(captor.capture());
        assertThat(captor.getValue().getValue("createdBy")).isEqualTo("sbhan");
        assertThat(captor.getValue().getValue("name")).isEqualTo("홍길동");
    }

    @Test
    void 수정시_updatedBy와_행번호가_함께_전달된다() {
        when(repository.findRowMeta(1_000_003L))
                .thenReturn(Map.of("origin", "manual"));

        service.updateRow(1_000_003L, sample(), "sbhan");

        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(repository).updateRow(captor.capture());
        assertThat(captor.getValue().getValue("rowNumber")).isEqualTo(1_000_003L);
        assertThat(captor.getValue().getValue("updatedBy")).isEqualTo("sbhan");
    }

    @Test
    void 존재하지_않는_행_수정도_명확한_에러로_거부한다() {
        when(repository.findRowMeta(9999L)).thenReturn(null);

        assertThatThrownBy(() -> service.updateRow(9999L, sample(), "sbhan"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("존재하지 않는 접수 행");
    }

    @Test
    void 공백_문자열은_null로_저장해_원본_컬럼과_섞이지_않게_한다() {
        // 시트 원본은 공란이 많은데, DB 는 nullable 이라 공백보다 NULL 로 넣는 게 조회 SQL 과 정합적이다.
        OverseasMarketingReceptionUpsertRequest blanks = new OverseasMarketingReceptionUpsertRequest(
                "", "홍길동", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "");
        when(repository.insertManualRow(any(MapSqlParameterSource.class))).thenReturn(1L);

        service.createRow(blanks, "sbhan");

        ArgumentCaptor<MapSqlParameterSource> captor = ArgumentCaptor.forClass(MapSqlParameterSource.class);
        verify(repository).insertManualRow(captor.capture());
        assertThat(captor.getValue().getValue("inquiryDate")).isNull();
        assertThat(captor.getValue().getValue("contact")).isNull();
        assertThat(captor.getValue().getValue("email")).isNull();
        // 이름은 trim 만 하고 null 로 바꾸지 않는다 (Not Null 컬럼).
        assertThat(captor.getValue().getValue("name")).isEqualTo("홍길동");
    }
}
