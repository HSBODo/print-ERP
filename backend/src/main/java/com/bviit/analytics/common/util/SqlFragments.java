package com.bviit.analytics.common.util;

import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public final class SqlFragments {

    private static final Pattern SAFE_ALIAS = Pattern.compile("[A-Za-z][A-Za-z0-9_]*");
    private static final String EXAM_MEASUREMENTS_BLANK =
            SqlLoader.load("sql/softcrm/fragments/fragment-exam-measurements-blank.sql");
    private static final String EXAM_SESSION_SOURCE =
            SqlLoader.load("sql/softcrm/fragments/fragment-exam-session-source.sql");

    private SqlFragments() {
    }

    /**
     * 검사 세션 모집단(cn · d · isCat) — 검사자 리스트와 동일 기준.
     * 조각 안의 {@code __EXAM_MEASUREMENTS_BLANK__} 는 EXAM 별칭 {@code e} 로 미리 치환해 돌려준다.
     *
     * @see #examMeasurementsBlankPredicate(String)
     */
    public static String examSessionSource() {
        return EXAM_SESSION_SOURCE.replace(
                "__EXAM_MEASUREMENTS_BLANK__",
                examMeasurementsBlankPredicate("e")
        );
    }

    public static String examMeasurementsBlankPredicate(String alias) {
        if (alias == null || !SAFE_ALIAS.matcher(alias).matches()) {
            throw new IllegalArgumentException("SQL alias is not safe: " + alias);
        }
        String sql = EXAM_MEASUREMENTS_BLANK.replace("__ALIAS__", alias);
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
