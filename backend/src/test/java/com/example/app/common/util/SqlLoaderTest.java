package com.example.app.common.util;

import com.example.app.common.exception.SqlResourceLoadException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqlLoaderTest {

    private static final String SAMPLE_SQL = "sql/sample.sql";

    @Test
    void 존재하는_sql_리소스를_utf8로_끝까지_읽는다() {
        String sql = SqlLoader.load(SAMPLE_SQL).replace("\r\n", "\n");

        assertThat(sql).startsWith("-- SqlLoaderTest 용 픽스처");
        assertThat(sql).endsWith("SELECT 1\n");
    }

    @Test
    void 없는_sql_리소스는_경로를_포함한_예외를_낸다() {
        assertThatThrownBy(() -> SqlLoader.load("sql/none.sql"))
                .isInstanceOf(SqlResourceLoadException.class)
                .hasMessageContaining("sql/none.sql");
    }
}
