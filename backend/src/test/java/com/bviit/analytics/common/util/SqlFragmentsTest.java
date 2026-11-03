package com.bviit.analytics.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SqlFragmentsTest {

    @Test
    void 검사측정값_공백조건은_각_줄을_and로_연결한다() {
        String sql = SqlFragments.examMeasurementsBlankPredicate("e");

        assertThat(sql).contains("e.right01", "e.left30");
        assertThat(sql.lines().skip(1))
                .allSatisfy(line -> assertThat(line).startsWith("AND "));
    }

    @Test
    void 안전하지_않은_alias는_거부한다() {
        assertThatThrownBy(() -> SqlFragments.examMeasurementsBlankPredicate("e;DROP"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("SQL alias is not safe");
    }
}
