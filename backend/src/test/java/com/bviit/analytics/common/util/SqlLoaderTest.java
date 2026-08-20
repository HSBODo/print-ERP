package com.bviit.analytics.common.util;

import com.bviit.analytics.common.exception.SqlResourceLoadException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqlLoaderTest {

    private static final String SYSTEM_SQL = "sql/reservation/stats/system-daily-counts.sql";
    private static final String CATARACT_SQL = "sql/reservation/stats/cataract-daily-counts.sql";

    @Test
    void 존재하는_sql_리소스를_utf8로_읽는다() {
        String sql = SqlLoader.load(SYSTEM_SQL);

        assertThat(sql)
                .isNotEmpty()
                .contains("SET NOCOUNT ON")
                .contains("예약날짜", "인입콜", "응대콜");
        assertThat(SqlLoader.load(CATARACT_SQL)).contains("백내장_내원");
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

        assertThat(sql).startsWith("SET NOCOUNT ON;");
        assertThat(sql).endsWith("ORDER BY Z.RESERVE_DATE\n");
    }
}
