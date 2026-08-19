package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EoeisCheckupSqlResourceTest {

    @Test
    void 아이리더_집계_sql은_날짜를_바인딩하고_개인정보를_조회하지_않는다() {
        String sql = SqlLoader.load("sql/exam/find-eoeis-checkup-stats.sql");

        assertThat(sql)
                .contains("record_begin_dt >= :from", "record_begin_dt < :toExclusive")
                .contains("operator_nm", "checkup_kind_nm", "COUNT_BIG(*)")
                .contains("NOT LIKE '%(kd%'", "NOT LIKE '%(ls%'")
                .contains("NULLIF(LTRIM(RTRIM(operator_nm)), '') IS NULL")
                .contains("N'(검사자 미지정)'")
                .doesNotContain("patient_no", "checkup_record_id", "SELECT *");
    }

    @Test
    void 두_sql은_장비명을_같은_규칙으로_묶어_점수_조회가_빗나가지_않는다() {
        String stats = SqlLoader.load("sql/exam/find-eoeis-checkup-stats.sql");
        String scores = SqlLoader.load("sql/exam/find-eoeis-device-scores.sql");

        // 정본 이름 = 점수표 이름. 두 SQL 이 같은 키(소문자·trim)로 묶어야 화면의 scores[device] 가 맞는다.
        String canonKey = "GROUP BY LOWER(LTRIM(RTRIM(checkup_kind_nm)))";
        assertThat(stats)
                .contains(canonKey)
                .contains("dbo.checkup_device_score")
                .contains("GROUP BY chk.operator_name, LOWER(chk.device_raw), chk.record_date");
        assertThat(scores)
                .contains(canonKey)
                .contains("MIN(checkup_kind_nm) AS device_name");
    }
}
