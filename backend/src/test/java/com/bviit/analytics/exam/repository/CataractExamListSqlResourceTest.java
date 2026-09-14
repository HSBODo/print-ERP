package com.bviit.analytics.exam.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 백내장 검사자 리스트 · 전체 검사자 리스트 · 검사 세션 조각이 같은 모집단·분류를 쓰는지 지킨다.
 *
 * <p>2026-08-05 이전에는 셋이 각자 규칙을 갖고 있었다 (2026-07 기준 56 / 59 / 56).
 * 하나만 고치면 화면과 레포트가 다시 어긋나므로, 여기서 세 파일을 함께 묶어둔다.
 */
class CataractExamListSqlResourceTest {

    private static final String CATARACT_LIST = "sql/softcrm/exam/select-cataract-exam-list.sql";
    private static final String ALL_LIST      = "sql/softcrm/exam/select-all-exam-list.sql";
    private static final String SESSION_SRC   = "sql/softcrm/fragments/fragment-exam-session-source.sql";

    /** 레거시 BCRM 분류 4종. 세 SQL 이 글자 하나까지 같은 CASE 를 써야 화면·레포트가 어긋나지 않는다. */
    private static final String CLASSIFICATION_CASE = normalize("""
            CASE WHEN opt.v = 1 AND B.MY_COUNSELOR = 'BS0808' THEN N'중단'
                 WHEN opt.v = 1 AND cns.v = 1                 THEN N'백내장'
                 WHEN B.MY_COUNSELOR = 'BS0808'               THEN N'노안/FU'
                 ELSE N'기타' END
            """);

    /** 백내장 예약 내원 모집단 — 담당자 배정 여부로 거르지 않는다. */
    private static final String POPULATION_PREDICATES = normalize("""
            AND D2.RESERVE_FLAG = 'H'
            AND ISNULL(D2.RESERVE_JINRYO, '') <> '3'
            AND ISNULL(D2.RESERVE_SEQ, 0) <> 3
            AND D2.RESERVE_STATE NOT IN ('C', 'Y')
            """);

    @Test
    void 세_sql은_같은_분류_case를_쓴다() {
        assertThat(normalize(SqlLoader.load(CATARACT_LIST))).contains(CLASSIFICATION_CASE);
        assertThat(normalize(SqlLoader.load(ALL_LIST))).contains(CLASSIFICATION_CASE);
        assertThat(normalize(SqlLoader.load(SESSION_SRC))).contains(CLASSIFICATION_CASE);
    }

    @Test
    void 전체리스트와_검사세션조각은_같은_백내장_모집단을_쓴다() {
        assertThat(normalize(SqlLoader.load(ALL_LIST))).contains(POPULATION_PREDICATES);
        assertThat(normalize(SqlLoader.load(SESSION_SRC))).contains(POPULATION_PREDICATES);
    }

    @Test
    void 백내장_리스트는_담당자_미배정도_싣는다() {
        String sql = normalize(SqlLoader.load(CATARACT_LIST));

        // 종전 모집단 필터(검안사 EXISTS · 상담사 EXISTS or BS0808)가 WHERE 에 남아 있으면 46건이 다시 사라진다.
        assertThat(sql).doesNotContain("OR EXISTS (SELECT 1 FROM EMPLOYEE");
        // 담당자 판정은 분류용 CROSS APPLY 로만 쓴다.
        assertThat(sql).contains("AS v) opt", "AS v) cns");
    }

    @Test
    void 백내장_원데이는_진료구분으로_판정하고_두_sql이_같은_규칙을_쓴다() {
        // C_원데이(7)·C_노안원데이(9). 시력교정(M/5 내원)과 근거가 달라 각자 계산하지만,
        // 백내장끼리는 리스트와 전체 리스트가 같아야 한다.
        String rule = normalize("IN ('7', '9') THEN 1 ELSE 0 END");
        assertThat(normalize(SqlLoader.load(CATARACT_LIST))).contains(rule);
        assertThat(normalize(SqlLoader.load(ALL_LIST))).contains(rule);
    }

    @Test
    void 전체리스트의_원데이는_빈칸없이_이진값이다() {
        // 종전엔 백내장·드림렌즈를 '' 로 덮어 130건(2026-07)이 빈칸이었다.
        String sql = normalize(SqlLoader.load(ALL_LIST));

        assertThat(sql).contains(normalize("CASE WHEN src.isOneDay = 1 THEN N'원데이' ELSE N'일반' END AS examType"));
        assertThat(sql).doesNotContain(normalize("WHEN src.isCat = 1 THEN ''"));
    }

    @Test
    void 시력교정_갈래는_백내장_예약일의_EXAM_행을_배제한다() {
        // 백내장 예약(H)으로만 내원한 날의 EXAM 행이 살아남아 같은 사람이 두 번 세어졌다(2026-01~05 실측 4건).
        // 세 SQL 이 같은 배제 조건을 써야 리스트·레포트가 어긋나지 않는다.
        String guard = normalize("""
                AND rh.RESERVE_FLAG = 'H'
                AND ISNULL(rh.RESERVE_JINRYO, '') <> '3'
                AND ISNULL(rh.RESERVE_SEQ, 0) <> 3
                AND rh.RESERVE_STATE NOT IN ('C','Y')
                """);
        assertThat(normalize(SqlLoader.load(SESSION_SRC))).contains(guard);
        assertThat(normalize(SqlLoader.load(ALL_LIST))).contains(guard);
        assertThat(normalize(SqlLoader.load("sql/softcrm/exam/select-exam-list.sql"))).contains(guard);
    }

    @Test
    void 검사세션조각의_isCat은_백내장과_중단만_센다() {
        String sql = normalize(SqlLoader.load(SESSION_SRC));

        // isCat = 월간 레포트 백내장 검사수 집계 대상. 노안/FU·기타가 섞이면 백내장 검사수가 흔들린다.
        assertThat(sql).contains(normalize("""
                CASE WHEN opt.v = 1 AND (B.MY_COUNSELOR = 'BS0808' OR cns.v = 1)
                     THEN 1 ELSE 0 END AS isCat
                """));
    }

    private static String normalize(String sql) {
        return sql.replace("\r\n", "\n").replaceAll("\\s+", " ").strip();
    }
}
