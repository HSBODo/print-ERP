package com.bviit.analytics.common.util;

import com.bviit.analytics.common.exception.SqlResourceLoadException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqlLoaderTest {

    private static final String SYSTEM_SQL = "sql/warehouse/reservation/stats/select-system-daily-counts.sql";
    private static final String CATARACT_SQL = "sql/warehouse/reservation/stats/select-cataract-daily-counts.sql";

    @Test
    void 존재하는_sql_리소스를_utf8로_읽는다() {
        String sql = SqlLoader.load(SYSTEM_SQL);

        assertThat(sql)
                .isNotEmpty()
                .contains("WITH")
                .contains("예약통계_시력교정");
        assertThat(SqlLoader.load(CATARACT_SQL)).contains("예약통계_백내장");
    }

    @Test
    void 없는_sql_리소스는_경로를_포함한_예외를_낸다() {
        assertThatThrownBy(() -> SqlLoader.load("sql/none.sql"))
                .isInstanceOf(SqlResourceLoadException.class)
                .hasMessageContaining("sql/none.sql");
    }

    @Test
    void sql을_trim하지_않고_끝까지_읽는다() {
        String sql = SqlLoader.load(SYSTEM_SQL).replace("\r\n", "\n");

        assertThat(sql).startsWith("-- 예약통계_시력교정");
        assertThat(sql).endsWith("ORDER BY Z.reserve_date\n");
    }
}
