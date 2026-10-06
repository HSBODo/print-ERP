package com.bviit.analytics.common.util;

import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public final class SqlFragments {

    private static final Pattern SAFE_ALIAS = Pattern.compile("[A-Za-z][A-Za-z0-9_]*");

    private static final String EXAM_MEASUREMENTS_BLANK_MSSQL =
            SqlLoader.load("sql/softcrm/fragments/fragment-exam-measurements-blank.sql");
    private static final String EXAM_MEASUREMENTS_BLANK_WAREHOUSE =
            SqlLoader.load("sql/warehouse/fragments/fragment-exam-measurements-blank.sql");

    private static final String EXAM_SESSION_SOURCE_MSSQL =
            SqlLoader.load("sql/softcrm/fragments/fragment-exam-session-source.sql");
    private static final String EXAM_SESSION_SOURCE_WAREHOUSE =
            SqlLoader.load("sql/warehouse/fragments/fragment-exam-session-source.sql");

    private SqlFragments() {
    }

    /**
     * 검사 세션 모집단(cn · d · isCat) — 검사자 리스트와 동일 기준 (MSSQL 방언).
     * 조각 안의 {@code __EXAM_MEASUREMENTS_BLANK__} 는 EXAM 별칭 {@code e} 로 미리 치환해 돌려준다.
     *
     * @see #examMeasurementsBlankPredicate(String)
     */
    public static String examSessionSource() {
        return examSessionSource(false);
    }

    /**
     * 검사 세션 모집단 조각 — {@code warehouse=true} 면 Postgres 방언 + raw 스키마 버전을 돌려준다
     * (RECONCILE Fragment 블록 · 2026-10-06).
     */
    public static String examSessionSource(boolean warehouse) {
        String base = warehouse ? EXAM_SESSION_SOURCE_WAREHOUSE : EXAM_SESSION_SOURCE_MSSQL;
        return base.replace(
                "__EXAM_MEASUREMENTS_BLANK__",
                examMeasurementsBlankPredicate("e", warehouse)
        );
    }

    public static String examMeasurementsBlankPredicate(String alias) {
        return examMeasurementsBlankPredicate(alias, false);
    }

    /** warehouse=true 면 Postgres 방언(소문자 컬럼 + TRIM/COALESCE) 조각을 돌려준다. */
    public static String examMeasurementsBlankPredicate(String alias, boolean warehouse) {
        if (alias == null || !SAFE_ALIAS.matcher(alias).matches()) {
            throw new IllegalArgumentException("SQL alias is not safe: " + alias);
        }
        String base = warehouse ? EXAM_MEASUREMENTS_BLANK_WAREHOUSE : EXAM_MEASUREMENTS_BLANK_MSSQL;
        String sql = base.replace("__ALIAS__", alias);
        String[] lines = sql.replace("\r\n", "\n").split("\n");
        return IntStream.range(0, lines.length)
                .mapToObj(i -> normalizePredicateLine(lines[i], i == 0))
                .filter(line -> !line.isBlank())
                .collect(Collectors.joining("\n"));
    }

    private static String normalizePredicateLine(String line, boolean firstLine) {
        String trimmed = line.strip();
        if (trimmed.isBlank() || firstLine) {
            return trimmed;
        }
        if (trimmed.regionMatches(true, 0, "AND ", 0, 4)) {
            return trimmed;
        }
        return "AND " + trimmed;
    }
}
