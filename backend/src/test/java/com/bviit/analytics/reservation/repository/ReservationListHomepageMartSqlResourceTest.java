package com.bviit.analytics.reservation.repository;

import com.bviit.analytics.common.util.SqlLoader;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 예약자 리스트_홈페이지 <b>마트</b> SQL 리소스 불변식.
 *
 * <p>{@link ReservationListHomepageSqlResourceTest} 가 소스판(SQLite/MariaDB) 을 지키는 것과
 * 짝이다 — 여기는 마트판({@code sql/mart/select-list-reservation-homepage*.sql}) 을 지킨다.
 * 배치가 소스에서 옮겨 담은 데이터를 <b>같은 계약</b>으로 앱에 내려보내는 것이 목적이라,
 * 마트 SQL 이 소스판과 어긋나면 프론트 zod 스키마 하나가 두 소스에 대해 참·거짓이 갈린다.
 *
 * <p>실제 건수 검증은 마트(Postgres) 가 있어야 해서 CI 에서 돌릴 수 없다 — 여기서는 쿼리 형태를 고정한다.
 *
 * <h2>왜 필터가 없는지</h2>
 * 소스판은 CATEGORY='COUNSELONLINE' · DEL_TF='N' 을 SELECT 에서 걸어야 하지만, 마트는 배치가
 * <b>미리 걸러서</b> 넣기 때문에 여기서 재적용하지 않는다. 마트 SQL 에 이 필터가 다시 등장하면
 * 오히려 이중 필터가 되어 유지보수 시 혼동을 부른다.
 */
class ReservationListHomepageMartSqlResourceTest {

    /**
     * 주석 제거 + 공백 정규화. 문서용 문구가 본문에서 사라져도 테스트가 통과하지 않도록.
     * 소스판 테스트와 동일한 정규화 규칙.
     */
    private static String sqlBody(String fileName) {
        return SqlLoader.load("sql/mart/" + fileName)
                .replaceAll("--[^\\n]*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /** 소스판과 동일한 14개 계약. 이름이 어긋나면 화면이 특정 소스에서만 깨진다. */
    private static final String[] ALIASES = {
            "legacyNo", "deviceType", "name", "phone", "reserveDate", "reserveTime",
            "utmSource", "utmMedium", "utmCampaign", "referralCode",
            "examType", "surgeryTf", "isReserve", "regDate",
    };

    @Test
    void 마트_목록_sql은_프론트_zod_계약인_camelCase_별칭_14개를_보존한다() {
        String sql = sqlBody("select-list-reservation-homepage.sql");

        for (String alias : ALIASES) {
            assertThat(sql)
                    .as("마트 SQL 에 별칭 %s 누락 — 소스판과 계약이 어긋난다", alias)
                    .containsPattern("AS \"" + alias + "\"");
        }
    }

    @Test
    void 마트_목록_sql은_반개구간과_PK역순을_보존한다() {
        String sql = sqlBody("select-list-reservation-homepage.sql");

        assertThat(sql).contains(":from", ":to");
        // 반개구간 — 마트도 소스와 같은 규약이어야 한다. 종료일 당일 등록분이 사라지면 206 → 199.
        assertThat(sql).containsPattern("reg_date\\s*<\\s*CAST\\(:to AS TIMESTAMP\\)\\s*\\+\\s*INTERVAL '1 day'");
        // 등록일이 아니라 PK 역순 — 레거시 화면 No 재현 전제.
        assertThat(sql).containsIgnoringCase("ORDER BY CAST(legacy_no AS BIGINT) DESC");
        // reg_date 는 TIMESTAMP 라 문자열화 필수. 안 하면 zod(string)가 깨진다.
        assertThat(sql).containsIgnoringCase("TO_CHAR(reg_date, 'YYYY-MM-DD HH24:MI:SS')");
    }

    @Test
    void 마트_목록_sql은_배치가_이미_필터한_컬럼을_재적용하지_않는다() {
        String sql = sqlBody("select-list-reservation-homepage.sql");

        // 이 필터들은 배치의 소스 SELECT 에서 걸리고 마트엔 이미 걸러진 데이터만 들어온다.
        // 마트 SQL 에 다시 등장하면 이중 필터가 되어 유지보수 시 혼동을 부른다.
        assertThat(sql).doesNotContainIgnoringCase("CATEGORY");
        assertThat(sql).doesNotContainIgnoringCase("DEL_TF");
    }

    @Test
    void 마트_월별_중복제외_sql은_소스판과_동일한_집계_조건을_보존한다() {
        String sql = sqlBody("select-list-reservation-homepage-monthly-deduped.sql");

        assertThat(sql).contains(":from", ":to");
        // 시력교정만 — 백내장(2)·노안(21)·렌즈삽입(24,25)·미상(1) 제외. 소스판과 동일.
        assertThat(sql).containsIgnoringCase("exam_type = '5'");
        // 중복제외 = 달 안 전화번호 기준. COUNT(*) 로 바뀌면 온라인 예약이 부풀려진다.
        assertThat(sql).containsIgnoringCase("COUNT(DISTINCT phone)");
        // 반개구간 — 소스판과 규약 일치.
        assertThat(sql).containsPattern("reg_date\\s*<\\s*CAST\\(:to AS TIMESTAMP\\)\\s*\\+\\s*INTERVAL '1 day'");
        // yr·mo·cnt 결과 계약 — 소스판(../{sqlite,mariadb}/monthly-deduped.sql)과 동일.
        assertThat(sql).containsPattern("AS \"yr\"");
        assertThat(sql).containsPattern("AS \"mo\"");
        assertThat(sql).containsPattern("AS \"cnt\"");
    }

    @Test
    void 마트_마지막_등록일시_sql은_결과_계약이_소스판과_동일하다() {
        String sql = sqlBody("select-list-reservation-homepage-last-reg-date.sql");

        assertThat(sql).containsIgnoringCase("MAX(reg_date)");
        // 소스판과 동일하게 문자열 1개(lastRegDate) — 배치 이후에는 '천장' 의미를 갖는다.
        assertThat(sql).containsPattern("AS \"lastRegDate\"");
        // 마트엔 이미 CATEGORY·DEL_TF 가 걸린 채로 들어오므로 여기서는 필터 없음.
        assertThat(sql).doesNotContainIgnoringCase("WHERE");
    }

    @Test
    void 마트_delete_range_sql은_소스판과_같은_반개구간_규약을_따른다() {
        String sql = sqlBody("delete-list-reservation-homepage-range.sql");

        assertThat(sql).containsIgnoringCase("DELETE FROM mart_list_reservation_homepage");
        assertThat(sql).contains(":from", ":to");
        // 반개구간 — 재배치 시 정확히 소스 SELECT 범위와 짝이 맞아야 취소·수정분이 흡수된다.
        assertThat(sql).containsPattern("reg_date\\s*>=\\s*CAST\\(:from AS TIMESTAMP\\)");
        assertThat(sql).containsPattern("reg_date\\s*<\\s*CAST\\(:to AS TIMESTAMP\\)\\s*\\+\\s*INTERVAL '1 day'");
    }

    @Test
    void 마트_insert_sql은_소스_SELECT_별칭_14개를_모두_바인딩한다() {
        String sql = sqlBody("insert-list-reservation-homepage.sql");

        assertThat(sql).containsIgnoringCase("INSERT INTO mart_list_reservation_homepage");
        for (String alias : ALIASES) {
            assertThat(sql)
                    .as("insert SQL 에 바인딩 :%s 누락 — Writer 가 채워도 컬럼이 빈값이 된다", alias)
                    .contains(":" + alias);
        }
        // 빈 문자열 방어 — 소스가 NULL 을 빈 문자열로 내려보내면 TIMESTAMP CAST 가 깨진다.
        assertThat(sql).containsIgnoringCase("NULLIF(:regDate, '')");
    }
}
