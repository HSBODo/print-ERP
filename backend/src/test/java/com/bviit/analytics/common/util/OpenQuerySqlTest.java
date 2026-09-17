package com.bviit.analytics.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OpenQuerySqlTest {

    @Test
    void 주석을_지우고_공백을_접은_뒤_따옴표를_이스케이프해_OPENQUERY로_감싼다() {
        String inner = """
                -- 머리 주석
                SELECT A.수납일자, '외래' AS t   -- 줄 끝 주석
                FROM IPLUS.dbo.PAOSUNAB_New A
                WHERE A.수납일자 >= '__OQ_FROM__' AND A.수납일자 <= '__OQ_TO__'
                """;

        String sql = OpenQuerySql.wrapForIplus(inner, "2026-07-01", "2026-07-31");

        assertThat(sql).isEqualTo("SELECT * FROM OPENQUERY([220.85.109.240], "
                + "'SELECT A.수납일자, ''외래'' AS t FROM IPLUS.dbo.PAOSUNAB_New A "
                + "WHERE A.수납일자 >= ''2026-07-01'' AND A.수납일자 <= ''2026-07-31''')");
    }

    @Test
    void ISO_형식이_아닌_날짜는_치환_전에_거부한다() {
        assertThatThrownBy(() -> OpenQuerySql.wrapForIplus("SELECT 1", "2026-7-1", "2026-07-31"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> OpenQuerySql.wrapForIplus("SELECT 1", "2026-07-01", "2026-07-31' OR 1=1 --"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void 안쪽_쿼리가_8000자를_넘으면_실패한다() {
        String tooLong = "SELECT '" + "x".repeat(OpenQuerySql.MAX_INNER_LENGTH) + "'";
        assertThatThrownBy(() -> OpenQuerySql.wrapForIplus(tooLong, "2026-07-01", "2026-07-31"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void 실제_의사랑_리소스_두_개는_상한_안에_들어온다() {
        for (String location : new String[]{
                "sql/iplus/accounting/select-medical-receipts-inner.sql",
                "sql/iplus/accounting/select-medical-monthly-inner.sql"}) {
            String sql = OpenQuerySql.wrapForIplus(SqlLoader.load(location), "2026-01-01", "2026-12-31");
            assertThat(sql).startsWith("SELECT * FROM OPENQUERY([220.85.109.240], '")
                    .doesNotContain("__OQ_FROM__", "__OQ_TO__", "--");
        }
    }
}
