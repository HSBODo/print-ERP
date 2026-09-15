package com.bviit.analytics.common.util;

/**
 * 링크드서버 OPENQUERY 래퍼 — 읽기 좋은 "안쪽" .sql 리소스를 원격 실행 문장으로 만든다.
 *
 * <p>왜 필요한가 — OPENQUERY 는 안쪽 쿼리를 문자열 리터럴로 받으므로 (a) 파라미터 바인딩이 안 되고
 * (b) 따옴표를 전부 이스케이프해야 하며 (c) 8,000자 상한이 있다. 리소스 파일에 이스케이프된 한 줄을 두면
 * 읽을 수도 고칠 수도 없어서, 주석 달린 원문을 두고 여기서 접는다.
 *
 * <ul>
 *   <li>{@code --} 주석 제거 · 공백 축약 (주석은 상한에 포함되지 않게)</li>
 *   <li>{@code __OQ_FROM__} / {@code __OQ_TO__} 를 ISO 날짜로 치환 — 치환 전 형식 재검증(주입 방지 · 예약통계 OPENQUERY 와 같은 규칙)</li>
 *   <li>{@code '} → {@code ''} 이스케이프 후 {@code SELECT * FROM OPENQUERY(server, '...')} 로 감싼다</li>
 * </ul>
 */
public final class OpenQuerySql {

    /** 의사랑(IPLUS) EMR — 드림렌즈 장부 초안(select-dreamlens-ledger-draft.sql) 이 쓰는 것과 같은 링크드서버. */
    public static final String IPLUS_LINKED_SERVER = "[220.85.109.240]";

    /** OPENQUERY 안쪽 쿼리 문자열 상한 (MSSQL 8 KB). */
    static final int MAX_INNER_LENGTH = 8000;

    private static final String ISO_DATE = "\\d{4}-\\d{2}-\\d{2}";

    private OpenQuerySql() {
    }

    public static String wrapForIplus(String innerSql, String from, String to) {
        return wrap(IPLUS_LINKED_SERVER, innerSql, from, to);
    }

    public static String wrap(String linkedServer, String innerSql, String from, String to) {
        if (from == null || to == null || !from.matches(ISO_DATE) || !to.matches(ISO_DATE)) {
            throw new IllegalArgumentException("from/to must be ISO yyyy-MM-dd dates");
        }
        String inner = compact(innerSql).replace("__OQ_FROM__", from).replace("__OQ_TO__", to);
        if (inner.length() > MAX_INNER_LENGTH) {
            throw new IllegalStateException("OPENQUERY inner sql exceeds " + MAX_INNER_LENGTH
                    + " chars: " + inner.length());
        }
        return "SELECT * FROM OPENQUERY(" + linkedServer + ", '" + inner.replace("'", "''") + "')";
    }

    /** 줄 주석(--) 제거 후 모든 공백을 한 칸으로. 문자열 리터럴 안에 '--' 가 오면 안 된다(이 프로젝트 SQL 에는 없다). */
    static String compact(String sql) {
        String noComments = sql.replaceAll("(?m)--[^\\r\\n]*", " ");
        return noComments.replaceAll("\\s+", " ").trim();
    }
}
