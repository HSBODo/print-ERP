package com.bviit.analytics.batch.job;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * select-surgery-daily-agg.sql 의 컬럼 별칭과 SurgeryMartJob.toDailyItem() 의 조회 키가
 * 어긋나지 않는지 잠근다.
 *
 * 왜 필요한가 — 둘이 어긋나면 예외가 나지 않는다. Map.get() 이 null 을 주고 num() 이 0 으로
 * 바꿔버려서, 해당 지표만 조용히 0 이 된 채 배치가 "성공"으로 끝난다.
 * 컬럼 하나 오타가 화면에서 빈 값으로 나타나기까지 아무 신호가 없다.
 */
class SurgeryDailyAggMappingTest {

    private static String sql() throws IOException {
        try (InputStream in = SurgeryDailyAggMappingTest.class.getClassLoader()
                .getResourceAsStream("sql/mart/surgery/select-surgery-daily-agg.sql")) {
            assertThat(in).as("select-surgery-daily-agg.sql 이 클래스패스에 있어야 한다").isNotNull();
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    /**
     * SQL 의 `AS alias` 별칭을 모두 뽑는다(주석 줄 제외).
     * CAST(:from AS DATE) 의 타입명은 별칭이 아니므로 걸러낸다.
     */
    private static final List<String> SQL_TYPE_KEYWORDS =
            List.of("date", "int", "integer", "bigint", "text", "varchar", "timestamp", "numeric", "boolean");

    private static List<String> aliases(String sql) {
        List<String> found = new ArrayList<>();
        Pattern p = Pattern.compile("\\bAS\\s+([a-z_][a-z0-9_]*)", Pattern.CASE_INSENSITIVE);
        for (String line : sql.split("\n")) {
            if (line.stripLeading().startsWith("--")) continue;
            Matcher m = p.matcher(line);
            while (m.find()) {
                String alias = m.group(1);
                if (SQL_TYPE_KEYWORDS.contains(alias.toLowerCase())) continue;
                found.add(alias);
            }
        }
        return found;
    }

    @Test
    @DisplayName("자바가 읽는 컬럼명이 SQL 별칭에 전부 존재한다")
    void 자바_조회키가_SQL_별칭에_있다() throws IOException {
        List<String> aliases = aliases(sql());

        // SurgeryMartJob.toDailyItem() 이 num(r, "...") 으로 읽는 키 전부.
        List<String> keysReadByJava = List.of(
                "dt",
                "lasek", "lasik", "smile", "smile_pro", "presbyond",
                "icl", "t_icl", "kpl", "t_kpl", "viva", "piol_patients",
                "cat_multi", "cat_mono", "cat_edof",
                "xtra", "wave_vision", "mono_vision", "contra", "personal",
                "lasek_ex", "lasek_red",
                "reoperation", "reop_laser", "reop_lens",
                "vision_patients", "cataract_patients", "total"
        );

        assertThat(aliases)
                .as("SQL 별칭에 없는 키를 자바가 읽으면 그 지표는 조용히 0 이 된다")
                .containsAll(keysReadByJava);
    }

    @Test
    @DisplayName("SQL 이 내보내는 별칭 중 자바가 안 읽는 것이 없다")
    void SQL_별칭이_전부_소비된다() throws IOException {
        List<String> keysReadByJava = List.of(
                "dt",
                "lasek", "lasik", "smile", "smile_pro", "presbyond",
                "icl", "t_icl", "kpl", "t_kpl", "viva", "piol_patients",
                "cat_multi", "cat_mono", "cat_edof",
                "xtra", "wave_vision", "mono_vision", "contra", "personal",
                "lasek_ex", "lasek_red",
                "reoperation", "reop_laser", "reop_lens",
                "vision_patients", "cataract_patients", "total"
        );

        assertThat(aliases(sql()))
                .as("SQL 에 컬럼을 추가했으면 toDailyItem()·aggregateByMonth() 에도 반영해야 한다")
                .isSubsetOf(keysReadByJava);
    }
}
