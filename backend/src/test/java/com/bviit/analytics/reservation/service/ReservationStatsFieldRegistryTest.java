package com.bviit.analytics.reservation.service;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReservationStatsFieldRegistryTest {

    private static final String SYSTEM_DAILY_SQL = "sql/reservation/stats/system-daily-counts.sql";
    private static final String SYSTEM_DRILL_DOWN_SQL = "sql/reservation/stats/system-drill-down.sql";
    private static final String CATARACT_DAILY_SQL = "sql/reservation/stats/cataract-daily-counts.sql";
    private static final String CATARACT_DRILL_DOWN_SQL = "sql/reservation/stats/cataract-drill-down.sql";

    @Test
    void system_registry_field는_daily_alias와_drill_down_FIELD_MAP에_모두_존재한다() {
        assertDailyAliases(SqlLoader.load(SYSTEM_DAILY_SQL), ReservationStatsFieldRegistry.SYSTEM_FIELDS);
        assertDrillDownMappings(SqlLoader.load(SYSTEM_DRILL_DOWN_SQL), ReservationStatsFieldRegistry.SYSTEM_FIELDS);
    }

    @Test
    void cataract_registry_field는_daily_alias에_존재하고_0고정값을_제외한_FIELD_MAP에_존재한다() {
        assertDailyAliases(SqlLoader.load(CATARACT_DAILY_SQL), ReservationStatsFieldRegistry.CATARACT_FIELDS);
        assertDrillDownMappings(SqlLoader.load(CATARACT_DRILL_DOWN_SQL), ReservationStatsFieldRegistry.CATARACT_FIELDS);
    }

    private static <T> void assertDailyAliases(String sql, List<ReservationStatsField<T>> fields) {
        for (ReservationStatsField<T> field : fields) {
            assertThat(sql)
                    .as("daily SQL must expose alias %s", field.name())
                    .contains(field.name());
        }
    }

    private static <T> void assertDrillDownMappings(String sql, List<ReservationStatsField<T>> fields) {
        assertThat(sql).contains("FIELD_MAP");
        for (ReservationStatsField<T> field : fields) {
            if (field.drillDownMapped()) {
                assertThat(sql)
                        .as("drill-down FIELD_MAP must include %s", field.name())
                        .contains("('" + field.name() + "'");
            }
        }
    }
}
